import {supabase, getCurrentUserId} from './supabase';
import {loadGameData, saveGameData, addStars, addItem, refillHearts, GameData} from '../stores/gameStore';

// Fetch active announcements
export async function fetchAnnouncements(): Promise<{id: number; title: string; content: string; created_at: string}[]> {
  const {data} = await supabase
    .from('announcements')
    .select('id, title, content, created_at')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
    .limit(10);
  return data || [];
}

// Check and claim pending resource grants
export async function claimPendingGrants(): Promise<{type: string; amount: number; reason: string | null}[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const {data: grants} = await supabase
    .from('resource_grants')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', {ascending: true});

  if (!grants || grants.length === 0) return [];

  let gameData = await loadGameData();
  const claimed: {type: string; amount: number; reason: string | null}[] = [];

  for (const grant of grants) {
    gameData = await applyGrant(gameData, grant.grant_type, grant.amount);
    claimed.push({type: grant.grant_type, amount: grant.amount, reason: grant.reason});

    // Mark as claimed
    await supabase
      .from('resource_grants')
      .update({status: 'claimed', claimed_at: new Date().toISOString()})
      .eq('id', grant.id);
  }

  return claimed;
}

async function applyGrant(data: GameData, type: string, amount: number): Promise<GameData> {
  switch (type) {
    case 'stars':
      return addStars(data, amount);
    case 'diamonds': {
      const updated = {...data, diamonds: data.diamonds + amount};
      await saveGameData(updated);
      return updated;
    }
    case 'hearts':
      return refillHearts(data);
    case 'hammer':
    case 'refresh':
    case 'addTurns':
    case 'bomb':
      return addItem(data, type as keyof GameData['items'], amount);
    default:
      return data;
  }
}
