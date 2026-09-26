<script lang="ts">
  import { backupReminder, snoozeBackupReminder, setBackupReminderOff, exportSlotToFile, activeSlot } from '../game/state/game.svelte';
  import { EXPORT_REMINDER_HOURS } from '../game/constants';

  // Small and out of the way - not a modal: the game keeps running.
  function exportNow() {
    if (activeSlot.id) exportSlotToFile(activeSlot.id);
  }
</script>

{#if backupReminder.showing}
  <div class="reminder" role="status">
    <div class="title">Back up your progress?</div>
    <div class="text">
      Your save lives only in this browser - clearing site data or switching browsers would lose it. An export is a file
      you can import anywhere.
    </div>
    <div class="actions">
      <button class="primary" onclick={exportNow}>Export now</button>
      <button onclick={() => snoozeBackupReminder()}>Later</button>
      <button class="quiet" onclick={() => setBackupReminderOff(true)} title="Turn it back on in Settings">Don't remind me</button>
    </div>
    <div class="note">Reminds you every {EXPORT_REMINDER_HOURS}h since your last export.</div>
  </div>
{/if}

<style>
  .reminder {
    position: absolute;
    left: 24px;
    bottom: 24px;
    z-index: 9; /* under the menu screens (10+) */
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--warn);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  }
  .title {
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--text-h);
  }
  .text,
  .note {
    font-size: 11px;
    color: var(--text);
  }
  .note {
    color: var(--text-dim);
  }
  .actions {
    display: flex;
    gap: 6px;
  }
  button {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 5px 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  button.primary {
    border-color: var(--warn);
    color: var(--text-h);
  }
  button.quiet {
    border-color: transparent;
    color: var(--text-dim);
  }
</style>
