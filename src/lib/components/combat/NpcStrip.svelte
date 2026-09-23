<script lang="ts">
  import { QUESTS, questStatus, areaProgress, requirementProgress } from '../../game/state/game.svelte';
  import { getSpriteUrl } from '../../game/images';

  interface Props {
    onOpenQuests: () => void;
  }

  const { onOpenQuests }: Props = $props();

  // The current area's quest givers with something open - one chip per
  // quest: ready ones first, marked "!", the rest show their progress.
  const open = $derived(
    QUESTS.filter((q) => q.areaId === areaProgress.activeAreaId)
      .map((quest) => ({ quest, status: questStatus(quest) }))
      .filter((q) => q.status === 'ready' || q.status === 'active')
      .sort((a, b) => Number(b.status === 'ready') - Number(a.status === 'ready'))
  );

  function progressText(questId: string): string {
    const quest = QUESTS.find((q) => q.id === questId);
    const first = quest?.requirements[0];
    if (!first) return '';
    const p = requirementProgress(first);
    return p.target > 1 ? `${p.current}/${p.target}` : '';
  }
</script>

{#if open.length}
  <div class="npc-strip" aria-label="Quests in this area">
    {#each open as { quest, status } (quest.id)}
      {@const sprite = quest.giver?.speciesId ? getSpriteUrl(quest.giver.speciesId) : null}
      <button class="npc" class:ready={status === 'ready'} onclick={onOpenQuests} title="{quest.giver?.name ?? 'Quest'}: {quest.title}">
        <span class="npc-sprite">{#if sprite}<img src={sprite} alt="" />{/if}</span>
        <span class="npc-text">
          <span class="npc-name">{quest.giver?.name ?? 'Quest'}</span>
          <span class="npc-quest">{quest.title}{#if status === 'active' && progressText(quest.id)} · {progressText(quest.id)}{/if}</span>
        </span>
        {#if status === 'ready'}<span class="bang" aria-label="ready to complete">!</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .npc-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .npc {
    appearance: none;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 4px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
    max-width: 280px;
  }
  .npc:hover {
    border-color: var(--panel-border-strong);
  }
  .npc.ready {
    border-color: var(--pos);
  }
  .npc:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  .npc-sprite {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .npc-sprite img {
    width: 84%;
    height: 84%;
    object-fit: contain;
  }
  .npc-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .npc-name {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .npc-quest {
    font-size: 11px;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bang {
    font-family: var(--head);
    font-weight: 800;
    color: var(--pos);
  }
</style>
