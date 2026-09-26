<script lang="ts">
  import type { ExpeditionDestination, RosterEntry } from '../game/types';
  import {
    expeditions,
    areaProgress,
    getPath,
    getRosterList,
    isAway,
    combat,
    startExpedition,
    claimExpedition,
    hasReturned,
    dismissHaul,
    ITEM_CATALOG,
  } from '../game/state/game.svelte';
  import {
    DESTINATIONS,
    isDestinationUnlocked,
    expeditionDurationMs,
    expeditionHaulMultiplier,
    getDestination,
  } from '../game/expeditions/expeditions';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import { EXPEDITION_MAX_CONCURRENT, EXPEDITION_MAX_PARTY } from '../game/constants';
  import ElementIcon from './shared/ElementIcon.svelte';
  import SpeciesTags from './shared/SpeciesTags.svelte';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  // Local clock for the countdowns - the game's own state only changes when
  // a party returns, so a 1s tick keeps the timers moving between those.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  const destinations = Object.values(DESTINATIONS);
  let selectedId: string | null = $state(
    destinations.find((d) => isDestinationUnlocked(areaProgress, d))?.id ?? null
  );
  const selected = $derived(selectedId ? getDestination(selectedId) : undefined);
  const slotFree = $derived(expeditions.active.length < EXPEDITION_MAX_CONCURRENT);

  let party: string[] = $state([]);

  function isFavored(entry: RosterEntry, destination: ExpeditionDestination): boolean {
    const element = getSpecies(entry.speciesId)?.element;
    return element !== undefined && destination.favoredElements.includes(element);
  }

  // Who can go: owned, not already away, not in a running boss squad -
  // favored elements first, then highest level.
  const candidates = $derived.by(() => {
    if (!selected) return [];
    const inSquad = new Set(combat.boss?.squad.map((m) => m.speciesId) ?? []);
    return getRosterList()
      .filter((entry) => !isAway(entry.speciesId) && !inSquad.has(entry.speciesId))
      .sort(
        (a, b) =>
          Number(isFavored(b, selected)) - Number(isFavored(a, selected)) || levelForXp(b.xp) - levelForXp(a.xp)
      );
  });

  function toggle(speciesId: string) {
    if (party.includes(speciesId)) party = party.filter((id) => id !== speciesId);
    else if (party.length < EXPEDITION_MAX_PARTY) party = [...party, speciesId];
    else party = [...party.slice(0, EXPEDITION_MAX_PARTY - 1), speciesId];
  }

  function selectDestination(id: string) {
    selectedId = id;
    party = [];
  }

  const partyEntries = $derived(party.map((id) => getRosterList().find((e) => e.speciesId === id)).filter((e) => e !== undefined));
  const preview = $derived(
    selected && partyEntries.length
      ? { durationMs: expeditionDurationMs(selected, partyEntries), multiplier: expeditionHaulMultiplier(selected, partyEntries) }
      : null
  );

  function start() {
    if (selected && startExpedition(selected.id, party)) party = [];
  }

  function formatDuration(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
  }

  function lootSummary(d: ExpeditionDestination): string {
    const items = d.loot.items.map((i) => ITEM_CATALOG[i.id].name).join(', ');
    return `${d.loot.data[0]}–${d.loot.data[1]} Data · ${d.loot.eggChancePercent}% egg${items ? ` · ${items}` : ''}`;
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
    <div class="panel-header">
      <div class="panel-title">Expeditions</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    {#if expeditions.lastHaul}
      {@const haul = expeditions.lastHaul}
      <div class="haul" role="status">
        <span class="haul-title">Back from {getDestination(haul.destinationId)?.name ?? 'the expedition'}</span>
        <span class="haul-items">
          +{haul.data} Data{haul.eggs ? ` · ${haul.eggs} egg${haul.eggs > 1 ? 's' : ''} (to the hatchery)` : ''}{#each haul.items as item (item.id)}
            &nbsp;· {item.count}× {ITEM_CATALOG[item.id].name}{/each}
        </span>
        <button class="small-btn" onclick={dismissHaul}>OK</button>
      </div>
    {/if}

    {#if expeditions.active.length}
      <section class="section">
        <h2 class="section-title">Out exploring</h2>
        {#each expeditions.active as expedition (expedition.id)}
          {@const destination = getDestination(expedition.destinationId)}
          {@const total = expedition.endsAt - expedition.startedAt}
          {@const back = hasReturned(expedition, now)}
          {@const left = back ? 0 : expedition.endsAt - now}
          <div class="active">
            <div class="active-party">
              {#each expedition.memberSpeciesIds as id (id)}
                {@const sprite = getSpriteUrl(id)}
                <div class="mini-sprite" title={getSpeciesName(id)}>{#if sprite}<img src={sprite} alt="" />{/if}</div>
              {/each}
            </div>
            <div class="active-info">
              <span class="active-name">{destination?.name ?? expedition.destinationId}</span>
              <div class="track"><div class="fill" style="width: {Math.round((1 - Math.max(0, left) / total) * 100)}%"></div></div>
              <span class="active-time">{back ? 'Back - the party is fighting again' : `${formatDuration(left)} left`}</span>
            </div>
            <button class="claim" disabled={!back} onclick={() => claimExpedition(expedition.id)}>
              {back ? 'Claim haul' : 'Exploring…'}
            </button>
          </div>
        {/each}
      </section>
    {/if}

    <section class="section destinations">
      <h2 class="section-title">
        Destinations <span class="dim">- party of up to {EXPEDITION_MAX_PARTY}; away Digimon don't fight</span>
      </h2>
      <div class="dest-grid">
        {#each destinations as d (d.id)}
          {@const unlocked = isDestinationUnlocked(areaProgress, d)}
          <button class="dest" class:selected={selectedId === d.id} disabled={!unlocked} onclick={() => selectDestination(d.id)}>
            <span class="dest-name">{unlocked ? d.name : '???'}</span>
            {#if unlocked}
              <span class="dest-desc">{d.description}</span>
              <span class="dest-meta">
                {#each d.favoredElements as el (el)}<span class="el"><ElementIcon element={el} size={14} />{el}</span>{/each}
                <span>· {d.durationMinutes} min</span>
              </span>
              <span class="dest-loot">{lootSummary(d)}</span>
            {:else}
              <span class="dest-desc">Unlocks with {getPath(d.areaId, d.unlockPathId)?.name ?? d.unlockPathId}.</span>
            {/if}
          </button>
        {/each}
      </div>
    </section>

    {#if selected}
      <section class="section picker">
        <h2 class="section-title">
          Party for {selected.name} <span class="dim">- {party.length}/{EXPEDITION_MAX_PARTY} · favored elements first</span>
        </h2>
        <div class="candidates">
          {#each candidates as entry (entry.speciesId)}
            {@const sprite = getSpriteUrl(entry.speciesId)}
            {@const picked = party.includes(entry.speciesId)}
            <button class="candidate" class:picked class:favored={isFavored(entry, selected)} aria-pressed={picked} onclick={() => toggle(entry.speciesId)}>
              <div class="mini-sprite">{#if sprite}<img src={sprite} alt="" />{/if}</div>
              <div class="c-info">
                <span class="c-name">{getSpeciesName(entry.speciesId)} <span class="dim">Lv {levelForXp(entry.xp)}</span></span>
                <SpeciesTags speciesId={entry.speciesId} />
              </div>
            </button>
          {:else}
            <span class="dim">Everyone is busy.</span>
          {/each}
        </div>
      </section>

      <div class="footer">
        <span class="estimate">
          {#if preview}
            Back in {formatDuration(preview.durationMs)} · haul ×{preview.multiplier.toFixed(2)}
          {:else}
            Pick at least one Digimon.
          {/if}
          {#if !slotFree}<span class="warn"> · an expedition is already out ({EXPEDITION_MAX_CONCURRENT} at a time)</span>{/if}
        </span>
        <button class="start" disabled={!preview || !slotFree} onclick={start}>Send party</button>
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
    max-width: 960px;
    max-height: 90%;
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
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
    color: var(--text-h);
  }
  .close-btn,
  .small-btn {
    appearance: none;
    font: inherit;
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
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-title {
    margin: 0;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .dim {
    color: var(--text-dim);
    text-transform: none;
    letter-spacing: 0;
    font-size: 11px;
  }
  .haul {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 10px 14px;
    border: 1px solid var(--pos);
    background: var(--pos-soft);
  }
  .haul-title {
    font-family: var(--head);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-h);
  }
  .haul-items {
    flex: 1;
    font-size: 12px;
    color: var(--text-h);
  }
  .active {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .active-party {
    display: flex;
    gap: 4px;
  }
  .active-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .active-name {
    font-size: 13px;
    color: var(--text-h);
  }
  .active-time {
    font-size: 11px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .track {
    height: 4px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .fill {
    height: 100%;
    background: var(--accent);
  }
  .mini-sprite {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mini-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .dest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
  }
  .dest {
    appearance: none;
    font: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .dest:hover:not(:disabled) {
    border-color: var(--panel-border-strong);
  }
  .dest.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .dest:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .dest-name {
    font-family: var(--head);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-h);
  }
  .dest-desc {
    font-size: 11px;
    color: var(--text);
    line-height: 1.4;
  }
  .dest-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text);
  }
  .el {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .dest-loot {
    font-size: 11px;
    color: var(--text-dim);
  }
  .candidates {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
    max-height: 260px;
    overflow-y: auto;
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
  .candidate.favored {
    border-left: 2px solid var(--pos);
  }
  .candidate.picked {
    border-color: var(--accent);
    background: var(--accent-soft);
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
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }
  .estimate {
    font-size: 12px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .warn {
    color: var(--warn);
  }
  .start,
  .claim {
    appearance: none;
    font: inherit;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 9px 18px;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    color: var(--accent);
    cursor: pointer;
  }
  .start:disabled,
  .claim:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .dest:focus-visible,
  .candidate:focus-visible,
  .start:focus-visible,
  .claim:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
</style>
