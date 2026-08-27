import type { TeamState } from '../types';
import { createStarterTeam } from '../roster/starterRoster';

export const team: TeamState = $state(createStarterTeam());
