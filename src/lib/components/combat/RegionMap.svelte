<script lang="ts">
  import {
    areaProgress,
    combat,
    travelTo,
    getArea,
    killsOnPath,
    pathNodeState,
    REGIONS,
    MAP_SIZE,
    getRegion,
    getRegionOfArea,
    isAreaBuilt,
    isAreaUnlocked,
    isRegionUnlocked,
    layoutPathNodes,
  } from '../../game/state/game.svelte';
  import type { PathNodeState } from '../../game/state/game.svelte';
  import type { AreaPath, RegionMapArea } from '../../game/types';
  import { blobPath, TERRAIN_COLOR } from './regionMapShapes';

  // PokeClicker-style travel map: one map per region (story act), its areas
  // as land, their paths as nodes. Tabs switch the viewed region; the view
  // follows the player whenever they travel into another region.
  const activeRegionId = $derived(getRegionOfArea(areaProgress.activeAreaId)?.id ?? REGIONS[0].id);
  let viewedRegionId = $state('');
  $effect(() => {
    viewedRegionId = activeRegionId;
  });
  const region = $derived(getRegion(viewedRegionId) ?? getRegion(activeRegionId)!);
  const [mapWidth, mapHeight] = MAP_SIZE;

  interface PathNode {
    areaId: string;
    pathId: string;
    path: AreaPath;
    x: number;
    y: number;
    state: PathNodeState;
    active: boolean;
  }

  const areaCenters = $derived(new Map(region.areas.map((area) => [area.id, area])));

  const nodePoints = $derived(layoutPathNodes(region));

  const nodes = $derived.by((): PathNode[] =>
    region.areas.flatMap((mapArea) => {
      const area = getArea(mapArea.id);
      if (!area) return [];
      return Object.entries(area.paths).map(([pathId, path]) => ({
        areaId: mapArea.id,
        pathId,
        path,
        ...(nodePoints.get(`${mapArea.id}:${pathId}`) ?? { x: mapArea.x, y: mapArea.y }),
        state: pathNodeState(areaProgress, mapArea.id, pathId),
        active: mapArea.id === areaProgress.activeAreaId && pathId === areaProgress.activePathId,
      }));
    }),
  );

  // Lines between a path and the same-area paths it unlocks.
  const pathLinks = $derived(
    nodes.flatMap((node) =>
      node.path.unlocks
        .filter((ref) => !ref.includes(':'))
        .map((ref) => nodes.find((other) => other.areaId === node.areaId && other.pathId === ref))
        .filter((target): target is PathNode => target !== undefined)
        .map((target) => ({ from: node, to: target, open: target.state !== 'locked' })),
    ),
  );

  let hovered: PathNode | RegionMapArea | null = $state(null);
  const inBoss = $derived(combat.boss !== null);

  function travel(node: PathNode) {
    if (node.state === 'locked' || inBoss) return;
    travelTo(node.areaId, node.pathId);
  }

  function nodeInfo(node: PathNode): string {
    const kills = killsOnPath(areaProgress, node.areaId, node.pathId);
    const range = `Lv ${node.path.levelRange[0]}-${node.path.levelRange[1]}`;
    const where = `${getArea(node.areaId)?.name ?? ''} · ${node.path.name}`;
    if (node.state === 'locked') return `${where} · locked`;
    const status: Record<PathNodeState, string> = {
      locked: '',
      open: `${Math.min(kills, node.path.mastery.kills)}/${node.path.mastery.kills} kills to mastery`,
      mastered: 'mastered',
      'boss-ready': 'boss ready',
      cleared: 'boss defeated',
    };
    return `${where} · ${range} · ${status[node.state]}`;
  }

  function areaInfo(area: RegionMapArea): string {
    if (!isAreaBuilt(area.id)) return '??? · not yet discovered';
    return isAreaUnlocked(areaProgress, area.id) ? area.name : `${area.name} · locked`;
  }

  const info = $derived.by(() => {
    if (hovered && 'pathId' in hovered) return nodeInfo(hovered);
    if (hovered) return areaInfo(hovered);
    const active = nodes.find((node) => node.active);
    if (inBoss) return 'Boss fight in progress - retreat to travel';
    return active ? nodeInfo(active) : `${region.name} - not reached yet`;
  });

  function routeOpen(a: string, b: string): boolean {
    return isAreaUnlocked(areaProgress, a) && isAreaUnlocked(areaProgress, b);
  }
</script>

<div class="region-map" data-tip="map">
  <div class="region-tabs">
    {#each REGIONS as tabRegion (tabRegion.id)}
      {@const unlocked = isRegionUnlocked(areaProgress, tabRegion)}
      <button
        class="region-tab"
        class:viewed={tabRegion.id === region.id}
        class:current={tabRegion.id === activeRegionId}
        class:locked={!unlocked}
        onclick={() => (viewedRegionId = tabRegion.id)}
      >
        {#if !unlocked}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.8" />
          </svg>
        {/if}
        <span class="tab-act">{tabRegion.label}</span>
        {unlocked ? tabRegion.name : '???'}
      </button>
    {/each}
  </div>

  <svg class="map" viewBox="0 0 {mapWidth} {mapHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="{region.name} map">
    <defs>
      <pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M25 0H0V25" fill="none" stroke="rgba(34,211,238,0.07)" stroke-width="1" />
      </pattern>
      <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>

    <rect width={mapWidth} height={mapHeight} fill="#081018" />
    <rect width={mapWidth} height={mapHeight} fill="url(#map-grid)" />

    {#if region.background}
      <image href={region.background} width={mapWidth} height={mapHeight} preserveAspectRatio="xMidYMid slice" />
    {:else}
      <!-- Shore: every area's blob a little bigger, plus a land bridge along
           each route, drawn outlined first and then filled on top - so the
           areas merge into one landmass with a single glowing coastline. -->
      {#each [true, false] as outline (outline)}
        {#each region.routes as [a, b] (a + b)}
          {@const from = areaCenters.get(a)}
          {@const to = areaCenters.get(b)}
          {#if from && to}
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={outline ? 'rgba(34,211,238,0.35)' : '#131c24'}
              stroke-width={outline ? 50 : 44}
              stroke-linecap="round"
            />
          {/if}
        {/each}
        {#each region.areas as area (area.id)}
          <path
            d={blobPath(area.id, area.x, area.y, area.r, 1.15)}
            fill={outline ? 'none' : '#131c24'}
            stroke={outline ? 'rgba(34,211,238,0.35)' : 'none'}
            stroke-width="3"
          />
        {/each}
      {/each}
      {#each region.areas as area (area.id)}
        {@const reached = isAreaUnlocked(areaProgress, area.id)}
        <path
          d={blobPath(area.id + ':land', area.x, area.y, area.r, 0.95)}
          fill={TERRAIN_COLOR[area.terrain]}
          opacity={reached ? 0.95 : isAreaBuilt(area.id) ? 0.45 : 0.22}
        />
      {/each}
    {/if}

    {#each region.routes as [a, b] (a + b)}
      {@const from = areaCenters.get(a)}
      {@const to = areaCenters.get(b)}
      {#if from && to}
        <line
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          class="route"
          class:open={routeOpen(a, b)}
        />
      {/if}
    {/each}

    {#each region.areas as area (area.id)}
      {@const built = isAreaBuilt(area.id)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <g
        class="area-label"
        class:dim={!isAreaUnlocked(areaProgress, area.id)}
        onmouseenter={() => (hovered = area)}
        onmouseleave={() => (hovered = null)}
      >
        <circle cx={area.x} cy={area.y} r={area.r * 0.9} fill="transparent" />
        <text x={area.x} y={area.y - area.r * 0.78}>{built ? area.name : '???'}</text>
      </g>
    {/each}

    {#each pathLinks as link (link.from.pathId + link.to.pathId)}
      <line
        x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y}
        class="path-link"
        class:open={link.open}
      />
    {/each}

    {#each nodes as node (node.areaId + node.pathId)}
      {@const { x, y } = node}
      <g
        class="node {node.state}"
        class:active={node.active}
        class:blocked={inBoss}
        role="button"
        tabindex={node.state === 'locked' ? -1 : 0}
        aria-label={nodeInfo(node)}
        onclick={() => travel(node)}
        onkeydown={(e) => e.key === 'Enter' && travel(node)}
        onmouseenter={() => (hovered = node)}
        onmouseleave={() => (hovered = null)}
      >
        {#if node.active}
          <circle cx={x} cy={y} r="16" class="active-ring" />
          <circle cx={x} cy={y} r="11" class="glow" filter="url(#node-glow)" />
        {/if}
        {#if node.path.boss}
          <rect x={x - 9} y={y - 9} width="18" height="18" transform="rotate(45 {x} {y})" class="shape" />
        {:else}
          <circle cx={x} cy={y} r="9" class="shape" />
        {/if}
        {#if node.state === 'mastered' || node.state === 'cleared'}
          <path d="M{x - 4} {y}l3 3 5-6" class="mark" />
        {:else if node.state === 'locked'}
          <circle cx={x} cy={y} r="2.5" class="mark-dot" />
        {/if}
      </g>
    {/each}
  </svg>

  <div class="map-info">{info}</div>
</div>

<style>
  .region-map {
    flex: 2 1 0;
    min-height: 0;
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .region-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .region-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font: inherit;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .region-tab.viewed {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .region-tab.locked {
    color: var(--text-dim);
  }
  .region-tab.current::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--pos);
  }
  .tab-act {
    font-size: 9px;
    color: var(--text-dim);
  }
  .map {
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
    max-height: 380px;
    background: #081018;
    border: 1px solid var(--panel-border);
    display: block;
  }
  .map-info {
    font-size: 12px;
    color: var(--text);
    min-height: 16px;
  }

  .route {
    stroke: rgba(143, 168, 173, 0.25);
    stroke-width: 2;
    stroke-dasharray: 6 6;
  }
  .route.open {
    stroke: rgba(34, 211, 238, 0.6);
  }
  .area-label text {
    fill: var(--text-h);
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1.5px;
    text-anchor: middle;
    text-transform: uppercase;
    paint-order: stroke;
    stroke: #081018;
    stroke-width: 4px;
    pointer-events: none;
  }
  .area-label.dim text {
    fill: var(--text-dim);
  }
  .path-link {
    stroke: rgba(143, 168, 173, 0.3);
    stroke-width: 3;
  }
  .path-link.open {
    stroke: rgba(34, 211, 238, 0.7);
  }

  .node {
    cursor: pointer;
    outline: none;
  }
  .node.locked,
  .node.blocked {
    cursor: not-allowed;
  }
  .node .shape {
    fill: #0d1319;
    stroke: var(--accent);
    stroke-width: 2.5;
  }
  .node.locked .shape {
    stroke: var(--text-dim);
  }
  .node.mastered .shape {
    fill: rgba(57, 255, 136, 0.25);
    stroke: var(--pos);
  }
  .node.boss-ready .shape {
    fill: rgba(255, 59, 92, 0.3);
    stroke: var(--danger);
  }
  .node.cleared .shape {
    fill: rgba(255, 176, 32, 0.3);
    stroke: var(--warn);
  }
  .node:hover .shape,
  .node:focus-visible .shape {
    stroke-width: 4;
  }
  .node .mark {
    fill: none;
    stroke: var(--text-h);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .node .mark-dot {
    fill: var(--text-dim);
  }
  .glow {
    fill: var(--accent);
    opacity: 0.6;
  }
  .active-ring {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    animation: pulse 1.6s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.9;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.25);
    }
  }
</style>
