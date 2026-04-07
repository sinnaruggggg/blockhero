import {claimPendingResourceGrants} from './economyService';
import type {GameData} from '../stores/gameStore';
import {supabase} from './supabase';
import {parseAnnouncementContent} from '../game/announcementContent';

const ADMIN_EMAIL = 'sinnaruggggg@gmail.com';

export async function getAdminStatus(): Promise<boolean> {
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_admin) {
    return true;
  }

  if ((user.email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return false;
  }

  const {error} = await supabase
    .from('profiles')
    .upsert({id: user.id, is_admin: true}, {onConflict: 'id'});

  return !error;
}

// Fetch active announcements
export async function fetchAnnouncements(): Promise<{
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  created_at: string;
}[]> {
  const {data} = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: false})
    .limit(10);
  return (data || []).map((row: any) => {
    const parsed = parseAnnouncementContent(row.content, row.image_url);
    return {
      id: row.id,
      title: row.title,
      content: parsed.content,
      imageUrl: parsed.imageUrl,
      created_at: row.created_at,
    };
  });
}

// Check and claim pending resource grants
export async function claimPendingGrants(): Promise<{
  gameData: GameData;
  claimed: {type: string; amount: number; reason: string | null}[];
}> {
  return claimPendingResourceGrants();
}
