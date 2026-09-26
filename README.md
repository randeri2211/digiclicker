# DigiClicker

A browser-based, Digimon-themed idle/clicker game. Tame a roster of
Digimon, each climbing its own branching digivolution line, and grow a
team through an active click/combat loop plus passive training slots.

Built with **Svelte 5 + TypeScript + Vite**. Digimon data (species,
evolution relationships, stage/type/attribute taxonomy) is scraped from
[digimon.fandom.com](https://digimon.fandom.com) via a set of Python
tools and baked into static JSON consumed by the game at runtime - no
backend, no database.

See [GAMEPLAY_DESIGN.md](GAMEPLAY_DESIGN.md) for the running log of
gameplay design decisions (confirmed mechanics vs. open questions).

## Running the game

Everything runs through Docker via `start.sh`/`stop.sh` (bash scripts,
not npm scripts, so they work the same from any shell):

```bash
./start.sh --dev      # Vite dev server w/ hot reload -> http://localhost:5173
./start.sh --prod     # production build served by nginx -> http://localhost:8080
./stop.sh              # stop whatever's running
```

`npm run docker:start` / `npm run docker:stop` are thin wrappers around
the same scripts, for anyone who reaches for npm out of habit.

Without Docker, the usual Vite workflow also works directly:

```bash
npm install
npm run dev       # dev server
npm run build     # production build
npm run check     # svelte-check + tsc, no emit
```

## Regenerating Digimon data

The game's species/evolution data (`src/lib/data/`) and its optimized
sprites (`public/sprites/`) are checked in - you don't need to run the
scrapers to play or develop the game. They're only needed to refresh the
data or art from the wiki. Scraped **source art** lives in `art/`
(git-ignored, never shipped); the game only ships the WebP copies in
`public/sprites/` built from it (step 5).

1. **`Importer.py`** - downloads and sorts Digimon sprite/art images
   into `art/digimon/images/<Name>/`.
   Docker: `./start.sh --importer` (one-shot, writes into the mounted
   `art/digimon/images/` volume, then exits).
   Local: `python Importer.py` (needs `requirements.txt` in a venv).

2. **`EvolutionImporter.py`** - scrapes the wiki's Digimon species
   category into a directed evolution graph (`data/evolution_graph.gexf`,
   viewable in [Gephi](https://gephi.org/)). Captures each species'
   stage, digivolution edges, and `type`/`attribute` taxonomy fields.

3. **`EvolutionGraphConverter.py`** - converts the GEXF graph into
   `src/lib/data/digimon-evolution.json`, the format the game actually
   loads. Also resolves each species' `type` into one of four combat
   stat archetypes (Attack/Defense/Speed/SpecialAttack) via
   `evolution_type_mapping.py`'s curated table, falling back to a
   deterministic hash for untaxonomied species, plus an egg flavor type
   (`egg_type_mapping.py`) and stage-skipping evolvesTo edge
   classification (`classify_evolution_skips`).

4. **`InfoboxImageImporter.py`** - fallback for species step 1 missed.
   `Importer.py` only grabs images tagged into the wiki's
   `Category:Digimon Images`, a separate and incomplete curation from
   `Category:Digimon species` - this fetches each still-unresolved
   species' own wiki page (from step 3's output) and downloads its
   infobox `|image=` directly (currently: 675 → 1583 of 1660 species
   resolved). **Run `EvolutionGraphConverter.py` again afterward** to
   pick up the newly downloaded images.

5. **`optimize_sprites.py`** - builds what the game actually ships:
   every in-game species' sprite (and each Digi-Egg) from `art/`,
   trimmed, fitted to 256px and saved as WebP in `public/sprites/`
   (~17MB, vs ~340MB of source art). Skips sprites that are already up
   to date (`--force` rebuilds all). **Commit `public/sprites/`** - CI
   checks every in-game species has one (`--check`).

6. **`import_type_icons.py`** - the element and attribute icons: downloads
   them into `art/icons/` (Fandom's element icons with their dark tile
   removed, the Frontier Spirit Marks for Light / Dark, Digimon Story:
   Time Stranger's attribute icons from Wikimon) and ships 64px WebPs in
   `public/sprites/icons/` (commit those; CI checks with `--check`).
   Only needed if the icon set changes.

Run steps 1-3 in order after wiki content changes or to pick up new
species; run 4 + a second pass of 3 whenever sprite coverage needs
topping up; always finish with step 5. Optional art clean-up before
step 5: `RemoveSpriteBackgrounds.py` (solid backgrounds to transparent),
`EggImageGenerator.py` (per-type egg recolours into `art/digimon/eggs/`).

The source art isn't committed to git (~340MB) - run step 1 to populate
`art/` locally if you need to re-import; the shipped sprites, evolution
graph JSON and code are version-controlled as normal.

## Project structure

```
src/
  lib/
    game/
      state/       reactive game state (Svelte 5 runes) - team, currency,
                    combat, save/load persistence
      combat/       damage/DPS formulas, tick loop, level curve, wild spawns
      evolution/    digivolve/de-digivolve logic (reads the evolution graph)
      roster/       starter team + wild spawn pool definitions
      data/         generated digimon-evolution.json (species + evolution graph)
    components/
      combat/       the click/combat arena
      sidebar/       active/training team slots, evolve button, DPS panel
      evolution/     the Evolution screen (digivolve/de-digivolve graph UI)
      hud/           top bar (currency, evolution badge)
data/                data/evolution_graph.gexf (Gephi source graph)
art/                 scraped source art (gitignored, never shipped - see above)
public/sprites/      optimized WebP sprites the game ships (optimize_sprites.py)
```

## Tech notes

- **Svelte 5 runes** (`$state`/`$derived`/`$effect`) throughout - state
  lives in `.svelte.ts` files, which is where runes are allowed outside
  `.svelte` components.
- Combat runs on discrete attack ticks: team Speed sets attacks/second,
  team Attack+SpecialAttack sets damage/hit. See "Combat: attack ticks
  and damage" in `GAMEPLAY_DESIGN.md` for the full mechanic.
- Saves are stored in `localStorage`, one slot per save; export/import
  to a `.json` file is supported from the main menu.
- A dev-only `window.__digiclicker` hook (gated on `import.meta.env.DEV`)
  exposes live game state for debugging/automated testing.
