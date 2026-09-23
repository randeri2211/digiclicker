"""
Fetches each species' attack list from https://digimon.fandom.com and
writes data/species_attacks.json - {page title: [{name, text}, ...]} - the
first few attacks per page, signature attack first.

Deliberately separate from EvolutionImporter.py: this only reads the
attack section for the species ALREADY in data/evolution_graph.gexf, so
re-running it can never change the evolution graph itself. Used by
EvolutionGraphConverter.py to decide elements (see element_mapping.py).
"""
import json
import re
from pathlib import Path

from EvolutionImporter import make_session, get_all_wikitext, REF_RE, COMMENT_RE
from EvolutionGraphConverter import GEXF_PATH, parse_gexf, filter_nodes

ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "data" / "species_attacks.json"

# How many attacks to keep per species - the signature attack comes first,
# and a handful after it is plenty for keyword voting.
MAX_ATTACKS = 6

# A heading or bold label containing "Attack" (e.g. "==Attack Techniques==",
# "'''<u>Attacks'''</u>").
ATTACK_HEADING_RE = re.compile(r"^.*(==|''').*\battacks?\b.*$", re.IGNORECASE | re.MULTILINE)
NIHONGO_RE = re.compile(r"\{\{\s*nihongo\s*\|([^|}]*)[^}]*\}\}", re.IGNORECASE)
TEMPLATE_RE = re.compile(r"\{\{[^{}]*\}\}")
LINK_RE = re.compile(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]")
BOLD_NAME_RE = re.compile(r"'''(.+?)'''")
TAG_RE = re.compile(r"<[^>]+>")


def clean(text):
    text = REF_RE.sub("", text)
    text = COMMENT_RE.sub("", text)
    text = NIHONGO_RE.sub(r"\1", text)
    # Nested templates: strip innermost first until none are left.
    while TEMPLATE_RE.search(text):
        text = TEMPLATE_RE.sub("", text)
    text = LINK_RE.sub(r"\1", text)
    text = TAG_RE.sub("", text)
    return text


def extract_attacks(wikitext):
    """Top-level bullet entries ('*', not '**' sub-variants) after the
    first attack heading, until the next section heading."""
    heading = ATTACK_HEADING_RE.search(wikitext)
    if not heading:
        return []
    attacks = []
    for line in wikitext[heading.end():].splitlines():
        stripped = line.strip()
        if stripped.startswith("=="):
            break
        if not stripped.startswith("*") or stripped.startswith("**"):
            continue
        raw = stripped.lstrip("*").strip()
        name_match = BOLD_NAME_RE.search(clean(raw))
        name = name_match.group(1).strip() if name_match else ""
        text = clean(raw).replace("'''", "").replace("''", "").strip(" :")
        if text:
            attacks.append({"name": name, "text": text})
        if len(attacks) >= MAX_ATTACKS:
            break
    return attacks


def main():
    nodes, _ = parse_gexf(GEXF_PATH)
    kept, _ = filter_nodes(nodes)
    titles = sorted({node["label"] for node in kept.values()})
    print(f"Fetching attacks for {len(titles)} species pages...")

    wikitext = get_all_wikitext(make_session(), titles)
    attacks = {title: extract_attacks(text) for title, text in wikitext.items()}

    with_attacks = sum(1 for a in attacks.values() if a)
    print(f"  {len(wikitext)} pages fetched, {with_attacks} with an attack list")
    OUTPUT_PATH.write_text(json.dumps(attacks, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
