# DigiClicker — Gameplay Design Notes

Running log of gameplay decisions. Split into **Confirmed** (locked in) and
**Proposed** (brainstormed, not yet decided).

## Confirmed

### Core approach: Hybrid model
- Player tames a roster of Digimon (PokeClicker-style collection/breadth).
- Each individual Digimon independently climbs its own digivolution line
  (Baby → In-Training → Rookie → Champion → Ultimate → Mega, branching paths).
- Completionist goal is a **Digivolution Compendium (confirmed, built)**:
  having obtained every evolution *form* of every line, not just one dex
  entry per species. Tracked as a **permanent record** (`CompendiumState`
  in `types.ts`, `state/compendium.svelte.ts`) - once a species is
  revealed to the player it stays credited forever, even if every
  instance of that form is later lost (no release/discard mechanic
  exists yet, but the record is built to behave like a real Pokédex
  regardless). Recorded at the three actual reveal moments only -
  starter team creation, egg hatch, and digivolve/de-digivolve - never
  at raw instance creation, since a freshly-dropped egg's species is
  already resolved internally (`formHistory`) well before the player
  ever sees it; crediting on creation would leak the species early.
  `CompendiumScreen.svelte` shows a stage-filterable grid over all 1296
  `IN_GAME_STAGES` species (not just yours); undiscovered entries render
  as a genuine "???" placeholder with nothing species-identifying in the
  DOM, not just visually hidden. Old saves (pre-dating this feature) are
  migrated once, on first load, by backfilling from each team member's
  existing `formHistory` - so no progress is lost - while still excluding
  any instance that's currently an unhatched egg. Pure tracker for now,
  no completion rewards.

### Core click loop
- Player is in a Digital World area; clicking attacks a wild Digimon spawn.
- Defeating a wild Digimon grants Bits (currency) and a rare chance to
  drop a Digi-Egg (see "Digi-Eggs" below).

### Team structure
Two independently expandable sets of team slots:
- **Active slots** — Digimon that deal damage in the click/combat loop.
  Base (starting) active capacity is **6** slots
  (`STARTER_ACTIVE_CAPACITY` in `src/lib/game/constants.ts`), all
  unlocked from the start of a new game - only 1 is filled by the
  starter Digimon, the rest are empty until roster growth (hatching
  Digi-Eggs, or later mechanics) fills them.
- **Training slots** — Digimon that don't fight, but passively receive a
  share of combat XP.

**XP distribution rule:** XP-per-kill is a flat amount awarded to *every*
team member (active + training) — it does not get divided/diluted as team
size grows. E.g. a kill worth 35 XP gives all 5 members 35 XP each;
expanding to 10 slots still gives every member 35 XP, not 17.5 XP each.
Net effect: growing team size is a pure multiplier on total XP earned per
kill, which makes slot expansion (via currency/progression) a meaningful,
non-wash upgrade — more slots = strictly more total training throughput.

### Team slot menu & Digimon Hub
- Clicking a filled Active or Training team slot opens a context menu
  (positioned next to the cursor, closes on outside click/Escape) with
  per-slot actions: **Open Stats** (a small table of Attack/HP/
  Speed/SpecialAttack, Base vs. Digivolution columns), and moving the
  Digimon between buckets - **Send To Training Team** / **Send To
  Active Team** (greyed out when the destination is full), and
  **Remove From Team** (sends it to the Digimon Hub).
- **Digimon Hub**: a new screen (reachable from the top bar) listing
  every caught Digimon that isn't on the Active or Training team. A
  checkbox toggle ("Also show Active/Training Team members") widens
  the list to include the current teams too, rather than a fixed
  filter - each card there opens the same bucket-aware context menu.
- Implementation is deliberately generic rather than one menu per team
  kind: a single `ContextMenu.svelte` (pure popup, no game logic) plus
  a single `getTeamSlotMenuItems(instance, bucket, callbacks)` builder
  (`src/lib/game/team/teamMenu.ts`) that switches on
  `'active' | 'training' | 'reserve'` - adding a new action later is a
  one-line change there, not a new component. `TeamState` gained a
  third, uncapped `reserveMembers` bucket (the Hub's backing store)
  alongside the existing capacity-limited `activeMembers`/
  `trainingMembers`; `moveMember(instanceId, toBucket)`
  (`src/lib/game/team/teamActions.ts`) is the one generic mover between
  all three buckets.

### Digivolution UI & automation
- Digimon level up through normal play; once eligible to digivolve, they're
  flagged "ready."
- A small button (likely in the main HUD) shows a badge/indicator with the
  count of Digimon currently ready to evolve.
- Clicking that button opens an **Evolution screen** listing all Digimon
  ready to evolve. Clicking one shows its available next-stage options
  (branching digivolutions) for the player to pick from manually.
- **Auto-Digivolve (confirmed, built):** the original design called for
  three separate modes (Off / Repeat last path / Digivolve by pin) - built
  instead as **one unified preference system**, since "repeat last" and
  "pin ahead of time" are really just two ways of setting the same thing.
  `DigivolveAutomationState` (`types.ts`) holds a global `enabled` toggle
  (Settings screen checkbox) plus `preferences: Record<sourceSpeciesId,
  {targetSpeciesId, minLevel}>` - keyed by the Digimon's *current* species,
  not an abstract "line" (the evolution graph is a multi-parent DAG, so
  "current form" is the only well-defined key). Every manual digivolve
  (`digivolve()` in `evolution/digivolve.ts`) records/overwrites that
  source species' preference automatically, regardless of whether
  automation is enabled - turning it on later immediately benefits from
  however you already played. The Evolution screen also lets you pin a
  target ahead of time with a custom **minLevel** - an extra floor on top
  of (never replacing) the target's normal level requirement, letting a
  Digimon "cook" longer before auto-firing (relevant since pre-transition
  level feeds the digivolution-stat bonus). Pinning is explicit two-step
  (Pin -> edit the level -> **Confirm**) rather than live-as-you-type -
  nothing is written until Confirm, and the entered level is capped to
  `MAX_LEVEL`. Confirm also checks eligibility immediately: if the
  Digimon already meets both the normal requirement and the level just
  confirmed, it digivolves right then instead of silently waiting for the
  next kill to notice. Checked on every xp award (`tryAutoDigivolve` in
  `awardKillXp`, alongside egg-hatch checking) - otherwise fires
  silently, no screen visit needed. Scoped to digivolve-**up** only;
  de-digivolve stays manual, since it now costs a purchased item and
  auto-spending currency without an explicit per-instance action wasn't
  part of the ask.

### Stat system: base stats vs. digivolution stats
- Each Digimon has two categories of stats:
  - **Base stats** — determined by current form; change whenever the
    Digimon's form changes (digivolve or de-digivolve).
  - **Digivolution stats** — NOT dependent on current form. A persistent
    bonus pool layered on top of whatever base stats the current form has.
- **De-digivolution**: a Digimon can revert **one level down** to whatever
  the evolution graph says leads to its current form (the current species'
  direct predecessors) — not an arbitrary earlier point in the instance's
  own personal history, and not further back than one step at a time.
- De-digivolving to a lower form grants Digivolution stat bonuses, added on
  top of that lower form's base stats (not replacing them).
- The Digimon's **level right before the transition** (digivolve or
  de-digivolve resets it to 0 afterward) also feeds into that
  transition's Digivolution stat bonus, on top of the usual stage/type
  amount - a small `LEVEL_IMPACT_SCALE` (0.1, placeholder) added per
  level, scaled by the same dominant/off factor as everything else so
  attack-type Digimon still gain more Attack than HP/Speed/
  SpecialAttack from the level they're cashing in
  (`src/lib/game/combat/stats.ts`).
- Because digivolution stats are form-independent and only accumulate, they
  persist through every future form change. This makes repeated
  digivolve/de-digivolve cycling a permanent, grindable progression layer
  on top of raw form/level progression — total power = current form's base
  stats + the Digimon's accumulated digivolution stats.
- **Cost mechanism (confirmed):** both digivolving and de-digivolving reset
  the Digimon's level back to 1, so reaching the next digivolution threshold
  again means re-grinding combat XP from scratch either way — this is the
  natural cost that bounds the digivolve/de-digivolve/re-digivolve loop, no
  separate currency needed. The reset happens as a result of the
  transition, not as a precondition for starting one.
- **Level-gate baseline (confirmed):** digivolving up requires a minimum
  level first, keyed off the *target's* stage (see
  `DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE` in `src/lib/game/constants.ts`):
  - Digivolve to Champion: **Lv 16**
  - Digivolve to Ultimate: **Lv 36**
  - Digivolve to Mega: **Lv 56**
  - Digivolve to In-Training/Rookie: no requirement yet (not specified,
    defaults to open).
- **De-digivolve requirement (confirmed, superseded the old level gate):**
  de-digivolving no longer uses a level gate at all - it costs a
  consumable **De-Digivolution Crystal** (bought with Bits, see the
  Inventory/Shop screen; `DEDIGIVOLVE_ITEM_ID`/`DEDIGIVOLVE_ITEM_COUNT` in
  `constants.ts`), consumed on commit. This directly closes the
  farm-by-cycling concern that used to be an open question here (a flat
  Lv 4 gate made digivolve-up-then-immediately-de-digivolve-down a nearly
  free repeatable loop) - de-digivolving now costs a real, earned
  resource every time, not just a trivial level checkpoint.
- **Playable stage scope (confirmed, temporary):** only In-Training,
  Rookie, Champion, Ultimate, and Mega stage Digimon are searched/offered
  as digivolve or de-digivolve options right now
  (`IN_GAME_STAGES` in `src/lib/game/constants.ts`). Fresh, Armor,
  Hybrid, Ultra, Burst Mode, and Unknown-stage species stay fully present
  in the scraped data (`src/lib/data/digimon-evolution.json`) - nothing
  is deleted - they're just excluded from the live evolution-option
  search until support for them (item-triggered Armor evolution,
  Hybrid's separate mechanic, DNA/Jogress multi-source fusion, etc.) is
  actually built. Re-enabling a stage later is a one-line change to
  `IN_GAME_STAGES`, no data regeneration needed.

### Special Abilities (confirmed, built - stat-boost tier)
- Each Digimon **instance** can hold one special ability
  (`DigimonInstance.abilityId`) - null until an **Ability Reroll
  Crystal** (bought in the Shop, same pattern as the De-Digivolution
  Crystal) is used on it via a new "Use Ability Reroll" action in the
  Hub/team context menu (`getTeamSlotMenuItems`). The item is the *only*
  source - nothing rolls an ability automatically at creation.
- `ABILITY_CATALOG` (`src/lib/game/abilities/abilityCatalog.ts`) has 12
  entries: 4 stats (Attack/HP/Speed/SpecialAttack) x 3 rarity tiers
  (Minor +5%, Major +10%, Superior +20%, placeholders) - a weighted pool
  (Minor common, Superior rare), same convention as area spawn weights
  and Mystery Egg pools. Using the item re-rolls a fresh weighted pick,
  can reroll into the same ability again (no dedup).
- **Persists across digivolve/de-digivolve** - a property of this
  specific Digimon, not its current form, unlike `baseStats`/
  `growthPerLevel` which reroll every transition (same permanence as
  `digivolutionStats`).
- The bonus applies via one shared `computeInstanceStatValue(instance,
  statKey)` (`combat/damage.ts`) - `base + level*growth +
  digivolutionStats`, then `* (1 + ability%)` if the ability targets
  that exact stat. Every combat formula (damage/hit, attack rate, the
  fight timer's team HP sum) *and* the Stat window's "Current" column
  now call this one function, replacing what used to be two separately-
  maintained copies of the same formula.
- Planned but explicitly deferred: farming/resource-gathering
  specialization abilities, once a farming system exists to specialize
  in (see "Idle production" above - still not built).

### Combat: attack ticks and damage
- Combat runs on **discrete attack ticks**, not a smooth per-second HP
  drain: the active team shares one attack clock (attacks/second), and
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
  + teamSpeedSum * SPEED_TO_APS_SCALE` (placeholder constants, see
  `src/lib/game/constants.ts`). This is a shared, team-wide rate - one
  clock for the whole active team, not a rate per Digimon.
- **Attack + SpecialAttack drive damage/hit**: each active member
  contributes `attack + specialAttack` (from baseStats + level *
  growthPerLevel + digivolutionStats) to the team's flat per-hit
  damage total; the whole team hits as one combined blow each tick,
  not member-by-member.
- **Fights are timed - HP funds the timer (confirmed, built):** every
  wild encounter has a time limit, `FIGHT_TIMER_BASE_SECONDS` (5,
  placeholder) plus a flat `FIGHT_TIMER_SECONDS_PER_HP` bonus per point
  of the active team's summed **HP** stat (`computeFightTimeLimitMs` in
  `combat/spawn.ts`, `computeTeamHp` in `combat/damage.ts`) - fixed once
  at spawn, doesn't change if team HP changes mid-fight. If the timer
  runs out before the wild is defeated, the encounter ends with **no
  reward** (no XP/Bits/egg roll) - same as never having fought it - and
  a fresh wild spawns right after, same gap as a normal kill. This is
  what finally gives the renamed **HP** stat (formerly Defense) a live
  mechanical effect - it was the last of the four stats with no formula
  behind it; Speed (attack rate), Attack/SpecialAttack (damage), and now
  HP (fight duration) all matter. A `TimerBar` next to the HP bar shows
  the countdown, reading the wild's already-ticking `lastTickAt` as its
  clock rather than polling a separate timer.
- The sidebar shows a live **Team DPS** panel (total + each active
  member's individual DPS share at the shared team attack rate) above
  the Active Team section.
- **Tuning note:** per-hit damage currently reads as too high (base
  stat/growth/digivolution-bonus scale constants in
  `src/lib/game/constants.ts` - `BASE_STAT_SCALE`,
  `GROWTH_PER_LEVEL_SCALE`, `DIGIVOLUTION_BONUS_SCALE` - are still
  early placeholders). Not yet retuned - open balance work.
- **All tunable numbers now live in one file**:
  `src/lib/game/constants.ts` centralizes every placeholder/balance
  constant across the game (team size, level requirements, in-game
  stage scope, combat/attack-rate constants, stat-roll scales, level
  curve, wild spawn/reward formulas, autosave interval), grouped by
  relevance - edit there to rebalance instead of hunting through
  individual combat/evolution files.

### Idle production
- Active-slot auto-attack (see Core click loop) *is* the idle/offline
  production mechanic for now — no separate farm/area-assignment system.
- A dedicated farming system may be added later, but as a fully independent
  system, not folded into the Active/Training slot mechanic.

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
- **Hatching (confirmed, built):** an egg is a normal `DigimonInstance`
  with a non-null `eggState: { eggType, hatchAtLevel }` - its `speciesId`
  is already resolved (decided the moment it dropped) but hidden behind
  the egg sprite/name everywhere it's displayed. It hatches by being
  leveled up like a real team member (occupying an active/training slot,
  gaining xp through combat exactly like any other member - checked via
  `tryHatch()` every time `awardKillXp` runs); once its level crosses
  `EGG_HATCH_LEVEL`, `eggState` clears and **xp resets to 0**, same as
  digivolve/de-digivolve - every form transition resets on the same
  uniform rule, not just to bound a re-loop exploit (hatching has none,
  since there's no un-hatching).
- **Where a dropped egg lands (confirmed, built):** always
  `reserveMembers` - since only active/training members gain xp, a
  reserve-parked egg is naturally "not progressing" with zero
  special-casing, and moving it into a real slot to start hatching reuses
  the Digimon Hub / team-slot context menu UI already built for moving
  any Digimon between buckets. A settings preference to auto-route
  hatched Digimon to a chosen bucket is still a proposed future
  refinement, not built.
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
  drops it straight into `reserveMembers`, same landing spot as a
  kill-drop egg. Same hatching mechanics either way - only display
  differs: a Mystery egg shows "Mystery {Type} Digi-Egg" (vs. a
  kill-drop's plain "Digi-Egg ({Type})") and a "?" badge overlaid on the
  sprite (`DigimonInstance.eggState.isMystery`, `isMysteryEgg`/
  `getInstanceDisplayName` in `images.ts`), so a mystery egg is never
  mistaken for a real wild-caught one.

## Technical notes

### Evolution graph
- Evolution relationships need to be modeled as a graph, not a flat list:
  each Digimon *form* is a node, each "digivolves to" relationship is a
  directed edge from a lower form to a higher form.
- De-digivolution is just traversing an edge backwards — no separate
  structure needed, the same graph serves both directions (query outgoing
  edges for "what can this digivolve to," incoming edges for "what forms
  led here").
- Nodes need queryable/sortable properties beyond identity, at minimum:
  **stage** (In-Training / Rookie / Champion / Ultimate / Mega / ...), and
  likely attribute (Vaccine/Data/Virus/...) and type/element down the line.
- Needed early since it directly underpins already-confirmed mechanics: the
  Evolution screen (listing a Digimon's available next forms), de-digivolution
  (listing prior forms), and the base-vs-digivolution stat system (tracking
  which forms a given Digimon has passed through).
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
  report - Bombmon, Fresh, was showing a de-digivolve option to
  DeckerGreymon, Ultimate - traced to the classifier never flagging
  negative-gap edges at all, and even letting them leak into the
  reachability walk used for shortcut/path classification of *other*
  species. For now `getDigivolveOptions`/`getDedigivolveOptions`/
  `isReadyToDigivolve` (`src/lib/game/evolution/digivolve.ts`) exclude
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
- **Level cap (confirmed):** `levelForXp` never returns above
  `MAX_LEVEL` (100, placeholder, `src/lib/game/constants.ts`), and
  `awardKillXp` skips a member entirely once it's already at the cap -
  xp stops accumulating rather than piling up uselessly past the point
  `levelForXp` would clamp it anyway.

## Proposed / not yet confirmed
Carried over from initial brainstorm — still open for discussion:
- Area bosses gate progression to new regions, themed by attribute
  (Vaccine/Data/Virus) or element. (Areas confirmed as PokeClicker-like
  in direction — see above — but this gating detail itself isn't decided.)
- Digi-Egg Data hatching costs per type (egg types themselves are now
  confirmed — see "Digi-Eggs" above; the mechanics around acquisition and
  hatching are proposed there too, not yet built).
- Possible prestige currency, further down the line.
