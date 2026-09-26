// Act 1 pacing simulator - plays the game headlessly with the REAL game
// code (loaded through Vite, like the game itself) and a simulated clock,
// then reports how long each area takes and whether each boss is winnable.
//
//   npm run simulate                      # defaults
//   npm run simulate -- --hours=120 --seed=7 --clicks=0 --grind=30
//   npm run simulate -- --set=KILL_XP_SPLIT_EXPONENT:1   # try a balance value
//   npm run simulate -- --runs=10                        # 10 seeds, medians
//   npm run simulate -- --runs=20 --workers=4            # parallel (default: cores - 1)
//   npm run simulate -- --runs=20 --tune --boss-hours=1  # suggest boss HP multipliers
//
// Only the player's DECISIONS live here (where to fight, what to digivolve,
// which squad to take); every formula, reward and unlock is the game's own:
// farming is fastForwardWildCombat (the offline-progress code), boss fights
// are startBossFight + tick at the real 250 ms rate. So a change to
// balance.json shows up here exactly as it would in play.

import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v === undefined ? true : v]),
);
const MAX_HOURS = Number(args.hours ?? 96);
const SEED = Number(args.seed ?? 1);
// Clicks per second during boss fights (an idle player clicks there if
// anywhere) - 6 matches the boss prep screen's "clicking" estimate.
const BOSS_CLICKS_PER_SECOND = Number(args.clicks ?? 6);
// A wild that takes longer than this to kill means "too slow here - grind
// the best path that's still quick instead".
const GRIND_KILL_SECONDS = Number(args.grind ?? 20);
const CHUNK_MS = 5 * 60_000; // decisions are made every 5 simulated minutes
const BOSS_RETRY_MS = 30 * 60_000;
const STUCK_MS = 12 * 3_600_000; // no new unlock or quest for this long = stuck
// --tune: instead of judging the bosses, find their HP multipliers. Each
// boss is left alone for --boss-hours after it appears (the player farms),
// then set to TUNE_MARGIN x the multiplier today's squad exactly beats, and
// fought - so every later boss is tuned against the squad a player really
// has by then. The report gives the median per boss across seeds.
const TUNE = Boolean(args.tune);
const TUNE_AFTER_MS = Number(args['boss-hours'] ?? 1) * 3_600_000;
const TUNE_MARGIN = Number(args.margin ?? 0.95);

// ---- Deterministic world: seeded randomness, simulated clock -------------
let s = SEED >>> 0 || 1;
const reseed = (seed) => (s = seed >>> 0 || 1);
Math.random = () => {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const START = Date.UTC(2026, 0, 1);
let now = START;
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

// A bare Vite server just to load the game's TypeScript/Svelte modules.
// Safe to start many at once (parallel --runs): no vite.config.ts (only
// the Svelte plugin is needed; bundling the config writes a shared temp
// file), a private cache dir per process, and no HMR/websocket server.
const { createServer } = await import('vite');
const { svelte } = await import('@sveltejs/vite-plugin-svelte');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const server = await createServer({
  root: ROOT,
  configFile: false,
  plugins: [svelte()],
  cacheDir: join(tmpdir(), `digiclicker-sim-${process.pid}`),
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false },
});
const load = (path) => server.ssrLoadModule(path);
// --set=KEY:value,KEY2:value overrides balance.json for this run only. The
// balance object is patched before any game module reads it (constants.ts
// copies values out at import time).
const overrides = String(args.set ?? '').split(',').filter(Boolean).map((pair) => pair.split(':'));
if (overrides.length) {
  const balance = (await load('/src/lib/game/balance.json')).default;
  for (const [key, value] of overrides) {
    if (!(key in balance)) throw new Error(`--set: unknown balance key ${key}`);
    balance[key] = Number(value);
  }
}
const g = await load('/src/lib/game/state/game.svelte.ts');
const C = await load('/src/lib/game/state/combat.svelte.ts');
const E = await load('/src/lib/game/state/expeditions.svelte.ts');
const D = await load('/src/lib/game/combat/damage.ts');
const S = await load('/src/lib/game/combat/spawn.ts');
const Ev = await load('/src/lib/game/evolution/digivolve.ts');
const Eggs = await load('/src/lib/game/eggs/eggs.ts');
const K = await load('/src/lib/game/constants.ts');
const { levelForXp } = await load('/src/lib/game/combat/levelCurve.ts');
const { getSpecies, getSpeciesName } = await load('/src/lib/game/images.ts');
const X = await load('/src/lib/game/expeditions/expeditions.ts');
// The simulated clock takes over only now - Vite's own startup uses
// Date.now (e.g. for temp file names) and must see the real time.
Date.now = () => now;

// ---- Helpers ---------------------------------------------------------------
const hms = (ms) => {
  const m = Math.round(ms / 60_000);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
const at = () => hms(now - START);
const log = [];
const note = (text) => log.push(`${at().padStart(7)}  ${text}`);
const areaIds = Object.keys(g.AREAS);
const P = g.areaProgress;
const unlocked = (a, p) => g.isPathUnlocked(P, a, p);
const orderedPaths = () => areaIds.flatMap((a) => Object.keys(g.AREAS[a].paths).map((p) => [a, p]));
const fighters = () => E.getFightingRoster();
const bestLevel = () => Math.max(...Object.values(g.roster).map((e) => levelForXp(e.xp)));

/** Seconds to kill an average wild on a path with the current roster. */
function killSeconds(areaId, pathId) {
  const path = g.getPath(areaId, pathId);
  const f = fighters();
  const aps = D.computeAttacksPerSecond(f), dph = D.computeRosterDamagePerHit(f);
  if (aps <= 0 || dph <= 0) return Infinity;
  const saved = Math.random; // sampling spawns mustn't disturb the run's randomness
  let hp = 0;
  for (let i = 0; i < 20; i++) hp += S.pickNextWildSpawn(now, path).maxHp;
  Math.random = saved;
  return Math.ceil(hp / 20 / dph) / aps + K.COMBAT_TICK_INTERVAL_MS / 1000;
}

/** Where to fight: the newest unfinished path, unless it's too slow. */
function choosePath() {
  const open = orderedPaths().filter(([a, p]) => unlocked(a, p));
  const frontier = open.at(-1);
  if (killSeconds(...frontier) <= GRIND_KILL_SECONDS) return { path: frontier, grinding: false };
  const quick = open.filter(([a, p]) => killSeconds(a, p) <= GRIND_KILL_SECONDS).at(-1);
  return quick ? { path: quick, grinding: true } : { path: frontier, grinding: false };
}

// Collector: any new form as soon as it's allowed (the source resets to Lv 1).
function digivolveWhatWeCan() {
  for (const entry of Object.values(g.roster)) {
    // --hold-partners: a player preparing for bosses keeps partners as they
    // are instead of resetting them to Lv 1 with a digivolve.
    if (args['hold-partners'] && g.isPartner(entry.speciesId)) continue;
    const option = Ev.getDigivolveOptions(entry).find((o) => o.requirementMet && !o.owned);
    if (option && Ev.digivolve(entry, option.species.id)) {
      stats.digivolves[option.species.stage] = (stats.digivolves[option.species.stage] ?? 0) + 1;
    }
  }
}

function housekeeping() {
  for (const quest of g.QUESTS) {
    if (g.questStatus(quest) === 'ready' && g.completeQuest(quest.id)) {
      note(`quest: ${quest.title}`);
      lastProgressAt = now;
    }
  }
  for (const npc of g.getResidents()) {
    if (g.hasJoined(npc) && !joined.has(npc.id)) {
      joined.add(npc.id);
      note(`>> ${npc.name} joins the village${npc.systems?.length ? ` (${npc.systems.join(', ')})` : ''}`);
    }
  }
  for (const egg of [...g.hatchery.incubating]) {
    if (Eggs.isEggReady(egg) && g.currency.data >= K.HATCH_DATA_COST) Eggs.hatchEgg(egg.eggId);
  }
  while (g.buyHatcherySlot()) note(`bought hatchery slot (${g.hatchery.capacity})`);
  digivolveWhatWeCan();

  // Partners: the strongest boss candidates (switching is free, so re-pick).
  if (!args['no-partners']) {
    const best = Object.values(g.roster)
      .sort((a, b) => D.computeSquadDps([{ entry: b, multiplier: 1 }]) - D.computeSquadDps([{ entry: a, multiplier: 1 }]))
      .slice(0, g.partnerSlots())
      .map((e) => e.speciesId);
    for (const id of [...g.partners.ids]) if (!best.includes(id)) g.setPartner(id, false);
    for (const id of best) g.setPartner(id, true);
  }

  // Expeditions: claim, then send the three weakest to the newest destination.
  for (const exp of [...E.expeditions.active]) {
    if (E.hasReturned(exp, now)) {
      const haul = E.claimExpedition(exp.id, now);
      if (haul) stats.expeditionData += haul.data;
    }
  }
  if (g.isSystemUnlocked('expeditions') && E.expeditions.active.length < K.EXPEDITION_MAX_CONCURRENT) {
    const dest = Object.values(X.DESTINATIONS).filter((d) => X.isDestinationUnlocked(P, d)).at(-1);
    // Never send away the only fighters.
    const pool = fighters();
    const weakest = [...pool]
      .sort((a, b) => D.computeEntryDamagePerHit(a) - D.computeEntryDamagePerHit(b))
      .slice(0, Math.min(K.EXPEDITION_MAX_PARTY, pool.length - 2))
      .map((e) => e.speciesId);
    if (dest && weakest.length > 0) E.startExpedition(dest.id, weakest, now);
  }
}

/** Fights a boss with the real code; returns the attempt's outcome. */
// The strongest squad for this boss (matchup multipliers included), and
// every kind of chip we own - what a sensible player brings.
function pickSquad(boss) {
  return fighters()
    .map((entry) => ({ entry, multiplier: C.squadMultiplier(entry.speciesId, boss.speciesId) }))
    .sort((a, b) => D.computeSquadDps([b]) - D.computeSquadDps([a]))
    .slice(0, boss.squadSize);
}
const ownedChips = () => ['attack-chip', 'speed-chip', 'hp-disk'].filter((c) => (g.inventory[c] ?? 0) > 0);

/** The HP multiplier at which today's best squad exactly wins: the damage
 * it deals within the fight timer (idle DPS + clicking, with owned chips)
 * over the boss's HP at multiplier 1. Pure - nothing is fought or spent. */
function breakevenMultiplier(boss) {
  const squad = pickSquad(boss);
  const bonus = {};
  for (const chip of ownedChips()) for (const stat of C.BOSS_CHIP_STATS[chip] ?? []) bonus[stat] = (bonus[stat] ?? 0) + K.BOSS_CHIP_BONUS;
  const dps = D.computeSquadDps(squad, bonus) + BOSS_CLICKS_PER_SECOND * D.computeSquadClickDamage(squad, bonus);
  const spawn = S.makeBossSpawn(now, { ...boss, hpMultiplier: 1 }, D.computeSquadStat(squad, 'hp', bonus));
  const level = squad.reduce((sum, m) => sum + levelForXp(m.entry.xp), 0) / Math.max(1, squad.length);
  return { multiplier: (dps * spawn.timeLimitMs) / 1000 / spawn.maxHp, squadLevel: level };
}

function fightBoss(areaId, pathId) {
  const boss = g.getPath(areaId, pathId).boss;
  const squad = pickSquad(boss);
  const chips = ownedChips();
  if (!C.startBossFight(areaId, pathId, squad.map((m) => m.entry.speciesId), now, chips)) return null;
  const wild = C.combat.wild;
  const limit = wild.timeLimitMs;
  let clickDebt = 0;
  while (C.combat.boss) {
    now += K.COMBAT_TICK_INTERVAL_MS;
    clickDebt += (BOSS_CLICKS_PER_SECOND * K.COMBAT_TICK_INTERVAL_MS) / 1000;
    for (; clickDebt >= 1 && C.combat.boss; clickDebt--) C.handleClick();
    if (C.combat.boss) C.tick(now);
  }
  const result = C.combat.lastBossResult;
  return {
    won: result.won,
    hpLeft: result.won ? 0 : wild.currentHp / wild.maxHp,
    timeLeft: result.won ? Math.max(0, wild.spawnedAt + limit - now) / limit : 0,
    squad: squad.map((m) => `${getSpeciesName(m.entry.speciesId)} ${levelForXp(m.entry.xp)} x${m.multiplier}`),
    chips,
  };
}

// ---- Run --------------------------------------------------------------------
// State the helpers above read; reset at the start of every run.
let stats, joined, lastProgressAt;
// Tuning edits boss data in memory; every run starts from the real values.
const originalMultipliers = new Map(
  orderedPaths().filter(([a, p]) => g.getPath(a, p).boss).map(([a, p]) => [`${a}:${p}`, g.getPath(a, p).boss.hpMultiplier]),
);

function runOnce(seed) {
  reseed(seed);
  now = START;
  log.length = 0;
  for (const [key, multiplier] of originalMultipliers) g.getPath(...key.split(':')).boss.hpMultiplier = multiplier;
  const bossSeenAt = {};
  const tuned = {};
  g.startNewGameInSlot('simulation');
  stats = { digivolves: {}, expeditionData: 0 };
  joined = new Set(g.getResidents().filter(g.hasJoined).map((n) => n.id));
  const areas = Object.fromEntries(areaIds.map((a) => [a, { reachedAt: null, clearedAt: null, attempts: [] }]));
  areas[areaIds[0]].reachedAt = now;
  lastProgressAt = now;
  const bossRetryAt = {};
  let stuck = null;

  while (now - START < MAX_HOURS * 3_600_000) {
    housekeeping();
    if (g.hasFlag('story:act-1-complete')) break;

    // Boss ready on an unlocked path? Fight it (with a cooldown after a loss).
    const bossPath = orderedPaths().find(([a, p]) => g.getPath(a, p).boss && g.isBossAvailable(P, a, p) && !g.isBossDefeated(P, a, p));
    let tuneWait = false;
    if (bossPath && TUNE) {
      const key = bossPath.join(':');
      const boss = g.getPath(...bossPath).boss;
      bossSeenAt[key] ??= now;
      if (!tuned[key]) {
        if (now - bossSeenAt[key] < TUNE_AFTER_MS) tuneWait = true; // farm first, like a player would
        else {
          const { multiplier, squadLevel } = breakevenMultiplier(boss);
          boss.hpMultiplier = Math.round(multiplier * TUNE_MARGIN * 100) / 100;
          tuned[key] = { multiplier: boss.hpMultiplier, squadLevel, at: now - START };
          note(`tuned ${getSpeciesName(boss.speciesId)}: hpMultiplier ${boss.hpMultiplier} (squad Lv ${squadLevel.toFixed(0)})`);
        }
      }
    }
    if (bossPath && !tuneWait && (bossRetryAt[bossPath.join(':')] ?? 0) <= now) {
      const [a, p] = bossPath;
      const boss = g.getPath(a, p).boss;
      const r = fightBoss(a, p);
      if (r) {
        areas[a].attempts.push({ at: now, ...r });
        note(`${r.won ? 'WON ' : 'lost'} vs ${getSpeciesName(boss.speciesId)} Lv ${boss.level} - ${r.won ? `${Math.round(r.timeLeft * 100)}% of timer left` : `${Math.round(r.hpLeft * 100)}% HP left`} | ${r.squad.join(', ')}${r.chips.length ? ` | chips: ${r.chips.join(', ')}` : ''}`);
        if (r.won) {
          lastProgressAt = now;
          if (!areas[a].clearedAt) areas[a].clearedAt = now;
        } else bossRetryAt[bossPath.join(':')] = now + BOSS_RETRY_MS;
        continue;
      }
    }

    const { path: [areaId, pathId], grinding } = choosePath();
    if (!areas[areaId].reachedAt) {
      areas[areaId].reachedAt = now;
      note(`== reached ${g.getArea(areaId).name}`);
    }
    if (P.activeAreaId !== areaId || P.activePathId !== pathId) {
      g.travelTo(areaId, pathId);
      if (grinding) stats.grindSwitches = (stats.grindSwitches ?? 0) + 1;
    }
    const unlocksBefore = JSON.stringify(P.unlockedPaths);
    C.fastForwardWildCombat(CHUNK_MS, now);
    now += CHUNK_MS;
    if (JSON.stringify(P.unlockedPaths) !== unlocksBefore) lastProgressAt = now;
    E.updateExpeditions(now);

    if (now - lastProgressAt > STUCK_MS) {
      const open = g.QUESTS.filter((q) => g.questStatus(q) === 'active');
      stuck = `no progress for ${STUCK_MS / 3_600_000}h on ${g.getPath(areaId, pathId).name} (kill ~${killSeconds(areaId, pathId).toFixed(0)}s); open quests: ${open.map((q) => q.title).join(', ') || 'none'}`;
      break;
    }
  }
  return {
    seed,
    areas,
    done: g.hasFlag('story:act-1-complete'),
    endedAt: now - START,
    stuck,
    roster: Object.keys(g.roster).length,
    bestLevel: bestLevel(),
    digivolves: stats.digivolves,
    quests: g.progress.completedQuests.length,
    residents: joined.size,
    bits: Math.round(g.currency.bits),
    data: g.currency.data,
    expeditionData: stats.expeditionData,
    tuned,
    timeline: [...log],
  };
}

// ---- Report -----------------------------------------------------------------
const RUNS = Math.max(1, Number(args.runs ?? 1));
const pad = (v, n) => String(v).padEnd(n);
const bossNames = (a) => Object.values(g.AREAS[a].paths).filter((p) => p.boss).map((p) => getSpeciesName(p.boss.speciesId)).join(' + ');
const settings = `boss clicks ${BOSS_CLICKS_PER_SECOND}/s · grind if kill > ${GRIND_KILL_SECONDS}s · limit ${MAX_HOURS}h${overrides.length ? ` · ${overrides.map((o) => o.join('=')).join(', ')}` : ''}`;

// Worker mode (spawned by the parent below): run the given seeds, hand the
// results back as JSON, exit.
const RESULT_MARKER = '@@SIMULATION_RESULTS@@';
if (args.worker) {
  const out = String(args.seeds).split(',').map((seed) => runOnce(Number(seed)));
  process.stdout.write(RESULT_MARKER + JSON.stringify(out));
  await server.close();
  process.exit(0);
}

// Runs in parallel across worker processes - each has its own copy of the
// game state (the state modules are process-global, so threads couldn't
// share one process). Seeds are dealt round-robin; results are identical
// to running them one by one, since every run is seeded.
async function runInWorkers(seeds, workerCount) {
  const { spawn } = await import('node:child_process');
  const passThrough = process.argv.slice(2).filter((a) => !/^--(runs|seed|workers|log)(=|$)/.test(a));
  const groups = Array.from({ length: workerCount }, (_, w) => seeds.filter((_, i) => i % workerCount === w)).filter((grp) => grp.length);
  let finished = 0;
  const batches = await Promise.all(
    groups.map(
      (group) =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...passThrough, '--worker', `--seeds=${group.join(',')}`], {
            stdio: ['ignore', 'pipe', 'inherit'],
          });
          let stdout = '';
          child.stdout.on('data', (chunk) => (stdout += chunk));
          child.on('error', reject);
          child.on('close', (code) => {
            const at = stdout.indexOf(RESULT_MARKER);
            if (code !== 0 || at === -1) return reject(new Error(`worker for seeds ${group.join(',')} failed (exit ${code})`));
            finished += group.length;
            process.stderr.write(`\r${finished}/${seeds.length} runs done`);
            resolve(JSON.parse(stdout.slice(at + RESULT_MARKER.length)));
          });
        }),
    ),
  );
  process.stderr.write('\n');
  return batches.flat().sort((a, b) => a.seed - b.seed);
}

const os = await import('node:os');
const WORKERS = Math.min(RUNS, Math.max(1, Number(args.workers ?? os.cpus().length - 1)));
const seeds = Array.from({ length: RUNS }, (_, i) => SEED + i);
const startedAt = performance.now();
const results = WORKERS > 1 ? await runInWorkers(seeds, WORKERS) : seeds.map((seed) => runOnce(seed));

if (RUNS === 1) {
  const run = results[0];
  console.log(`\nAct 1 simulation · seed ${SEED} · ${settings}\n`);
  console.log(`${pad('Area', 20)}${pad('reached', 9)}${pad('cleared', 9)}${pad('time', 8)}boss`);
  for (const a of areaIds) {
    const r = run.areas[a];
    const tries = r.attempts.length;
    const win = r.attempts.find((t) => t.won);
    const bossText = !tries
      ? '-'
      : win
        ? `won on try ${r.attempts.indexOf(win) + 1}/${tries}, ${Math.round(win.timeLeft * 100)}% timer left`
        : `lost ${tries}x, best ${Math.round(Math.min(...r.attempts.map((t) => t.hpLeft)) * 100)}% HP left`;
    const reached = r.reachedAt === null ? '-' : hms(r.reachedAt - START);
    const cleared = r.clearedAt === null ? '-' : hms(r.clearedAt - START);
    const spent = r.reachedAt !== null && r.clearedAt !== null ? hms(r.clearedAt - r.reachedAt) : '';
    console.log(`${pad(g.getArea(a).name, 20)}${pad(reached, 9)}${pad(cleared, 9)}${pad(spent, 8)}${bossNames(a)}: ${bossText}`);
  }
  const ending = run.done ? `ACT 1 COMPLETE at ${hms(run.endedAt)}` : run.stuck ? `STUCK at ${hms(run.endedAt)}: ${run.stuck}` : `NOT FINISHED within ${MAX_HOURS}h`;
  console.log(`\n${ending}`);
  console.log(
    `Roster ${run.roster} · best level ${run.bestLevel} · digivolves ${JSON.stringify(run.digivolves)} · quests ${run.quests}/${g.QUESTS.length} · ` +
      `residents ${run.residents} · bits ${run.bits} · data ${run.data} (expeditions +${run.expeditionData})`,
  );
  if (args.log) console.log('\nTimeline\n' + run.timeline.join('\n'));
  else console.log(`\n(${run.timeline.length} events - add --log for the full timeline)`);
} else {
  // Several seeds: median (and range) per area, so tuning isn't chasing luck.
  const median = (xs) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : NaN;
  };
  const range = (xs) => (xs.length ? `${hms(Math.min(...xs))}-${hms(Math.max(...xs))}` : '-');
  const took = ((performance.now() - startedAt) / 1000).toFixed(0);
  console.log(`\nAct 1 simulation · ${RUNS} runs (seeds ${SEED}-${SEED + RUNS - 1}) · ${settings} · ${WORKERS} worker(s), ${took}s\n`);
  console.log(`${pad('Area', 20)}${pad('cleared', 9)}${pad('median', 9)}${pad('range', 14)}${pad('boss tries (med, max)', 23)}boss`);
  for (const a of areaIds) {
    const cleared = results.filter((r) => r.areas[a].clearedAt !== null);
    const times = cleared.map((r) => r.areas[a].clearedAt - r.areas[a].reachedAt);
    const tries = cleared.map((r) => r.areas[a].attempts.findIndex((t) => t.won) + 1);
    const blocked = results.filter((r) => r.areas[a].reachedAt !== null && r.areas[a].clearedAt === null).length;
    console.log(
      `${pad(g.getArea(a).name, 20)}${pad(`${cleared.length}/${RUNS}`, 9)}${pad(times.length ? hms(median(times)) : '-', 9)}${pad(range(times), 14)}` +
        `${pad(tries.length ? `${median(tries)}, ${Math.max(...tries)}` : '-', 23)}${bossNames(a)}${blocked ? `  (${blocked} run(s) stuck here)` : ''}`,
    );
  }
  const finished = results.filter((r) => r.done).map((r) => r.endedAt);
  console.log(`\nAct 1 complete in ${finished.length}/${RUNS} runs${finished.length ? ` · median ${hms(median(finished))} · range ${range(finished)}` : ''}`);
  console.log(`Median at the end: best level ${median(results.map((r) => r.bestLevel))} · roster ${median(results.map((r) => r.roster))} · bits ${median(results.map((r) => r.bits))}`);
  for (const r of results.filter((x) => !x.done)) {
    console.log(`  seed ${r.seed}: ${r.stuck ? `stuck at ${hms(r.endedAt)} - ${r.stuck}` : `not finished within ${MAX_HOURS}h`}`);
  }
}

if (TUNE) {
  const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
  console.log(`\nBoss tuning · beatable ${args['boss-hours'] ?? 1}h after appearing · margin ${TUNE_MARGIN}\n`);
  console.log(`${pad('Boss', 22)}${pad('Lv', 5)}${pad('now', 7)}${pad('tuned (median)', 16)}${pad('range', 14)}${pad('seeds', 7)}squad Lv`);
  const suggestion = {};
  for (const key of originalMultipliers.keys()) {
    const boss = g.getPath(...key.split(':')).boss;
    const samples = results.map((r) => r.tuned[key]).filter(Boolean);
    const mults = samples.map((t) => t.multiplier);
    const name = getSpeciesName(boss.speciesId);
    if (!mults.length) {
      console.log(`${pad(name, 22)}${pad(boss.level, 5)}${pad(originalMultipliers.get(key), 7)}not reached`);
      continue;
    }
    suggestion[key] = median(mults);
    console.log(
      `${pad(name, 22)}${pad(boss.level, 5)}${pad(originalMultipliers.get(key), 7)}${pad(median(mults), 16)}` +
        `${pad(`${Math.min(...mults)}-${Math.max(...mults)}`, 14)}${pad(`${mults.length}/${RUNS}`, 7)}${median(samples.map((t) => t.squadLevel)).toFixed(0)}`,
    );
  }
  console.log(`\nSuggested hpMultiplier per boss (areaId:pathId):\n${JSON.stringify(suggestion, null, 2)}`);
}

await server.close();
process.exit(0);
