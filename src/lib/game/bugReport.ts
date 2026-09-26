import { areaProgress } from './state/areaProgress.svelte';
import { roster } from './state/roster.svelte';
import { progress } from './state/progress.svelte';
import { getArea, getPath } from './areas/areaRegistry';
import config from '../data/bugReport.json';

// "Report a bug": opens a report form with the game's own details
// pre-filled, so reports come with context.
// - If data/bugReport.json has a Google Form set up, that form (no account
//   needed to answer): `viewUrl` is the form's link and `gameInfoEntry` the
//   "entry.<number>" id of its game-info question (from the form's "Get
//   pre-filled link").
// - Otherwise a GitHub issue using .github/ISSUE_TEMPLATE/bug_report.yml
//   (needs a GitHub account).

export const REPO_URL = 'https://github.com/randeri2211/digiclicker';

/** Which build is running - set by the Pages workflow (VITE_BUILD_ID). */
export const BUILD_ID: string = (import.meta.env.VITE_BUILD_ID ?? 'dev').slice(0, 7);

function gameInfo(): string {
  const area = getArea(areaProgress.activeAreaId);
  const path = getPath(areaProgress.activeAreaId, areaProgress.activePathId);
  const act = progress.flags['story:act-1-complete'] ? 'Act 1 complete' : 'Act 1';
  return [
    `Build: ${BUILD_ID}`,
    `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    `Location: ${area?.name ?? areaProgress.activeAreaId} - ${path?.name ?? areaProgress.activePathId}`,
    `Progress: ${act}, ${progress.completedQuests.length} quests done, ${Object.keys(roster).length} Digimon`,
  ].join('\n');
}

export function bugReportUrl(): string {
  const form = config.googleForm;
  if (form.viewUrl && form.gameInfoEntry) {
    const url = new URL(form.viewUrl);
    url.searchParams.set('usp', 'pp_url');
    url.searchParams.set(form.gameInfoEntry, gameInfo());
    return url.toString();
  }
  const params = new URLSearchParams({
    template: 'bug_report.yml',
    title: '[Bug] ',
    'game-info': gameInfo(),
  });
  return `${REPO_URL}/issues/new?${params}`;
}

export function openBugReport(): void {
  window.open(bugReportUrl(), '_blank', 'noopener');
}
