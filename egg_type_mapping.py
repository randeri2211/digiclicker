"""
Curated mapping from the wiki's raw |type= infobox value (the same
145-value taxonomy curated for stat affinities in evolution_type_mapping.py)
to one of eleven Digi-Egg flavor types (Dragon, Beast, Bird, ...). A
completely different grouping of the same raw values - this one groups by
thematic flavor, not by combat archetype.

Deliberately NOT curated (falls through to a deterministic hash fallback in
EvolutionGraphConverter.py, same treatment as the stat-affinity mapping):
- The wiki's own "no signal" markers: Unknown, Unidentified, Lesser, None,
  Unique, Food.
- "Slime" - the wiki's generic tag for 36 of the 49 Fresh-stage species
  ("hasn't differentiated yet"), not a real flavor signal.
- The long tail of raw values with <3 occurrences across the dataset.
"""

DRAGON = "Dragon"
BEAST = "Beast"
DINOSAUR = "Dinosaur"
BIRD = "Bird"
AQUATIC = "Aquatic"
INSECT = "Insect"
PLANT = "Plant"
MACHINE = "Machine"
MINERAL = "Mineral"
EVIL = "Evil"
HOLY = "Holy"

TYPE_TO_EGG_TYPE = {
    # Dragon - includes elemental flavors (Flame/Ice-Snow), which read as
    # more dragon-adjacent than any other bucket here.
    "Dragonkin": DRAGON,
    "Mini Dragon": DRAGON,
    "Holy Dragon": DRAGON,
    "Dragon": DRAGON,
    "Beast Dragon": DRAGON,
    "Evil Dragon": DRAGON,
    "Mythical Dragon": DRAGON,
    "Bird Dragon": DRAGON,
    "Light Dragon": DRAGON,
    "Ancient Dragon": DRAGON,
    "Baby Dragon": DRAGON,
    "Sky Dragon": DRAGON,
    "Ancient Dragonkin": DRAGON,
    "Dark Dragon": DRAGON,
    "Machine Dragon": DRAGON,
    "Rock Dragon": DRAGON,
    "Flame": DRAGON,
    "Ice-Snow": DRAGON,

    # Beast - includes Warrior (physical fighter archetype).
    "Beast": BEAST,
    "Beastkin": BEAST,
    "Holy Beast": BEAST,
    "Dark Animal": BEAST,
    "Mammal": BEAST,
    "Mythical Beast": BEAST,
    "God Beast": BEAST,
    "Ancient Animal": BEAST,
    "Beast Knight": BEAST,
    "Mysterious Beast": BEAST,
    "Mutant": BEAST,
    "Warrior": BEAST,
    "Dark Knight": BEAST,

    # Dinosaur
    "Dinosaur": DINOSAUR,
    "Reptile": DINOSAUR,
    "Ceratopsian": DINOSAUR,
    "Ankylosaur": DINOSAUR,
    "Plesiosaur": DINOSAUR,
    "Amphibian": DINOSAUR,

    # Bird - includes Fairy (small flying creature).
    "Avian": BIRD,
    "Giant Bird": BIRD,
    "Birdkin": BIRD,
    "Pterosaur": BIRD,
    "Bird": BIRD,
    "Holy Bird": BIRD,
    "Ancient Bird": BIRD,
    "Fairy": BIRD,

    # Aquatic
    "Aquatic": AQUATIC,
    "Aquabeast": AQUATIC,
    "Sea Beast": AQUATIC,
    "Sea Animal": AQUATIC,
    "Crustacean": AQUATIC,
    "Mollusk": AQUATIC,

    # Insect
    "Insectoid": INSECT,
    "Larva": INSECT,

    # Plant
    "Vegetation": PLANT,
    "Carnivorous Plant": PLANT,

    # Machine - includes Puppet (mechanical/constructed).
    "Cyborg": MACHINE,
    "Machine": MACHINE,
    "Composite": MACHINE,
    "Enhancement": MACHINE,
    "Weapon": MACHINE,
    "Armor": MACHINE,
    "Puppet": MACHINE,

    # Mineral
    "Mineral": MINERAL,
    "Rock": MINERAL,

    # Evil - fused Demon + Undead, plus Wizard (dark-caster archetype).
    # Fallen Angel lands here (reads as the demonic side of "fallen"),
    # not Holy - arguable either way.
    "Demon Lord": EVIL,
    "Undead": EVIL,
    "Demon": EVIL,
    "Ghost": EVIL,
    "Evil": EVIL,
    "Smoke": EVIL,
    "Fallen Angel": EVIL,
    "Shaman": EVIL,
    "Wizard": EVIL,

    # Holy - renamed from "Angel".
    "Angel": HOLY,
    "Archangel": HOLY,
    "Cherub": HOLY,
    "Throne": HOLY,
    "Holy Warrior": HOLY,
}
