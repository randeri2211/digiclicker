<script lang="ts">
  import { offline, dismissOfflineReport, getPath } from '../game/state/game.svelte';
  import { getSpriteUrl, getSpeciesName } from '../game/images';
  import { OFFLINE_PROGRESS_CAP_HOURS } from '../game/constants';

  const report = $derived(offline.report);
  // Biggest jumps first; the rest are summarised in one line.
  const levelUps = $derived(
    report ? Object.entries(report.levelUps).sort((a, b) => b[1].to - b[1].from - (a[1].to - a[1].from)) : [],
  );
  const SHOWN = 6;

  function duration(ms: number): string {
    const minutes = Math.floor(ms / 60_000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  }

  function pathName(key: string): string {
    const [areaId, pathId] = key.split(':');
    return getPath(areaId, pathId)?.name ?? pathId;
  }

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') dismissOfflineReport();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if report}
  <div
    class="backdrop"
    onclick={dismissOfflineReport}
    onkeydown={(e) => e.key === ' ' && dismissOfflineReport()}
    role="button"
    tabindex="0"
  >
    <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="title">Welcome back</div>
      <div class="away">
        You were away for {duration(report.awayMs)}.
        {#if report.capped}Your team kept fighting for the first {OFFLINE_PROGRESS_CAP_HOURS}h.{/if}
      </div>

      <div class="totals">
        <div class="total"><span class="value">{report.kills.toLocaleString()}</span><span class="label">wild Digimon defeated</span></div>
        <div class="total"><span class="value">+{report.bits.toLocaleString()}</span><span class="label">bits</span></div>
        <div class="total"><span class="value">{report.eggs}</span><span class="label">{report.eggs === 1 ? 'egg' : 'eggs'} found</span></div>
      </div>

      {#if report.newDigimon.length}
        <div class="section-title">Digivolved</div>
        <div class="row">
          {#each report.newDigimon as id (id)}
            {@const sprite = getSpriteUrl(id)}
            <div class="mon new">
              {#if sprite}<img src={sprite} alt="" />{/if}
              <span>{getSpeciesName(id)}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if levelUps.length}
        <div class="section-title">Level ups</div>
        <div class="row">
          {#each levelUps.slice(0, SHOWN) as [id, change] (id)}
            {@const sprite = getSpriteUrl(id)}
            <div class="mon">
              {#if sprite}<img src={sprite} alt="" />{/if}
              <span>{getSpeciesName(id)}</span>
              <span class="lv">Lv {change.from} → {change.to}</span>
            </div>
          {/each}
        </div>
        {#if levelUps.length > SHOWN}<div class="more">+{levelUps.length - SHOWN} more</div>{/if}
      {/if}

      {#if report.newPaths.length}
        <div class="section-title">New paths opened</div>
        <div class="paths">{report.newPaths.map(pathName).join(' · ')}</div>
      {/if}

      <button class="ok" onclick={dismissOfflineReport}>Continue</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }
  .panel {
    width: 92%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px 24px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
  }
  .title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .away {
    font-size: 12px;
    color: var(--text);
  }
  .totals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .total {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .value {
    font-family: var(--head);
    font-size: 18px;
    color: var(--pos);
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: 11px;
    color: var(--text-dim);
  }
  .section-title {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 76px;
    padding: 6px 4px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    font-size: 10px;
    color: var(--text-h);
    text-align: center;
  }
  .mon.new {
    border-color: var(--pos);
  }
  .mon img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
  .lv {
    color: var(--accent);
  }
  .more,
  .paths {
    font-size: 12px;
    color: var(--text);
  }
  .ok {
    align-self: flex-end;
    appearance: none;
    font: inherit;
    font-size: 12px;
    padding: 8px 18px;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    color: var(--text-h);
    cursor: pointer;
  }
</style>
