export interface FloatingDamageHit {
  id: number;
  damage: number;
}

export function pushFloatingDamageHit(
  hits: FloatingDamageHit[],
  id: number,
  damage: number,
  maxHits = 3,
): FloatingDamageHit[] {
  const cappedMaxHits = Math.max(1, maxHits);
  const preservedHits = hits.slice(-(cappedMaxHits - 1));
  return [...preservedHits, {id, damage}];
}

export function removeFloatingDamageHit(
  hits: FloatingDamageHit[],
  hitId: number,
): FloatingDamageHit[] {
  return hits.filter(hit => hit.id !== hitId);
}

export function getLatestFloatingDamageHit(
  hits: FloatingDamageHit[],
): FloatingDamageHit | null {
  return hits.length > 0 ? hits[hits.length - 1] : null;
}
