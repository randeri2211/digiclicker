<script lang="ts">
  import TeamSlot from './TeamSlot.svelte';
  import type { DigimonInstance } from '../../game/types';
  import { getSpriteUrl } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { isReadyToDigivolve } from '../../game/state/game.svelte';

  interface Props {
    kind: 'active' | 'training';
    capacity: number;
    maxCapacity: number;
    members: DigimonInstance[];
    onSlotClick?: (member: DigimonInstance, event: MouseEvent) => void;
  }

  const { kind, capacity, maxCapacity, members, onSlotClick }: Props = $props();

  const emptyCount = $derived(Math.max(0, capacity - members.length));
  const lockedCount = $derived(Math.max(0, maxCapacity - capacity));
</script>

<div class="side-section">
  <div class="side-head">
    <div class="side-title" class:training={kind === 'training'}>
      {kind === 'active' ? 'Active Team' : 'Training Team'}
    </div>
    <div class="side-count">{members.length} / {capacity}</div>
  </div>
  <div class="slot-grid">
    {#each members as member (member.instanceId)}
      <TeamSlot
        variant="filled"
        isActive={kind === 'active'}
        spriteUrl={getSpriteUrl(member.speciesId)}
        level={levelForXp(member.xp)}
        ready={isReadyToDigivolve(member)}
        onClick={onSlotClick && ((event) => onSlotClick(member, event))}
      />
    {/each}
    {#each Array.from({ length: emptyCount }) as _, i (i)}
      <TeamSlot variant="empty" />
    {/each}
    {#each Array.from({ length: lockedCount }) as _, i (i)}
      <TeamSlot variant="locked" />
    {/each}
  </div>
  {#if kind === 'training'}
    <div class="xp-note">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 7.4H22l-6.2 4.5L18 21l-6-4.4L6 21l2.2-7.1L2 9.4h7.6L12 2z"
          stroke="currentColor"
          stroke-width="1.3"
        />
      </svg>
      Full XP per kill, same as active team
    </div>
  {/if}
</div>

<style>
  .side-section {
    margin-bottom: 28px;
  }
  .side-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .side-title {
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .side-title.training {
    color: var(--text);
  }
  .side-count {
    font-size: 12px;
    color: var(--text-dim);
  }
  .slot-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .xp-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 10px;
  }
</style>
