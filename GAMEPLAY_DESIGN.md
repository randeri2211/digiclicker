# DigiClicker — Gameplay Design Notes

Running log of gameplay decisions. Split into **Confirmed** (locked in) and
**Proposed** (brainstormed, not yet decided).

## Confirmed

### Core approach: Hybrid model
- Player tames a roster of Digimon (PokeClicker-style collection/breadth).
- Each individual Digimon independently climbs its own digivolution line
  (Baby → In-Training → Rookie → Champion → Ultimate → Mega, branching paths).
- Completionist goal is a **Digivolution Compendium**: having obtained every
  evolution *form* of every line, not just one dex entry per species.

### Core click loop
- Player is in a Digital World area; clicking attacks a wild Digimon spawn.
- Defeating a wild Digimon grants Bits (currency) and a chance to scan/tame
  it into the player's roster.

### Team structure
Two independently expandable sets of team slots:
- **Active slots** — Digimon that deal damage in the click/combat loop.
- **Training slots** — Digimon that don't fight, but passively receive a
  share of combat XP.

**XP distribution rule:** XP-per-kill is a flat amount awarded to *every*
team member (active + training) — it does not get divided/diluted as team
size grows. E.g. a kill worth 35 XP gives all 5 members 35 XP each;
expanding to 10 slots still gives every member 35 XP, not 17.5 XP each.
Net effect: growing team size is a pure multiplier on total XP earned per
kill, which makes slot expansion (via currency/progression) a meaningful,
non-wash upgrade — more slots = strictly more total training throughput.

### Digivolution UI & automation
- Digimon level up through normal play; once eligible to digivolve, they're
  flagged "ready."
- A small button (likely in the main HUD) shows a badge/indicator with the
  count of Digimon currently ready to evolve.
- Clicking that button opens an **Evolution screen** listing all Digimon
  ready to evolve. Clicking one shows its available next-stage options
  (branching digivolutions) for the player to pick from manually.
- **Settings: automatic digivolution mode**, one of three:
  1. **Off** — fully manual; every evolution is chosen in the Evolution
     screen.
  2. **Repeat last path** — for a given Digimon line, if it was previously
     digivolved into a specific next form, automatically repeat that same
     choice the next time a Digimon on that line becomes eligible (no
     screen visit needed).
  3. **Digivolve by selection (pin)** — in the Evolution screen, the player
     can pin a specific target evolution for a line ahead of time; once a
     Digimon on that line becomes eligible, it auto-evolves into the pinned
     target as soon as it's available.

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
- Because digivolution stats are form-independent and only accumulate, they
  persist through every future form change. This makes repeated
  digivolve/de-digivolve cycling a permanent, grindable progression layer
  on top of raw form/level progression — total power = current form's base
  stats + the Digimon's accumulated digivolution stats.
- **Cost mechanism (confirmed):** both digivolving and de-digivolving reset
  the Digimon's level back to 1, so reaching the next digivolution threshold
  again means re-grinding combat XP from scratch either way — this is the
  natural cost that bounds the digivolve/de-digivolve/re-digivolve loop, no
  separate currency needed. De-digivolving still has no *level requirement
  to trigger it* (you can de-digivolve at any level, unlike digivolving up
  which requires hitting the stage's level threshold) — the reset happens
  as a result of the transition, not as a precondition for starting one.
- **Open question:** because de-digivolving is unrestricted, a player could
  digivolve up the moment they hit the threshold and immediately
  de-digivolve right back down, re-grinding the same cheap low-level
  threshold repeatedly to farm digivolution-stat bonuses fast. A proposed
  mitigation is a cooldown between digivolving and being allowed to
  de-digivolve again (i.e. a minimum time spent in the new form before it
  can be reverted) — not yet decided.

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
- **Speed drives attack rate**: `attacksPerSecond = 1 + teamSpeedSum *
  SPEED_TO_APS_SCALE` (placeholder constants, see
  `src/lib/game/combat/damage.ts`). This is a shared, team-wide rate -
  one clock for the whole active team, not a rate per Digimon.
- **Attack + SpecialAttack drive damage/hit**: each active member
  contributes `attack + specialAttack` (from baseStats + level *
  growthPerLevel + digivolutionStats) to the team's flat per-hit
  damage total; the whole team hits as one combined blow each tick,
  not member-by-member.
- **Defense is still inert** - no damage-mitigation mechanic exists
  yet on the wild-Digimon side. Speed graduated from inert to
  attack-rate-relevant this session; Defense is the one remaining
  stat with no live mechanical effect.
- The sidebar shows a live **Team DPS** panel (total + each active
  member's individual DPS share at the shared team attack rate) above
  the Active Team section.
- **Tuning note:** per-hit damage currently reads as too high (base
  stat/growth/digivolution-bonus scale constants in
  `src/lib/game/combat/stats.ts` - `BASE_STAT_SCALE`,
  `GROWTH_PER_LEVEL_SCALE`, `DIGIVOLUTION_BONUS_SCALE` - are still
  early placeholders). Not yet retuned - open balance work.

### Idle production
- Active-slot auto-attack (see Core click loop) *is* the idle/offline
  production mechanic for now — no separate farm/area-assignment system.
- A dedicated farming system may be added later, but as a fully independent
  system, not folded into the Active/Training slot mechanic.

### Areas / regions
- Directionally similar to PokeClicker (progress through areas, presumably
  gated by defeating something to unlock the next). Exact structure —
  how gating works, whether areas restrict which evolution stages spawn,
  etc. — deferred to a later planning session.

### Taming mechanic
- Defeating a wild Digimon gives a chance to tame it: a flat **base
  chance**, scaled by the level difference between the wild Digimon and
  the player (presumably favoring the player at higher relative level),
  up to a cap — not a straight line to 100%.
- Items that manipulate the base taming chance are a later addition, not
  needed for the first pass.

### Currency: Bits and Data
- **Bits** (combat currency) buy **items**, including **Data**.
- **Data** is spent to hatch Digi-Eggs; the amount/type of Data required
  depends on the egg's type. Which egg types exist and their exact Data
  costs are still to be figured out.

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

## Proposed / not yet confirmed
Carried over from initial brainstorm — still open for discussion:
- Area bosses gate progression to new regions, themed by attribute
  (Vaccine/Data/Virus) or element. (Areas confirmed as PokeClicker-like
  in direction — see above — but this gating detail itself isn't decided.)
- Digi-Egg types and their Data hatching costs (mechanic itself is now
  confirmed — see Currency: Bits and Data above).
- Possible prestige currency, further down the line.
