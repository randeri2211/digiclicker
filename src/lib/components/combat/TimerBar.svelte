<script lang="ts">
  import type { WildSpawnState } from '../../game/types';

  interface Props {
    wild: WildSpawnState;
  }

  const { wild }: Props = $props();

  // Reads wild.lastTickAt as the "clock" rather than polling Date.now()
  // itself - the combat tick loop already updates it ~4x/second, so this
  // recomputes on the same cadence as the rest of combat with no extra
  // timer/interval needed.
  const remainingMs = $derived(Math.max(0, wild.spawnedAt + wild.timeLimitMs - wild.lastTickAt));
  const percent = $derived(wild.timeLimitMs > 0 ? Math.max(0, Math.min(100, (remainingMs / wild.timeLimitMs) * 100)) : 0);
  const remainingSeconds = $derived((remainingMs / 1000).toFixed(1));
</script>

<div class="timer-bar-wrap">
  <div class="timer-bar-track">
    <div class="timer-bar-fill" style:width="{percent}%"></div>
  </div>
  <div class="timer-text">
    <span>TIME</span>
    <span>{remainingSeconds}s</span>
  </div>
</div>

<style>
  .timer-bar-wrap {
    width: 340px;
    margin-bottom: 14px;
  }
  .timer-bar-track {
    height: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    position: relative;
    overflow: hidden;
  }
  .timer-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--warn), #ffb020);
    box-shadow: 0 0 8px rgba(255, 176, 32, 0.5);
    transition: width 150ms linear;
  }
  .timer-text {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
  }
</style>
