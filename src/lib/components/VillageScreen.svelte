<script lang="ts">
  import { getResidents, hasJoined, isSystemUnlocked, SYSTEM_NAMES, getArea, getRegionOfArea } from '../game/state/game.svelte';
  import { getSpriteUrl } from '../game/images';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  // Every resident in story order (npcs.json order); ones who haven't joined
  // yet show as silhouettes with where to find them - once their area exists.
  const residents = $derived(getResidents().map((npc) => ({ npc, joined: hasJoined(npc) })));
  const joinedCount = $derived(residents.filter((r) => r.joined).length);

  function whereToFind(areaId: string): string {
    return getArea(areaId)?.name ?? getRegionOfArea(areaId)?.areas.find((a) => a.id === areaId)?.name ?? '???';
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
      <div class="panel-title">Village</div>
      <span class="count">{joinedCount} / {residents.length} residents</span>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>
    <p class="intro">Every Digimon you free or befriend can move in - and each resident opens something new.</p>

    <div class="grid">
      {#each residents as { npc, joined } (npc.id)}
        {@const sprite = getSpriteUrl(npc.speciesId)}
        <div class="resident" class:joined>
          <div class="sprite" class:silhouette={!joined}>{#if sprite}<img src={sprite} alt="" />{/if}</div>
          <div class="body">
            <span class="name">{joined ? npc.name : '???'}</span>
            <span class="role">{joined ? npc.role : `Somewhere in ${whereToFind(npc.homeAreaId)}`}</span>
            {#if npc.systems?.length}
              <div class="systems">
                {#each npc.systems as system (system)}
                  <span class="system" class:open={isSystemUnlocked(system)}>
                    {isSystemUnlocked(system) ? '' : '🔒 '}{SYSTEM_NAMES[system]}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
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
    max-width: 760px;
    max-height: 88%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px 24px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .count {
    flex: 1;
    font-size: 12px;
    color: var(--text-dim);
  }
  .close-btn {
    appearance: none;
    font: inherit;
    font-size: 12px;
    padding: 6px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .intro {
    margin: 0;
    font-size: 12px;
    color: var(--text);
  }
  .grid {
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 10px;
  }
  .resident {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .resident.joined {
    border-color: var(--panel-border-strong);
  }
  .sprite {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .sprite img {
    width: 88%;
    height: 88%;
    object-fit: contain;
  }
  .sprite.silhouette img {
    filter: brightness(0) opacity(0.45);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .name {
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--text-h);
  }
  .role {
    font-size: 11px;
    color: var(--text);
  }
  .systems {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .system {
    font-size: 10px;
    padding: 1px 6px;
    border: 1px solid var(--panel-border);
    color: var(--text-dim);
  }
  .system.open {
    border-color: var(--pos);
    color: var(--pos);
  }
</style>
