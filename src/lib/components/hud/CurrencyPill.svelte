<script lang="ts">
  interface Props {
    kind: 'bits' | 'data';
    value: number;
  }

  const { kind, value }: Props = $props();
</script>

<div class="currency">
  {#if kind === 'bits'}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="bits">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
      <path
        d="M12 7v10M9 9.5c0-1.4 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2-3 .6-3 2 1.3 2 3 2 3-.6 3-2"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="data">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  {/if}
  <span>{value.toLocaleString()}</span>
</div>

<style>
  .currency {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    font-size: 15px;
    color: var(--text-h);
  }
  .currency svg {
    flex-shrink: 0;
  }
  .currency .bits {
    color: var(--pos);
  }
  .currency .data {
    color: var(--accent);
  }
</style>
