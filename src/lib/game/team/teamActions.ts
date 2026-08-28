import type { DigimonInstance } from '../types';
import { team } from '../state/team.svelte';

export type TeamBucket = 'active' | 'training' | 'reserve';

function bucketArray(bucket: TeamBucket): DigimonInstance[] {
  switch (bucket) {
    case 'active':
      return team.activeMembers;
    case 'training':
      return team.trainingMembers;
    case 'reserve':
      return team.reserveMembers;
  }
}

function bucketCapacity(bucket: TeamBucket): number | null {
  switch (bucket) {
    case 'active':
      return team.activeCapacity;
    case 'training':
      return team.trainingCapacity;
    case 'reserve':
      return null; // uncapped
  }
}

export function hasRoomIn(bucket: TeamBucket): boolean {
  const capacity = bucketCapacity(bucket);
  return capacity === null || bucketArray(bucket).length < capacity;
}

// Finds instanceId in whichever of the three buckets currently holds it and
// moves it into toBucket, if there's room - one generic mover instead of a
// separate function per (from, to) pair, so a future bucket (e.g. "Box 2")
// only needs a case added to bucketArray/bucketCapacity above, not new move
// functions.
export function moveMember(instanceId: string, toBucket: TeamBucket): boolean {
  if (!hasRoomIn(toBucket)) return false;

  const buckets: TeamBucket[] = ['active', 'training', 'reserve'];
  for (const bucket of buckets) {
    if (bucket === toBucket) continue;
    const array = bucketArray(bucket);
    const index = array.findIndex((member) => member.instanceId === instanceId);
    if (index === -1) continue;

    const [instance] = array.splice(index, 1);
    bucketArray(toBucket).push(instance);
    return true;
  }
  return false;
}
