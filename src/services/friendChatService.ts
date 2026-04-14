import { supabase } from './supabase';

export interface FriendChatStoredMessage {
  id: string;
  threadKey: string;
  senderId: string;
  receiverId: string;
  senderNickname: string;
  text: string;
  createdAt: string;
}

interface FriendChatMessageRow {
  id: string;
  thread_key: string;
  sender_id: string;
  receiver_id: string;
  sender_nickname: string;
  text: string;
  created_at: string;
}

export function getFriendChatThreadKey(
  leftPlayerId: string,
  rightPlayerId: string,
) {
  return [leftPlayerId, rightPlayerId].sort().join(':');
}

function mapFriendChatMessageRow(
  row: FriendChatMessageRow,
): FriendChatStoredMessage {
  return {
    id: row.id,
    threadKey: row.thread_key,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    senderNickname: row.sender_nickname,
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function fetchFriendChatMessages(
  myPlayerId: string,
  friendPlayerId: string,
  limit = 100,
) {
  const threadKey = getFriendChatThreadKey(myPlayerId, friendPlayerId);

  const { data, error } = await supabase
    .from('friend_chat_messages')
    .select(
      'id, thread_key, sender_id, receiver_id, sender_nickname, text, created_at',
    )
    .eq('thread_key', threadKey)
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: (data ?? [])
      .slice()
      .reverse()
      .map(row => mapFriendChatMessageRow(row as FriendChatMessageRow)),
    error,
  };
}

export async function insertFriendChatMessage(params: {
  id: string;
  senderId: string;
  receiverId: string;
  senderNickname: string;
  text: string;
}) {
  const { id, senderId, receiverId, senderNickname, text } = params;

  return supabase.from('friend_chat_messages').insert({
    id,
    thread_key: getFriendChatThreadKey(senderId, receiverId),
    sender_id: senderId,
    receiver_id: receiverId,
    sender_nickname: senderNickname,
    text,
  });
}
