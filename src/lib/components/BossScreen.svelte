<script lang="ts">
  import { getPath, getRosterList, squadMultiplier, startBossFight } from '../game/state/game.svelte';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import {
    computeEntryDamagePerHit,
    computeSquadDps,
    computeSquadStat,
    computeSquadClickDamage,
    type WeightedEntry,
  } from '../game/combat/damage';
  import { computeWildMaxHp, computeFightTimeLimitMs } from '../game/combat/spawn';
  import SpeciesTags from './shared/SpeciesTags.svelte';
  import { formatMultiplier, multiplierTone } from './shared/matchup';

  interface Props {
    areaId: string;
    pathId: string;
    onClose: () => void;
  }

  const { areaId, pathId, onClose }: Props = $props();

  // Assumed clicking pace for the "with clicking" estimate - same default
  // as the Balance Lab's example roster.
  const ESTIMATE_CLICKS_PER_SECOND = 6;

  const boss = $derived(getPath(areaId, pathId)?.boss);
  const bossSpecies = $derived(boss ? getSpecies(boss.speciesId) : undefined);
  const bossHp = $derived(boss ? Math.round(computeWildMaxHp(boss.speciesId, boss.level) * boss.hpMultiplier) : 0);

  // Every roster entry with its matchup vs this boss, best matchups first,
  // then strongest hitters - the order Auto-pick takes them in.
  const candidates = $derived.by(() => {
    if (!boss) return [];
    return getRosterList()
      .map((entry) => {
        const multiplier = squadMultiplier(entry.speciesId, boss.speciesId);
        return { entry, multiplier, score: computeEntryDamagePerHit(entry) * multiplier };
      })
      .sort((a, b) => b.multiplier - a.multiplier || b.score - a.score);
  });

  let selected: string[] = $state([]);

  function autoPick() {
    if (!boss) return;
    selected = [...candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, boss.squadSize)
      .map((c) => c.entry.speciesId);
  }
  autoPick();

  // Picking when the squad is already full swaps the new Digimon into the
  // last slot instead of refusing - Auto-pick fills every slot on open, so
  // a blocked pick would make the rest of the roster look unselectable.
  function toggle(speciesId: string) {
    if (!boss) return;
    if (selected.includes(speciesId)) selected = selected.filter((id) => id !== speciesId);
    else if (selected.length < boss.squadSize) selected = [...selected, speciesId];
    else selected = [...selected.slice(0, boss.squadSize - 1), speciesId];
  }

  function remove(speciesId: string) {
    selected = selected.filter((id) => id !== speciesId);
  }

  const squad = $derived<WeightedEntry[]>(
    candidates.filter((c) => selected.includes(c.entry.speciesId)).map((c) => ({ entry: c.entry, multiplier: c.multiplier }))
  );
  const estimate = $derived.by(() => {
    const dps = computeSquadDps(squad);
    const timerSeconds = computeFightTimeLimitMs(computeSquadStat(squad, 'hp')) / 1000;
    const activeDps = dps + ESTIMATE_CLICKS_PER_SECOND * computeSquadClickDamage(squad);
    const idleSeconds = dps > 0 ? bossHp / dps : Infinity;
    const activeSeconds = activeDps > 0 ? bossHp / activeDps : Infinity;
    const verdict: 'idle' | 'clicking' | 'lose' =
      idleSeconds <= timerSeconds ? 'idle' : activeSeconds <= timerSeconds ? 'clicking' : 'lose';
    return { dps, timerSeconds, idleSeconds, activeSeconds, verdict };
  });
  const VERDICT_TEXT = { idle: 'Wins idle', clicking: 'Needs clicking', lose: 'Too strong' } as const;

  const fmt = (n: number) => (Number.isFinite(n) ? (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1)) : '∞');

  function start() {
    if (startBossFight(areaId, pathId, selected)) onClose();
  }

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="backdrop"
  onclick={onClose}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onClose()}
  role="button"
  tabindex="0"
>
  <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    {#if boss && bossSpecies}
      {@const bossSprite = getSpriteUrl(boss.speciesId)}
      <div class="panel-header">
        <div class="panel-title">Boss fight</div>
        <button class="close-btn" onclick={onClose}>Close</button>
      </div>

      <div class="boss">
        <div class="boss-sprite">{#if bossSprite}<img src={bossSprite} alt="" />{/if}</div>
        <div class="boss-info">
          <span class="boss-name">{bossSpecies.name} <span class="dim">Lv {boss.level}</span></span>
          <SpeciesTags speciesId={boss.speciesId} />
          <span class="boss-stats">{fmt(bossHp)} HP · squad of up to {boss.squadSize} · win: +{boss.rewards.bits} bits, +{boss.rewards.data} Data</span>
        </div>
      </div>

      <div class="body">
        <div class="squad-row" aria-label="Squad">
          {#each Array.from({ length: boss.squadSize }) as _, i (i)}
            {@const id = selected[i]}
            {#if id}
              {@const slotSprite = getSpriteUrl(id)}
              {@const member = candidates.find((c) => c.entry.speciesId === id)}
              <div class="slot filled">
                <div class="c-sprite">{#if slotSprite}<img src={slotSprite} alt="" />{/if}</div>
                <span class="slot-name">{getSpeciesName(id)}</span>
                {#if member}<span class="mult {multiplierTone(member.multiplier)}">{formatMultiplier(member.multiplier)}</span>{/if}
                <button class="slot-remove" onclick={() => remove(id)} aria-label="Remove {getSpeciesName(id)} from the squad">×</button>
              </div>
            {:else}
              <div class="slot empty">Empty slot</div>
            {/if}
          {/each}
        </div>

        <div class="list-head">
          <span class="section-title">
            Your roster <span class="dim">- best matchups first{selected.length >= boss.squadSize
                ? ' · squad full: picking swaps out the last slot'
                : ''}</span>
          </span>
          <div class="head-actions">
            <button class="small-btn" onclick={() => (selected = [])} disabled={selected.length === 0}>Clear</button>
            <button class="small-btn" onclick={autoPick}>Auto-pick</button>
          </div>
        </div>
        <div class="candidates">
          {#each candidates as c (c.entry.speciesId)}
            {@const sprite = getSpriteUrl(c.entry.speciesId)}
            {@const picked = selected.includes(c.entry.speciesId)}
            <button class="candidate" class:picked onclick={() => toggle(c.entry.speciesId)} aria-pressed={picked}>
              <div class="c-sprite">{#if sprite}<img src={sprite} alt="" />{/if}</div>
              <div class="c-info">
                <span class="c-name">{getSpeciesName(c.entry.speciesId)} <span class="dim">Lv {levelForXp(c.entry.xp)}</span></span>
                <SpeciesTags speciesId={c.entry.speciesId} />
              </div>
              <span class="mult {multiplierTone(c.multiplier)}">{formatMultiplier(c.multiplier)}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="footer">
        <div class="estimate">
          <span>Squad {selected.length}/{boss.squadSize}</span>
          <span>{fmt(estimate.dps)} DPS</span>
          <span>Timer {fmt(estimate.timerSeconds)}s</span>
          <span>Kill in {fmt(estimate.idleSeconds)}s idle · {fmt(estimate.activeSeconds)}s clicking {ESTIMATE_CLICKS_PER_SECOND}/s</span>
          <span class="pill {estimate.verdict}">{VERDICT_TEXT[estimate.verdict]}</span>
        </div>
        <button class="start" disabled={selected.length === 0} onclick={start}>Start fight</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .panel {
    width: 92%;
    max-width: 880px;
    height: 88%;
    background: var(--panel);
    border: 1px solid rgba(255, 59, 92, 0.45);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--danger);
  }
  .close-btn,
  .small-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .close-btn:hover,
  .small-btn:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .boss {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .boss-sprite {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .boss-sprite img,
  .c-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .boss-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .boss-name {
    font-family: var(--head);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-h);
  }
  .boss-stats {
    font-size: 11px;
    color: var(--text);
  }
  .dim {
    color: var(--text-dim);
    font-family: var(--mono);
    font-weight: 400;
    font-size: 11px;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .section-title {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .candidates {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    align-content: start;
    gap: 8px;
  }
  .candidate {
    appearance: none;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .candidate:hover:not(:disabled) {
    border-color: var(--panel-border-strong);
  }
  .candidate.picked {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .squad-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }
  .slot {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    padding: 6px 8px;
    border: 1px solid var(--panel-border);
    background: var(--panel-2);
  }
  .slot.filled {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .slot.empty {
    justify-content: center;
    border-style: dashed;
    font-size: 11px;
    color: var(--text-dim);
  }
  .slot-name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slot-remove {
    appearance: none;
    border: none;
    background: none;
    color: var(--text);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
  }
  .slot-remove:hover {
    color: var(--danger);
  }
  .head-actions {
    display: flex;
    gap: 6px;
  }
  .small-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .candidate:focus-visible,
  .start:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  .c-sprite {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .c-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .c-name {
    font-size: 12px;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .mult {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    padding: 2px 6px;
    border: 1px solid currentColor;
  }
  .mult.good {
    color: var(--pos);
  }
  .mult.neutral {
    color: var(--text);
  }
  .mult.bad {
    color: var(--danger);
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }
  .estimate {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    font-size: 11px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .pill {
    padding: 2px 8px;
    border: 1px solid currentColor;
  }
  .pill.idle {
    color: var(--pos);
  }
  .pill.clicking {
    color: var(--warn);
  }
  .pill.lose {
    color: var(--danger);
  }
  .start {
    appearance: none;
    font: inherit;
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 10px 22px;
    background: rgba(255, 59, 92, 0.12);
    border: 1px solid var(--danger);
    color: var(--danger);
    cursor: pointer;
  }
  .start:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
