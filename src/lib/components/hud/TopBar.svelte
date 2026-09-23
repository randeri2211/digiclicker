<script lang="ts">
  import CurrencyPill from './CurrencyPill.svelte';
  import EvolutionBadgeButton from './EvolutionBadgeButton.svelte';
  import HubButton from './HubButton.svelte';
  import InventoryButton from './InventoryButton.svelte';
  import ShopButton from './ShopButton.svelte';
  import CompendiumButton from './CompendiumButton.svelte';
  import SettingsButton from './SettingsButton.svelte';
  import { currency } from '../../game/state/game.svelte';

  interface Props {
    onOpenSettings: () => void;
    onOpenEvolution: () => void;
    onOpenHub: () => void;
    onOpenInventory: () => void;
    onOpenShop: () => void;
    onOpenCompendium: () => void;
  }

  const { onOpenSettings, onOpenEvolution, onOpenHub, onOpenInventory, onOpenShop, onOpenCompendium }: Props = $props();
</script>

<div class="topbar">
  <div class="logo"><span class="dot"></span>DIGICLICKER</div>
  <div class="currency-row">
    <CurrencyPill kind="bits" value={currency.bits} />
    <CurrencyPill kind="data" value={currency.data} />
  </div>
  <EvolutionBadgeButton onClick={onOpenEvolution} />
  <HubButton onClick={onOpenHub} />
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
