"""
Validates the element data behind boss-fight matchups: every species in
src/lib/data/digimon-evolution.json has a known element (see
element_mapping.py), and src/lib/data/elementChart.json only references
known elements, covers every element, and never has an element beat
itself. Prints per-element counts for the in-game stages so a nearly
empty element (or a Neutral bucket that's grown too large) is easy to
spot after retuning the mapping.

Exit code 1 on any error, so CI fails the push.
"""

import collections
import json
import sys
from pathlib import Path

from element_mapping import ELEMENTS, NEUTRAL

ROOT = Path(__file__).resolve().parent
SPECIES_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"
CHART_PATH = ROOT / "src" / "lib" / "data" / "elementChart.json"

# Mirrors IN_GAME_STAGES in src/lib/game/constants.ts.
IN_GAME_STAGES = {"Fresh", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"}

# Warn (not fail) below this many in-game species for a real element.
SPARSE_ELEMENT_WARNING = 20


def main():
    errors = []
    species = json.loads(SPECIES_PATH.read_text(encoding="utf-8"))["species"]
    chart = json.loads(CHART_PATH.read_text(encoding="utf-8"))

    for slug, entry in species.items():
        if entry.get("element") not in ELEMENTS:
            errors.append(f"species {slug}: unknown element {entry.get('element')!r}")

    for element in ELEMENTS:
        if element not in chart:
            errors.append(f"elementChart.json: missing entry for {element}")
    for attacker, beaten in chart.items():
        if attacker not in ELEMENTS:
            errors.append(f"elementChart.json: unknown attacker element {attacker!r}")
        for defender in beaten:
            if defender not in ELEMENTS:
                errors.append(f"elementChart.json: {attacker} beats unknown element {defender!r}")
            if defender == attacker:
                errors.append(f"elementChart.json: {attacker} beats itself")

    in_game = [s for s in species.values() if s["stage"] in IN_GAME_STAGES]
    counts = collections.Counter(s.get("element") for s in in_game)
    print(f"In-game species by element ({len(in_game)} total):")
    for element in ELEMENTS:
        beats = ", ".join(chart.get(element, [])) or "-"
        losers_to = ", ".join(a for a, b in chart.items() if element in b) or "-"
        print(f"  {element:<9} {counts.get(element, 0):>4}   beats: {beats:<16} loses to: {losers_to}")
        if element != NEUTRAL and counts.get(element, 0) < SPARSE_ELEMENT_WARNING:
            print(f"    warning: only {counts.get(element, 0)} in-game species")

    if errors:
        print(f"\n{len(errors)} error(s):")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    print("\nElements OK.")


if __name__ == "__main__":
    main()
