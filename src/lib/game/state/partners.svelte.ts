import { roster } from './roster.svelte';
import { getResidents, hasJoined } from '../village/village';
import { PARTNER_BASE_SLOTS } from '../constants';

// Partners: the few Digimon the player is training for boss fights. They
// get more kill XP and can go a little further past the wilds' level
// before the over-level XP penalty kicks in (combat/xp.ts), so the squad
// they'll bring to bosses can pull ahead of the rest of the roster. Free
// to reassign any time; slots grow with the story (residents with
// `partnerSlots` in npcs.json).

export const partners: { ids: string[] } = $state({ ids: [] });

export function partnerSlots(): number {
  return PARTNER_BASE_SLOTS + getResidents().filter(hasJoined).reduce((slots, npc) => slots + (npc.partnerSlots ?? 0), 0);
}

export function isPartner(speciesId: string): boolean {
  return partners.ids.includes(speciesId);
}

/** Makes (or stops making) a Digimon a partner. False and no-op if it
 * isn't owned or every slot is taken. */
export function setPartner(speciesId: string, on: boolean): boolean {
  if (!on) {
    partners.ids = partners.ids.filter((id) => id !== speciesId);
    return true;
  }
  if (isPartner(speciesId)) return true;
  if (!roster[speciesId] || partners.ids.length >= partnerSlots()) return false;
  partners.ids.push(speciesId);
  return true;
}

/** A partner digivolved: its slot moves to the new form ("my partner grew
 * up"); if the new form was already a partner, the source's slot frees. */
export function transferPartner(fromSpeciesId: string, toSpeciesId: string): void {
  const index = partners.ids.indexOf(fromSpeciesId);
  if (index === -1) return;
  if (isPartner(toSpeciesId)) partners.ids.splice(index, 1);
  else partners.ids[index] = toSpeciesId;
}
