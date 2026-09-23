"""
How each species gets one of nine combat elements (plus Neutral), used by
the boss-fight advantage system (see src/lib/game/combat/advantage.ts and
src/lib/data/elementChart.json). EvolutionGraphConverter.py decides, in
order:

1. ELEMENT_OVERRIDES - hand-picked, for iconic species the signals below
   get wrong.
2. Attacks - keyword votes over the species' attack list
   (data/species_attacks.json, from AttackImporter.py): ELEMENT_KEYWORDS,
   signature attack weighted SIGNATURE_WEIGHT times, needing at least
   MIN_ATTACK_SCORE to count. An attack says what a Digimon fights WITH,
   which is what an element means - the raw type only says what it IS
   (Tentomon is an "Insectoid" but fights with electricity).
3. TYPE_TO_ELEMENT - the wiki's raw |type= value, when attacks say nothing.
4. NEUTRAL - deliberately no hash fallback (unlike stat affinity / egg
   type): a random element would invent matchups, while Neutral simply
   never has an edge either way.

Every species records which step decided it (elementSource). Retune
freely; validate_elements.py reports the per-element counts after
regenerating.
"""

FIRE = "Fire"
WATER = "Water"
PLANT = "Plant"
ELECTRIC = "Electric"
EARTH = "Earth"
WIND = "Wind"
METAL = "Metal"
LIGHT = "Light"
DARK = "Dark"
NEUTRAL = "Neutral"

ELEMENTS = (FIRE, WATER, PLANT, ELECTRIC, EARTH, WIND, METAL, LIGHT, DARK, NEUTRAL)

TYPE_TO_ELEMENT = {
    # Fire - the classic fire-breathers: dragons, dinosaurs and reptiles
    # (Agumon/Greymon's line lives here).
    "Flame": FIRE,
    "Fire Dragon": FIRE,
    "Dragon": FIRE,
    "Dragonkin": FIRE,
    "Mini Dragon": FIRE,
    "Baby Dragon": FIRE,
    "Beast Dragon": FIRE,
    "Mythical Dragon": FIRE,
    "Ancient Dragon": FIRE,
    "Ancient Dragonkin": FIRE,
    "Dragon Warrior": FIRE,
    "Dinosaur": FIRE,
    "Reptile": FIRE,
    "Reptile Man": FIRE,
    "Smoke": FIRE,

    # Water - sea creatures, plus the handful of ice/snow species.
    "Aquatic": WATER,
    "Aquabeast": WATER,
    "Sea Beast": WATER,
    "Sea Animal": WATER,
    "Mollusk": WATER,
    "Amphibian": WATER,
    "Crustacean": WATER,
    "Shellfish": WATER,
    "Plesiosaur": WATER,
    "Ocean Dragon": WATER,
    "Marine Man": WATER,
    "Tropical Fish": WATER,
    "Ancient Fish": WATER,
    "Ancient Crustacean": WATER,
    "Ancient Aquabeast": WATER,
    "Ice-Snow": WATER,

    # Plant - vegetation and the insects that live among it.
    "Vegetation": PLANT,
    "Carnivorous Plant": PLANT,
    "Seed": PLANT,
    "Ancient Plant": PLANT,
    "Insectoid": PLANT,
    "Ancient Insectoid": PLANT,
    "Larva": PLANT,
    "Parasite": PLANT,

    # Electric - cyborgs, screens and anything from outer space.
    "Cyborg": ELECTRIC,
    "CRT": ELECTRIC,
    "LCD": ELECTRIC,
    "Navigation": ELECTRIC,
    "Enhancement": ELECTRIC,
    "Alien": ELECTRIC,
    "Alien Humanoid": ELECTRIC,
    "Invader": ELECTRIC,
    "Galaxy": ELECTRIC,

    # Earth - land beasts, rock and the armored dinosaurs.
    "Beast": EARTH,
    "Beastkin": EARTH,
    "Mammal": EARTH,
    "Rare Animal": EARTH,
    "Ancient Animal": EARTH,
    "Mysterious Beast": EARTH,
    "Mythical Beast": EARTH,
    "Ancient Mythical Beast": EARTH,
    "Beast<!--": EARTH,
    "Rock": EARTH,
    "Mineral": EARTH,
    "Ancient Mineral": EARTH,
    "Rock Dragon": EARTH,
    "Earth Dragon": EARTH,
    "Ankylosaur": EARTH,
    "Ceratopsian": EARTH,
    "Stegosaur": EARTH,
    "Mine": EARTH,
    "Mutant": EARTH,
    "Shaman": EARTH,

    # Wind - birds, sky dragons and fairies.
    "Bird": WIND,
    "Avian": WIND,
    "Birdkin": WIND,
    "Giant Bird": WIND,
    "Mini Bird": WIND,
    "Mysterious Bird": WIND,
    "Ancient Bird": WIND,
    "Ancient Birdkin": WIND,
    "Pterosaur": WIND,
    "Sky Dragon": WIND,
    "Bird Dragon": WIND,
    "Fairy": WIND,
    "Ancient Fairy": WIND,

    # Metal - machines, weapons and armored warriors.
    "Machine": METAL,
    "Machine Dragon": METAL,
    "Holy Mechanical": METAL,
    "Weapon": METAL,
    "Armor": METAL,
    "Musical Instrument": METAL,
    "Puppet": METAL,
    "Warrior": METAL,
    "Beast Knight": METAL,
    "Magic Knight": METAL,
    "Magic Warrior": METAL,

    # Light - angels, holy beasts and deities.
    "Holy Warrior": LIGHT,
    "Holy Beast": LIGHT,
    "Holy Dragon": LIGHT,
    "Light Dragon": LIGHT,
    "Holy Bird": LIGHT,
    "Holy Sword": LIGHT,
    "God Beast": LIGHT,
    "Angel": LIGHT,
    "Mini Angel": LIGHT,
    "Archangel": LIGHT,
    "Cherub": LIGHT,
    "Seraph": LIGHT,
    "Throne": LIGHT,
    "Principality": LIGHT,
    "Virtue": LIGHT,
    "Dominion": LIGHT,
    "Authority": LIGHT,
    "Tathāgata": LIGHT,
    "Avatar": LIGHT,
    "Monk": LIGHT,
    "Spirit": LIGHT,
    "Wizard": LIGHT,
    "Wizard<!--Source?": LIGHT,

    # Dark - demons, the undead and fallen/evil dragons.
    "Demon": DARK,
    "Demon Lord": DARK,
    "Demon God": DARK,
    "Demon Dragon": DARK,
    "Devil": DARK,
    "Evil": DARK,
    "Evil Dragon": DARK,
    "Dark Dragon": DARK,
    "Dark Animal": DARK,
    "Dark Knight": DARK,
    "Fallen Angel": DARK,
    "Wicked God": DARK,
    "Undead": DARK,
    "Ghost": DARK,
}


# --- Attack keywords --------------------------------------------------
# EvolutionGraphConverter.py decides most elements from each species'
# attacks (data/species_attacks.json, from AttackImporter.py): every
# keyword match in an attack's name + description scores a point for its
# element, the signature (first) attack counts SIGNATURE_WEIGHT times, and
# the highest score wins. Only when no attack matches does the raw-type
# table above decide. Patterns are regexes, matched case-insensitively on
# word boundaries - keep them specific: "fire" as a verb ("fires a
# missile") must not count as Fire.
SIGNATURE_WEIGHT = 3
# A winning attack score below this is treated as too weak (one incidental
# word in a minor attack) and the raw-type table decides instead.
MIN_ATTACK_SCORE = 4

ELEMENT_KEYWORDS = {
    FIRE: [
        r"flames?", r"fiery", r"blaze", r"blazing", r"burn(s|ing|ed)?", r"fireballs?", r"inferno",
        r"magma", r"lava", r"scorch\w*", r"embers?", r"heat", r"pyro\w*", r"firestorm",
        r"fire(?!\s+(a|an|at|off|from|its|his|her|missiles?|lasers?|bullets?|shots?|arrows?|beams?))",
    ],
    WATER: [
        r"water", r"aqua\w*", r"ice", r"icy", r"frozen", r"freez\w*", r"frost\w*",
        r"snow\w*", r"blizzard", r"tidal", r"waves?", r"ocean", r"sea", r"hydro\w*", r"glacier",
        r"torrent", r"subzero", r"cold",
    ],
    ELECTRIC: [
        r"electric\w*", r"thunder\w*", r"lightning", r"shock\w*", r"static", r"volts?", r"voltage",
        r"sparks?", r"sparkling", r"plasma", r"bolts?",
    ],
    PLANT: [
        r"leaf", r"leaves", r"vines?", r"ivy", r"thorns?", r"petals?", r"flowers?", r"pollen",
        r"seeds?", r"spores?", r"roots?", r"plants?", r"nectar", r"bloom\w*", r"toxin", r"poison\w*",
    ],
    EARTH: [
        r"rocks?", r"stones?", r"boulders?", r"earthquake", r"quake", r"sand", r"mud", r"sludge",
        r"tremor", r"soil", r"dirt", r"earth",
    ],
    WIND: [
        r"wind\w*", r"gusts?", r"gale", r"tornado\w*", r"whirlwind", r"cyclone", r"typhoon",
        r"hurricane", r"feathers?", r"air", r"breeze",
    ],
    METAL: [
        r"missiles?", r"lasers?", r"cannons?", r"bullets?", r"guns?", r"metal\w*", r"steel",
        r"iron", r"bombs?", r"rockets?", r"drills?", r"machine\w*", r"mechanical",
    ],
    LIGHT: [
        r"holy", r"heaven\w*", r"angel\w*", r"divine", r"sacred", r"radiant", r"shining",
        r"celestial", r"blessing", r"purif\w*", r"light of", r"of light",
    ],
    DARK: [
        r"dark\w*", r"shadows?", r"evil", r"curse[ds]?", r"demon\w*", r"hell\w*", r"abyss",
        r"nightmare", r"doom", r"necro\w*", r"ghost\w*", r"souls?", r"death",
    ],
}

# Final say, above attacks and type - for iconic species where both
# signals get it wrong (e.g. the first-listed attack isn't the signature,
# or a move name like "Lightning Paw" is just a punch). {species slug:
# element}.
ELEMENT_OVERRIDES = {
    "guilmon": FIRE,  # Pyro Sphere, listed after Rock Breaker
    "gatomon": LIGHT,  # "Lightning Paw" is a punch; a holy beast
    "wargreymon": FIRE,  # Terra Force has no keyword; Great Tornado is a spin
    "piximon": WIND,  # "Pit Bomb" is a magic bomb, not a machine
}
