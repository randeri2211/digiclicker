<script lang="ts">
  import { QUESTS, questStatus, requirementProgress, completeQuest, ITEM_CATALOG } from '../game/state/game.svelte';
  import type { QuestStatus } from '../game/state/game.svelte';
  import type { QuestDefinition } from '../game/types';
  import { getSpriteUrl } from '../game/images';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  let tab: 'current' | 'completed' = $state('current');

  // Ready first (they need a click), then active; locked quests stay
  // hidden - they appear once their prerequisites are done.
  const ORDER: Record<QuestStatus, number> = { ready: 0, active: 1, completed: 2, locked: 3 };
  const listed = $derived(
    QUESTS.map((quest) => ({ quest, status: questStatus(quest) }))
      .filter((q) => (tab === 'current' ? q.status === 'ready' || q.status === 'active' : q.status === 'completed'))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status])
  );
  const readyCount = $derived(QUESTS.filter((q) => questStatus(q) === 'ready').length);

  function rewardText(quest: QuestDefinition): string {
    const r = quest.rewards;
    const parts = [
      r.bits ? `${r.bits} bits` : '',
      r.data ? `${r.data} Data` : '',
      ...(r.items ?? []).map((i) => `${i.count}× ${ITEM_CATALOG[i.id]?.name ?? i.id}`),
    ].filter(Boolean);
    return parts.join(' · ') || '-';
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
      <div class="panel-title">Quests</div>
      <div class="tabs" role="tablist">
        <button class="tab" class:active={tab === 'current'} role="tab" aria-selected={tab === 'current'} onclick={() => (tab = 'current')}>
          Current{readyCount ? ` (${readyCount} ready)` : ''}
        </button>
        <button class="tab" class:active={tab === 'completed'} role="tab" aria-selected={tab === 'completed'} onclick={() => (tab = 'completed')}>
          Completed
        </button>
      </div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="list">
      {#each listed as { quest, status } (quest.id)}
        {@const sprite = quest.giver?.speciesId ? getSpriteUrl(quest.giver.speciesId) : null}
        <article class="quest" class:ready={status === 'ready'} class:done={status === 'completed'}>
          <div class="giver">
            <div class="giver-sprite">{#if sprite}<img src={sprite} alt="" />{/if}</div>
            <span class="giver-name">{quest.giver?.name ?? ''}</span>
          </div>
          <div class="body">
            <h3 class="quest-title">{quest.title}</h3>
            <p class="quest-text">{status === 'completed' && quest.completeText ? quest.completeText : quest.text}</p>
            {#if status !== 'completed'}
              <ul class="reqs">
                {#each quest.requirements as req, i (i)}
                  {@const p = requirementProgress(req)}
                  <li class="req" class:met={p.met}>
                    <span class="req-mark" aria-hidden="true">{p.met ? '✓' : '·'}</span>
                    <span class="req-label">{p.label}</span>
                    {#if p.target > 1}<span class="req-count">{p.current}/{p.target}</span>{/if}
                  </li>
                {/each}
              </ul>
            {/if}
            <div class="footer">
              <span class="reward">Reward: {rewardText(quest)}</span>
              {#if status === 'ready'}
                <button class="turn-in" onclick={() => completeQuest(quest.id)}>Complete</button>
              {:else if status === 'completed'}
                <span class="done-mark">Completed</span>
              {/if}
            </div>
          </div>
        </article>
      {:else}
        <p class="empty">{tab === 'current' ? 'No quests right now - keep exploring.' : 'Nothing completed yet.'}</p>
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
  .tabs {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .tab,
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
  .tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }
  .list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .quest {
    display: flex;
    gap: 14px;
    padding: 12px 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .quest.ready {
    border-color: var(--pos);
  }
  .quest.done {
    opacity: 0.75;
  }
  .giver {
    width: 64px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .giver-sprite {
    width: 52px;
    height: 52px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .giver-sprite img {
    width: 84%;
    height: 84%;
    object-fit: contain;
  }
  .giver-name {
    font-size: 10px;
    color: var(--text);
    text-align: center;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .quest-title {
    margin: 0;
    font-family: var(--head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-h);
  }
  .quest-text {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text);
    max-width: 65ch;
  }
  .reqs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .req {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
    color: var(--text-h);
  }
  .req.met {
    color: var(--pos);
  }
  .req-mark {
    width: 10px;
  }
  .req-count {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid var(--panel-border);
  }
  .reward {
    font-size: 11px;
    color: var(--text);
  }
  .turn-in {
    appearance: none;
    font: inherit;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 7px 16px;
    background: var(--pos-soft);
    border: 1px solid var(--pos);
    color: var(--pos);
    cursor: pointer;
  }
  .done-mark {
    font-size: 11px;
    color: var(--pos);
  }
  .empty {
    font-size: 12px;
    color: var(--text-dim);
    padding: 20px 0;
  }
  .tab:focus-visible,
  .turn-in:focus-visible,
  .close-btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
</style>
