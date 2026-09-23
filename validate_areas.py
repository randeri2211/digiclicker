"""
Validates every area file under src/lib/data/areas/*.json - the
hand-authored area/path exploration graph (see AreaData/AreaPath in
src/lib/game/types.ts). Unlike the scraped-data pipeline scripts, this data
is authored directly in its final, game-consumed shape, so mistakes here
(a typo'd unlock target, an orphaned path nothing points at, a species id
that doesn't exist) are pure human error with nothing else to catch them -
this script is that catch, run locally and in CI (see
.github/workflows/validate-areas.yml).

It also checks src/lib/data/regions.json, the travel maps: every built area
sits on exactly one region's map, a path's optional manual map position is
inside the map, and routes join areas of the same region.

Stdlib only, no pip install needed.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AREAS_DIR = ROOT / "src" / "lib" / "data" / "areas"
EVOLUTION_DATA_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"
REGIONS_PATH = ROOT / "src" / "lib" / "data" / "regions.json"

# Mirrors MapTerrain in src/lib/game/types.ts.
TERRAINS = {
    "forest", "savanna", "mountain", "snow", "town", "lake",
    "ruins", "desert", "dark", "volcano", "sky", "digital",
}

# Mirrors IN_GAME_STAGES in src/lib/game/constants.ts - duplicated here
# since this script can't import the TS source. Keep in sync by hand if
# that set ever changes.
IN_GAME_STAGES = {"Fresh", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"}


def load_species():
    with open(EVOLUTION_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)["species"]


def is_level_range(value):
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(isinstance(v, int) and not isinstance(v, bool) for v in value)
        and value[0] <= value[1]
        and value[0] > 0
    )


def is_positive_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def validate_boss(prefix, boss, paths, species):
    """A path's optional boss: an in-game species, positive level / squad
    size / HP multiplier, non-negative rewards, and unlock targets that
    resolve (plain ids in this area; "areaId:pathId" is checked for shape
    only, since other area files are validated on their own)."""
    if boss is None:
        return []
    if not isinstance(boss, dict):
        return [f"{prefix}: boss must be an object"]
    errors = []
    boss_id = boss.get("speciesId")
    if boss_id not in species:
        errors.append(f"{prefix}: boss references unknown species {boss_id!r}")
    elif species[boss_id]["stage"] not in IN_GAME_STAGES:
        errors.append(f"{prefix}: boss '{boss_id}' is stage {species[boss_id]['stage']!r}, not an in-game stage")
    for field in ("level", "squadSize"):
        value = boss.get(field)
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            errors.append(f"{prefix}: boss.{field} must be a positive integer, got {value!r}")
    if not is_positive_number(boss.get("hpMultiplier")):
        errors.append(f"{prefix}: boss.hpMultiplier must be a positive number, got {boss.get('hpMultiplier')!r}")
    rewards = boss.get("rewards")
    if not isinstance(rewards, dict):
        errors.append(f"{prefix}: boss.rewards must be an object with bits and data")
    else:
        for field in ("bits", "data"):
            value = rewards.get(field)
            if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
                errors.append(f"{prefix}: boss.rewards.{field} must be a number >= 0, got {value!r}")
    unlocks = boss.get("unlocks")
    if not isinstance(unlocks, list):
        errors.append(f"{prefix}: boss.unlocks must be a list")
    else:
        for target in unlocks:
            if ":" in target:
                if len(target.split(":")) != 2 or not all(target.split(":")):
                    errors.append(f"{prefix}: boss.unlocks '{target}' must be 'areaId:pathId'")
            elif target not in paths:
                errors.append(f"{prefix}: boss.unlocks references unknown path '{target}' in this area")
    return errors


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_regions(regions_data, built_area_ids):
    errors = []
    size = regions_data.get("mapSize")
    if not (isinstance(size, list) and len(size) == 2 and all(is_positive_number(v) for v in size)):
        return ["regions.json: mapSize must be [width, height]"]
    width, height = size

    region_ids = set()
    placements = {}
    for region in regions_data.get("regions", []):
        rid = region.get("id")
        if rid in region_ids:
            errors.append(f"regions.json: duplicate region id {rid!r}")
        region_ids.add(rid)
        for field in ("name", "label", "areas", "routes"):
            if field not in region:
                errors.append(f"region {rid}: missing field '{field}'")
        area_ids = set()
        for area in region.get("areas", []):
            aid = area.get("id")
            area_ids.add(aid)
            placements.setdefault(aid, []).append(rid)
            if area.get("terrain") not in TERRAINS:
                errors.append(f"region {rid}: area {aid!r} has unknown terrain {area.get('terrain')!r}")
            if not (is_number(area.get("x")) and 0 <= area["x"] <= width and is_number(area.get("y")) and 0 <= area["y"] <= height):
                errors.append(f"region {rid}: area {aid!r} is not inside the {width}x{height} map")
            if not is_positive_number(area.get("r")):
                errors.append(f"region {rid}: area {aid!r} needs a positive radius 'r'")
        for route in region.get("routes", []):
            if not (isinstance(route, list) and len(route) == 2 and all(end in area_ids for end in route)):
                errors.append(f"region {rid}: route {route!r} must join two areas of this region")

    for aid, rids in placements.items():
        if len(rids) > 1:
            errors.append(f"area {aid!r} is on more than one region map: {rids}")
    for aid in sorted(built_area_ids - set(placements)):
        errors.append(f"area {aid!r} has a data file but isn't on any region map in regions.json")
    return errors


def validate_area_file(path, species, map_size):
    errors = []
    area_id = path.stem

    try:
        with open(path, encoding="utf-8") as f:
            area = json.load(f)
    except json.JSONDecodeError as e:
        return [f"{area_id}: invalid JSON ({e})"]

    for field in ("id", "name", "label", "startingPath", "paths"):
        if field not in area:
            errors.append(f"{area_id}: missing top-level field '{field}'")
    if errors:
        return errors

    if area["id"] != area_id:
        errors.append(f"{area_id}: 'id' field ({area['id']!r}) doesn't match filename")

    paths = area["paths"]
    if not isinstance(paths, dict) or not paths:
        return errors + [f"{area_id}: 'paths' must be a non-empty object"]

    starting_path = area["startingPath"]
    if starting_path not in paths:
        errors.append(f"{area_id}: startingPath '{starting_path}' is not a path in this file")

    for path_id, p in paths.items():
        prefix = f"{area_id}:{path_id}"

        for field in ("name", "levelRange", "digimonPool", "mastery", "unlocks"):
            if field not in p:
                errors.append(f"{prefix}: missing field '{field}'")
        # "map" is an optional manual override of the auto layout.
        pos = p.get("map")
        if pos is not None and map_size:
            if not isinstance(pos, dict) or not (is_number(pos.get("x")) and 0 <= pos["x"] <= map_size[0] and is_number(pos.get("y")) and 0 <= pos["y"] <= map_size[1]):
                errors.append(f"{prefix}: map position {pos!r} is not inside the {map_size[0]}x{map_size[1]} region map")
        if any(f not in p for f in ("levelRange", "digimonPool", "mastery", "unlocks")):
            continue

        level_range = p["levelRange"]
        if not is_level_range(level_range):
            errors.append(f"{prefix}: levelRange {level_range!r} must be [min, max] positive integers, min <= max")

        pool = p["digimonPool"]
        if not isinstance(pool, list) or not pool:
            errors.append(f"{prefix}: digimonPool must be a non-empty list")
            pool = []

        seen_ids = set()
        for entry in pool:
            entry_id = entry.get("id")
            weight = entry.get("weight")

            if entry_id is None:
                errors.append(f"{prefix}: digimonPool entry missing 'id'")
                continue
            if entry_id in seen_ids:
                errors.append(f"{prefix}: duplicate digimonPool entry '{entry_id}' - merge into one, don't duplicate")
            seen_ids.add(entry_id)

            if entry_id not in species:
                errors.append(f"{prefix}: digimonPool references unknown species '{entry_id}'")
            elif species[entry_id]["stage"] not in IN_GAME_STAGES:
                errors.append(
                    f"{prefix}: '{entry_id}' is stage {species[entry_id]['stage']!r}, "
                    f"not one of the in-game stages {sorted(IN_GAME_STAGES)}"
                )

            if not isinstance(weight, int) or isinstance(weight, bool) or weight <= 0:
                errors.append(f"{prefix}: digimonPool entry '{entry_id}' has invalid weight {weight!r} (must be a positive integer)")

            entry_range = entry.get("levelRange")
            if entry_range is not None and is_level_range(level_range):
                if not is_level_range(entry_range):
                    errors.append(f"{prefix}: '{entry_id}' levelRange {entry_range!r} must be [min, max] positive integers, min <= max")
                elif entry_range[0] < level_range[0] or entry_range[1] > level_range[1]:
                    errors.append(
                        f"{prefix}: '{entry_id}' levelRange {entry_range!r} falls outside the path's own range {level_range!r}"
                    )

        mastery = p["mastery"]
        kills = mastery.get("kills") if isinstance(mastery, dict) else None
        if not isinstance(kills, int) or isinstance(kills, bool) or kills <= 0:
            errors.append(f"{prefix}: mastery.kills must be a positive integer, got {kills!r}")

        unlocks = p["unlocks"]
        if not isinstance(unlocks, list):
            errors.append(f"{prefix}: unlocks must be a list")
        else:
            for target in unlocks:
                # "areaId:pathId" cross-area form is anticipated by the
                # schema but nothing produces it yet - only same-file plain
                # path ids are checked for now.
                if ":" not in target and target not in paths:
                    errors.append(f"{prefix}: unlocks references unknown path '{target}' in this area")

        errors.extend(validate_boss(prefix, p.get("boss"), paths, species))

    # Reachability - BFS from startingPath must reach every path in the file.
    if starting_path in paths:
        seen = set()
        stack = [starting_path]
        while stack:
            node = stack.pop()
            if node in seen:
                continue
            seen.add(node)
            # Mastery unlocks, and a boss's (a miniboss can gate the next path).
            boss = paths[node].get("boss")
            targets = paths[node].get("unlocks", []) + (boss.get("unlocks", []) if isinstance(boss, dict) else [])
            for target in targets:
                if ":" not in target and target in paths:
                    stack.append(target)

        orphans = set(paths) - seen
        for orphan in sorted(orphans):
            errors.append(f"{area_id}:{orphan}: unreachable from startingPath '{starting_path}' - no path's unlocks leads here")

    return errors


def validate_cross_area_unlocks(area_files):
    """Every "areaId:pathId" unlock (path or boss) must name a path in a
    built area - otherwise the unlock silently does nothing."""
    areas = {}
    for path in area_files:
        try:
            areas[path.stem] = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    errors = []
    for area_id, area in areas.items():
        for path_id, p in area.get("paths", {}).items():
            boss = p.get("boss") if isinstance(p.get("boss"), dict) else {}
            for target in (p.get("unlocks") or []) + (boss.get("unlocks") or []):
                if ":" not in target:
                    continue
                target_area, target_path = target.split(":", 1)
                if target_path not in areas.get(target_area, {}).get("paths", {}):
                    errors.append(f"{area_id}:{path_id}: unlocks '{target}', which isn't a path in a built area")
    return errors


def main():
    if not AREAS_DIR.is_dir():
        print(f"No areas directory at {AREAS_DIR} - nothing to validate.")
        return 0

    area_files = sorted(AREAS_DIR.glob("*.json"))
    if not area_files:
        print(f"No area files found in {AREAS_DIR}.")
        return 0

    species = load_species()
    with open(REGIONS_PATH, encoding="utf-8") as f:
        regions_data = json.load(f)
    map_size = regions_data.get("mapSize")

    all_errors = validate_regions(regions_data, {path.stem for path in area_files})
    for path in area_files:
        all_errors.extend(validate_area_file(path, species, map_size))
    all_errors.extend(validate_cross_area_unlocks(area_files))

    if all_errors:
        print(f"FAILED - {len(all_errors)} problem(s) found across {len(area_files)} area file(s):\n")
        for error in all_errors:
            print(f"  - {error}")
        return 1

    print(f"OK - {len(area_files)} area file(s) validated, no problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
