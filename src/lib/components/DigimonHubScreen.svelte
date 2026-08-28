<script lang="ts">
  import type { DigimonInstance } from '../game/types';
  import { getSpecies, getSpriteUrl } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import { team, getTeamSlotMenuItems } from '../game/state/game.svelte';
  import type { TeamBucket } from '../game/state/game.svelte';
  import ContextMenu from './shared/ContextMenu.svelte';
  import StatWindow from './shared/StatWindow.svelte';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  let showTeamMembersToo = $state(false);

  const entries = $derived.by((): { instance: DigimonInstance; bucket: TeamBucket }[] => {
    const reserve = team.reserveMembers.map((instance) => ({ instance, bucket: 'reserve' as TeamBucket }));
    if (!showTeamMembersToo) return reserve;
    const active = team.activeMembers.map((instance) => ({ instance, bucket: 'active' as TeamBucket }));
    const training = team.trainingMembers.map((instance) => ({ instance, bucket: 'training' as TeamBucket }));
    return [...reserve, ...active, ...training];
  });

  let menuState: { instance: DigimonInstance; bucket: TeamBucket; x: number; y: number } | null = $state(null);
  let statsFor: DigimonInstance | null = $state(null);

  function openMenu(entry: { instance: DigimonInstance; bucket: TeamBucket }, event: MouseEvent) {
    event.stopPropagation();
    menuState = { instance: entry.instance, bucket: entry.bucket, x: event.clientX, y: event.clientY };
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
  <div
    class="panel"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <div class="panel-header">
      <div class="panel-title">Digimon Hub</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <label class="filter-toggle">
      <input type="checkbox" bind:checked={showTeamMembersToo} />
      Also show Active/Training Team members
    </label>

    <div class="grid">
      {#if entries.length === 0}
        <div class="empty-note">No Digimon here.</div>
      {:else}
        {#each entries as entry (entry.instance.instanceId)}
          {@const species = getSpecies(entry.instance.speciesId)}
          {@const sprite = getSpriteUrl(entry.instance.speciesId)}
          <button class="card" onclick={(e) => openMenu(entry, e)}>
            <div class="card-sprite">
              {#if sprite}
                <img src={sprite} alt="" />
              {/if}
            </div>
            <div class="card-name">{species?.name ?? entry.instance.speciesId}</div>
            <div class="card-meta">Lv {levelForXp(entry.instance.xp)} · {species?.stage ?? 'Unknown'}</div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

{#if menuState}
  <ContextMenu
    x={menuState.x}
    y={menuState.y}
    items={getTeamSlotMenuItems(menuState.instance, menuState.bucket, {
      onOpenStats: () => (statsFor = menuState?.instance ?? null),
    })}
    onClose={() => (menuState = null)}
  />
{/if}

{#if statsFor}
  <StatWindow instance={statsFor} onClose={() => (statsFor = null)} />
{/if}

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
    height: 88%;
    max-width: 1280px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 24px;
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
  .close-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .close-btn:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    overflow-y: auto;
    align-content: start;
  }
  .empty-note {
    font-size: 13px;
    color: var(--text-dim);
    padding: 20px;
  }
  .card {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .card-sprite {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .card-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-h);
  }
  .card-meta {
    font-size: 10px;
    color: var(--text-dim);
  }
</style>
