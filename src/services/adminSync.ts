import {claimPendingResourceGrants} from './economyService';
import {supabase} from './supabase';

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
  const result = await claimPendingResourceGrants();
  return result.claimed;
}
