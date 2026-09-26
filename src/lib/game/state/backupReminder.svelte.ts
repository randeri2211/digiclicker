import { EXPORT_REMINDER_HOURS } from '../constants';

// A gentle nudge to export a backup: saves live only in this browser, so
// clearing site data or switching browsers loses them. Every
// EXPORT_REMINDER_HOURS since the last export, a small popup offers to
// export now, later (snooze an hour) or never (Settings turns it back on).

const SNOOZE_MS = 3_600_000;

export interface BackupReminderState {
  lastExportAt: number;
  snoozedUntil: number;
  off: boolean;
}

export const backupReminder: BackupReminderState & { showing: boolean } = $state({
  lastExportAt: 0,
  snoozedUntil: 0,
  off: false,
  showing: false,
});

/** Called by the tick loop: shows the popup once a backup is due. */
export function checkBackupReminder(now: number = Date.now()): void {
  if (backupReminder.off || backupReminder.showing) return;
  const due = Math.max(backupReminder.lastExportAt + EXPORT_REMINDER_HOURS * 3_600_000, backupReminder.snoozedUntil);
  if (now >= due) backupReminder.showing = true;
}

export function markExported(now: number = Date.now()): void {
  backupReminder.lastExportAt = now;
  backupReminder.showing = false;
}

export function snoozeBackupReminder(now: number = Date.now()): void {
  backupReminder.snoozedUntil = now + SNOOZE_MS;
  backupReminder.showing = false;
}

export function setBackupReminderOff(off: boolean): void {
  backupReminder.off = off;
  if (off) backupReminder.showing = false;
}

/** Restores it from a save; a save without it counts from now (no popup
 * the moment an old save loads). */
export function applyBackupReminder(saved: BackupReminderState | undefined, now: number = Date.now()): void {
  backupReminder.lastExportAt = saved?.lastExportAt ?? now;
  backupReminder.snoozedUntil = saved?.snoozedUntil ?? 0;
  backupReminder.off = saved?.off ?? false;
  backupReminder.showing = false;
}

export function snapshotBackupReminder(): BackupReminderState {
  return { lastExportAt: backupReminder.lastExportAt, snoozedUntil: backupReminder.snoozedUntil, off: backupReminder.off };
}
