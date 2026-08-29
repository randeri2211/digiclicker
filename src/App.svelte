<script lang="ts">
  import TopBar from './lib/components/hud/TopBar.svelte';
  import CombatPanel from './lib/components/combat/CombatPanel.svelte';
  import Sidebar from './lib/components/sidebar/Sidebar.svelte';
  import LoadingScreen from './lib/components/LoadingScreen.svelte';
  import MainMenu from './lib/components/MainMenu.svelte';
  import SettingsScreen from './lib/components/SettingsScreen.svelte';
  import EvolutionScreen from './lib/components/evolution/EvolutionScreen.svelte';
  import DigimonHubScreen from './lib/components/DigimonHubScreen.svelte';
  import {
    startCombatTickLoop,
    stopCombatTickLoop,
    startAutosave,
    stopAutosave,
    saveGame,
    loadSlotIntoLiveState,
    startNewGameInSlot,
    team,
    combat,
    findRootAncestors,
    rollEggDrop,
    tryHatch,
  } from './lib/game/state/game.svelte';
  import { preloadImages } from './lib/game/preload';
  import { getSpriteUrl } from './lib/game/images';
  import { PRELOAD_SPECIES_IDS } from './lib/game/roster/starterRoster';

  let progress = $state(0);
  let ready = $state(false);
  let screen: 'main-menu' | 'game' = $state('main-menu');
  let settingsOpen = $state(false);
  let evolutionOpen = $state(false);
  let hubOpen = $state(false);

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
      team,
      combat,
      findRootAncestors,
      rollEggDrop,
      tryHatch,
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
      onOpenEvolution={() => (evolutionOpen = true)}
      onOpenHub={() => (hubOpen = true)}
    />
    <div class="main">
      <CombatPanel />
      <Sidebar onOpenEvolution={() => (evolutionOpen = true)} />
    </div>
  {/if}

  {#if settingsOpen}
    <SettingsScreen onClose={() => (settingsOpen = false)} onBackToMenu={backToMenu} />
  {/if}

  {#if evolutionOpen}
    <EvolutionScreen onClose={() => (evolutionOpen = false)} />
  {/if}

  {#if hubOpen}
    <DigimonHubScreen onClose={() => (hubOpen = false)} />
  {/if}
</div>

<style>
  .main {
    flex: 1;
    display: flex;
    min-height: 0;
  }
</style>
