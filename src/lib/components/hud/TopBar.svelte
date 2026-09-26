<script lang="ts">
  import CurrencyPill from './CurrencyPill.svelte';
  import EvolutionBadgeButton from './EvolutionBadgeButton.svelte';
  import RosterButton from './RosterButton.svelte';
  import InventoryButton from './InventoryButton.svelte';
  import HudButton from './HudButton.svelte';
  import CompendiumButton from './CompendiumButton.svelte';
  import SettingsButton from './SettingsButton.svelte';
  import { currency, expeditions, QUESTS, questStatus, isSystemUnlocked, lockedHint } from '../../game/state/game.svelte';
  import { pushToast } from '../../game/state/notifications.svelte';
  import type { SystemId } from '../../game/types';
  import { openBugReport } from '../../game/bugReport';

  interface Props {
    onOpenSettings: () => void;
    onOpenEvolution: () => void;
    onOpenRoster: () => void;
    onOpenInventory: () => void;
    onOpenShop: () => void;
    onOpenCompendium: () => void;
    onOpenExpeditions: () => void;
    onOpenQuests: () => void;
    onOpenVillage: () => void;
  }

  const {
    onOpenSettings,
    onOpenEvolution,
    onOpenRoster,
    onOpenInventory,
    onOpenShop,
    onOpenCompendium,
    onOpenExpeditions,
    onOpenQuests,
    onOpenVillage,
  }: Props = $props();

  // A button for a village-gated system: opens it once unlocked, otherwise
  // says who unlocks it.
  function gated(systems: SystemId[], open: () => void) {
    return () => {
      if (systems.some(isSystemUnlocked)) open();
      else pushToast('Locked', lockedHint(systems[0]));
    };
  }
  const expeditionsLocked = $derived(!isSystemUnlocked('expeditions'));
  // The Shop opens with either half: the Mystery Egg stall comes first.
  const shopLocked = $derived(!isSystemUnlocked('shop') && !isSystemUnlocked('mystery-eggs'));

  // Parties back home with a haul waiting to be claimed.
  const expeditionsReady = $derived(expeditions.active.filter((e) => e.returned).length);
  // Quests ready to turn in.
  const questsReady = $derived(QUESTS.filter((q) => questStatus(q) === 'ready').length);
</script>

<div class="topbar">
  <div class="logo"><span class="dot"></span>DIGICLICKER</div>
  <div class="currency-row">
    <CurrencyPill kind="bits" value={currency.bits} />
    <CurrencyPill kind="data" value={currency.data} />
  </div>
  <EvolutionBadgeButton onClick={onOpenEvolution} />
  <RosterButton onClick={onOpenRoster} />
  <HudButton
    title={expeditionsLocked ? `Expeditions - ${lockedHint('expeditions')}` : 'Expeditions'}
    locked={expeditionsLocked}
    onClick={gated(['expeditions'], onOpenExpeditions)}
    tip="expeditions"
    badge={expeditionsReady}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
  </HudButton>
  <HudButton title="Quests" onClick={onOpenQuests} badge={questsReady}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h9l3 3V20.5H6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M9 10h6M9 13.5h6M9 17h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </HudButton>
  <InventoryButton onClick={onOpenInventory} />
  <HudButton
    title={shopLocked ? `Shop - ${lockedHint('mystery-eggs')}` : 'Shop'}
    locked={shopLocked}
    onClick={gated(['mystery-eggs', 'shop'], onOpenShop)}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9L5.5 4H18.5L20 9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M4 9V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M4 9H20" stroke="currentColor" stroke-width="1.6" />
      <path d="M9 20V14H15V20" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    </svg>
  </HudButton>
  <HudButton title="Village" onClick={onOpenVillage}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11l5-4 5 4v9H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M13 13l4-3 4 3v7h-8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M6.5 20v-4h3v4" stroke="currentColor" stroke-width="1.5" />
    </svg>
  </HudButton>
  <CompendiumButton onClick={onOpenCompendium} />
  <HudButton title="Report a bug" onClick={openBugReport}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="5" ry="6" stroke="currentColor" stroke-width="1.6" />
      <path d="M12 8v12M9 6l1.5 2M15 6l-1.5 2M7 12H4M20 12h-3M7 17l-2.5 1.5M17 17l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </HudButton>
  <SettingsButton onClick={onOpenSettings} />
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 24px;
    height: 64px;
    padding: 0 24px;
    border-bottom: 1px solid var(--panel-border);
    background: rgba(13, 19, 25, 0.85);
    flex-shrink: 0;
  }
  .logo {
    font-family: var(--head);
    font-weight: 800;
    font-size: 20px;
    letter-spacing: 2px;
    color: var(--text-h);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo .dot {
    width: 8px;
    height: 8px;
    background: var(--pos);
    box-shadow: 0 0 8px var(--pos);
  }
  .currency-row {
    display: flex;
    gap: 12px;
    margin-left: auto;
  }
</style>
