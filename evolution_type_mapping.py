"""
Curated mapping from the wiki's raw |type= infobox value (a real but messy
145-value taxonomy, e.g. "Reptile", "Cyborg", "Shaman") to one of four
combat stat archetypes. Covers every raw value that appears >=3 times across
the full species dataset (85 values) - thematic grouping, not a scientific
classification. Anything not listed here (the long tail of one/two-off
values, plus values that carry no real archetype signal - Unknown,
Unidentified, Lesser, None, Unique, Food) is deliberately left out and
falls back to a deterministic hash in EvolutionGraphConverter.py.
"""

ATTACK = "Attack"
DEFENSE = "Defense"
SPEED = "Speed"
SPECIAL_ATTACK = "SpecialAttack"

TYPE_TO_STAT_AFFINITY = {
    # Attack - physical beast/dragon/dinosaur/warrior archetypes
    "Beast": ATTACK,
    "Beastkin": ATTACK,
    "Holy Beast": ATTACK,
    "Dinosaur": ATTACK,
    "Dragonkin": ATTACK,
    "Dark Animal": ATTACK,
    "Mammal": ATTACK,
    "Aquatic": ATTACK,
    "Reptile": ATTACK,
    "Mythical Beast": ATTACK,
    "Aquabeast": ATTACK,
    "Mini Dragon": ATTACK,
    "Holy Dragon": ATTACK,
    "Dragon": ATTACK,
    "Amphibian": ATTACK,
    "Beast Dragon": ATTACK,
    "Evil Dragon": ATTACK,
    "Mythical Dragon": ATTACK,
    "Bird Dragon": ATTACK,
    "Ceratopsian": ATTACK,
    "Ankylosaur": ATTACK,
    "Light Dragon": ATTACK,
    "Ancient Dragon": ATTACK,
    "Baby Dragon": ATTACK,
    "Plesiosaur": ATTACK,
    "Sky Dragon": ATTACK,
    "Ancient Dragonkin": ATTACK,
    "God Beast": ATTACK,
    "Sea Beast": ATTACK,
    "Sea Animal": ATTACK,
    "Ancient Animal": ATTACK,
    "Warrior": ATTACK,
    "Holy Warrior": ATTACK,
    "Beast Knight": ATTACK,
    "Dark Knight": ATTACK,
    "Crustacean": ATTACK,
    "Dark Dragon": ATTACK,

    # Defense - mechanical/composite/mineral/plant/shelled/amorphous archetypes
    "Cyborg": DEFENSE,
    "Machine": DEFENSE,
    "Puppet": DEFENSE,
    "Composite": DEFENSE,
    "Enhancement": DEFENSE,
    "Mineral": DEFENSE,
    "Weapon": DEFENSE,
    "Armor": DEFENSE,
    "Vegetation": DEFENSE,
    "Rock": DEFENSE,
    "Mollusk": DEFENSE,
    "Carnivorous Plant": DEFENSE,
    "Machine Dragon": DEFENSE,
    "Rock Dragon": DEFENSE,
    "Slime": DEFENSE,

    # Speed - flying/insect/agile archetypes
    "Insectoid": SPEED,
    "Fairy": SPEED,
    "Avian": SPEED,
    "Giant Bird": SPEED,
    "Birdkin": SPEED,
    "Pterosaur": SPEED,
    "Bird": SPEED,
    "Holy Bird": SPEED,
    "Ancient Bird": SPEED,
    "Larva": SPEED,

    # SpecialAttack - magic/undead/demon/holy-caster/elemental/mysterious archetypes
    "Shaman": SPECIAL_ATTACK,
    "Wizard": SPECIAL_ATTACK,
    "Demon Lord": SPECIAL_ATTACK,
    "Undead": SPECIAL_ATTACK,
    "Demon": SPECIAL_ATTACK,
    "Fallen Angel": SPECIAL_ATTACK,
    "Ghost": SPECIAL_ATTACK,
    "Angel": SPECIAL_ATTACK,
    "Archangel": SPECIAL_ATTACK,
    "Cherub": SPECIAL_ATTACK,
    "Evil": SPECIAL_ATTACK,
    "Throne": SPECIAL_ATTACK,
    "Flame": SPECIAL_ATTACK,
    "Ice-Snow": SPECIAL_ATTACK,
    "Smoke": SPECIAL_ATTACK,
    "Mutant": SPECIAL_ATTACK,
    "Mysterious Beast": SPECIAL_ATTACK,

    # Deliberately NOT mapped - these are the wiki's own "no signal" markers
    # (Unknown, Unidentified, Lesser, None, Unique, Food), not a real
    # archetype. Left out so they fall through to the deterministic hash
    # fallback in EvolutionGraphConverter.py rather than being force-fit
    # into a flavor bucket that isn't actually justified by the label.
}
