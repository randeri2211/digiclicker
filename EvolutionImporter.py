"""
Builds a directed evolution graph from https://digimon.fandom.com/wiki/Category:Digimon_species
and exports it as GEXF (data/evolution_graph.gexf) for viewing in Gephi.

Only the link structure is imported (from/to/lateral-to relationships between
Digimon pages) - no digivolution conditions/requirements, and no DNA-fusion
(digifuse) edges.
"""
import hashlib
import os
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

API_URL = "https://digimon.fandom.com/api.php"
CATEGORY = "Category:Digimon species"
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "evolution_graph.gexf")
HEADERS = {"User-Agent": "DigiClicker-EvolutionImporter/1.0 (randerikatom@gmail.com)"}
MAX_WORKERS = 8

FIELD_RE = re.compile(
    r'^[ \t]*\|\s*(name|level|from|to|lateral to|type|attribute)\s*=(.*?)(?=\n[ \t]*\|[A-Za-z0-9_ ]+\s*=|\n\}\})',
    re.DOTALL | re.MULTILINE | re.IGNORECASE,
)
LINK_RE = re.compile(r'\[\[\s*([^\]\|]+?)\s*(?:\|[^\]]*)?\]\]')
REF_RE = re.compile(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', re.DOTALL | re.IGNORECASE)
COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)

# Approximate rank for layout/sorting purposes. Armor and Hybrid are
# side-branches (roughly Champion/Ultimate power level) rather than being
# part of the linear Fresh->Mega chain, so their placement here is a rough
# approximation, not a canonical claim.
STAGE_ORDER = {
    "Fresh": 0,
    "In-Training": 1,
    "Rookie": 2,
    "Armor": 3,
    "Champion": 3,
    "Hybrid": 4,
    "Ultimate": 4,
    "Mega": 5,
    "Ultra": 6,
    "Burst Mode": 6,
}
UNKNOWN_STAGE_VALUES = {"", "none", "unidentified"}


def make_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    adapter = requests.adapters.HTTPAdapter(pool_connections=MAX_WORKERS, pool_maxsize=MAX_WORKERS)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def get_all_species_titles(session):
    titles = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": CATEGORY,
        "cmlimit": "500",
        "format": "json",
    }
    while True:
        resp = session.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        titles.extend(m["title"] for m in data["query"]["categorymembers"] if m["ns"] == 0)
        if "continue" in data:
            params["cmcontinue"] = data["continue"]["cmcontinue"]
        else:
            break
    return titles


def _fetch_wikitext_batch(session, batch):
    params = {
        "action": "query",
        "titles": "|".join(batch),
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
    }
    resp = session.get(API_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    result = {}
    for page in data["query"]["pages"].values():
        revisions = page.get("revisions")
        if revisions:
            result[page["title"]] = revisions[0]["slots"]["main"]["*"]
    return result


def get_all_wikitext(session, titles):
    wikitext = {}
    batches = [titles[i:i + 50] for i in range(0, len(titles), 50)]
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(_fetch_wikitext_batch, session, batch) for batch in batches]
        for future in as_completed(futures):
            wikitext.update(future.result())
    return wikitext


def extract_fields(wikitext):
    fields = {}
    for match in FIELD_RE.finditer(wikitext):
        key = match.group(1).strip().lower()
        value = COMMENT_RE.sub("", match.group(2))
        fields.setdefault(key, value)
    return fields


def clean_stage(raw):
    stage = (raw or "").split("\n", 1)[0].strip()
    if stage.lower() in UNKNOWN_STAGE_VALUES:
        return "Unknown"
    return stage or "Unknown"


def clean_type(raw):
    value = (raw or "").split("\n", 1)[0].strip()
    return value or "Unknown"


def extract_links(value):
    if not value:
        return []
    value = REF_RE.sub("", value)
    links = []
    for target in LINK_RE.findall(value):
        target = target.strip()
        if target and not target.lower().startswith(("file:", "category:", "image:")):
            links.append(target)
    return links


UNKNOWN_NODE = ("Unknown", "Unknown", "Unknown")


def build_graph(titles, wikitext_map):
    nodes = {}
    edges = []

    for title in titles:
        wikitext = wikitext_map.get(title)
        fields = extract_fields(wikitext) if wikitext else {}
        nodes[title] = (
            clean_stage(fields.get("level")),
            clean_type(fields.get("type")),
            clean_type(fields.get("attribute")),
        )

    for title in titles:
        wikitext = wikitext_map.get(title)
        if not wikitext:
            continue
        fields = extract_fields(wikitext)

        for target in extract_links(fields.get("to", "")):
            nodes.setdefault(target, UNKNOWN_NODE)
            edges.append((title, target, "evolve"))

        for source in extract_links(fields.get("from", "")):
            nodes.setdefault(source, UNKNOWN_NODE)
            edges.append((source, title, "evolve"))

        for target in extract_links(fields.get("lateral to", "")):
            nodes.setdefault(target, UNKNOWN_NODE)
            edges.append((title, target, "lateral"))

    deduped_edges = sorted(set(edges))
    return nodes, deduped_edges


COLUMN_SPACING = 300
COLUMN_JITTER = 200
ROW_SPAN = 2000


def stable_offset(text, salt):
    digest = hashlib.md5(f"{salt}:{text}".encode("utf-8")).hexdigest()
    return int(digest, 16) % ROW_SPAN - ROW_SPAN / 2


def write_gexf(nodes, edges, path):
    GEXF_NS = "http://www.gexf.net/1.3"
    VIZ_NS = "http://www.gexf.net/1.3/viz"
    ET.register_namespace("", GEXF_NS)
    gexf = ET.Element("gexf", {"xmlns": GEXF_NS, "xmlns:viz": VIZ_NS, "version": "1.3"})
    graph = ET.SubElement(gexf, "graph", {"mode": "static", "defaultedgetype": "directed"})

    node_attrs = ET.SubElement(graph, "attributes", {"class": "node"})
    ET.SubElement(node_attrs, "attribute", {"id": "0", "title": "stage", "type": "string"})
    ET.SubElement(node_attrs, "attribute", {"id": "1", "title": "stageOrder", "type": "integer"})
    ET.SubElement(node_attrs, "attribute", {"id": "2", "title": "type", "type": "string"})
    ET.SubElement(node_attrs, "attribute", {"id": "3", "title": "attribute", "type": "string"})

    edge_attrs = ET.SubElement(graph, "attributes", {"class": "edge"})
    ET.SubElement(edge_attrs, "attribute", {"id": "0", "title": "type", "type": "string"})

    sorted_nodes = sorted(nodes.items())

    nodes_el = ET.SubElement(graph, "nodes")
    node_ids = {}
    for i, (title, (stage, type_, attribute)) in enumerate(sorted_nodes):
        node_id = str(i)
        node_ids[title] = node_id
        node_el = ET.SubElement(nodes_el, "node", {"id": node_id, "label": title})
        attvalues = ET.SubElement(node_el, "attvalues")
        ET.SubElement(attvalues, "attvalue", {"for": "0", "value": stage})
        stage_order = STAGE_ORDER.get(stage, -1)
        ET.SubElement(attvalues, "attvalue", {"for": "1", "value": str(stage_order)})
        ET.SubElement(attvalues, "attvalue", {"for": "2", "value": type_})
        ET.SubElement(attvalues, "attvalue", {"for": "3", "value": attribute})

        # Position depends only on this node's own title, never on its
        # siblings - inserting/removing other nodes never shifts it.
        x = stage_order * COLUMN_SPACING + stable_offset(title, "x") * (COLUMN_JITTER / ROW_SPAN)
        y = stable_offset(title, "y")
        ET.SubElement(node_el, "viz:position", {"x": str(x), "y": str(y), "z": "0.0"})

    edges_el = ET.SubElement(graph, "edges")
    for i, (source, target, edge_type) in enumerate(edges):
        edge_el = ET.SubElement(edges_el, "edge", {
            "id": str(i),
            "source": node_ids[source],
            "target": node_ids[target],
            "type": "directed",
        })
        attvalues = ET.SubElement(edge_el, "attvalues")
        ET.SubElement(attvalues, "attvalue", {"for": "0", "value": edge_type})

    os.makedirs(os.path.dirname(path), exist_ok=True)
    tree = ET.ElementTree(gexf)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)


def main():
    session = make_session()

    print("Fetching Digimon species list...")
    titles = get_all_species_titles(session)
    print(f"Found {len(titles)} species pages.")

    print("Fetching wikitext...")
    wikitext_map = get_all_wikitext(session, titles)
    print(f"Fetched wikitext for {len(wikitext_map)}/{len(titles)} pages.")

    print("Building graph...")
    nodes, edges = build_graph(titles, wikitext_map)
    extra_nodes = len(nodes) - len(titles)
    print(f"Graph has {len(nodes)} nodes ({extra_nodes} referenced outside the species category) and {len(edges)} edges.")

    print(f"Writing {OUTPUT_PATH}...")
    write_gexf(nodes, edges, OUTPUT_PATH)
    print("Done.")


if __name__ == "__main__":
    main()
