<script lang="ts">
  import LineChart from './LineChart.svelte';
  import type { ChartSeries } from './LineChart.svelte';
  import {
    STAGES,
    DEFAULT_SCENARIO,
    summarizeRoster,
    checkPaths,
    checkBosses,
    maxWinnableLevel,
    wildHp,
    fightTimerSeconds,
    levelXpCurve,
    killXpCurve,
    killsPerLevelUp,
    curvePoints,
    killXp,
    formatCompact,
    type Balance,
    type InGameStage,
    type Scenario,
  } from './model';
  import { AREAS } from '../lib/game/areas/areaRegistry';
  import { FIGHT_TIMER_FORMULAS, type FightTimerFormula } from '../lib/game/combat/fightTimer';
  import { CURVE_FORMULAS, type CurveFormula, type CurveParams } from '../lib/game/combat/levelCurveFormulas';

  // ---- Stage identity colors (validated for CVD + contrast on the game's
  // dark panel surface; same color = same stage on every chart) ----------
  const STAGE_COLOR: Record<InGameStage, string> = {
    Fresh: '#3987e5',
    'In-Training': '#d95926',
    Rookie: '#199e70',
    Champion: '#c98500',
    Ultimate: '#d55181',
    Mega: '#008300',
  };
  const ROSTER_INK = '#e8fbff';
  const CURVE_INK = '#22d3ee';

  // ---- Field definitions: every value in balance.json, grouped the same
  // way constants.ts groups them. `path` is [key] or [key, stage]. --------
  type FieldPath = [string] | [string, string];
  interface FieldDef {
    path: FieldPath;
    label: string;
    step?: number;
    /** Present = a dropdown of these values instead of a number field. */
    options?: { id: string; label: string }[];
    /** Hide the field unless this returns true (e.g. formula-specific
     * parameters). List the formulas that USE a field rather than the ones
     * that don't, so a newly added formula never inherits stray fields.
     * Hidden values are still saved untouched. */
    showIf?: (b: Balance) => boolean;
  }
  interface FieldGroup {
    id: string;
    title: string;
    note?: string;
    open: boolean;
    fields: FieldDef[];
    /** Live description under the title, e.g. of the selected formula. */
    describe?: (b: Balance) => string | undefined;
  }

  // Same fallbacks as the game's formula modules: an unknown name means
  // halfLife (timer) / power (leveling).
  function timerFormulaOf(b: Balance): FightTimerFormula {
    const id = b.FIGHT_TIMER_FORMULA;
    return FIGHT_TIMER_FORMULAS.some((f) => f.id === id) ? (id as FightTimerFormula) : 'halfLife';
  }
  function curveFormulaOf(id: unknown): CurveFormula {
    return CURVE_FORMULAS.some((f) => f.id === id) ? (id as CurveFormula) : 'power';
  }
  const describeCurve = (id: unknown) => CURVE_FORMULAS.find((f) => f.id === curveFormulaOf(id))?.description;

  // One leveling curve's fields (LEVEL_XP_* or KILL_XP_*): the formula
  // dropdown, then only the settings that formula uses.
  function curveFields(
    prefix: 'LEVEL_XP' | 'KILL_XP',
    labels: { first: string; last: string },
    steps: { first: number; last: number }
  ): FieldDef[] {
    const formulaOf = (b: Balance) => curveFormulaOf((b as unknown as Record<string, unknown>)[`${prefix}_FORMULA`]);
    return [
      { path: [`${prefix}_FORMULA`], label: 'Formula', options: CURVE_FORMULAS.map((f) => ({ id: f.id, label: f.label })) },
      { path: [`${prefix}_FIRST`], label: labels.first, step: steps.first },
      {
        path: [`${prefix}_LAST`],
        label: labels.last,
        step: steps.last,
        showIf: (b) => formulaOf(b) === 'parabola',
      },
      { path: [`${prefix}_EXPONENT`], label: 'Exponent', step: 0.05, showIf: (b) => formulaOf(b) === 'power' },
      {
        path: [`${prefix}_GROWTH`],
        label: 'Growth per level',
        step: 0.01,
        showIf: (b) => formulaOf(b) === 'exponential',
      },
    ];
  }

  const perStage = (key: string, step: number, stages: readonly string[] = STAGES): FieldDef[] =>
    stages.map((stage) => ({ path: [key, stage], label: stage, step }));

  const GROUPS: FieldGroup[] = [
    {
      id: 'combat',
      title: 'Combat',
      open: true,
      fields: [
        { path: ['CLICK_DAMAGE_BASE'], label: 'Click damage (flat)', step: 1 },
        { path: ['CLICK_DAMAGE_DPS_FRACTION'], label: 'Click damage per DPS', step: 0.01 },
        { path: ['BASE_ATTACKS_PER_SECOND'], label: 'Base attacks / sec', step: 0.1 },
        { path: ['SPEED_TO_APS_SCALE'], label: 'Attacks / sec per Speed', step: 0.005 },
      ],
    },
    {
      id: 'matchups',
      title: 'Boss matchups',
      note: 'Per edge won (attribute, element) / lost - they add up. Boss fights only.',
      open: false,
      fields: [
        { path: ['ADVANTAGE_BONUS'], label: 'Advantage bonus', step: 0.05 },
        { path: ['DISADVANTAGE_PENALTY'], label: 'Disadvantage penalty', step: 0.05 },
        { path: ['BOSS_CHIP_BONUS'], label: 'Boss chip bonus', step: 0.05 },
      ],
    },
    {
      id: 'expeditions',
      title: 'Expeditions',
      note: 'Duration ÷ (1 + speed × avg level) · haul × (1 + match × favored members + stage × avg stage)',
      open: false,
      fields: [
        { path: ['EXPEDITION_MAX_CONCURRENT'], label: 'Expeditions at once', step: 1 },
        { path: ['EXPEDITION_MAX_PARTY'], label: 'Party size', step: 1 },
        { path: ['EXPEDITION_LEVEL_SPEED_SCALE'], label: 'Speed per party level', step: 0.005 },
        { path: ['EXPEDITION_ELEMENT_MATCH_BONUS'], label: 'Haul per favored member', step: 0.05 },
        { path: ['EXPEDITION_STAGE_BONUS'], label: 'Haul per avg stage', step: 0.05 },
      ],
    },
    {
      id: 'timer',
      title: 'Boss fight timer',
      open: true,
      describe: (b) => FIGHT_TIMER_FORMULAS.find((f) => f.id === timerFormulaOf(b))?.description,
      fields: [
        {
          path: ['FIGHT_TIMER_FORMULA'],
          label: 'Formula',
          options: FIGHT_TIMER_FORMULAS.map((f) => ({ id: f.id, label: f.label })),
        },
        { path: ['FIGHT_TIMER_BASE_SECONDS'], label: 'Base seconds', step: 1 },
        { path: ['FIGHT_TIMER_MAX_BONUS_SECONDS'], label: 'Max bonus seconds', step: 1 },
        {
          path: ['FIGHT_TIMER_HALF_BONUS_HP'],
          label: 'Squad HP for half bonus',
          step: 1000,
          showIf: (b) => timerFormulaOf(b) === 'halfLife',
        },
        {
          path: ['FIGHT_TIMER_FULL_BONUS_HP'],
          label: 'Squad HP for full bonus',
          step: 1000,
          showIf: (b) => ['parabola', 'power'].includes(timerFormulaOf(b)),
        },
        {
          path: ['FIGHT_TIMER_POWER_EXPONENT'],
          label: 'Power exponent',
          step: 0.05,
          showIf: (b) => timerFormulaOf(b) === 'power',
        },
      ],
    },
    {
      id: 'wild',
      title: 'Wild HP',
      note: 'HP = base × stage multiplier × growth ^ level',
      open: true,
      fields: [
        { path: ['WILD_HP_BASE'], label: 'Base HP', step: 10 },
        { path: ['WILD_HP_LEVEL_GROWTH_FACTOR'], label: 'Growth per level', step: 0.005 },
        ...perStage('WILD_HP_STAGE_MULTIPLIER', 1),
      ],
    },
    {
      id: 'stats',
      title: 'Roster stats',
      note: 'Stage power scales every stat roll of that stage',
      open: true,
      fields: [
        ...perStage('STAGE_POWER', 0.1),
        { path: ['STAT_DOMINANT_FACTOR'], label: 'Dominant stat factor', step: 0.1 },
        { path: ['STAT_OFF_FACTOR'], label: 'Other stats factor', step: 0.1 },
        { path: ['STAT_RANGE_SPREAD_FRACTION'], label: 'Roll spread (±)', step: 0.01 },
        { path: ['BASE_STAT_SCALE'], label: 'Base stat scale', step: 0.5 },
        { path: ['GROWTH_PER_LEVEL_SCALE'], label: 'Growth per level scale', step: 0.5 },
        { path: ['INHERITED_BONUS_SCALE'], label: 'Inherited bonus scale', step: 0.5 },
        { path: ['INHERITED_BONUS_LEVEL_SCALE'], label: 'Inherited per source level', step: 0.05 },
      ],
    },
    {
      id: 'xp-curve',
      title: 'XP per level-up',
      open: true,
      describe: (b) => describeCurve(b.LEVEL_XP_FORMULA),
      fields: curveFields('LEVEL_XP', { first: 'XP for first level-up', last: 'XP for last level-up' }, { first: 10, last: 500 }),
    },
    {
      id: 'kill-xp-curve',
      title: 'Kill XP per wild level',
      note: 'Kills per level-up are calculated: XP cost ÷ kill XP at that level.',
      open: true,
      describe: (b) => describeCurve(b.KILL_XP_FORMULA),
      fields: curveFields('KILL_XP', { first: 'Kill XP at Lv 1', last: 'Kill XP at last level' }, { first: 1, last: 10 }),
    },
    {
      id: 'leveling',
      title: 'Levels & digivolving',
      open: false,
      fields: [
        { path: ['MAX_LEVEL'], label: 'Max level', step: 1 },
        ...perStage('DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE', 1, ['Rookie', 'Champion', 'Ultimate', 'Mega']).map((f) => ({
          ...f,
          label: `Digivolve to ${f.label} at Lv`,
        })),
      ],
    },
    {
      id: 'economy',
      title: 'Rewards, eggs & shop',
      open: false,
      fields: [
        { path: ['KILL_BITS_BASE'], label: 'Kill bits (flat)', step: 1 },
        { path: ['KILL_BITS_PER_LEVEL'], label: 'Kill bits per wild level', step: 1 },
        { path: ['EGG_DROP_CHANCE_PERCENT'], label: 'Egg drop chance %', step: 0.05 },
        { path: ['EGG_HATCH_LEVEL'], label: 'Egg hatch level', step: 1 },
        { path: ['HATCH_DATA_COST'], label: 'Hatch cost (Data)', step: 5 },
        { path: ['DUPLICATE_HATCH_XP'], label: 'Duplicate hatch XP', step: 50 },
        { path: ['HATCHERY_STARTING_CAPACITY'], label: 'Hatchery slots at start', step: 1 },
        { path: ['HATCHERY_MAX_CAPACITY'], label: 'Hatchery slots max', step: 1 },
        { path: ['HATCHERY_SLOT_BASE_COST'], label: 'Extra slot: first cost (bits)', step: 100 },
        { path: ['HATCHERY_SLOT_COST_GROWTH'], label: 'Extra slot: cost x per slot', step: 0.1 },
        { path: ['MYSTERY_EGG_COST_BITS'], label: 'Mystery egg price (bits)', step: 50 },
        { path: ['ABILITY_REROLL_COST_BITS'], label: 'Ability reroll price (bits)', step: 50 },
      ],
    },
    {
      id: 'offline',
      title: 'Offline progress',
      open: false,
      fields: [
        { path: ['OFFLINE_PROGRESS_CAP_HOURS'], label: 'Max hours counted', step: 1 },
        { path: ['OFFLINE_PROGRESS_EFFICIENCY'], label: 'Efficiency (1 = full pace)', step: 0.05 },
      ],
    },
    {
      id: 'crests',
      title: 'Crests',
      open: false,
      fields: [{ path: ['CREST_GATING_ENABLED'], label: 'Crest gate on Ultimate/Mega (1 on, 0 off)', step: 1 }],
    },
    {
      id: 'xp-split',
      title: 'Roster scaling',
      open: false,
      fields: [
        { path: ['KILL_XP_SPLIT_EXPONENT'], label: 'Kill XP split exponent (0 none, 0.5 sqrt, 1 even)', step: 0.05 },
        { path: ['ROSTER_STAT_FALLOFF'], label: 'Wild-fight stat falloff per member (1 = plain sum)', step: 0.01 },
      ],
    },
  ];

  // ---- File state ------------------------------------------------------
  // Typed on the $state call, not the variable - a `: Balance | null`
  // annotation with a null initializer makes TS narrow these to `null` in
  // every top-level $derived expression below.
  let saved = $state<Balance | null>(null);
  let draft = $state<Balance | null>(null);
  let loadError: string | null = $state(null);
  let saveState: { kind: 'idle' | 'saving' | 'saved' | 'error'; message: string } = $state({ kind: 'idle', message: '' });

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  async function load() {
    try {
      const response = await fetch('/__balance');
      if (!response.ok) throw new Error((await response.json()).error ?? response.statusText);
      const data = (await response.json()) as Balance;
      saved = data;
      draft = clone(data);
    } catch (error) {
      loadError = `Couldn't read balance.json - is this page open on the Vite dev server (npm run dev)? ${(error as Error).message}`;
    }
  }
  load();

  function getAt(obj: Balance, path: FieldPath): unknown {
    const root = obj as unknown as Record<string, unknown>;
    return path.length === 1 ? root[path[0]] : (root[path[0]] as Record<string, unknown>)[path[1]];
  }
  // `null` is what an emptied number field binds to - kept as-is so the
  // field shows as invalid and Save stays disabled until it's filled in.
  function setAt(obj: Balance, path: FieldPath, value: number | string | null) {
    const root = obj as unknown as Record<string, unknown>;
    if (path.length === 1) root[path[0]] = value;
    else (root[path[0]] as Record<string, unknown>)[path[1]] = value;
  }
  const isValidNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const isValidField = (field: FieldDef, v: unknown): boolean =>
    field.options ? field.options.some((o) => o.id === v) : isValidNumber(v);
  const fieldId = (path: FieldPath) => `f-${path.join('-').replace(/\W+/g, '-')}`;

  const allFields = GROUPS.flatMap((g) => g.fields);
  const changedCount = $derived(
    draft && saved ? allFields.filter((f) => getAt(draft!, f.path) !== getAt(saved!, f.path)).length : 0
  );
  const invalidCount = $derived(draft ? allFields.filter((f) => !isValidField(f, getAt(draft!, f.path))).length : 0);
  const canSave = $derived(changedCount > 0 && invalidCount === 0 && saveState.kind !== 'saving');

  async function save() {
    if (!draft || !canSave) return;
    saveState = { kind: 'saving', message: 'Saving…' };
    try {
      const response = await fetch('/__balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? response.statusText);
      saved = clone(draft);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      saveState = { kind: 'saved', message: `Saved to balance.json at ${time}` };
    } catch (error) {
      saveState = { kind: 'error', message: (error as Error).message };
    }
  }

  function revert() {
    if (saved) draft = clone(saved);
    saveState = { kind: 'idle', message: '' };
  }

  function resetField(path: FieldPath) {
    if (draft && saved) setAt(draft, path, getAt(saved, path) as number | string);
  }

  $effect(() => {
    function onKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (changedCount > 0) event.preventDefault();
    }
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  });

  // ---- Example roster (browser-local, not part of balance.json) ---------
  const SCENARIO_KEY = 'digiclicker-balance-lab-scenario';
  function loadScenario(): Scenario {
    try {
      const raw = localStorage.getItem(SCENARIO_KEY);
      if (raw) return { ...clone(DEFAULT_SCENARIO), ...JSON.parse(raw) };
    } catch {
      // Storage unavailable - fall back to the example roster.
    }
    return clone(DEFAULT_SCENARIO);
  }
  const scenario: Scenario = $state(loadScenario());
  $effect(() => {
    const snapshot = JSON.stringify(scenario);
    try {
      localStorage.setItem(SCENARIO_KEY, snapshot);
    } catch {
      // Not persisting the example roster is fine.
    }
  });
  // Blank/invalid scenario inputs read as 0 so the charts never go NaN.
  const safeScenario = $derived<Scenario>({
    counts: Object.fromEntries(STAGES.map((s) => [s, Math.max(0, Number(scenario.counts[s]) || 0)])) as Scenario['counts'],
    level: Math.max(1, Number(scenario.level) || 1),
    inheritedFromLevel: Math.max(0, Number(scenario.inheritedFromLevel) || 0),
    clicksPerSecond: Math.max(0, Number(scenario.clicksPerSecond) || 0),
    targetKillSeconds: Math.max(0.1, Number(scenario.targetKillSeconds) || DEFAULT_SCENARIO.targetKillSeconds),
    bossMatchup: Math.max(0, Number(scenario.bossMatchup) || DEFAULT_SCENARIO.bossMatchup),
  });

  // ---- Derived numbers (only from a fully valid draft) ------------------
  const model = $derived(draft && invalidCount === 0 ? draft : saved);
  const summary = $derived(model ? summarizeRoster(model, safeScenario) : null);
  const paths = $derived(model && summary ? checkPaths(model, summary) : []);
  const bosses = $derived(model ? checkBosses(model, safeScenario) : []);
  const reach = $derived(
    model && summary
      ? STAGES.map((stage) => ({
          stage,
          idle: maxWinnableLevel(model, stage, summary.idleDamagePerFight),
          active: maxWinnableLevel(model, stage, summary.activeDamagePerFight),
        }))
      : []
  );

  const levels = $derived(model ? Array.from({ length: Math.max(2, Math.round(model.MAX_LEVEL)) }, (_, i) => i + 1) : []);

  // Axis scale toggles, remembered per browser like the example roster.
  // Win chart y: log keeps every stage readable (Mega is ~400x Fresh),
  // linear shows the true shape of the exponential curves. Timer chart x:
  // log spans tiny-to-huge rosters, linear shows the formula's real shape.
  type AxisScale = 'log' | 'linear';
  function persistedScale(key: string): { value: AxisScale } {
    let initial: AxisScale = 'log';
    try {
      if (localStorage.getItem(key) === 'linear') initial = 'linear';
    } catch {
      // Storage unavailable - default to log.
    }
    const setting = $state({ value: initial });
    $effect(() => {
      const value = setting.value;
      try {
        localStorage.setItem(key, value);
      } catch {
        // Not remembering the axis choice is fine.
      }
    });
    return setting;
  }
  const winScale = persistedScale('digiclicker-balance-lab-win-scale');
  const timerScale = persistedScale('digiclicker-balance-lab-timer-scale');
  const xpScale = persistedScale('digiclicker-balance-lab-xp-scale');
  const killXpScale = persistedScale('digiclicker-balance-lab-kill-xp-scale');

  const winChart = $derived.by(() => {
    if (!model || !summary) return null;
    const stageSeries: ChartSeries[] = STAGES.map((stage) => ({
      id: stage,
      label: stage,
      color: STAGE_COLOR[stage],
      points: levels.map((l) => [l, wildHp(model, stage, l)] as [number, number]),
    }));
    const rosterSeries: ChartSeries[] = [
      {
        id: 'active',
        label: 'You, clicking',
        color: ROSTER_INK,
        points: levels.map((l) => [l, summary.activeDamagePerFight] as [number, number]),
      },
      {
        id: 'idle',
        label: 'You, idle',
        color: ROSTER_INK,
        dash: '5 4',
        points: levels.map((l) => [l, summary.idleDamagePerFight] as [number, number]),
      },
    ];
    const all = [...stageSeries, ...rosterSeries];
    const ys = all.flatMap((s) => s.points.map(([, y]) => y)).filter((y) => y > 0 && Number.isFinite(y));
    const maxY = Math.max(...ys);
    // Log: whole powers of ten around the data. Linear: from 0 - which is
    // where exponential growth actually looks like a curve.
    const lo = winScale.value === 'log' ? Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.min(...ys))))) : 0;
    const hi = winScale.value === 'log' ? Math.pow(10, Math.ceil(Math.log10(maxY * 1.2))) : maxY * 1.08;
    const strips = Object.values(AREAS).flatMap((area) =>
      Object.values(area.paths).map((p) => ({ from: p.levelRange[0], to: p.levelRange[1], label: p.name }))
    );
    return { series: all, yDomain: [lo, hi] as [number, number], strips };
  });

  const COMPARE_INK = '#6d878c';
  const COMPARE_DASHES = ['8 4', '3 3', '1 4'];

  const timerChart = $derived.by(() => {
    if (!model || !summary) return null;
    const selected = timerFormulaOf(model);
    const ceiling = model.FIGHT_TIMER_BASE_SECONDS + model.FIGHT_TIMER_MAX_BONUS_SECONDS;
    // Wide enough to see every formula flatten out, and every boss squad's dot.
    const squadHps = bosses.map((b) => b.squadHp);
    const span = Math.max(100, model.FIGHT_TIMER_HALF_BONUS_HP * 6, model.FIGHT_TIMER_FULL_BONUS_HP * 1.25, ...squadHps.map((hp) => hp * 1.25));
    const isLog = timerScale.value === 'log';
    const xMax = isLog ? Math.pow(10, Math.ceil(Math.log10(span))) : span;
    const samples = Array.from({ length: 200 }, (_, i) =>
      isLog ? Math.pow(10, (i / 199) * Math.log10(xMax)) : (i / 199) * xMax
    );
    const curve = (formula: FightTimerFormula) =>
      samples.map((hp) => [hp, fightTimerSeconds(model, hp, formula)] as [number, number]);
    const others = FIGHT_TIMER_FORMULAS.filter((f) => f.id !== selected);
    const series: ChartSeries[] = [
      {
        id: selected,
        label: FIGHT_TIMER_FORMULAS.find((f) => f.id === selected)?.label ?? selected,
        color: CURVE_INK,
        points: curve(selected),
      },
      ...others.map((f, i) => ({
        id: f.id,
        label: f.label,
        color: COMPARE_INK,
        dash: COMPARE_DASHES[i % COMPARE_DASHES.length],
        points: curve(f.id),
      })),
      {
        id: 'ceiling',
        label: `Ceiling ${formatCompact(ceiling)}s`,
        color: ROSTER_INK,
        dash: '2 5',
        points: samples.map((hp) => [hp, ceiling] as [number, number]),
      },
    ];
    return {
      series,
      xDomain: [isLog ? 1 : 0, xMax] as [number, number],
      yDomain: [0, Math.max(1, ceiling * 1.08)] as [number, number],
      markers: bosses.map((b) => ({
        x: Math.max(1, b.squadHp),
        y: b.timerSeconds,
        label: `${b.bossName} squad: ${formatCompact(b.squadHp)} HP → ${b.timerSeconds.toFixed(1)}s`,
      })),
    };
  });

  // A leveling curve chart: the selected formula in cyan, the other formulas
  // (same settings) grey-dashed, scaled to the selected curve so a steep
  // comparison can't flatten it; marker + running totals at the example
  // roster's level.
  function levelCurveChart(
    b: Balance,
    makeCurve: (formula?: CurveFormula) => CurveParams,
    scale: AxisScale
  ) {
    const selected = curveFormulaOf(makeCurve().formula);
    const pts = curvePoints(b, makeCurve(selected));
    const series: ChartSeries[] = [
      {
        id: selected,
        label: CURVE_FORMULAS.find((f) => f.id === selected)?.label ?? selected,
        color: CURVE_INK,
        points: pts,
      },
      ...CURVE_FORMULAS.filter((f) => f.id !== selected).map((f, i) => ({
        id: f.id,
        label: f.label,
        color: COMPARE_INK,
        dash: COMPARE_DASHES[i % COMPARE_DASHES.length],
        points: curvePoints(b, makeCurve(f.id)),
      })),
    ];
    const ys = pts.map(([, y]) => y).filter((y) => Number.isFinite(y) && y > 0);
    const maxY = ys.length ? Math.max(...ys) : 1;
    const yDomain: [number, number] =
      scale === 'log'
        ? [Math.pow(10, Math.floor(Math.log10(Math.min(...ys, maxY)))), Math.pow(10, Math.ceil(Math.log10(maxY * 1.3)))]
        : [0, Math.max(1, maxY * 1.3)];
    const at = Math.min(Math.max(1, Math.round(safeScenario.level)), pts.length);
    const totalTo = (upTo: number) => pts.slice(0, Math.max(0, upTo - 1)).reduce((sum, [, v]) => sum + v, 0);
    return {
      series,
      yDomain,
      points: pts,
      at,
      maxLevel: pts.length + 1,
      totalToScenario: totalTo(at),
      totalToMax: totalTo(pts.length + 1),
    };
  }

  function markerAt(points: [number, number][], at: number, unit: string) {
    return points.length ? [{ x: at, y: points[at - 1][1], label: `Lv ${at}: ${formatCompact(points[at - 1][1])} ${unit}` }] : [];
  }

  const xpChart = $derived.by(() => {
    if (!model) return null;
    const chart = levelCurveChart(model, (f) => levelXpCurve(model, f), xpScale.value);
    return { ...chart, markers: markerAt(chart.points, chart.at, 'XP') };
  });

  const killXpChart = $derived.by(() => {
    if (!model) return null;
    const chart = levelCurveChart(model, (f) => killXpCurve(model, f), killXpScale.value);
    return { ...chart, markers: markerAt(chart.points, chart.at, 'XP') };
  });

  // Calculated from the two curves above - one line, no formula of its own.
  const killsChart = $derived.by(() => {
    if (!model) return null;
    const points = killsPerLevelUp(model);
    const ys = points.map(([, y]) => y).filter((y) => Number.isFinite(y) && y > 0);
    const at = Math.min(Math.max(1, Math.round(safeScenario.level)), points.length);
    const totalTo = (upTo: number) =>
      points.slice(0, Math.max(0, upTo - 1)).reduce((sum, [, k]) => sum + (Number.isFinite(k) ? k : 0), 0);
    return {
      series: [{ id: 'kills', label: 'Kills', color: CURVE_INK, points }] as ChartSeries[],
      yDomain: [0, Math.max(1, (ys.length ? Math.max(...ys) : 1) * 1.2)] as [number, number],
      markers: markerAt(points, at, 'kills'),
      at,
      maxLevel: points.length + 1,
      totalToScenario: totalTo(at),
      totalToMax: totalTo(points.length + 1),
    };
  });

  // Wild fights are untimed: the area check grades kill SPEED against the
  // target kill time; boss fights are timed: the boss check grades wins.
  const VERDICT_TEXT = { idle: 'Fast idle', clicking: 'Fast clicking', 'too-hard': 'Slow' } as const;
  const BOSS_VERDICT_TEXT = { idle: 'Wins idle', clicking: 'Needs clicking', 'too-hard': 'Loses' } as const;
  const fmtSeconds = (s: number) => (Number.isFinite(s) ? (s >= 100 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`) : '∞');
</script>

{#snippet scaleToggle(axis: string, setting: { value: AxisScale }, hints: Record<AxisScale, string>)}
  <div class="scale-toggle" role="radiogroup" aria-label="{axis} scale">
    <span class="scale-label">{axis}</span>
    {#each ['log', 'linear'] as const as scale (scale)}
      <button
        class="scale-btn"
        class:active={setting.value === scale}
        role="radio"
        aria-checked={setting.value === scale}
        onclick={() => (setting.value = scale)}
      >
        {scale === 'log' ? 'Log' : 'Linear'}
      </button>
    {/each}
    <span class="scale-hint">{hints[setting.value]}</span>
  </div>
{/snippet}

<div class="lab">
  <header class="topbar">
    <div class="brand">
      <span class="brand-name">Balance Lab</span>
      <span class="brand-file">src/lib/game/balance.json</span>
    </div>
    <div class="save-area">
      <span class="save-status" class:error={saveState.kind === 'error'} role="status" aria-live="polite">
        {#if invalidCount > 0}
          {invalidCount} field{invalidCount === 1 ? '' : 's'} need a number
        {:else if saveState.kind !== 'idle' && changedCount === 0}
          {saveState.message}
        {:else if saveState.kind === 'error'}
          {saveState.message}
        {:else if changedCount > 0}
          {changedCount} unsaved change{changedCount === 1 ? '' : 's'}
        {:else}
          In sync with the file
        {/if}
      </span>
      <button class="btn" onclick={revert} disabled={changedCount === 0}>Revert</button>
      <button class="btn primary" onclick={save} disabled={!canSave} title="Ctrl+S">Save</button>
    </div>
  </header>

  {#if loadError}
    <p class="load-error">{loadError}</p>
  {:else if !draft || !summary}
    <p class="loading">Reading balance.json…</p>
  {:else}
    <div class="layout">
      <aside class="controls">
        <section class="group scenario">
          <h2 class="group-title">Example roster</h2>
          <p class="group-note">Only for these charts - not saved to balance.json.</p>
          <div class="stage-counts">
            {#each STAGES as stage (stage)}
              <label class="count-field" for="sc-{stage}">
                <span class="count-label"><i class="swatch" style="background:{STAGE_COLOR[stage]}"></i>{stage}</span>
                <input id="sc-{stage}" type="number" min="0" step="1" bind:value={scenario.counts[stage]} />
              </label>
            {/each}
          </div>
          <div class="field-list">
            <label class="field" for="sc-level">
              <span class="field-label">Average level</span>
              <input id="sc-level" type="number" min="1" step="1" bind:value={scenario.level} />
            </label>
            <label class="field" for="sc-inherited">
              <span class="field-label">Digivolved from Lv</span>
              <input id="sc-inherited" type="number" min="0" step="1" bind:value={scenario.inheritedFromLevel} />
            </label>
            <label class="field" for="sc-cps">
              <span class="field-label">Clicks per second</span>
              <input id="sc-cps" type="number" min="0" step="1" bind:value={scenario.clicksPerSecond} />
            </label>
            <label class="field" for="sc-target">
              <span class="field-label">Target seconds per kill</span>
              <input id="sc-target" type="number" min="1" step="1" bind:value={scenario.targetKillSeconds} />
            </label>
            <label class="field" for="sc-matchup">
              <span class="field-label">Boss squad matchup ×</span>
              <input id="sc-matchup" type="number" min="0.5" max="2" step="0.25" bind:value={scenario.bossMatchup} />
            </label>
          </div>
        </section>

        {#each GROUPS as group (group.id)}
          <details class="group" open={group.open}>
            <summary class="group-title">{group.title}</summary>
            {#if group.note}<p class="group-note">{group.note}</p>{/if}
            {#if group.describe}
              <p class="group-note">{group.describe(draft!)}</p>
            {/if}
            <div class="field-list">
              {#each group.fields.filter((f) => !f.showIf || f.showIf(draft!)) as field (field.path.join('.'))}
                {@const value = getAt(draft, field.path)}
                {@const changed = saved !== null && value !== getAt(saved, field.path)}
                {@const invalid = !isValidField(field, value)}
                <div class="field" class:changed class:invalid>
                  <label class="field-label" for={fieldId(field.path)}>
                    {field.label}
                    <span class="const-name">{field.path.join('.')}</span>
                  </label>
                  <div class="field-input">
                    <!-- Function binding, not value + oninput: Svelte skips
                         writing back a number the field already shows, so
                         typing "0.05" never gets clobbered mid-way at "0.". -->
                    {#if field.options}
                      <select
                        id={fieldId(field.path)}
                        bind:value={() => getAt(draft!, field.path) as string, (v) => setAt(draft!, field.path, v)}
                      >
                        {#each field.options as option (option.id)}
                          <option value={option.id}>{option.label}</option>
                        {/each}
                      </select>
                    {:else}
                      <input
                        id={fieldId(field.path)}
                        type="number"
                        step={field.step}
                        bind:value={() => getAt(draft!, field.path) as number, (v) => setAt(draft!, field.path, v)}
                      />
                    {/if}
                    {#if changed}
                      <button class="undo" onclick={() => resetField(field.path)} title="Back to saved value {getAt(saved!, field.path)}"
                        >↺</button
                      >
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </details>
        {/each}
        <p class="group-note foot">
          Stages not in play yet (Armor, Ultra, Hybrid…) keep their saved values untouched.
        </p>
      </aside>

      <main class="board">
        <section class="tiles" aria-label="Example roster at a glance">
          <div class="tile">
            <span class="tile-label">Roster DPS</span>
            <span class="tile-value">{formatCompact(summary.dps)}</span>
            <span class="tile-sub">{summary.size} Digimon · {summary.attacksPerSecond.toFixed(2)} hits/s</span>
          </div>
          <div class="tile">
            <span class="tile-label">Click damage</span>
            <span class="tile-value">{formatCompact(summary.clickDamage)}</span>
            <span class="tile-sub">{safeScenario.clicksPerSecond}/s adds {summary.dps > 0 ? Math.round((safeScenario.clicksPerSecond * summary.clickDamage / summary.dps) * 100) : 0}%</span>
          </div>
          <div class="tile">
            <span class="tile-label">Target kill time</span>
            <span class="tile-value">{safeScenario.targetKillSeconds}s</span>
            <span class="tile-sub">wild fights are untimed</span>
          </div>
          <div class="tile">
            <span class="tile-label">Damage in {safeScenario.targetKillSeconds}s</span>
            <span class="tile-value">{formatCompact(summary.activeDamagePerFight)}</span>
            <span class="tile-sub">{formatCompact(summary.idleDamagePerFight)} idle</span>
          </div>
        </section>

        <section class="checks">
          <div class="panel area-check">
            <h2 class="panel-title">Area check - kill speed</h2>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr><th>Path</th><th>Levels</th><th>Toughest spawn</th><th class="num">HP</th><th class="num">Kill time</th><th>Verdict</th></tr>
                </thead>
                <tbody>
                  {#each paths as p (p.areaName + p.pathName)}
                    <tr>
                      <td>{p.pathName}</td>
                      <td class="num">{p.levelRange[0]}–{p.levelRange[1]}</td>
                      <td>{p.toughestName} <span class="dim">Lv {p.toughestLevel}</span></td>
                      <td class="num">{formatCompact(p.toughestHp)}</td>
                      <td class="num">{fmtSeconds(p.idleKillSeconds)} <span class="dim">/ {fmtSeconds(p.activeKillSeconds)} clicking</span></td>
                      <td>
                        <span class="pill {p.verdict}">
                          <span class="pill-icon" aria-hidden="true">{p.verdict === 'idle' ? '✓' : p.verdict === 'clicking' ? '!' : '✕'}</span>
                          {VERDICT_TEXT[p.verdict]}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel reach">
            <h2 class="panel-title">Killed within {safeScenario.targetKillSeconds}s</h2>
            <div class="reach-list">
              {#each reach as r (r.stage)}
                <div class="reach-row">
                  <span class="reach-stage"><i class="swatch" style="background:{STAGE_COLOR[r.stage]}"></i>{r.stage}</span>
                  <span class="reach-val">{r.active > 0 ? `Lv ${r.active}` : '—'}</span>
                  <span class="reach-idle">{r.idle > 0 ? `Lv ${r.idle} idle` : 'none idle'}</span>
                </div>
              {/each}
            </div>
          </div>
        </section>

        {#if bosses.length}
          <section class="panel">
            <h2 class="panel-title">Boss check</h2>
            <p class="chart-note boss-note">
              Squad = the example roster's highest-stage members, each at ×{safeScenario.bossMatchup} matchup. Timer from
              squad HP.
            </p>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Boss</th><th>Path</th><th class="num">HP</th><th>Squad</th><th class="num">Timer</th><th class="num">Kill time</th><th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {#each bosses as b (b.areaName + b.pathName)}
                    <tr>
                      <td>{b.bossName} <span class="dim">Lv {b.level}</span></td>
                      <td>{b.pathName}</td>
                      <td class="num">{formatCompact(b.hp)}</td>
                      <td>{b.squadText} <span class="dim">of {b.squadSize}</span></td>
                      <td class="num">{fmtSeconds(b.timerSeconds)}</td>
                      <td class="num">{fmtSeconds(b.idleKillSeconds)} <span class="dim">/ {fmtSeconds(b.activeKillSeconds)} clicking</span></td>
                      <td>
                        <span class="pill {b.verdict}">
                          <span class="pill-icon" aria-hidden="true">{b.verdict === 'idle' ? '✓' : b.verdict === 'clicking' ? '!' : '✕'}</span>
                          {BOSS_VERDICT_TEXT[b.verdict]}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>
        {/if}

        {#if winChart}
          <section class="panel">
            {@render scaleToggle('Y axis', winScale, {
              log: 'Each gridline is ×10 - exponential growth draws as a straight line.',
              linear: 'True shape of the curves - low stages flatten near zero.',
            })}
            <LineChart
              title="Wild HP vs your damage in {safeScenario.targetKillSeconds}s"
              series={winChart.series}
              yScale={winScale.value}
              xDomain={[1, levels[levels.length - 1]]}
              yDomain={winChart.yDomain}
              xLabel="Wild level"
              yLabel={winScale.value === 'log' ? 'HP / damage (log)' : 'HP / damage'}
              formatX={(x) => `${Math.round(x)}`}
              formatY={formatCompact}
              strips={winChart.strips}
              height={380}
            />
            <p class="chart-note">Wild fights are untimed - a wild falls within the target kill time where its line sits below yours.</p>
          </section>
        {/if}

        <div class="pair">
          {#if xpChart}
            <section class="panel">
              {@render scaleToggle('Y axis', xpScale, {
                log: 'Each gridline is ×10 XP.',
                linear: "The curve's true shape.",
              })}
              <LineChart
                title="XP per level-up"
                series={xpChart.series}
                yScale={xpScale.value}
                xDomain={[1, Math.max(2, xpChart.maxLevel - 1)]}
                yDomain={xpChart.yDomain}
                xLabel="Level-up from Lv"
                yLabel={xpScale.value === 'log' ? 'XP (log)' : 'XP'}
                formatX={(x) => `${Math.round(x)}`}
                formatY={formatCompact}
                markers={xpChart.markers}
                height={280}
              />
              <p class="chart-note">
                Total: {formatCompact(xpChart.totalToScenario)} XP to Lv {xpChart.at},
                {formatCompact(xpChart.totalToMax)} to Lv {xpChart.maxLevel}. Grey dashed: the other formulas.
              </p>
            </section>
          {/if}
          {#if killXpChart}
            <section class="panel">
              {@render scaleToggle('Y axis', killXpScale, {
                log: 'Each gridline is ×10 XP.',
                linear: "The curve's true shape.",
              })}
              <LineChart
                title="Kill XP per wild level"
                series={killXpChart.series}
                yScale={killXpScale.value}
                xDomain={[1, Math.max(2, killXpChart.maxLevel - 1)]}
                yDomain={killXpChart.yDomain}
                xLabel="Wild level"
                yLabel={killXpScale.value === 'log' ? 'XP per kill (log)' : 'XP per kill'}
                formatX={(x) => `${Math.round(x)}`}
                formatY={formatCompact}
                markers={killXpChart.markers}
                height={280}
              />
              <p class="chart-note">Grey dashed: the other formulas with these same settings, for comparison.</p>
            </section>
          {/if}
        </div>

        <div class="pair">
          {#if killsChart}
            <section class="panel">
              <LineChart
                title="Kills per level-up (calculated)"
                series={killsChart.series}
                xDomain={[1, Math.max(2, killsChart.maxLevel - 1)]}
                yDomain={killsChart.yDomain}
                xLabel="Level-up from Lv (same-level wilds)"
                yLabel="Kills"
                formatX={(x) => `${Math.round(x)}`}
                formatY={formatCompact}
                markers={killsChart.markers}
                height={280}
              />
              <p class="chart-note">
                XP per level-up ÷ kill XP at that level. Total: {formatCompact(killsChart.totalToScenario)} kills to Lv
                {killsChart.at}, {formatCompact(killsChart.totalToMax)} to Lv {killsChart.maxLevel}.
              </p>
            </section>
          {/if}
          {#if timerChart}
            <section class="panel">
              {@render scaleToggle('X axis', timerScale, {
                log: 'Each gridline is ×10 squad HP.',
                linear: "The formula's true shape.",
              })}
              <LineChart
                title="Boss fight timer"
                series={timerChart.series}
                xScale={timerScale.value}
                xDomain={timerChart.xDomain}
                yDomain={timerChart.yDomain}
                xLabel={timerScale.value === 'log' ? 'Squad HP (log)' : 'Squad HP'}
                yLabel="Seconds"
                formatX={formatCompact}
                formatY={(y) => `${+y.toFixed(1)}`}
                markers={timerChart.markers}
                height={280}
              />
              <p class="chart-note">Grey dashed: the other formulas with these same settings, for comparison.</p>
            </section>
          {/if}
        </div>
      </main>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background: var(--bg);
  }
  .lab {
    --lab-grid: rgba(34, 211, 238, 0.07);
    --text-dim-readable: #6d878c;
    min-height: 100vh;
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
  }

  .topbar {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 20px;
    padding: 14px 24px;
    background: rgba(10, 14, 20, 0.94);
    border-bottom: 1px solid var(--panel-border);
    backdrop-filter: blur(6px);
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 14px;
    flex-wrap: wrap;
  }
  .brand-name {
    font-family: var(--head);
    font-weight: 800;
    font-size: 18px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .brand-file {
    font-size: 12px;
    color: var(--text-dim-readable);
  }
  .save-area {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .save-status {
    font-size: 12px;
    color: var(--text);
  }
  .save-status.error {
    color: var(--danger);
  }
  .btn {
    appearance: none;
    font: inherit;
    font-size: 12px;
    padding: 7px 16px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--panel-border-strong);
  }
  .btn.primary {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn:focus-visible,
  input:focus-visible,
  select:focus-visible,
  .undo:focus-visible,
  summary:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }

  .loading,
  .load-error {
    padding: 40px 24px;
    max-width: 65ch;
  }
  .load-error {
    color: var(--danger);
  }

  .layout {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    align-items: start;
  }
  .controls {
    position: sticky;
    top: 61px;
    max-height: calc(100vh - 61px);
    overflow-y: auto;
    padding: 18px 20px 28px 24px;
    border-right: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .board {
    padding: 20px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .group-title {
    font-family: var(--head);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
    margin: 0;
    cursor: default;
  }
  summary.group-title {
    cursor: pointer;
    list-style-position: outside;
    margin-bottom: 8px;
  }
  .group-note {
    margin: 0 0 4px;
    font-size: 11px;
    color: var(--text-dim-readable);
  }
  .group-note.foot {
    margin-top: -4px;
  }
  .scenario {
    padding: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .stage-counts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .count-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10px;
  }
  .count-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text);
    white-space: nowrap;
  }
  .swatch {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .field-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 118px;
    align-items: center;
    gap: 10px;
    padding-left: 8px;
    border-left: 2px solid transparent;
  }
  .field.changed {
    border-left-color: var(--accent);
  }
  .field.invalid {
    border-left-color: var(--danger);
  }
  .field-label {
    display: flex;
    flex-direction: column;
    gap: 1px;
    color: var(--text-h);
    font-size: 12px;
    min-width: 0;
  }
  .const-name {
    font-size: 9px;
    color: var(--text-dim-readable);
    overflow-wrap: anywhere;
  }
  .field-input {
    position: relative;
    display: flex;
  }
  input,
  select {
    width: 100%;
    font: inherit;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    padding: 5px 8px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
  }
  .field.invalid input {
    border-color: var(--danger);
  }
  .undo {
    position: absolute;
    right: 22px;
    top: 50%;
    transform: translateY(-50%);
    appearance: none;
    border: none;
    background: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 13px;
    padding: 0 2px;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .tile-label {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text);
  }
  .tile-value {
    font-family: var(--head);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-h);
    font-variant-numeric: tabular-nums;
  }
  .tile-sub {
    font-size: 11px;
    color: var(--text-dim-readable);
  }

  .checks {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
    gap: 12px;
  }
  .panel {
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    min-width: 0;
  }
  .panel-title {
    margin: 0 0 10px;
    font-family: var(--head);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    font-weight: 400;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim-readable);
    padding: 0 10px 6px 0;
    border-bottom: 1px solid var(--panel-border);
  }
  td {
    padding: 7px 10px 7px 0;
    color: var(--text-h);
    border-bottom: 1px solid rgba(45, 212, 191, 0.08);
    white-space: nowrap;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .dim {
    color: var(--text-dim-readable);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    font-size: 11px;
    border: 1px solid currentColor;
  }
  .pill-icon {
    font-weight: 700;
  }
  .pill.idle {
    color: var(--pos);
    background: var(--pos-soft);
  }
  .pill.clicking {
    color: var(--warn);
    background: rgba(255, 176, 32, 0.1);
  }
  .pill.too-hard {
    color: var(--danger);
    background: rgba(255, 59, 92, 0.1);
  }
  .reach-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .reach-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: baseline;
    gap: 12px;
    font-size: 12px;
  }
  .reach-stage {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-h);
  }
  .reach-val {
    color: var(--text-h);
    font-variant-numeric: tabular-nums;
  }
  .reach-idle {
    min-width: 9ch;
    text-align: right;
    color: var(--text-dim-readable);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .scale-toggle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    margin-bottom: 12px;
    font-size: 11px;
  }
  .scale-label {
    color: var(--text-dim-readable);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 10px;
  }
  .scale-btn {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 3px 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .scale-btn.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .scale-btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  .scale-hint {
    color: var(--text-dim-readable);
    margin-left: 4px;
  }
  .boss-note {
    margin: -4px 0 10px;
  }
  .chart-note {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--text-dim-readable);
  }

  @media (max-width: 1180px) {
    .tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .checks,
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 860px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .controls {
      position: static;
      max-height: none;
      border-right: none;
      border-bottom: 1px solid var(--panel-border);
      padding: 18px 16px;
    }
    .board {
      padding: 18px 16px 32px;
    }
    .topbar {
      padding: 12px 16px;
    }
  }
</style>
