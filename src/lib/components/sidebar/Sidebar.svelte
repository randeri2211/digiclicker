<script lang="ts">
  import EvolveCta from './EvolveCta.svelte';
  import HatcherySection from './HatcherySection.svelte';
  import RosterStatsPanel from './RosterStatsPanel.svelte';
  import ContextMenu from '../shared/ContextMenu.svelte';
  import StatWindow from '../shared/StatWindow.svelte';
  import { getRosterEntryMenuItems, openAbilityReroll, feedMeat, partners, partnerSlots, isPartner, setPartner } from '../../game/state/game.svelte';
  import type { RosterEntry } from '../../game/types';

  interface Props {
    /** speciesId preselects that entry on the Evolution screen. */
    onOpenEvolution: (speciesId?: string) => void;
  }

  const { onOpenEvolution }: Props = $props();

  let menuState: { entry: RosterEntry; x: number; y: number } | null = $state(null);
  let statsFor: RosterEntry | null = $state(null);

  function openMenu(entry: RosterEntry, event: MouseEvent) {
    event.stopPropagation();
    menuState = { entry, x: event.clientX, y: event.clientY };
  }
</script>

<div class="sidebar">
  <EvolveCta onClick={() => onOpenEvolution()} />
  <RosterStatsPanel onEntryClick={openMenu} />
  <HatcherySection />
</div>

{#if menuState}
  {@const entry = menuState.entry}
  <ContextMenu
    x={menuState.x}
    y={menuState.y}
    items={getRosterEntryMenuItems({
      onOpenStats: () => (statsFor = entry),
      onRerollAbility: () => openAbilityReroll(entry.speciesId),
      onFeed: (meatId) => feedMeat(entry, meatId),
      onOpenDigivolve: () => onOpenEvolution(entry.speciesId),
      partner: {
        isPartner: isPartner(entry.speciesId),
        slotFree: partners.ids.length < partnerSlots(),
        onToggle: () => setPartner(entry.speciesId, !isPartner(entry.speciesId)),
      },
    })}
    onClose={() => (menuState = null)}
  />
{/if}

{#if statsFor}
  <StatWindow entry={statsFor} onClose={() => (statsFor = null)} />
{/if}

<style>
  /* Grows with the window so the roster panel's icons stay readable; the
     combat column and map take what's left. */
  .sidebar {
    width: clamp(340px, 30vw, 520px);
    flex-shrink: 0;
    border-left: 1px solid var(--panel-border);
    background: rgba(13, 19, 25, 0.6);
    padding: 24px 20px;
    overflow-y: auto;
  }
</style>
