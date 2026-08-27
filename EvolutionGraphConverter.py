"""
Converts data/evolution_graph.gexf (a Gephi-visualization export produced by
EvolutionImporter.py) into a clean, game-usable JSON file at
src/lib/data/digimon-evolution.json.

Filters out non-Digimon nodes that leaked in from inline item/location links,
cross-references each surviving node against public/digimon/images/ to
resolve a representative sprite, and reshapes the graph into a
speciesId-keyed lookup with precomputed evolvesTo/evolvesFrom/lateralTo edges.
viz:position (Gephi layout jitter) is discarded entirely - it carries no
gameplay signal.
"""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

from evolution_junk_labels import JUNK_LABELS
from evolution_type_mapping import TYPE_TO_STAT

STAT_TYPES = ("Attack", "Defense", "Speed", "SpecialAttack")

ROOT = Path(__file__).resolve().parent
GEXF_PATH = ROOT / "data" / "evolution_graph.gexf"
IMAGES_DIR = ROOT / "public" / "digimon" / "images"
OUTPUT_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"

NS = {"g": "http://www.gexf.net/1.3"}
INVALID_FS_CHARS = re.compile(r'[<>:"/\\|?*]')
SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def sanitize_fs(name):
    return INVALID_FS_CHARS.sub("_", name).strip()


def slugify(label):
    slug = SLUG_STRIP.sub("-", label.lower()).strip("-")
    return slug or "unknown"


def is_composite_junk(label):
    stripped = label.strip()
    if stripped.startswith('"') and stripped.endswith('"'):
        return True
    if " + " in stripped:
        return True
    return False


def parse_gexf(path):
    tree = ET.parse(path)
    root = tree.getroot()

    nodes = {}
    for node_el in root.iterfind(".//g:nodes/g:node", NS):
        node_id = node_el.get("id")
        label = node_el.get("label")
        stage = "Unknown"
        stage_order = -1
        raw_type = "Unknown"
        raw_attribute = "Unknown"
        for attvalue in node_el.iterfind("./g:attvalues/g:attvalue", NS):
            if attvalue.get("for") == "0":
                stage = attvalue.get("value")
            elif attvalue.get("for") == "1":
                stage_order = int(attvalue.get("value"))
            elif attvalue.get("for") == "2":
                raw_type = attvalue.get("value")
            elif attvalue.get("for") == "3":
                raw_attribute = attvalue.get("value")
        nodes[node_id] = {
            "label": label,
            "stage": stage,
            "stageOrder": stage_order,
            "type": raw_type,
            "attribute": raw_attribute,
        }

    edges = []
    for edge_el in root.iterfind(".//g:edges/g:edge", NS):
        source = edge_el.get("source")
        target = edge_el.get("target")
        edge_type = "evolve"
        for attvalue in edge_el.iterfind("./g:attvalues/g:attvalue", NS):
            if attvalue.get("for") == "0":
                edge_type = attvalue.get("value")
        edges.append((source, target, edge_type))

    return nodes, edges


def filter_nodes(nodes):
    kept = {}
    dropped = 0
    for node_id, node in nodes.items():
        label = node["label"]
        if is_composite_junk(label) or label in JUNK_LABELS:
            dropped += 1
            continue
        kept[node_id] = node
    return kept, dropped


def find_sprite(label):
    """Image folders are named after the first token of a Digimon's name
    (see Importer.py's digimon_name_from_title) - a label like
    "Agumon (Black)" looks in the "Agumon" folder for a file matching the
    "(Black)" qualifier, falling back to a generic best-file pick."""
    first_token = label.split(" ")[0]
    folder = IMAGES_DIR / sanitize_fs(first_token)
    if not folder.is_dir():
        return None

    files = sorted(folder.glob("*.png"))
    if not files:
        return None

    qualifier = label[len(first_token):].strip()

    if qualifier:
        # e.g. label "Agumon (Black)": only files carrying that qualifier text
        # are acceptable - a plain prefix match would also match unrelated
        # variants that merely start with the same first token.
        candidates = [f for f in files if qualifier.lower() in f.stem.lower()]
        if not candidates:
            candidates = files
        for f in candidates:
            if f.stem.lower() == label.lower():
                return f
        starts = sorted(f for f in candidates if f.stem.lower().startswith(label.lower()))
        if starts:
            return starts[0]
        return sorted(candidates)[0]

    # Bare species label (no qualifier): a file "starts with" the label even
    # when it's really a different variant, e.g. "Agumon (Black) dl.png"
    # starts with "Agumon". Only accept files where whatever follows
    # "<label> " looks like a lowercase game-source code (dl, dwds, asr...),
    # not a capitalized qualifier word or a "(" - those belong to a distinct,
    # more specific label and would misrepresent this bare species.
    exact = [f for f in files if f.stem.lower() == label.lower()]
    if exact:
        return sorted(exact)[0]

    plain_variant = re.compile(re.escape(label) + r" [a-z]", re.IGNORECASE)
    plain = sorted(f for f in files if plain_variant.match(f.stem))
    if plain:
        return plain[0]

    return sorted(files)[0]


def sprite_url(label):
    path = find_sprite(label)
    if path is None:
        return None
    return path.relative_to(ROOT / "public").as_posix()


def resolve_stat_type(raw_type, slug):
    """Curated lookup first; anything not in the table (long-tail raw values,
    or the wiki's own "no signal" markers like Unknown/None/Lesser) falls
    back to a deterministic hash of the species slug - hashlib, not the
    built-in hash(), which is randomized per-process and would silently
    reshuffle fallback assignments on every rerun."""
    mapped = TYPE_TO_STAT.get(raw_type)
    if mapped:
        return mapped, "mapped"
    digest = hashlib.md5(slug.encode("utf-8")).hexdigest()
    index = int(digest, 16) % len(STAT_TYPES)
    return STAT_TYPES[index], "fallback"


def build_species(nodes, edges):
    id_to_slug = {}
    slug_counts = {}
    for node_id, node in nodes.items():
        slug = slugify(node["label"])
        if slug in slug_counts:
            slug_counts[slug] += 1
            slug = f"{slug}-{slug_counts[slug]}"
        else:
            slug_counts[slug] = 0
        id_to_slug[node_id] = slug

    species = {}
    for node_id, node in nodes.items():
        slug = id_to_slug[node_id]
        stat_type, stat_type_source = resolve_stat_type(node["type"], slug)
        species[slug] = {
            "id": slug,
            "name": node["label"],
            "stage": node["stage"],
            "stageOrder": node["stageOrder"],
            "type": node["type"],
            "attribute": node["attribute"],
            "statType": stat_type,
            "statTypeSource": stat_type_source,
            "evolvesTo": [],
            "evolvesFrom": [],
            "lateralTo": [],
            "spriteUrl": sprite_url(node["label"]),
        }

    for source, target, edge_type in edges:
        if source not in id_to_slug or target not in id_to_slug:
            continue
        source_slug = id_to_slug[source]
        target_slug = id_to_slug[target]
        if edge_type == "lateral":
            species[source_slug]["lateralTo"].append(target_slug)
        else:
            species[source_slug]["evolvesTo"].append(target_slug)
            species[target_slug]["evolvesFrom"].append(source_slug)

    return species


def main():
    print(f"Parsing {GEXF_PATH}...")
    nodes, edges = parse_gexf(GEXF_PATH)
    print(f"  {len(nodes)} nodes, {len(edges)} edges")

    kept_nodes, dropped = filter_nodes(nodes)
    print(f"Filtered: kept {len(kept_nodes)}, dropped {dropped} junk nodes")

    species = build_species(kept_nodes, edges)

    with_sprite = sum(1 for s in species.values() if s["spriteUrl"])
    print(f"Resolved sprites for {with_sprite}/{len(species)} species")

    mapped_count = sum(1 for s in species.values() if s["statTypeSource"] == "mapped")
    print(f"statType: {mapped_count}/{len(species)} from curated table, {len(species) - mapped_count} via fallback hash")

    output = {
        "species": species,
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceNodeCount": len(nodes),
            "keptNodeCount": len(kept_nodes),
            "droppedNodeCount": dropped,
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, sort_keys=True)

    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
