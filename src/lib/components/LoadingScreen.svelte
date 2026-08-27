<script lang="ts">
  interface Props {
    progress: number;
  }

  const { progress }: Props = $props();
</script>

<div class="loading">
  <div class="logo"><span class="dot"></span>DIGICLICKER</div>
  <div class="bar-track">
    <div class="bar-fill" style:width="{Math.round(progress * 100)}%"></div>
  </div>
  <div class="label">Loading Digital World assets…</div>
</div>

<style>
  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .logo {
    font-family: var(--head);
    font-weight: 800;
    font-size: 24px;
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
  .bar-track {
    width: 280px;
    height: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pos), #1fce6e);
    box-shadow: 0 0 10px rgba(57, 255, 136, 0.5);
    transition: width 150ms linear;
  }
  .label {
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
</style>
