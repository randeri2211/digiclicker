"""
Converts data/evolution_graph.gexf (a Gephi-visualization export produced by
EvolutionImporter.py) into a clean, game-usable JSON file at
src/lib/data/digimon-evolution.json.

Filters out non-Digimon nodes that leaked in from inline item/location links,
cross-references each surviving node against art/digimon/images/ to
resolve a representative sprite, and reshapes the graph into a
speciesId-keyed lookup with precomputed evolvesTo/evolvesFrom/lateralTo edges.
viz:position (Gephi layout jitter) is discarded entirely - it carries no
gameplay signal.
"""
import collections
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

from evolution_junk_labels import JUNK_LABELS
from evolution_type_mapping import TYPE_TO_STAT_AFFINITY
from egg_type_mapping import TYPE_TO_EGG_TYPE
from element_mapping import (
    TYPE_TO_ELEMENT,
    NEUTRAL,
    ELEMENT_KEYWORDS,
    SIGNATURE_WEIGHT,
    MIN_ATTACK_SCORE,
    ELEMENT_OVERRIDES,
)

STAT_AFFINITIES = ("Attack", "HP", "Speed", "SpecialAttack")
EGG_TYPES = (
    "Dragon", "Beast", "Dinosaur", "Bird", "Aquatic", "Insect",
    "Plant", "Machine", "Mineral", "Evil", "Holy",
)

ROOT = Path(__file__).resolve().parent
GEXF_PATH = ROOT / "data" / "evolution_graph.gexf"
IMAGES_DIR = ROOT / "art" / "digimon" / "images"
OUTPUT_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"
ATTACKS_PATH = ROOT / "data" / "species_attacks.json"

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

    # Importer.py's category scrape happens to be all .png, but
    # InfoboxImageImporter.py's per-page fallback downloads whatever format
    # the wiki actually serves (commonly .jpg) - glob every format either
    # importer can produce, not just .png.
    files = sorted(f for ext in ("*.png", "*.jpg", "*.jpeg", "*.gif") for f in folder.glob(ext))
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
    # spriteUrl is relative to art/ (the scraped source; see optimize_sprites.py).
    return path.relative_to(ROOT / "art").as_posix()


def _resolve_curated(mapping, fallback_values, raw_type, slug, salt):
    """Shared curated-lookup-then-deterministic-hash-fallback pattern, used
    for both stat affinity and egg type resolution. hashlib, not the
    built-in hash(), which is randomized per-process and would silently
    reshuffle fallback assignments on every rerun. salt keeps the two
    fallbacks independent - without it, a species falling back for both
    stat affinity and egg type would always land on the matching index in
    both value lists."""
    mapped = mapping.get(raw_type)
    if mapped:
        return mapped, "mapped"
    digest = hashlib.md5(f"{salt}:{slug}".encode("utf-8")).hexdigest()
    index = int(digest, 16) % len(fallback_values)
    return fallback_values[index], "fallback"


def resolve_stat_affinity(raw_type, slug):
    return _resolve_curated(TYPE_TO_STAT_AFFINITY, STAT_AFFINITIES, raw_type, slug, "stat-affinity")


def resolve_egg_type(raw_type, slug):
    return _resolve_curated(TYPE_TO_EGG_TYPE, EGG_TYPES, raw_type, slug, "egg-type")


ELEMENT_PATTERNS = {
    element: [re.compile(r"\b" + pattern + r"\b", re.IGNORECASE) for pattern in patterns]
    for element, patterns in ELEMENT_KEYWORDS.items()
}


def load_attacks():
    """{page title: [{name, text}, ...]} from AttackImporter.py - optional:
    without it every element falls back to the raw-type table."""
    if not ATTACKS_PATH.exists():
        print(f"  (no {ATTACKS_PATH.name} - elements come from raw type only; run AttackImporter.py)")
        return {}
    return json.loads(ATTACKS_PATH.read_text(encoding="utf-8"))


def score_attacks(attacks):
    """Keyword score per element over a species' attacks - the signature
    (first) attack counts SIGNATURE_WEIGHT times."""
    scores = collections.Counter()
    for index, attack in enumerate(attacks):
        weight = SIGNATURE_WEIGHT if index == 0 else 1
        text = f"{attack.get('name', '')} {attack.get('text', '')}"
        for element, patterns in ELEMENT_PATTERNS.items():
            hits = sum(len(pattern.findall(text)) for pattern in patterns)
            if hits:
                scores[element] += weight * hits
    return scores


def resolve_element(slug, raw_type, attacks):
    """Override, else the attack keywords' top scorer (if it reaches
    MIN_ATTACK_SCORE), else the raw-type
    table, else NEUTRAL - deliberately no hash fallback like the two
    resolvers above: a random element would invent matchups, while Neutral
    simply has no advantage either way (see element_mapping.py). A tie
    between top attack scorers goes to the raw-type element if it's among
    them, else to whichever the signature attack favors."""
    if slug in ELEMENT_OVERRIDES:
        return ELEMENT_OVERRIDES[slug], "override"
    type_element = TYPE_TO_ELEMENT.get(raw_type)
    scores = score_attacks(attacks)
    if scores and max(scores.values()) >= MIN_ATTACK_SCORE:
        best = max(scores.values())
        tied = [element for element, score in scores.items() if score == best]
        if len(tied) == 1:
            return tied[0], "attack"
        if type_element in tied:
            return type_element, "attack"
        signature = score_attacks(attacks[:1])
        return max(tied, key=lambda element: signature.get(element, 0)), "attack"
    if type_element:
        return type_element, "type"
    return NEUTRAL, "fallback"


def build_species(nodes, edges, attacks_by_title):
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
        stat_affinity, stat_affinity_source = resolve_stat_affinity(node["type"], slug)
        egg_type, egg_type_source = resolve_egg_type(node["type"], slug)
        element, element_source = resolve_element(slug, node["type"], attacks_by_title.get(node["label"], []))
        species[slug] = {
            "id": slug,
            "name": node["label"],
            "stage": node["stage"],
            "stageOrder": node["stageOrder"],
            "type": node["type"],
            "attribute": node["attribute"],
            "statAffinity": stat_affinity,
            "statAffinitySource": stat_affinity_source,
            "eggType": egg_type,
            "eggTypeSource": egg_type_source,
            "element": element,
            "elementSource": element_source,
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
        if source_slug == target_slug:
            continue  # self-loop (e.g. Fukamon -> Fukamon) - a scraping
            # artifact, not a real relationship; drop at the source so it
            # can't reappear as a sameStageEvolutions self-loop later.
        if edge_type == "lateral":
            species[source_slug]["lateralTo"].append(target_slug)
        else:
            species[source_slug]["evolvesTo"].append(target_slug)
            species[target_slug]["evolvesFrom"].append(source_slug)

    return species


def classify_evolution_skips(species):
    """For every evolvesTo edge that isn't a normal one-tier-at-a-time step
    (stageOrder gap of exactly 0 or 1 - stageOrder groups parallel tiers
    together, e.g. Armor/Champion both = 3), classify what kind of
    irregular edge it is:

    - "shortcut": the target is ALSO reachable from the same species via a
      fully legitimate, one-tier-at-a-time chain through its own non-skip
      children (transitively - never through another skip edge). A
      legitimate route already exists; this edge is redundant.
    - "path": no such legitimate chain exists. This skip edge is the only
      way this species' line reaches that target - removing it would
      disconnect the target entirely, not just remove a redundant shortcut.
    - "backward": the target's stageOrder is LOWER than the source's (e.g.
      DeckerGreymon, Ultimate, evolvesTo Bombmon, Fresh) - not a forward
      digivolution at all, always invalid regardless of reachability (a
      legitimate forward-only walk can never land on a lower stage, so
      there's no meaningful shortcut/path distinction to make here).

    Computed over the full graph (every kept species, every stage) -
    independent of IN_GAME_STAGES, since this is about the wiki data's own
    structure, not current gameplay scope. Mutates species in place,
    adding evolutionSkips only to species that actually have skip edges.
    Returns a Counter of totals per classification for the summary printout.
    """
    # 0 <= gap <= 1, NOT just gap <= 1 - a backward edge (gap < 0) is not a
    # legitimate step, and must never be treated as one here: this feeds
    # the reachability walk below, so letting a backward edge through would
    # silently corrupt shortcut/path classification for OTHER species too
    # (a "legitimate" route that secretly detours backward through a stage
    # it shouldn't be able to reach at all).
    normal_children = {}
    for sid, s in species.items():
        normal_children[sid] = [
            t for t in s["evolvesTo"]
            if t in species and 0 <= species[t]["stageOrder"] - s["stageOrder"] <= 1
        ]

    def reachable_via_normal_edges(start_id):
        seen = set()
        stack = list(normal_children.get(start_id, []))
        while stack:
            node_id = stack.pop()
            if node_id in seen:
                continue
            seen.add(node_id)
            stack.extend(normal_children.get(node_id, []))
        return seen

    counts = collections.Counter()
    for sid, s in species.items():
        classification = {}
        legit_reachable = None  # computed lazily, at most once per species
        for t in s["evolvesTo"]:
            target = species.get(t)
            if not target:
                continue
            gap = target["stageOrder"] - s["stageOrder"]
            if gap < 0:
                classification[t] = "backward"
            elif gap >= 2:
                if legit_reachable is None:
                    legit_reachable = reachable_via_normal_edges(sid)
                classification[t] = "shortcut" if t in legit_reachable else "path"

        for label in classification.values():
            counts[label] += 1
        if classification:
            s["evolutionSkips"] = classification

    return counts


def classify_same_stage_evolutions(species):
    """For every evolvesTo edge where the source and target share the
    exact same stage (e.g. Rookie -> Rookie), classify it:

    - "self-loop": target IS the source - a literal scraping artifact
      (e.g. Fukamon -> Fukamon).
    - "mode-change": one name starts with the other (e.g. Alphamon ->
      Alphamon Ouryuken) - an alternate mode/weapon-form of the same
      base Digimon, not a real evolution.
    - "mutual": the reverse edge ALSO exists (target evolvesTo lists the
      source back) - not a fusion at all, a tangled web of forms that
      all evolve into each other (usually one specific game's own
      shift-between-forms mechanic, scraped flat alongside everything
      else). Checked before "fusion" so a genuine multi-source target
      isn't misread as one just because ONE of its several sources also
      happens to loop back - see Omnimon below.
    - "fusion": 2+ OTHER same-stage edges into the same target are ALSO
      still unclaimed after the self-loop/mode-change/mutual passes -
      likely a real DNA/Jogress digivolution result. Two-pass on
      purpose: counting raw len(evolvesFrom) (any stage, including
      edges that turned out to be a mode-change or mutual pairing)
      over-counts - e.g. Alphamon Ouryuken has exactly 2 evolvesFrom
      (Alphamon, Ouryumon), but Alphamon -> Alphamon Ouryuken is really
      a mode-change, leaving only 1 genuine candidate (Ouryumon), not a
      real fusion. Still frequently over-inclusive even after this fix:
      a real fusion target often has its canonical parents (e.g.
      Omnimon's WarGreymon + MetalGarurumon) mixed in the same
      evolvesFrom list with other games' own, unrelated fusion rosters
      for the same target name - distinguishing those needs per-
      citation wikitext analysis this pass doesn't attempt (same open
      "pick one canonical continuity" problem noted elsewhere in this
      file/GAMEPLAY_DESIGN.md).
    - "other": none of the above (including a same-stage edge that's
      the only unclaimed source into its target - not enough signal to
      call it a fusion) - a genuine anomaly worth a manual look.

    Mutates species in place, adding sameStageEvolutions only to species
    that have at least one same-stage edge. Returns a Counter of totals
    per classification for the summary printout.
    """
    # Pass 1: self-loop/mode-change/mutual are cheap, local, per-edge
    # checks - resolve those first and collect everything left over as
    # "candidates" for the fusion count in pass 2.
    resolved = collections.defaultdict(dict)
    candidates = []
    for sid, s in species.items():
        for t in s["evolvesTo"]:
            target = species.get(t)
            if not target or target["stage"] != s["stage"]:
                continue

            source_name = s["name"].lower()
            target_name = target["name"].lower()
            if t == sid:
                resolved[sid][t] = "self-loop"
            elif target_name.startswith(source_name) or source_name.startswith(target_name):
                resolved[sid][t] = "mode-change"
            elif sid in target["evolvesTo"]:
                resolved[sid][t] = "mutual"
            else:
                candidates.append((sid, t))

    # Pass 2: a candidate is only "fusion" if at least one OTHER
    # candidate also points at the same target - i.e. 2+ genuinely
    # unclaimed same-stage sources, not just 2+ evolvesFrom entries
    # total regardless of what those other entries turned out to be.
    candidates_by_target = collections.defaultdict(set)
    for sid, t in candidates:
        candidates_by_target[t].add(sid)

    counts = collections.Counter()
    for sid, t in candidates:
        label = "fusion" if len(candidates_by_target[t]) >= 2 else "other"
        resolved[sid][t] = label

    for sid, classification in resolved.items():
        for label in classification.values():
            counts[label] += 1
        species[sid]["sameStageEvolutions"] = classification

    return counts


def main():
    print(f"Parsing {GEXF_PATH}...")
    nodes, edges = parse_gexf(GEXF_PATH)
    print(f"  {len(nodes)} nodes, {len(edges)} edges")

    kept_nodes, dropped = filter_nodes(nodes)
    print(f"Filtered: kept {len(kept_nodes)}, dropped {dropped} junk nodes")

    species = build_species(kept_nodes, edges, load_attacks())

    with_sprite = sum(1 for s in species.values() if s["spriteUrl"])
    print(f"Resolved sprites for {with_sprite}/{len(species)} species")

    affinity_mapped_count = sum(1 for s in species.values() if s["statAffinitySource"] == "mapped")
    print(f"statAffinity: {affinity_mapped_count}/{len(species)} from curated table, {len(species) - affinity_mapped_count} via fallback hash")

    egg_mapped_count = sum(1 for s in species.values() if s["eggTypeSource"] == "mapped")
    print(f"eggType: {egg_mapped_count}/{len(species)} from curated table, {len(species) - egg_mapped_count} via fallback hash")

    element_sources = collections.Counter(s["elementSource"] for s in species.values())
    print("element: " + ", ".join(f"{source}: {count}" for source, count in element_sources.most_common()))

    skip_counts = classify_evolution_skips(species)
    total_skips = sum(skip_counts.values())
    skip_breakdown = ", ".join(f"{label}: {count}" for label, count in skip_counts.most_common())
    print(f"evolutionSkips: {total_skips} non-adjacent-stage edges found - {skip_breakdown}")

    same_stage_counts = classify_same_stage_evolutions(species)
    total_same_stage = sum(same_stage_counts.values())
    breakdown = ", ".join(f"{label}: {count}" for label, count in same_stage_counts.most_common())
    print(f"sameStageEvolutions: {total_same_stage} same-stage edges found - {breakdown}")

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
