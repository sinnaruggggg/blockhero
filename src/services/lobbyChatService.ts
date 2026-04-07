import {supabase} from './supabase';

export type LobbyChatMode = 'battle' | 'raid';

export interface LobbyChatStoredMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: string;
}

interface LobbyChatMessageRow {
  id: string;
  user_id: string;
  nickname: string;
  text: string;
  created_at: string;
}

export function getLobbyChatChannelKey(
  mode: LobbyChatMode,
  channelId: number,
): string {
  return `${mode}_${channelId}`;
}

function mapLobbyChatMessageRow(row: LobbyChatMessageRow): LobbyChatStoredMessage {
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function fetchLobbyChatMessages(
  mode: LobbyChatMode,
  channelId: number,
  limit = 100,
) {
  const channelKey = getLobbyChatChannelKey(mode, channelId);

  const {data, error} = await supabase
    .from('lobby_chat_messages')
    .select('id, user_id, nickname, text, created_at')
    .eq('channel_key', channelKey)
    .order('created_at', {ascending: false})
    .limit(limit);

  return {
    data: (data ?? [])
      .slice()
      .reverse()
      .map(row => mapLobbyChatMessageRow(row as LobbyChatMessageRow)),
    error,
  };
}

export async function insertLobbyChatMessage(params: {
  id: string;
  mode: LobbyChatMode;
  channelId: number;
  userId: string;
  nickname: string;
  text: string;
}) {
  const {id, mode, channelId, userId, nickname, text} = params;

  return supabase.from('lobby_chat_messages').insert({
    id,
    channel_key: getLobbyChatChannelKey(mode, channelId),
    mode,
    channel_id: channelId,
    user_id: userId,
    nickname,
    text,
  });
}
