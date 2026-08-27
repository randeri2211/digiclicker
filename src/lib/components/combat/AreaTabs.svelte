<script lang="ts">
  // Visual stub - areas/regions are out of scope this slice (see
  // GAMEPLAY_DESIGN.md: PokeClicker-like direction confirmed, gating deferred).
</script>

<div class="area-tabs">
  <div class="area-tab active">Forest Sector</div>
  <div class="area-tab">Cave Sector</div>
  <div class="area-tab locked">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.8" />
    </svg>
    Server Continent
  </div>
</div>

<style>
  .area-tabs {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  .area-tab {
    padding: 8px 16px;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text);
  }
  .area-tab.active {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .area-tab.locked {
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
