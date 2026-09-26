<script lang="ts">
  import TopBar from './lib/components/hud/TopBar.svelte';
  import CombatPanel from './lib/components/combat/CombatPanel.svelte';
  import VillageScreen from './lib/components/VillageScreen.svelte';
  import OfflineReportScreen from './lib/components/OfflineReportScreen.svelte';
  import BackupReminder from './lib/components/BackupReminder.svelte';
  import TipCard from './lib/components/TipCard.svelte';
  import ActCompleteScreen from './lib/components/ActCompleteScreen.svelte';
  import { saveSession } from './lib/game/state/game.svelte';
  import Sidebar from './lib/components/sidebar/Sidebar.svelte';
  import LoadingScreen from './lib/components/LoadingScreen.svelte';
  import MainMenu from './lib/components/MainMenu.svelte';
  import SettingsScreen from './lib/components/SettingsScreen.svelte';
  import EvolutionScreen from './lib/components/evolution/EvolutionScreen.svelte';
  import RosterScreen from './lib/components/RosterScreen.svelte';
  import InventoryScreen from './lib/components/InventoryScreen.svelte';
  import ShopScreen from './lib/components/ShopScreen.svelte';
  import CompendiumScreen from './lib/components/CompendiumScreen.svelte';
  import BossScreen from './lib/components/BossScreen.svelte';
  import ExpeditionsScreen from './lib/components/ExpeditionsScreen.svelte';
  import QuestLogScreen from './lib/components/QuestLogScreen.svelte';
  import Toasts from './lib/components/shared/Toasts.svelte';
  import {
    startCombatTickLoop,
    stopCombatTickLoop,
    startAutosave,
    stopAutosave,
    saveGame,
    loadSlotIntoLiveState,
    startNewGameInSlot,
    roster,
    hatchery,
    addEgg,
    combat,
    currency,
    findRootAncestors,
    rollEggDrop,
    hatchEgg,
    inventory,
    buyItem,
    areaProgress,
    setActivePath,
    isOwned,
    automation,
    buyMysteryEgg,
    useAbilityReroll,
    ABILITY_CATALOG,
    computeEntryStatValue,
  } from './lib/game/state/game.svelte';
  import { preloadImages } from './lib/game/preload';
  import { getSpriteUrl } from './lib/game/images';
  import { PRELOAD_SPECIES_IDS } from './lib/game/roster/starterRoster';

  let progress = $state(0);
  let ready = $state(false);
  let screen: 'main-menu' | 'game' = $state('main-menu');
  let settingsOpen = $state(false);
  let evolutionOpen = $state(false);
  // Preselected entry for the Evolution screen (a roster menu's
  // "Digivolve…" action) - null lets the screen pick its own default.
  let evolutionInitialSpeciesId: string | null = $state(null);
  let rosterOpen = $state(false);
  let inventoryOpen = $state(false);
  let shopOpen = $state(false);
  let compendiumOpen = $state(false);
  let expeditionsOpen = $state(false);
  let villageOpen = $state(false);
  let questsOpen = $state(false);
  // Boss prep screen target, or null when closed.
  let bossPrep: { areaId: string; pathId: string } | null = $state(null);

  $effect(() => {
    const urls = PRELOAD_SPECIES_IDS.map(getSpriteUrl).filter((url): url is string => url !== null);
    preloadImages(urls, (fraction) => (progress = fraction)).then(() => (ready = true));
  });

  $effect(() => {
    if (!ready || screen !== 'game') return;
    startCombatTickLoop();
    startAutosave();
    return () => {
      stopCombatTickLoop();
      stopAutosave();
    };
  });

  function enterGame() {
    screen = 'game';
  }

  function openEvolution(speciesId: string | null = null) {
    evolutionInitialSpeciesId = speciesId;
    rosterOpen = false;
    evolutionOpen = true;
  }

  function backToMenu() {
    saveGame();
    settingsOpen = false;
    screen = 'main-menu';
  }

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__digiclicker = {
      saveGame,
      loadSlotIntoLiveState,
      startNewGameInSlot,
      roster,
      hatchery,
      addEgg,
      combat,
      currency,
      findRootAncestors,
      rollEggDrop,
      hatchEgg,
      inventory,
      buyItem,
      areaProgress,
      setActivePath,
      isOwned,
      automation,
      buyMysteryEgg,
      useAbilityReroll,
      ABILITY_CATALOG,
      computeEntryStatValue,
    };
  }
</script>

<div class="screen">
  {#if !ready}
    <LoadingScreen {progress} />
  {:else if screen === 'main-menu'}
    <MainMenu onEnterGame={enterGame} />
  {:else}
    <TopBar
      onOpenSettings={() => (settingsOpen = true)}
      onOpenEvolution={() => openEvolution()}
      onOpenRoster={() => (rosterOpen = true)}
      onOpenInventory={() => (inventoryOpen = true)}
      onOpenShop={() => (shopOpen = true)}
      onOpenCompendium={() => (compendiumOpen = true)}
      onOpenExpeditions={() => (expeditionsOpen = true)}
      onOpenQuests={() => (questsOpen = true)}
      onOpenVillage={() => (villageOpen = true)}
    />
    <div class="main">
      <CombatPanel onChallengeBoss={(areaId, pathId) => (bossPrep = { areaId, pathId })} onOpenQuests={() => (questsOpen = true)} />
      <Sidebar onOpenEvolution={openEvolution} />
    </div>
  {/if}

  {#if settingsOpen}
    <SettingsScreen onClose={() => (settingsOpen = false)} onBackToMenu={backToMenu} />
  {/if}

  {#if evolutionOpen}
    <EvolutionScreen initialSpeciesId={evolutionInitialSpeciesId} onClose={() => (evolutionOpen = false)} />
  {/if}

  {#if rosterOpen}
    <RosterScreen onOpenEvolution={openEvolution} onClose={() => (rosterOpen = false)} />
  {/if}

  {#if inventoryOpen}
    <InventoryScreen onClose={() => (inventoryOpen = false)} />
  {/if}

  {#if shopOpen}
    <ShopScreen onClose={() => (shopOpen = false)} />
  {/if}

  {#if questsOpen}
    <QuestLogScreen onClose={() => (questsOpen = false)} />
  {/if}

  {#if villageOpen}
    <VillageScreen onClose={() => (villageOpen = false)} />
  {/if}

  {#if expeditionsOpen}
    <ExpeditionsScreen onClose={() => (expeditionsOpen = false)} />
  {/if}

  {#if bossPrep}
    <BossScreen areaId={bossPrep.areaId} pathId={bossPrep.pathId} onClose={() => (bossPrep = null)} />
  {/if}

  {#if compendiumOpen}
    <CompendiumScreen onClose={() => (compendiumOpen = false)} />
  {/if}

  {#if screen === 'game'}
    <Toasts />
    <OfflineReportScreen />
    <BackupReminder />
    <TipCard />
    <ActCompleteScreen />
    {#if saveSession.takenOver}
      <div class="taken-over" role="alert">
        This save was continued in another tab, so this tab has stopped saving (it would overwrite the newer progress).
        <button onclick={() => location.reload()}>Reload to play here</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .taken-over {
    position: absolute;
    top: 72px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    font-size: 12px;
    color: var(--text-h);
    background: var(--panel);
    border: 1px solid var(--danger);
  }
  .taken-over button {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 4px 10px;
    background: var(--panel-2);
    border: 1px solid var(--danger);
    color: var(--text-h);
    cursor: pointer;
  }
  .main {
    flex: 1;
    display: flex;
    min-height: 0;
  }
</style>
