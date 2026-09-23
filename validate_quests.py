"""
Validates src/lib/data/quests.json - the quest/story data - against the
rest of the game data, so an authoring typo fails CI instead of producing
a quest that can never be completed:

- quest ids are unique, every quest has a title, text, requirements and
  rewards;
- prerequisite quests exist and never form a cycle (a quest that can never
  unlock);
- every requirement / reward references something real: species, stage,
  element, area + path (+ its boss for defeat-boss), item ids (read from
  src/lib/game/items/itemCatalog.ts), and positive counts.

Exit code 1 on any error.
"""
import json
import re
import sys
from pathlib import Path

from element_mapping import ELEMENTS

ROOT = Path(__file__).resolve().parent
QUESTS_PATH = ROOT / "src" / "lib" / "data" / "quests.json"
SPECIES_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"
AREAS_DIR = ROOT / "src" / "lib" / "data" / "areas"
ITEM_CATALOG_PATH = ROOT / "src" / "lib" / "game" / "items" / "itemCatalog.ts"

# Mirrors IN_GAME_STAGES in src/lib/game/constants.ts.
IN_GAME_STAGES = {"Fresh", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"}
REQUIREMENT_KINDS = {
    "own-species", "own-stage", "own-element", "reach-level",
    "path-kills", "defeat-boss", "deliver-item", "has-flag",
}


def load_item_ids():
    text = ITEM_CATALOG_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"^\s*'([a-z0-9-]+)':\s*\{", text, re.MULTILINE))


def load_areas():
    return {path.stem: json.loads(path.read_text(encoding="utf-8")) for path in AREAS_DIR.glob("*.json")}


def is_positive_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def check_requirement(prefix, req, species, areas, items):
    errors = []
    kind = req.get("kind")
    if kind not in REQUIREMENT_KINDS:
        return [f"{prefix}: unknown requirement kind {kind!r}"]

    def need_species(field, optional=False):
        value = req.get(field)
        if value is None and optional:
            return
        if value not in species:
            errors.append(f"{prefix}: unknown species {value!r}")

    def need_path(require_boss=False):
        area = areas.get(req.get("areaId"))
        path = area["paths"].get(req.get("pathId")) if area else None
        if not path:
            errors.append(f"{prefix}: unknown area/path {req.get('areaId')!r}/{req.get('pathId')!r}")
        elif require_boss and "boss" not in path:
            errors.append(f"{prefix}: path {req.get('pathId')!r} has no boss")

    if kind == "own-species":
        need_species("speciesId")
    elif kind == "own-stage":
        if req.get("stage") not in IN_GAME_STAGES:
            errors.append(f"{prefix}: stage {req.get('stage')!r} is not an in-game stage")
        if not is_positive_int(req.get("count")):
            errors.append(f"{prefix}: count must be a positive integer")
    elif kind == "own-element":
        if req.get("element") not in ELEMENTS:
            errors.append(f"{prefix}: unknown element {req.get('element')!r}")
        if not is_positive_int(req.get("count")):
            errors.append(f"{prefix}: count must be a positive integer")
    elif kind == "reach-level":
        need_species("speciesId", optional=True)
        if not is_positive_int(req.get("level")):
            errors.append(f"{prefix}: level must be a positive integer")
    elif kind == "path-kills":
        need_path()
        if not is_positive_int(req.get("kills")):
            errors.append(f"{prefix}: kills must be a positive integer")
    elif kind == "defeat-boss":
        need_path(require_boss=True)
    elif kind == "deliver-item":
        if req.get("itemId") not in items:
            errors.append(f"{prefix}: unknown item {req.get('itemId')!r}")
        if not is_positive_int(req.get("count")):
            errors.append(f"{prefix}: count must be a positive integer")
    elif kind == "has-flag":
        if not isinstance(req.get("flag"), str) or not req.get("flag"):
            errors.append(f"{prefix}: flag must be a non-empty string")
    return errors


def main():
    quests = json.loads(QUESTS_PATH.read_text(encoding="utf-8"))
    species = json.loads(SPECIES_PATH.read_text(encoding="utf-8"))["species"]
    areas = load_areas()
    items = load_item_ids()
    errors = []

    ids = [q.get("id") for q in quests]
    for quest_id in {i for i in ids if ids.count(i) > 1}:
        errors.append(f"duplicate quest id {quest_id!r}")
    by_id = {q.get("id"): q for q in quests}

    for quest in quests:
        prefix = f"quest {quest.get('id')!r}"
        for field in ("id", "title", "text", "requirements", "rewards"):
            if field not in quest:
                errors.append(f"{prefix}: missing field '{field}'")
        giver = quest.get("giver") or {}
        if giver.get("speciesId") and giver["speciesId"] not in species:
            errors.append(f"{prefix}: giver species {giver['speciesId']!r} unknown")
        if quest.get("areaId") and quest["areaId"] not in areas:
            errors.append(f"{prefix}: unknown area {quest['areaId']!r}")
        for pre in (quest.get("prerequisites") or {}).get("quests", []):
            if pre not in by_id:
                errors.append(f"{prefix}: prerequisite quest {pre!r} doesn't exist")
        for i, req in enumerate(quest.get("requirements", [])):
            errors.extend(check_requirement(f"{prefix} requirement {i + 1}", req, species, areas, items))
        rewards = quest.get("rewards", {})
        for item in rewards.get("items", []):
            if item.get("id") not in items:
                errors.append(f"{prefix}: reward item {item.get('id')!r} unknown")
            if not is_positive_int(item.get("count")):
                errors.append(f"{prefix}: reward item count must be a positive integer")

    # Prerequisite cycles - depth-first search with a "visiting" mark.
    state = {}

    def visit(quest_id, trail):
        if state.get(quest_id) == "done":
            return
        if state.get(quest_id) == "visiting":
            errors.append(f"prerequisite cycle: {' -> '.join(trail + [quest_id])}")
            return
        state[quest_id] = "visiting"
        for pre in (by_id.get(quest_id, {}).get("prerequisites") or {}).get("quests", []):
            if pre in by_id:
                visit(pre, trail + [quest_id])
        state[quest_id] = "done"

    for quest_id in by_id:
        visit(quest_id, [])

    if errors:
        print(f"{len(errors)} problem(s) in quests.json:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    print(f"OK - {len(quests)} quest(s) validated, no problems found.")


if __name__ == "__main__":
    main()
