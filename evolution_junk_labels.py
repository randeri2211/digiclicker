"""
Hand-curated list of node labels from data/evolution_graph.gexf that are not
actually Digimon - items, locations, or other objects that got linked inline
in a from/to/lateral-to field and leaked into the scraped graph. Extend this
list as more junk is spotted; it's deliberately a flat data file rather than
a classifier since these can't be reliably pattern-matched.
"""
JUNK_LABELS = {
    "Digi-Egg of Courage",
    "Digi-Egg of Friendship",
    "Digi-Egg of Love",
    "Digi-Egg of Knowledge",
    "Digi-Egg of Sincerity",
    "Digi-Egg of Reliability",
    "Digi-Egg of Hope",
    "Digi-Egg of Light",
    "Digi-Egg of Miracles",
    "Digi-Egg of Destiny",
    "Code Key of Envy",
    "Code Key of Gluttony",
    "Code Key of Greed",
    "Code Key of Lust",
    "Code Key of Sloth",
    "Code Key of Wrath",
    "Code Crown",
    "Chrono Core",
    "ChronoCore",
    "Black Digitron",
    "Bewitching Hairpin",
    "Dark Area",
    "Dark Network",
    "Digi-Egg Digivolution Chart",
    "Abyss Truffle",
    "Angemon-species",
    "Aoi Shibuya",
    "Crimson",
}
