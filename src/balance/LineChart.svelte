<script lang="ts" module>
  export interface ChartSeries {
    id: string;
    label: string;
    color: string;
    /** SVG stroke-dasharray, e.g. '6 4' - identity backup for color. */
    dash?: string;
    /** Shared x grid across all series of one chart (the crosshair snaps
     * to series[0]'s x values and reads every series at that index). */
    points: [number, number][];
  }

  /** A labeled x-range drawn as a strip above the plot (e.g. an area path's
   * level range). */
  export interface ChartStrip {
    from: number;
    to: number;
    label: string;
  }

  export interface ChartMarker {
    x: number;
    y: number;
    label: string;
  }
</script>

<script lang="ts">
  type ScaleType = 'linear' | 'log';

  interface Props {
    title: string;
    series: ChartSeries[];
    xScale?: ScaleType;
    yScale?: ScaleType;
    xDomain: [number, number];
    yDomain: [number, number];
    xLabel: string;
    yLabel: string;
    formatX?: (x: number) => string;
    formatY?: (y: number) => string;
    strips?: ChartStrip[];
    markers?: ChartMarker[];
    height?: number;
  }

  const {
    title,
    series,
    xScale = 'linear',
    yScale = 'linear',
    xDomain,
    yDomain,
    xLabel,
    yLabel,
    formatX = (x: number) => `${x}`,
    formatY = (y: number) => `${y}`,
    strips = [],
    markers = [],
    height = 300,
  }: Props = $props();

  let width = $state(640);

  const STRIP_ROW = 16;
  const margin = $derived({ top: 12 + strips.length * STRIP_ROW, right: 104, bottom: 40, left: 58 });
  const plotW = $derived(Math.max(80, width - margin.left - margin.right));
  const plotH = $derived(Math.max(80, height - margin.top - margin.bottom));

  function project(value: number, [lo, hi]: [number, number], type: ScaleType, size: number, invert: boolean): number {
    const t =
      type === 'log'
        ? (Math.log10(Math.max(value, 1e-12)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))
        : (value - lo) / (hi - lo);
    return invert ? size - t * size : t * size;
  }

  const sx = (x: number) => project(x, xDomain, xScale, plotW, false);
  const sy = (y: number) => project(y, yDomain, yScale, plotH, true);

  function unprojectX(px: number): number {
    const t = px / plotW;
    return xScale === 'log'
      ? Math.pow(10, Math.log10(xDomain[0]) + t * (Math.log10(xDomain[1]) - Math.log10(xDomain[0])))
      : xDomain[0] + t * (xDomain[1] - xDomain[0]);
  }

  // Linear: ~5 "nice" steps (1/2/5 x 10^n). Log: every power of ten in the
  // domain (so each gridline is always x10 - labels thin separately below).
  function ticks([lo, hi]: [number, number], type: ScaleType): number[] {
    if (!(hi > lo)) return [lo];
    if (type === 'log') {
      const all: number[] = [];
      for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) all.push(Math.pow(10, e));
      return all;
    }
    const rough = (hi - lo) / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough;
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }

  const xTicks = $derived(ticks(xDomain, xScale));
  const yTicks = $derived(ticks(yDomain, yScale));
  // At most ~8 labels per axis, however many gridlines there are.
  const labelStride = (count: number) => Math.max(1, Math.ceil(count / 8));

  function pathFor(points: [number, number][]): string {
    let d = '';
    let pen = false;
    for (const [x, y] of points) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || (yScale === 'log' && y <= 0)) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`;
      pen = true;
    }
    return d;
  }

  // Direct labels at each line's right end, clamped into the plot and
  // nudged apart vertically so neighbours never overlap.
  const endLabels = $derived.by(() => {
    const labels = series
      .map((s) => {
        const last = [...s.points].reverse().find(([, y]) => Number.isFinite(y) && (yScale !== 'log' || y > 0));
        if (!last) return null;
        const y = Math.min(plotH, Math.max(0, sy(last[1])));
        return { id: s.id, label: s.label, color: s.color, y };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.y - b.y);
    const GAP = 13;
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < GAP) labels[i].y = labels[i - 1].y + GAP;
    }
    const overflow = labels.length ? labels[labels.length - 1].y - plotH : 0;
    if (overflow > 0) for (const l of labels) l.y -= overflow;
    return labels;
  });

  // Crosshair: snaps to the nearest x of series[0]; arrow keys step it.
  let hoverIndex: number | null = $state(null);
  const xs = $derived(series[0]?.points.map(([x]) => x) ?? []);

  function nearestIndex(px: number): number {
    const target = unprojectX(px);
    let best = 0;
    for (let i = 1; i < xs.length; i++) {
      const di = xScale === 'log' ? Math.abs(Math.log10(xs[i]) - Math.log10(target)) : Math.abs(xs[i] - target);
      const db = xScale === 'log' ? Math.abs(Math.log10(xs[best]) - Math.log10(target)) : Math.abs(xs[best] - target);
      if (di < db) best = i;
    }
    return best;
  }

  function onPointerMove(event: PointerEvent) {
    const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
    hoverIndex = nearestIndex(event.clientX - rect.left);
  }

  function onKeydown(event: KeyboardEvent) {
    if (!xs.length) return;
    if (event.key === 'ArrowRight') hoverIndex = Math.min(xs.length - 1, (hoverIndex ?? -1) + 1);
    else if (event.key === 'ArrowLeft') hoverIndex = Math.max(0, (hoverIndex ?? xs.length) - 1);
    else if (event.key === 'Escape') hoverIndex = null;
    else return;
    event.preventDefault();
  }

  const hover = $derived.by(() => {
    if (hoverIndex === null || hoverIndex >= xs.length) return null;
    const x = xs[hoverIndex];
    const px = sx(x);
    return {
      px,
      xText: formatX(x),
      flip: px > plotW * 0.62,
      rows: series.map((s) => ({ id: s.id, label: s.label, color: s.color, dash: s.dash, y: s.points[hoverIndex!]?.[1] })),
    };
  });
</script>

<figure class="chart" bind:clientWidth={width}>
  <figcaption class="chart-head">
    <span class="chart-title">{title}</span>
    <span class="legend">
      {#each series as s (s.id)}
        <span class="legend-item">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke={s.color} stroke-width="2" stroke-dasharray={s.dash ?? ''} stroke-linecap="round" />
          </svg>
          {s.label}
        </span>
      {/each}
    </span>
  </figcaption>

  <div class="plot-wrap">
    <svg {width} {height} role="img" aria-label={title}>
      <defs>
        <clipPath id="clip-{title.replace(/\W+/g, '-')}">
          <rect x="0" y="-2" width={plotW} height={plotH + 4} />
        </clipPath>
      </defs>
      <g transform="translate({margin.left},{margin.top})">
        {#each strips as strip, i (strip.label)}
          {@const x1 = Math.max(0, sx(strip.from))}
          {@const x2 = Math.min(plotW, sx(strip.to))}
          {#if x2 > x1}
            <g transform="translate(0,{-margin.top + 8 + i * STRIP_ROW})">
              <rect x={x1} y="0" width={x2 - x1} height="4" class="strip" rx="2" />
              <text x={x1} y="-1" dy="-2" class="strip-label">{strip.label}</text>
            </g>
          {/if}
        {/each}

        {#each yTicks as t, i (t)}
          <line x1="0" x2={plotW} y1={sy(t)} y2={sy(t)} class="grid" />
          {#if i % labelStride(yTicks.length) === 0}
            <text x="-8" y={sy(t)} dy="0.32em" text-anchor="end" class="tick">{formatY(t)}</text>
          {/if}
        {/each}
        {#each xTicks as t, i (t)}
          {#if i % labelStride(xTicks.length) === 0}
            <text x={sx(t)} y={plotH + 16} text-anchor="middle" class="tick">{formatX(t)}</text>
          {/if}
        {/each}
        <line x1="0" x2={plotW} y1={plotH} y2={plotH} class="axis" />
        <text x={plotW / 2} y={plotH + 34} text-anchor="middle" class="axis-label">{xLabel}</text>
        <text transform="translate({-46},{plotH / 2}) rotate(-90)" text-anchor="middle" class="axis-label">{yLabel}</text>

        <g clip-path="url(#clip-{title.replace(/\W+/g, '-')})">
          {#each series as s (s.id)}
            <path d={pathFor(s.points)} fill="none" stroke={s.color} stroke-width="2" stroke-dasharray={s.dash ?? ''} stroke-linejoin="round" stroke-linecap="round" />
          {/each}
          {#each markers as m (m.label)}
            <circle cx={sx(m.x)} cy={sy(m.y)} r="5" class="marker" />
          {/each}
        </g>
        {#each markers as m (m.label)}
          <text x={sx(m.x)} y={sy(m.y) - 10} text-anchor={sx(m.x) > plotW * 0.7 ? 'end' : 'start'} class="marker-label">{m.label}</text>
        {/each}

        {#each endLabels as l (l.id)}
          <text x={plotW + 8} y={l.y} dy="0.32em" class="end-label" fill={l.color}>{l.label}</text>
        {/each}

        {#if hover}
          <line x1={hover.px} x2={hover.px} y1="0" y2={plotH} class="crosshair" />
          {#each hover.rows as row (row.id)}
            {#if row.y !== undefined && Number.isFinite(row.y) && row.y >= yDomain[0] && row.y <= yDomain[1]}
              <circle cx={hover.px} cy={sy(row.y)} r="4" fill={row.color} class="hover-dot" />
            {/if}
          {/each}
        {/if}

        <rect
          width={plotW}
          height={plotH}
          fill="transparent"
          role="slider"
          tabindex="0"
          aria-label="{title}: use left and right arrow keys to read values"
          aria-valuenow={hoverIndex ?? 0}
          onpointermove={onPointerMove}
          onpointerleave={() => (hoverIndex = null)}
          onkeydown={onKeydown}
          onblur={() => (hoverIndex = null)}
          class="hit"
        />
      </g>
    </svg>

    {#if hover}
      <div
        class="tooltip"
        class:flip={hover.flip}
        style="left: {margin.left + hover.px + (hover.flip ? -12 : 12)}px; top: {margin.top + 4}px;"
      >
        <div class="tt-x">{xLabel} {hover.xText}</div>
        {#each hover.rows as row (row.id)}
          <div class="tt-row">
            <svg width="14" height="6" aria-hidden="true">
              <line x1="1" y1="3" x2="13" y2="3" stroke={row.color} stroke-width="2" stroke-dasharray={row.dash ?? ''} />
            </svg>
            <span class="tt-value">{row.y === undefined ? '–' : formatY(row.y)}</span>
            <span class="tt-label">{row.label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</figure>

<style>
  .chart {
    margin: 0;
    min-width: 0;
  }
  .chart-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px 16px;
    margin-bottom: 6px;
  }
  .chart-title {
    font-family: var(--head);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 11px;
    color: var(--text);
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .plot-wrap {
    position: relative;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: var(--lab-grid);
    stroke-width: 1;
  }
  .axis {
    stroke: var(--panel-border-strong);
  }
  .tick {
    fill: var(--text);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
  .axis-label {
    fill: var(--text-dim-readable);
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .strip {
    fill: var(--panel-border-strong);
  }
  .strip-label {
    fill: var(--text);
    font-size: 10px;
  }
  .end-label {
    font-size: 11px;
  }
  .marker {
    fill: var(--accent);
    stroke: var(--panel);
    stroke-width: 2;
  }
  .marker-label {
    fill: var(--text-h);
    font-size: 11px;
  }
  .crosshair {
    stroke: var(--text);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .hover-dot {
    stroke: var(--panel);
    stroke-width: 2;
  }
  .hit {
    cursor: crosshair;
    outline: none;
  }
  .hit:focus-visible {
    stroke: var(--accent);
    stroke-width: 1;
  }
  .tooltip {
    position: absolute;
    pointer-events: none;
    min-width: 150px;
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--panel-border-strong);
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    z-index: 2;
  }
  .tooltip.flip {
    transform: translateX(-100%);
  }
  .tt-x {
    color: var(--text);
    margin-bottom: 2px;
  }
  .tt-row {
    display: grid;
    grid-template-columns: 14px auto 1fr;
    align-items: center;
    gap: 6px;
  }
  .tt-value {
    color: var(--text-h);
    font-variant-numeric: tabular-nums;
  }
  .tt-label {
    color: var(--text);
  }
</style>
