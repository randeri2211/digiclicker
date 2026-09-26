"""
Validates src/lib/data/mysteryEggWeights.json - the hand-tunable weight
table backing the Shop's Mystery Digi-Eggs (see game/eggs/mysteryEggs.ts).
Seeded from real per-species eggType data but hand-editable afterward
(retuning weights, adding/removing entries), so it needs the same kind of
catch validate_areas.py provides for area data. Stdlib only.
"""
import json
import sys
from ci_report import report
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEIGHTS_PATH = ROOT / "src" / "lib" / "data" / "mysteryEggWeights.json"
EVOLUTION_DATA_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"

# Mirrors the EggType union in src/lib/game/types.ts - duplicated here
# since this script can't import the TS source. Keep in sync by hand if
# that union ever changes.
EGG_TYPES = {
    "Dragon", "Beast", "Dinosaur", "Bird", "Aquatic", "Insect",
    "Plant", "Machine", "Mineral", "Evil", "Holy",
}


def load_species():
    with open(EVOLUTION_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)["species"]


def main():
    if not WEIGHTS_PATH.is_file():
        print(f"No mysteryEggWeights.json at {WEIGHTS_PATH}.")
        return 0

    try:
        with open(WEIGHTS_PATH, encoding="utf-8") as f:
            weights = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAILED - invalid JSON ({e})")
        return 1

    species = load_species()
    errors = []

    missing_types = EGG_TYPES - set(weights.keys())
    for t in sorted(missing_types):
        errors.append(f"missing EggType key '{t}' - every type should have a pool")

    extra_types = set(weights.keys()) - EGG_TYPES
    for t in sorted(extra_types):
        errors.append(f"unknown key '{t}' - not one of the EggType union")

    for egg_type, pool in weights.items():
        if egg_type not in EGG_TYPES:
            continue

        if not isinstance(pool, list) or not pool:
            errors.append(f"{egg_type}: pool must be a non-empty list")
            continue

        seen_ids = set()
        for entry in pool:
            entry_id = entry.get("id")
            weight = entry.get("weight")

            if entry_id is None:
                errors.append(f"{egg_type}: entry missing 'id'")
                continue
            if entry_id in seen_ids:
                errors.append(f"{egg_type}: duplicate entry '{entry_id}' - merge into one, don't duplicate")
            seen_ids.add(entry_id)

            species_entry = species.get(entry_id)
            if species_entry is None:
                errors.append(f"{egg_type}: references unknown species '{entry_id}'")
            elif species_entry["stage"] != "Fresh":
                errors.append(f"{egg_type}: '{entry_id}' is stage {species_entry['stage']!r}, not Fresh")

            if not isinstance(weight, int) or isinstance(weight, bool) or weight <= 0:
                errors.append(f"{egg_type}: entry '{entry_id}' has invalid weight {weight!r} (must be a positive integer)")

    report("Mystery eggs", errors, f"{len(weights)} egg type(s) validated.", lambda e: "src/lib/data/mysteryEggWeights.json")
    if errors:
        print(f"FAILED - {len(errors)} problem(s) found:\n")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"OK - {len(weights)} egg type(s) validated, no problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
