# DigiClicker content roadmap

Bosses, advantages, expeditions, Data, quests, Crests and special digivolutions - the plan for turning the idle loop into a game with decisions and goals.

## Context
The balance pass is merged (roster rework, Balance Lab, formula-driven timer and leveling). The game is now mechanically sound but has little to *do*: every fight is the same idle roster sum, and "progress" is only kill counts and levels. This roadmap turns the brainstorm into concrete, buildable features that add **decisions** (squads, matchups), **goals** (bosses, story, crests, special digivolutions) and **idle depth** (expeditions, Data). It is a reference for future sessions - each feature is built separately, in the order below, each on its own branch.

As each feature ships, move its description into `GAMEPLAY_DESIGN.md`'s "Confirmed" section and mark it done in the build order below.

**Decisions already made (from the conversation):**
- Kill-count mastery on the last path unlocks a **boss fight**; beating the boss unlocks the next region.
- Boss fights use a hand-picked **squad**; squad size is **per boss** (a balancing knob).
- **Advantage system, boss fights only:** attribute advantage (Vaccine > Virus > Data > Vaccine) = +50% stats, disadvantage = -25%; element advantage the same. They add: max +100% (both), min -50% (both against).
- Element = a **new `element` field** per species (curated mapping in the Python pipeline), not the egg families.
- **Data gates hatching:** eggs still incubate from kill XP; at the hatch level they wait "Ready - costs X Data" until paid.
- **Crests per egg family**: each Crest covers a few egg families; a Crest unlocks Ultimate for them, an awakened form unlocks Mega.
- Special digivolutions (Armor, DNA) are unlocked by **meaningful goals** (quests/story), not grinding.
- **Not decided yet (no commitment):** the storyline itself - chapters, NPCs, which region ends which part of the story - and **where/when Crests are obtained or awakened**. Features 5–7 below describe only the *mechanisms* (a generic unlock-flag system, the Crest requirement, the Armor/DNA flows); what triggers each unlock is designed later, when we get there.
- Expeditions return Data, eggs and **unique items**; Digimon element/type and level affect speed and haul.
- Signature moves: parked for the far future (too many species to author).

## Build order
| # | Feature | Depends on |
|---|---|---|
| 1 | Elements data + advantage math **(done)** | - |
| 2 | Boss fights + squads **(done)** | 1 |
| 3 | Expeditions (first real Data source) + unique items **(done)** | - (uses 1 for element bonuses) |
| 4 | Data-gated hatching **(done)** | 3 (players need Data first) |
| 5 | Unlock flags + quests framework **(done - story content: undecided)** | 2 |
| 6 | Crest requirement for Ultimate/Mega (how Crests are obtained: undecided) | 5 |
| 7 | Special digivolutions: Armor (Armor Digi-Eggs) and DNA (unlock triggers: undecided) | 5, 3 |
| 8 | Farming: Digi-Meat and other food (needs a design pass) | 3 |
| 9 | Region travel + village residents gating systems (story Act 1) **(done - Act 1 playable)** | 5 |
| 10 | Post-game: higher-level areas past Act 8, up to Huanglongmon (levels uncapped - replaces Limit Breaks) | 5 |

Features 1–4 are fully specified; 5–8 get a design pass (story, Crest sources/timing, farming details) before they're built.

Every new tunable goes into `src/lib/game/balance.json` (re-exported with docs in `constants.ts`) and, where it has a curve or matters for pacing, gets a control/chart in the Balance Lab (`src/balance/`). Every new saved state goes into `SaveSlotData` (`state/saveData.ts`) with a `normalize*` default in `persistence.svelte.ts`, so v2 saves keep loading.

---

## 1. Elements + advantage math - done

*Shipped: see GAMEPLAY_DESIGN.md "Elements & matchups". Final element set: Fire, Water, Plant, Electric, Earth, Wind, Metal, Light, Dark + Neutral (Ice folded into Water). Elements come mainly from each species' attacks (AttackImporter.py -> data/species_attacks.json), not just the raw type - the type alone misfiled e.g. Tentomon as Plant.*
**Goal:** every species gets an element; one pure function computes the advantage multiplier for (attacker, defender).

- **Data:** new `element_mapping.py` (same pattern as `egg_type_mapping.py` / `evolution_type_mapping.py`): curated map from the wiki's raw `type` (137 values, e.g. "Sea Beast", "Fallen Angel", "Vegetation") to ~10 elements - draft: **Fire, Water, Plant, Electric, Earth, Wind, Ice, Metal, Light, Dark** (+ **Neutral** fallback for no-signal types). `EvolutionGraphConverter.py` writes `element` (+ `elementSource`, mirroring `statAffinitySource`) into `digimon-evolution.json`. Add `element` to `DigimonSpecies` in `types.ts`.
- **Validation:** `validate_elements.py` in CI (like `validate_areas.py`): every in-game species has an element; report the per-element counts so no element is nearly empty.
- **Element chart:** `src/lib/data/elementChart.json` - `{ "Fire": ["Plant", "Ice"], "Water": ["Fire", "Earth"], ... }` (attacker -> elements it beats). Draft to tune when we build it; Light/Dark beat each other. Attribute triangle is fixed in code: Vaccine > Virus > Data > Vaccine; "Free"/"None"/unknown attributes are neutral.
- **Math:** new pure module `src/lib/game/combat/advantage.ts` (same style as `fightTimer.ts` - no constants import, shared with the lab):
  `advantageMultiplier(attacker, defender, params) = clamp(1 + attr + elem, MIN, MAX)` where each term is `+ADVANTAGE_BONUS` (0.5), `-DISADVANTAGE_PENALTY` (0.25) or 0 → range 0.5 .. 2.0.
- **balance.json:** `ADVANTAGE_BONUS` 0.5, `DISADVANTAGE_PENALTY` 0.25.
- **Where it applies:** boss fights only (feature 2) - scales **all four stats** of a squad member vs. that boss. Normal wild fights are unchanged (`computeRosterDamagePerHit` etc. stay as they are).
- **UI:** show attribute + element as small chips on the Stats window, roster cards and Compendium entries (reuse `getSpecies`).

## 2. Boss fights + squads - done

*Shipped: see GAMEPLAY_DESIGN.md "Boss fights & squads". Changes from the plan: beating a boss only marks the area cleared for now (no next region exists yet); rewards are bits + Data only (no roster prize); the timer is funded by squad HP via the fight-timer formula, and **normal wild fights are now untimed**.*
**Goal:** each region ends in a boss; picking the right squad matters.

- **Flow:** reaching `mastery.kills` on a region's final path (existing `recordActivePathKill` in `areas/areaProgress.ts`) now unlocks the **boss** (not the next region). Beating the boss unlocks the next region's starting path (cross-area unlock - the `"areaId:pathId"` form `AreaPath.unlocks` already anticipates).
- **Data (area JSON):** a path can carry `boss: { speciesId, level, squadSize, hpMultiplier, timerSeconds, rewards: { bits, data, items[] }, unlocks: ["areaId:pathId"] }`. Squad size and HP are per boss, so each can be balanced on its own. Forest Sector's boss: **Leomon** at Forest Heart (draft).
- **State:** `AreaProgressState` gains `bossesDefeated: string[]` and `bossUnlocked: string[]`; `combat` gains a `mode: 'wild' | 'boss'` plus the active squad.
- **Squad:** chosen in a **Boss prep screen** before each attempt (free choice every attempt - no lock-in), up to `squadSize` roster entries. The screen shows each candidate's advantage vs. the boss (the multiplier from feature 1) and sorts the best matchups first.
- **Combat:** a boss fight reuses the existing tick loop (`state/combat.svelte.ts` `tick`/`resolveKill`) with the squad instead of the whole roster: damage/attack-rate/timer computed from the squad's stats × `advantageMultiplier` (extend `computeEntryStatValue` callers with an optional multiplier rather than forking the formula). Timer = the boss's own `timerSeconds` (no roster-HP scaling, so squad HP matters via advantage only - revisit). Clicking still works.
- **Outcome:** win → rewards, `bossesDefeated`, next region unlocked, first-clear Compendium credit for the boss species (it joins the roster? - decide at build time); lose/timeout → back to wild mode, retry any time (no cost for now).
- **Balance Lab:** a "Boss check" panel - pick a boss and a squad composition (per-stage counts + advantage count) → required vs. dealt damage, like the existing Area check.
- **Mechanics (shields, phases):** out of scope here; designed per boss later.

## 3. Expeditions (Data, eggs, unique items) - done

*Shipped: see GAMEPLAY_DESIGN.md "Expeditions". First version: three Forest Sector destinations, one expedition at a time, parties of up to 3; loot is Data, eggs and boss chips (Attack Chip / Speed Chip / HP Disk). Seeds (farming) and Armor Digi-Eggs (Armor digivolution) are added with their features.*
**Goal:** idle depth with a trade-off, and the game's first real **Data** source.

- **Model (Digital World flavor):** "Survey unexplored zones" - each region has 1–3 **expedition destinations** (e.g. Forest Sector: *Overgrown Server Ruins*, *Misty Lake Shore*) with a **favored element**, duration and loot table. You send a party of 1–N roster entries; while away they **don't contribute to combat** (the trade-off). Destinations unlock with region progress (after its boss, or on reaching it).
- **Speed & haul:** `duration = base / (1 + LEVEL_SPEED_SCALE * avgLevel)`; haul multiplier `1 + ELEMENT_MATCH_BONUS * matchingMembers + STAGE_BONUS * avgStage`. All in balance.json and the lab.
- **Loot:** Data (always), eggs (of the destination's egg families, into the hatchery via `addEgg`), and **unique items** that give expeditions their own identity. Two kinds, kept strictly apart:
  - **Consumables** (stackable, worth finding repeatedly) - draft list, each with a real use:
    - **Recovery Floppy / Attack Chip / Defense Disk** - boss-fight buffs (feature 2).
    - **Seeds / rare crop cuttings** for the farm (feature 8) - expeditions find them, the farm grows them. Food itself mainly comes from farming, so the two loops don't overlap.
    These go through the existing `ITEM_CATALOG` / `inventory` system (`items/itemCatalog.ts`, `state/inventory.svelte.ts`).
  - **Key items** (permanent unlocks, found **once** - never consumed, so duplicates are never dropped): e.g. **Armor Digi-Eggs** (Armor digivolution, feature 7) as rare one-time discoveries at specific destinations. Stored as unlock flags (feature 5), not inventory counts; once found, that key item is removed from every loot table.
- **No Crest drops:** Crests are permanent keys too, so farming them makes no sense - expeditions never drop Crests or Crest pieces.
- **State:** `ExpeditionState { active: [{ id, destinationId, memberSpeciesIds, startedAt, endsAt }] }` - time-based (`Date.now()`), so it completes offline; resolved on load and on a timer. Max concurrent expeditions: a balance knob.
- **UI:** Expeditions screen (top bar), party picker (reuse roster cards + advantage-style element chips), a progress bar per expedition (reuse `XpBar`-style track), a "claim" step showing the haul.

## 4. Data-gated hatching - done

*Shipped: flat `HATCH_DATA_COST` (20 Data) for now rather than a per-family map.*
**Goal:** Data becomes the hatching currency; eggs stay idle-friendly.

- `tryHatch` (`eggs/eggs.ts`) stops auto-hatching: an egg reaching `EGG_HATCH_LEVEL` becomes **ready** (stays in its slot, stops gaining XP).
- Hatching a ready egg costs Data: `HATCH_DATA_COST` by egg family / mystery (balance.json map), paid from `currency.data` via a new `spendData` (mirror `spendBits` in `state/currency.svelte.ts`).
- The ready egg **occupies its incubation slot** until hatched, so unpaid eggs block the hatchery - pressure to spend, without destroying eggs. (Optional later: "auto-hatch when affordable" toggle, like auto-digivolve.)
- Sources of Data by then: expeditions (3) and boss rewards (2). The duplicate-hatch bonus (`TODO(human)` in `tryHatch`) lands in the same function - finish it before or with this feature.
- **UI:** hatchery slot shows "Ready" + cost; click to hatch; the sidebar Data pill finally means something.

## 5. Unlock flags + quests framework - done

*Shipped: see GAMEPLAY_DESIGN.md "Quests & progress flags". `src/lib/data/quests.json` holds four clearly marked placeholder quests (Jijimon, Tentomon, Leomon) until the storyline is written.*
**Goal:** the mechanism for meaningful goals - what will unlock Crests and special digivolutions. **The story content (chapters, NPCs, which region tells what, when things unlock) is not decided** - this feature only builds the machinery, with placeholder test quests.

- **Unlock flags:** one generic `flags: Record<string, true>` store that every gated system reads (e.g. `crest:courage`, `crest:courage:awakened`, `armor-unlocked`, `dna:omnimon`). Anything can set a flag - a quest, a boss, an expedition find - so the story can be designed later without touching the gated systems.
- **Quests:** one declarative format so quests are data, not code:
  `{ id, giver?, text, requirements: [{ kind: 'own-species'|'own-stage'|'own-element'|'defeat-boss'|'clear-path-under-seconds'|'deliver-item', ... }], rewards: { bits, data, items[], flags[] } }`.
  A single `checkQuest(requirement)` evaluator over existing state (`roster`, `areaProgress`, `inventory`) - new requirement kinds are a new `case`.
- **State:** `ProgressFlagsState { completedQuests: string[], activeQuests: string[], flags: Record<string, true> }`. Story structure (chapters etc.) can be layered on top later without changing this.
- **UI:** a quest log screen and a toast when a quest completes; where quests are offered (NPCs, region header) is decided with the story.

## 6. Crest requirement for Ultimate/Mega
**Goal:** Ultimate and Mega become milestones, not just levels. **Only the requirement mechanism is specified here - where, when and how Crests are obtained and awakened is not decided.**

- **Crests:** ~8 (Courage, Friendship, Love, Knowledge, Sincerity, Reliability, Hope, Light), each covering a few **egg families** - draft: Courage = Dinosaur+Dragon, Friendship = Beast, Love = Bird, Knowledge = Insect+Machine, Sincerity = Plant, Reliability = Aquatic+Mineral, Hope/Light = Holy (Evil: Darkness crest or shared - decide when authoring). Mapping in `src/lib/data/crests.json`.
- **Gate:** digivolving into an **Ultimate** requires the Crest for the *target's* egg family; into a **Mega** requires that Crest **awakened**. Implemented as an extra requirement in `evolution/requirements.ts` (`getRequirement` gains `crestId` / `awakened`; `isRequirementMet` checks the unlock flags from feature 5). The Evolution screen shows "Needs Crest of Courage" on locked options. A balance.json switch (`CREST_GATING_ENABLED`) keeps it off until Crests are actually obtainable.
- **Crests are permanent key items**, never consumed: owning one is an unlock flag, obtained exactly once. Digivolving doesn't spend it.
- **Getting them: undecided.** Candidates to weigh later: boss rewards, quest rewards, story-unlocked areas (not repeatable drops). Awakening likewise.
- **Existing saves:** already-owned Ultimates/Megas stay owned; only *new* digivolutions are gated.

## 7. Special digivolutions: Armor and DNA
**Goal:** bring the 70 Armor species and the 69 classified DNA fusions into play, behind meaningful goals. **What unlocks each one (which quest/boss/story beat) is not decided.**

- **Armor:** re-add `'Armor'` to `IN_GAME_STAGES`; a Rookie can Armor-digivolve into the targets its data lists (`evolvesTo` edges into Armor species) by **owning** the matching **Armor Digi-Egg** (Courage, Friendship, Love, ... - permanent key items found once, see feature 3; never consumed), once the flag `armor-unlocked` is set (trigger to be decided). Adds the target as a new roster entry, like normal digivolve (reuse `digivolve()` with a key-item requirement - `DigivolutionRequirement` gains `keyItem`, checked against the unlock flags).
- **DNA:** the `fusion`-classified `sameStageEvolutions` edges (EvolutionGraphConverter.py, `data/fusion_edges_review.md`) define pairs → result (e.g. WarGreymon + MetalGarurumon → Omnimon). Requires **owning both sources**, a flag per fusion (e.g. `dna:omnimon`; trigger to be decided), and consumes nothing (both stay - roster rules). Fusion data needs a curated `fusions.json` (pairs), since the raw edges list sources per result, not pairs.
- **UI:** Evolution screen gains an "Armor" and a "DNA" tab; locked entries explain their quest.

## 8. Farming: Digi-Meat and other food
**Goal:** a second idle loop - growing food - with its own small decisions, feeding Digimon directly. **Needs a design pass before building** (the points below are a draft, nothing here is decided).

- **Model (Digimon World flavor):** a **farm** with a few **plots** (more unlockable with bits). Each plot grows one crop over real time (`Date.now()`-based like expeditions, so it grows offline) and is harvested when ready - draft crops:
  - **Digi-Meat** - common, fast; feed for a little XP.
  - **Giant Meat** - slower; a lot of XP.
  - **Sirloin / Supercarrot / Deluxe Mushroom** - rare (grown from expedition seeds, feature 3); boss-fight buffs (e.g. +20% Attack for the next boss fight) or a small permanent bonus.
- **Farmhands:** optionally assign roster Digimon to a plot to speed it up or raise its yield - **Plant/Earth** elements (feature 1) and level help. Like an expedition party, farmhands **don't fight** while assigned (reuse feature 3's "Digimon away" state rather than a second one).
- **Feeding:** a "Feed" action on a roster entry (roster menu / Stats window) spends food for XP - a way to push a chosen Digimon toward a digivolution level without farming kills for the whole roster.
- **Division of labour with expeditions:** expeditions *explore* (Data, eggs, key items, seeds); the farm *produces* (food). Food isn't a regular expedition drop.
- **Hooks already waiting:** the "farming specialization" special abilities parked in GAMEPLAY_DESIGN.md ("Special Abilities") plug in here - e.g. a +yield ability for farmhands.
- **Tunables:** grow times, yields, XP per food, plot costs in `balance.json`; a Balance Lab chart of food XP per hour vs. kill XP per hour, so feeding stays a supplement to combat rather than a replacement.
- **Open questions for the design pass:** is food bought/planted with bits or seeds only; how many plots; does a plot need care (watering) or is it pure idle; is farming unlocked from the start or after the first boss.

## 9. Region travel + residents gating systems
**Goal:** the story's first act playable end to end. See STORY.md sections 3-4.
- Real **multi-region travel** - **map done**: a PokeClicker-style region map (one per act, `regions.json` + `RegionMap.svelte`) with travel to any unlocked path. Still to do: the next areas' data, so boss `unlocks` (and story flags) actually open them.
- **Residents unlock systems**: expeditions, the Shop, the Mystery Egg stall and hatchery upgrades each check a flag set by an Act 1 quest (Tentomon, Andromon, the Yokomon villagers, Elecmon).
- Act 1's seven new regions, bosses and quest chain, built from STORY.md.

## 10. Limit Breaks (level cap above 100)
> **Superseded mechanism (2026-09-26):** levels are now uncapped - the wilds' levels soft-cap them (GAMEPLAY_DESIGN.md "No level cap").
>
> **Decided (2026-09-26):** the post-game's progression is **higher-level areas** past Act 8, climbing well above the Act 8 final boss's level, with **Huanglongmon** as the far-higher summit. No cap to raise - the new areas' wild levels are the ceiling. On the current HP curve (`((L + 20) / 21) ^ 3.5`, a Digimon's damage ~ level²), each doubling of level makes same-stage fights ~2.3-2.5x longer at an equal level (x1.5 level: ~1.6x; x3: ~4x), so stages, roster and partners still have to carry part of the climb - tune with the simulator once Act 8's levels exist. Whether "Limit Breaks" survive as a name (e.g. story beats that open each higher tier) is open.

**Goal:** the post-game's progression. See STORY.md section 8.
- `MAX_LEVEL` rises in steps (100 → 150) as Limit Breaks are earned from post-game bosses; the XP curves (feature: leveling curves) continue past Lv 100.
- One global cap for the whole roster (decided); the XP curve stays as is - XP-gain boosts come through the story instead (STORY.md 8.1b).

## Parked
- **Signature moves** - per-species active moves; revisit when a small curated set (e.g. only Megas or boss-relevant lines) is feasible.
- **Boss mechanics** (shields, phases, enrage) - per boss, after feature 2.
- **Prestige** - far future.

## Verification (per feature)
- `npm run check` + `npx vite build` clean.
- Headless logic scripts through Vite `ssrLoadModule` (as used for the roster rework) for each pure module: advantage multiplier table (all 9 attribute pairs × element pairs, clamps at 0.5/2.0), boss win/lose flow, expedition completion across a simulated `Date.now()` jump, Data-gated hatch (ready egg blocks slot; paying hatches), quest evaluator per requirement kind, crest gate on `requirements.ts`.
- Python data changes: new validator in CI passes; `EvolutionGraphConverter.py` regenerates `digimon-evolution.json` without dropping existing fields.
- Save round-trip: an existing v2 save loads with the new state defaults; new state survives save/load.
- Balance Lab: new knobs editable and saved; boss check panel matches an in-game boss attempt.
- Manual play-through in the dev server for the UI of each feature.
