# DigiClicker — Gameplay Design Notes

Running log of gameplay decisions. Split into **Confirmed** (locked in) and
**Proposed** (brainstormed, not yet decided).

## Confirmed

### Core approach: one-per-species roster (confirmed, built)
- PokeClicker-style collection: the player owns a **roster** holding at
  most **one entry per species** (`RosterState` in `types.ts`, keyed by
  speciesId - the key itself enforces uniqueness; `state/
  roster.svelte.ts`). There is no party: **every** owned Digimon
  contributes its stats to combat and receives full kill XP.
- Digivolving never replaces a Digimon - it **adds** the target species
  as a new roster entry (see "Stat system" below). So the collection only
  grows, and the branching evolution graph (Baby -> In-Training -> Rookie
  -> Champion -> Ultimate -> Mega) becomes "which branch first", not
  either/or.
- Completionist goal is the **Digivolution Compendium (confirmed,
  built)**: every in-game species obtained. Since roster entries can
  never be lost and an egg's species stays hidden until it hatches,
  "discovered" is simply "owned" - `CompendiumScreen.svelte` reads
  `isOwned` straight from the roster rather than keeping a separate
  record that could drift. It shows a stage-filterable grid over all
  1296 `IN_GAME_STAGES` species; undiscovered entries render as a genuine
  "???" placeholder with nothing species-identifying in the DOM, not
  just visually hidden. Pure tracker for now, no completion rewards.
- **Replaced the old party model** (Active/Training/Reserve buckets with
  capped slots, multiple copies of a species, one Digimon *changing*
  species as it digivolved). Saves from that model (save format v1) are
  not converted - see "Technical notes".

### Core click loop
- Player is in a Digital World area; clicking attacks a wild Digimon spawn.
- **Click damage scales with the roster (confirmed, built):** each click
  deals `CLICK_DAMAGE_BASE + rosterDps * CLICK_DAMAGE_DPS_FRACTION`
  (8 + 10% of DPS, placeholders - `computeClickDamage` in
  `combat/damage.ts`). The flat base keeps early clicks meaningful while
  DPS is tiny; the DPS share keeps clicking a proportional boost on top
  of idle damage (~80% extra at ~8 clicks/sec) instead of fading into
  irrelevance as the roster grows. Shown in the sidebar's Roster DPS
  panel.
- Defeating a wild Digimon grants Bits (currency) and a rare chance to
  drop a Digi-Egg (see "Digi-Eggs" below).

### XP distribution
**Flat-XP rule:** XP-per-kill is a flat amount awarded to *every* roster
entry (and every incubating egg, see "Digi-Eggs") - it is never
divided/diluted as the roster grows. E.g. a kill worth 35 XP gives every
owned Digimon 35 XP. Net effect: growing the roster is a pure multiplier
on total XP earned per kill.

### Roster screen & entry menu
- Clicking a roster entry (a card on the **Roster** screen, reachable
  from the top bar, or one of the sidebar's top contributors) opens a
  context menu (next to the cursor, closes on outside click/Escape) with
  **Open Stats** (Base / Per Level / Inherited / Current table),
  **Digivolve...** (opens the Evolution screen with that entry
  selected), and **Use Ability Reroll**.
- The Roster screen lists every owned Digimon with a stage filter and a
  sort (DPS / Level / Stage), each card showing that entry's DPS share.
- Implementation stays generic: a single `ContextMenu.svelte` (pure
  popup, no game logic) plus one `getRosterEntryMenuItems(callbacks)`
  builder (`src/lib/game/roster/rosterMenu.ts`) - adding an action is a
  one-line change there, not a new component.

### Digivolution UI & automation
- Digimon level up through normal play; once eligible to digivolve, they're
  flagged "ready."
- A small button (likely in the main HUD) shows a badge/indicator with the
  count of Digimon currently ready to evolve.
- Clicking that button opens an **Evolution screen** listing the roster
  (ready entries first). Clicking one shows its available next-stage
  options (branching digivolutions) for the player to pick from manually.
  Already-owned targets are shown with an "Owned" badge but can't be
  picked - the roster holds one entry per species. "Ready" means at least
  one **unowned** target's requirement is met.
- **Auto-Digivolve (confirmed, built):** the original design called for
  three separate modes (Off / Repeat last path / Digivolve by pin) - built
  instead as **one unified preference system**, since "repeat last" and
  "pin ahead of time" are really just two ways of setting the same thing.
  `DigivolveAutomationState` (`types.ts`) holds a global `enabled` toggle
  (Settings screen checkbox) plus `preferences: Record<sourceSpeciesId,
  {targetSpeciesId, minLevel}>` - keyed by the source species, not an
  abstract "line" (the evolution graph is a multi-parent DAG, so the
  species is the only well-defined key). Every digivolve (`digivolve()`
  in `evolution/digivolve.ts`) records that source species' choice
  automatically, regardless of whether automation is enabled - turning
  it on later immediately benefits from however you already played. A
  preference that already points at the same target is left untouched,
  so a pinned custom minLevel survives every digivolve it triggers; only
  picking a *different* target replaces it. Since an owned target can't
  be digivolved into again, each preference fires **at most once** -
  only the pinned target auto-unlocks, other branches stay manual. The Evolution screen also lets you pin a
  target ahead of time with a custom **minLevel** - an extra floor on top
  of (never replacing) the target's normal level requirement, letting a
  Digimon "cook" longer before auto-firing (relevant since the source's
  pre-digivolve level feeds the new entry's inherited bonus). Pinning is explicit two-step
  (Pin -> edit the level -> **Confirm**) rather than live-as-you-type -
  nothing is written until Confirm, and the entered level is capped to
  `MAX_LEVEL`. Confirm also checks eligibility immediately: if the
  Digimon already meets both the normal requirement and the level just
  confirmed, it digivolves right then instead of silently waiting for the
  next kill to notice. Checked on every xp award (`tryAutoDigivolve` in
  `awardKillXp`) - otherwise fires silently, no screen visit needed.

### Stat system: base, growth, inherited bonus
- Each roster entry (`RosterEntry` in `types.ts`) has:
  - **Base stats** and **growth per level** - rolled once when the entry
    is created, from its species' stage/statAffinity, never rerolled
    (Pokemon-IV-style individual variance).
  - **Inherited bonus** - a one-time bonus rolled when the entry is
    created *by a digivolve*; zero for starters and hatched entries.
- Current stat = `base + level * growth + inheritedBonus`, then
  `* (1 + ability%)` (see "Special Abilities").
- **Digivolving (confirmed, built):** creates the target species as a
  **new roster entry** at level 1 - the source stays in the roster. The
  source then **resets to level 1**: its levels are "spent" on the new
  form, so each further branch from the same source needs its own grind.
  The new entry's inherited bonus is rolled from the target's
  stage/affinity plus the source's **level right before digivolving**
  (`INHERITED_BONUS_SCALE` + `INHERITED_BONUS_LEVEL_SCALE` per level,
  scaled by the same dominant/off factor as everything else, so
  attack-type Digimon still gain more Attack than HP/Speed from the
  levels they're cashing in - `rollInheritedBonus` in
  `src/lib/game/combat/stats.ts`). Levelling a source longer before
  digivolving therefore produces a stronger new form - the reason a
  custom pinned minLevel is worth setting.
- Digivolving is never a net loss for the roster: the source keeps its
  base stats, growth, inherited bonus and ability, and a whole new
  contributor is added on top. (The old model replaced the Digimon and
  reset its level, which made the first moments after a digivolve
  weaker than before it.)
- **Re-digivolving into an owned form = upgrade (confirmed, built):** an
  owned target stays selectable. Digivolving into it again rolls a fresh
  inherited bonus from the source's current level and keeps the **higher
  value per stat** (old vs. new), so the owned form can only ever
  improve - rerolling at a similar level is a free second chance at a
  better roll, a higher level shifts the whole range up. The source
  still resets to level 1. Each entry records `inheritedFromLevel` (the
  highest source level it has inherited from, 0 if never digivolved
  into), shown on the Evolution screen ("Best from Lv X") next to its
  current bonus and the possible upgrade outcome. An upgrade that can't
  improve any stat even with a perfect roll is blocked, so a source's
  levels are never thrown away for nothing.
- Upgrades are **manual only** - automation only unlocks new forms. An
  auto-upgrade into a target with no level requirement would re-fire on
  every kill and pin the source at level 1 forever. The "ready" badge
  likewise counts new forms only (almost every entry past its level gate
  could upgrade *something*, which would leave it permanently lit).
- `digivolve()` refuses (returns false, no-op) unless the target is a
  real in-game option for that source, its requirement is met, and - for
  an owned target - the upgrade could improve something. No caller can
  create a duplicate, skip the level gate, or waste a source's levels.
- **De-digivolution: removed.** With the source kept in the roster
  there's nothing to go back *to*; the De-Digivolution Crystal, its
  Shop entry and the de-digivolve UI are gone.
- **Level-gate baseline (confirmed):** digivolving up requires a minimum
  level first, keyed off the *target's* stage (see
  `DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE` in `src/lib/game/constants.ts`):
  - Digivolve to Champion: **Lv 16**
  - Digivolve to Ultimate: **Lv 36**
  - Digivolve to Mega: **Lv 56**
  - Digivolve to Rookie: **Lv 4**
  - Digivolve to In-Training: no requirement yet (not specified,
    defaults to open).
- **Playable stage scope (confirmed, temporary):** only Fresh,
  In-Training, Rookie, Champion, Ultimate, and Mega stage Digimon are
  searched/offered as digivolve options right now (`IN_GAME_STAGES` in
  `src/lib/game/constants.ts`). Armor, Hybrid, Ultra, Burst Mode, and Unknown-stage species stay fully present
  in the scraped data (`src/lib/data/digimon-evolution.json`) - nothing
  is deleted - they're just excluded from the live evolution-option
  search until support for them (item-triggered Armor evolution,
  Hybrid's separate mechanic, DNA/Jogress multi-source fusion, etc.) is
  actually built. Re-enabling a stage later is a one-line change to
  `IN_GAME_STAGES`, no data regeneration needed.

### Special Abilities (confirmed, built - stat-boost tier)
- Each roster entry can hold one special ability
  (`RosterEntry.abilityId`) - null until an **Ability Reroll Crystal**
  (bought in the Shop) is used on it via the "Use Ability Reroll" action
  in the roster entry menu (`getRosterEntryMenuItems`). The item is the
  *only* source - nothing rolls an ability automatically at creation.
- `ABILITY_CATALOG` (`src/lib/game/abilities/abilityCatalog.ts`) has 12
  entries: 4 stats (Attack/HP/Speed/SpecialAttack) x 3 rarity tiers
  (Minor +5%, Major +10%, Superior +20%, placeholders) - a weighted pool
  (Minor common, Superior rare), same convention as area spawn weights
  and Mystery Egg pools. Using the item re-rolls a fresh weighted pick,
  can reroll into the same ability again (no dedup).
- Belongs to that entry only - a new entry created by digivolving starts
  with no ability, the source keeps its own.
- The bonus applies via one shared `computeEntryStatValue(entry,
  statKey)` (`combat/damage.ts`) - `base + level*growth +
  inheritedBonus`, then `* (1 + ability%)` if the ability targets that
  exact stat. Every combat formula (damage/hit, attack rate, the fight
  timer's roster HP sum) *and* the Stat window's "Current" column call
  this one function, so they can never drift apart.
- Planned but explicitly deferred: farming/resource-gathering
  specialization abilities, once a farming system exists to specialize
  in (see "Idle production" above - still not built).

### Combat: attack ticks and damage
- Combat runs on **discrete attack ticks**, not a smooth per-second HP
  drain: the whole roster shares one attack clock (attacks/second), and
  each attack that lands deals a flat amount of damage (damage/hit).
  Total damage over time still works out to `attacksPerSecond *
  damagePerHit * secondsPassed`, same total as a continuous rate - the
  ticks are modeled explicitly (rather than only integrated as a rate)
  so per-hit granularity is available for later features (crit
  variance, per-hit popups, dodge rolls) without a rework. Fractional
  attack progress between polls of the tick loop isn't dropped - it
  carries over (`WildSpawnState.attackProgress`) so the long-run rate
  stays accurate regardless of polling cadence.
- **Speed drives attack rate**: `attacksPerSecond = BASE_ATTACKS_PER_SECOND
  + rosterSpeedSum * SPEED_TO_APS_SCALE` (placeholder constants, see
  `src/lib/game/constants.ts`). This is a shared, roster-wide rate - one
  clock for the whole roster, not a rate per Digimon.
- **Attack + SpecialAttack drive damage/hit**: each roster entry
  contributes `attack + specialAttack` (from baseStats + level *
  growthPerLevel + inheritedBonus) to the roster's flat per-hit damage
  total; the whole roster hits as one combined blow each tick, not
  entry-by-entry.
- **Fights are timed - HP funds the timer (confirmed, built):** every
  wild encounter has a time limit, `FIGHT_TIMER_BASE_SECONDS` plus a
  **capped** bonus of up to `FIGHT_TIMER_MAX_BONUS_SECONDS` funded by the
  roster's summed **HP** stat. The curve shape is a setting,
  `FIGHT_TIMER_FORMULA` (all values in `balance.json`, pickable in the
  Balance Lab):
  - `halfLife` - `max * (1 - 0.5 ^ (hp / FIGHT_TIMER_HALF_BONUS_HP))`:
    fast early gains, approaches the ceiling without reaching it.
  - `parabola` - `max * (1 - (1 - hp / FIGHT_TIMER_FULL_BONUS_HP)^2)`:
    gains taper off steadily and reach the ceiling exactly at "full
    bonus" HP, flat after.
  - `power` - `max * (hp / FIGHT_TIMER_FULL_BONUS_HP) ^
    FIGHT_TIMER_POWER_EXPONENT`, capped: 0.5 = square root, 1 = linear.
  The formulas live in `combat/fightTimer.ts` as pure functions, shared by
  the game (`computeFightTimeLimitMs` in `combat/spawn.ts`) and the
  Balance Lab, so the lab's timer chart can never drift from the game; an
  unknown formula name falls back to `halfLife`. The cap matters because
  roster HP grows with every Digimon collected - an uncapped bonus would
  balloon into minutes-long fights. Fixed once at spawn, doesn't change
  if roster HP changes mid-fight. If the timer
  runs out before the wild is defeated, the encounter ends with **no
  reward** (no XP/Bits/egg roll) - same as never having fought it - and
  a fresh wild spawns right after, same gap as a normal kill. This is
  what finally gives the renamed **HP** stat (formerly Defense) a live
  mechanical effect - it was the last of the four stats with no formula
  behind it; Speed (attack rate), Attack/SpecialAttack (damage), and now
  HP (fight duration) all matter. A `TimerBar` next to the HP bar shows
  the countdown, reading the wild's already-ticking `lastTickAt` as its
  clock rather than polling a separate timer.
- The sidebar shows a live **Roster DPS** panel (totals for every stat,
  the shared attack rate, and the top 5 contributors by DPS share -
  the roster can hold hundreds of entries, so only the biggest are
  listed) above the Hatchery.
- **Tuning note (open):** all stat/wild-HP constants in
  `src/lib/game/constants.ts` are still early placeholders, and wild HP
  was tuned against a small party - now that the whole roster
  contributes, damage and the fight timer scale with collection size, so
  the difficulty curve needs a full retune.
- **All tunable numbers live in one settings file**:
  `src/lib/game/balance.json` holds every balance value (hatchery size,
  level requirements, combat/attack-rate constants, fight timer,
  stat-roll scales, level curve, wild HP/reward formulas, egg and shop
  numbers). `src/lib/game/constants.ts` re-exports each one under the
  same name with its explanation, and every other module imports from
  there - never from the JSON directly.
- **Balance Lab (dev tool):** with the dev server running, open
  `/balance.html` (e.g. http://localhost:5173/balance.html). Every value
  in `balance.json` is editable there, and the charts update as you type:
  wild HP by stage against an example roster's damage per fight (with the
  real area paths' level ranges marked), the fight timer curve, and kills
  per level, plus an area-by-area "wins idle / needs clicking / too
  hard" check. **Save** (or Ctrl+S) writes `balance.json` through a
  dev-server-only endpoint (`balanceFilePlugin` in `vite.config.ts`,
  which refuses anything but same-shape numeric values); Vite then
  hot-reloads, so an open game tab picks up the new numbers immediately.
  The lab's formulas live in `src/balance/model.ts` and **mirror** the
  game's - change a formula in the game and change it there too. The
  page isn't part of the production build.

### Idle production
- Roster auto-attack (see Core click loop) *is* the idle/offline
  production mechanic for now — no separate farm/area-assignment system.
- A dedicated farming system may be added later, but as a fully
  independent system.

### Areas / regions
- **Confirmed, built (Forest Sector):** each area (`src/lib/data/areas/
  *.json`, `AreaData`/`AreaPath` in `types.ts`) is a graph of **paths**,
  not areas directly — the granular explorable unit is the path. Every
  path has its own level-ranged wild spawn pool (`digimonPool`, weighted
  per species — a species can also override the path's `levelRange` for
  just itself, e.g. a weaker regional variant still shows up in a
  higher-tier path but capped lower) and a `mastery.kills` threshold that,
  once reached via kills in that path, unlocks every path listed in its
  `unlocks` (a list, not a single next-path — paths form a DAG, so one
  path can fork into several). Progress (`AreaProgressState`: active
  area/path, unlocked paths per area, kills per path) is tracked in
  `state/areaProgress.svelte.ts` and persisted like any other save data.
  Wild spawning (`pickNextWildSpawn` in `combat/spawn.ts`) draws only from
  the currently active path's pool — the old flat 3-species round-robin
  is gone. `PathTabs.svelte` lets the player switch between unlocked
  paths in the active area; `AreaTabs.svelte` (Forest Sector/Cave Sector/
  Server Continent) stays a cosmetic stub until a second area has real
  data behind it. `validate_areas.py` (run in CI, see
  `.github/workflows/validate-areas.yml`) checks every area file for bad
  species references, malformed level ranges, and — the main thing this
  catches that nothing else would — paths that are unreachable from the
  area's `startingPath` (an authoring typo in `unlocks`, not a design
  choice).
- Still open: Cave Sector/Server Continent have no real path data yet;
  cross-area unlocks (a path's `unlocks` pointing at another area's
  entry path) are anticipated by the schema (`"areaId:pathId"` form) but
  nothing produces or resolves that yet, since only one area exists so
  far; area bosses as an alternate mastery gate (proposed below) aren't
  built - `mastery` is kill-count-only for now.

### Taming mechanic — superseded
- Originally: defeating a wild Digimon would have a chance to tame it
  directly into the roster. Superseded by Digi-Eggs as the roster-growth
  mechanic instead (see "Digi-Eggs" below) - taming was never built
  (`computeTameChancePercent` existed only as a display-only stub feeding
  a "Tame chance on defeat" readout, with nothing behind it) and has been
  removed rather than left as dead code.

### Currency: Bits and Data
- **Bits** (combat currency) buy **items**, including **Data**.
- **Data** is spent to hatch Digi-Eggs; the amount/type of Data required
  depends on the egg's type. Exact Data costs are still to be figured out
  (egg types themselves are now confirmed - see "Digi-Eggs" below).

### Digi-Eggs
- **Egg type (confirmed):** every Digi-Egg has a flavor type - one of
  **Dragon, Beast, Dinosaur, Bird, Aquatic, Insect, Plant, Machine,
  Mineral, Evil, Holy** (11 types, `EggType` in `types.ts`). Resolved from
  the same raw wiki `|type=` taxonomy already scraped for stat affinities
  (see "Stat system" below), via a second curated mapping
  (`egg_type_mapping.py`'s `TYPE_TO_EGG_TYPE`) that groups the same raw
  values by thematic flavor instead of combat archetype - e.g. every
  "___ Dragon" raw type folds into Dragon, Demon+Undead+Wizard fold into
  Evil, Angel-adjacent types fold into Holy. Species whose raw type isn't
  curated (the wiki's own "no signal" values, the long tail of rare raw
  types, and "Slime" - the generic tag on 36 of the 49 Fresh-stage
  species) fall back to a deterministic hash, same treatment as
  stat-affinity fallback.
- **Egg art (confirmed):** one real official Digitama image (Zurumon's,
  sourced from wikimon.net) recolored per type - `EggImageGenerator.py`
  isolates the source's stripe pattern via a color-key mask and remaps
  both the shell and stripe colors per type from
  `egg_assets/egg_type_colors.json` (fully data-driven, no code changes
  needed to retune a palette), preserving the original shading gradient
  and knocking out the background to transparent. Also writes
  `egg_assets/montage.png` (all 11 side by side on a dark backdrop) for
  quick comparison when retuning colors. Output lives at
  `public/digimon/eggs/<Type>/egg-base.png` (gitignored, regenerate with
  the script - same convention as `public/digimon/images/<Name>/`).
- **Hatchery (confirmed, built):** eggs never sit in the roster - they
  live in a separate **hatchery** (`HatcheryState` in `types.ts`,
  `state/hatchery.svelte.ts`). An `Egg` already has its `speciesId`
  resolved (decided the moment it dropped/was bought) but hidden behind
  the egg sprite/name everywhere it's displayed. Only **incubating** eggs
  (up to `capacity` - `HATCHERY_STARTING_CAPACITY` 2, up to
  `HATCHERY_MAX_CAPACITY` 6, placeholders) gain kill XP; extra eggs wait
  in uncapped **storage** and move into a free incubating slot
  automatically, oldest first, so the hatchery drains with no player
  action. New eggs (kill-drops and Shop purchases alike) go straight into
  a free incubating slot if there is one, else storage.
- **Hatching (confirmed, built):** once an incubating egg's level crosses
  `EGG_HATCH_LEVEL`, `tryHatch()` (checked every time `awardKillXp`
  runs) removes it from the hatchery. If its species isn't owned yet it
  joins the roster as a new entry (the reveal moment - also what credits
  it in the Compendium). If the species is **already owned**, it becomes
  a bonus for the existing entry instead of a second copy
  (`DUPLICATE_HATCH_XP`, placeholder), so an egg is never wasted.
- **Acquisition - kill-drop (confirmed, built):** killing a wild has an
  `EGG_DROP_CHANCE_PERCENT` chance (small placeholder, tunable in
  `constants.ts`) to drop an egg. The drop resolves to a random *Fresh-stage*
  ancestor reachable via the killed species' `evolvesFrom` chain
  (`findRootAncestors` in `game/eggs/eggs.ts`, restricted to
  `IN_GAME_STAGES` species) - e.g. killing a Mega can drop the egg of any
  Fresh-stage line that provably evolves into it. If no Fresh ancestor is
  traceable (a data gap), that roll is simply skipped rather than
  substituting a wrong-stage fallback.
- **Acquisition - Mystery Digi-Eggs (confirmed, built):** buyable
  directly in the **Shop** with Bits (not Data - Data still has no
  source anywhere in the game, so building a shop mechanic around it
  would've meant deciding a Data-earning mechanism too; Bits already
  flow and are already spent elsewhere). One buy card per `EggType`
  (`MYSTERY_EGG_COST_BITS`, flat across all 11 types), labeled "Mystery
  {Type} Digi-Egg" - buying immediately rolls a weighted-random
  Fresh-stage species from that type's pool
  (`src/lib/data/mysteryEggWeights.json`, seeded from the same eggType
  taxonomy every species already has, hand-tunable afterward like area
  spawn weights; validated in CI by `validate_mystery_eggs.py`) and
  adds it to the hatchery, same as a kill-drop egg. Same hatching
  mechanics either way - only display differs: a Mystery egg shows
  "Mystery {Type} Digi-Egg" (vs. a kill-drop's plain "Digi-Egg
  ({Type})") and a "?" badge overlaid on the sprite (`Egg.isMystery`,
  `getEggDisplayName` in `images.ts`), so a mystery egg is never
  mistaken for a real wild-caught one.

## Technical notes

### Evolution graph
- Evolution relationships need to be modeled as a graph, not a flat list:
  each Digimon *form* is a node, each "digivolves to" relationship is a
  directed edge from a lower form to a higher form.
- The same graph serves both directions (outgoing edges for "what can
  this digivolve to", incoming edges for "what forms led here" - used by
  egg drops to find a killed species' Fresh ancestors).
- Nodes need queryable/sortable properties beyond identity, at minimum:
  **stage** (In-Training / Rookie / Champion / Ultimate / Mega / ...), and
  likely attribute (Vaccine/Data/Virus/...) and type/element down the line.
- Directly underpins the Evolution screen (listing a Digimon's available
  next forms) and egg drops (walking back to Fresh ancestors).
- **Sourced (raw link data):** `EvolutionImporter.py` scrapes the wiki's
  per-Digimon `from`/`to`/`lateral to` infobox links into a directed graph
  (1698 nodes, 2298 edges), exported as `data/evolution_graph.gexf` for
  visual review in Gephi. Conditions/requirements were deliberately not
  imported (see open problem above — sources disagree on those anyway).
  Still open: picking one canonical continuity/game to treat as the game's
  actual digivolution rules, and cleaning ~121 non-Digimon nodes that leaked
  in from items/locations linked inline in those fields.
- **Stage-skipping (and backward) edges are disabled in-game (confirmed):**
  the scraped data mixes evolution paths from different games/continuities
  for the same Digimon, so a single species' `evolvesTo` can include both
  the canonical one-tier-at-a-time step *and* direct jumps 2+ tiers up
  (e.g. Botamon, Fresh, listing direct edges to Rookie/Champion/Ultimate/
  Armor targets alongside its real In-Training children) - or even edges
  that go backward in stage entirely (e.g. DeckerGreymon, Ultimate,
  listing an `evolvesTo` edge down to Bombmon, Fresh - not a digivolution
  at all, just contaminated source data). `EvolutionGraphConverter.py`
  classifies every such non-adjacent-stage edge as `shortcut` (the target
  is *also* reachable via a fully legitimate multi-hop chain through the
  species' own non-skip children - redundant), `path` (no such chain
  exists - the skip is the only route to that target), or `backward`
  (the target's stageOrder is lower than the source's - always invalid,
  no shortcut/path distinction applies) and stores it as `evolutionSkips`
  per species (608 found across the dataset: 297 backward, 254 path, 57
  shortcut). The `backward` category was only added after a live bug
  report - Bombmon, Fresh, was showing a (since-removed) de-digivolve
  option to DeckerGreymon, Ultimate - traced to the classifier never flagging
  negative-gap edges at all, and even letting them leak into the
  reachability walk used for shortcut/path classification of *other*
  species. For now `getDigivolveOptions`/`isReadyToDigivolve` (`src/lib/game/evolution/digivolve.ts`) exclude
  **all** skip edges regardless of classification - only strict
  one-tier-at-a-time evolution shows up as a player-facing option. The
  `path`-classified edges this removes (essential, no alternate route)
  are a real, if small, loss of content for now - a reasonable future
  option is re-enabling just the `path` edges (since only `shortcut`
  ones are truly redundant, and `backward` ones are never legitimate)
  once there's a design for how to present a multi-tier jump in the UI.
- **Same-stage evolvesTo edges (analysis only, not yet acted on):**
  similarly, `evolvesTo` includes edges where source and target share
  the exact same stage (e.g. Rookie -> Rookie) - not a real progression.
  The Fukamon -> Fukamon self-loop (a pure scraping artifact) is now
  dropped entirely at the source, in `build_species()`'s edge-processing
  loop - it can never resurface on a future regeneration. Every
  remaining same-stage edge is classified by
  `classify_same_stage_evolutions` in `EvolutionGraphConverter.py`:
  `mode-change` (alternate form/weapon of the same base Digimon, e.g.
  Alphamon -> Alphamon Ouryuken, 8 found), `mutual` (the reverse edge
  ALSO exists - not a fusion, a tangled web of forms evolving into each
  other, usually one specific game's own shift-between-forms mechanic
  scraped flat, e.g. the Apemon/Troopmon/MadLeomon cluster, 162 found),
  `fusion` (target has 2+ evolvesFrom sources and this edge *isn't*
  reciprocated - the best signal for a real DNA/Jogress result, 145
  found - though a target can still mix multiple continuities' own
  fusion rosters: Omnimon's real WarGreymon+MetalGarurumon pair
  correctly lands here while its other 6 sources from a different
  game's roster correctly land in `mutual` instead, since only those 6
  have a reciprocal edge back to Omnimon), or `other` (unclassified
  anomaly worth a manual look, 9 found). Stored as `sameStageEvolutions`
  per species; full review list at `data/fusion_edges_review.md`, split
  by classification. Unlike `evolutionSkips`, this isn't wired into
  `getDigivolveOptions` yet - data/counts only for now.
- **Leveling = two independent curves (confirmed, built):** the **XP
  cost** of each level-up L -> L + 1 (`LEVEL_XP_*` in `balance.json`) and
  the **kill XP** a level-L wild gives (`KILL_XP_*`, used by
  `computeKillXp` in `combat/spawn.ts` - replaces the old linear
  `KILL_XP_BASE + level * KILL_XP_PER_LEVEL`). Each curve picks its own
  formula: `power` (`FIRST * L ^ EXPONENT`), `exponential` (`FIRST *
  GROWTH ^ (L - 1)`) or `parabola` (`FIRST` to `LAST` along progress²,
  gentle early and steep near max level). **Kills per level-up are not a
  setting** - they're calculated for each level as XP cost ÷ kill XP at
  that level (fighting same-level wilds). Defaults: both parabolas, XP
  50 -> 15,000 per level-up and kill XP 25 -> 515 (the old linear kill XP
  at Lv 1 and Lv 99), giving 2 kills for the first level-up, ≈11 at
  Lv 16, ≈22 at Lv 36, ≈29 near max (≈88 kills to Lv 16, ≈2,150 to
  Lv 100). The formulas live in `combat/levelCurveFormulas.ts`, shared by
  the game (XP table in `combat/levelCurve.ts`, kill XP in `spawn.ts`,
  both fed through `combat/levelCurveParams.ts`) and the Balance Lab,
  which charts XP per level-up and kill XP separately (other formulas as
  grey comparison lines) plus the calculated kills per level-up with
  running totals. (Before this, one `power` XP curve plus linear kill XP
  made kills per level *fall* at high levels - ≈3.3 at Lv 10, ≈1.4 at
  Lv 99, ~212 kills to Lv 100 in total.)
- **Level cap (confirmed):** `levelForXp` never returns above
  `MAX_LEVEL` (100, placeholder, `src/lib/game/constants.ts`), and
  `awardKillXp` skips an entry entirely once it's already at the cap -
  xp stops accumulating rather than piling up uselessly past the point
  `levelForXp` would clamp it anyway.

- **Save format v2 (confirmed):** the roster rework changed the save
  shape (`roster` + `hatchery` instead of `team`, no compendium field),
  so `CURRENT_SAVE_VERSION` is 2 under a new localStorage key
  (`digiclicker-saves-v2`). v1 saves are deliberately not converted -
  they stay untouched under the old key (never read, never deleted), so
  a converter could still be written later. Importing a v1 export file
  is rejected cleanly by the shape check.

## Proposed / not yet confirmed
Carried over from initial brainstorm — still open for discussion:
- Area bosses gate progression to new regions, themed by attribute
  (Vaccine/Data/Virus) or element. (Areas confirmed as PokeClicker-like
  in direction — see above — but this gating detail itself isn't decided.)
- Digi-Egg Data hatching costs per type (egg types themselves are now
  confirmed — see "Digi-Eggs" above; the mechanics around acquisition and
  hatching are proposed there too, not yet built).
- Possible prestige currency, further down the line.
