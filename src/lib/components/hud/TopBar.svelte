<script lang="ts">
  import CurrencyPill from './CurrencyPill.svelte';
  import EvolutionBadgeButton from './EvolutionBadgeButton.svelte';
  import RosterButton from './RosterButton.svelte';
  import InventoryButton from './InventoryButton.svelte';
  import ShopButton from './ShopButton.svelte';
  import HudButton from './HudButton.svelte';
  import CompendiumButton from './CompendiumButton.svelte';
  import SettingsButton from './SettingsButton.svelte';
  import { currency, expeditions, QUESTS, questStatus } from '../../game/state/game.svelte';

  interface Props {
    onOpenSettings: () => void;
    onOpenEvolution: () => void;
    onOpenRoster: () => void;
    onOpenInventory: () => void;
    onOpenShop: () => void;
    onOpenCompendium: () => void;
    onOpenExpeditions: () => void;
    onOpenQuests: () => void;
  }

  const { onOpenSettings, onOpenEvolution, onOpenRoster, onOpenInventory, onOpenShop, onOpenCompendium, onOpenExpeditions, onOpenQuests }: Props =
    $props();

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
  <HudButton title="Expeditions" onClick={onOpenExpeditions} badge={expeditionsReady}>
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
  <ShopButton onClick={onOpenShop} />
  <CompendiumButton onClick={onOpenCompendium} />
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
