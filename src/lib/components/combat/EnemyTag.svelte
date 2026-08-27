<script lang="ts">
  interface Props {
    name: string;
    level: number;
  }

  const { name, level }: Props = $props();
</script>

<div class="enemy-tag">
  <span class="enemy-name">{name}</span>
  <span class="enemy-lv">Lv. {level}</span>
</div>

<style>
  .enemy-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .enemy-name {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-h);
    letter-spacing: 1px;
  }
  .enemy-lv {
    font-size: 12px;
    padding: 3px 8px;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--panel-border-strong);
  }
</style>
