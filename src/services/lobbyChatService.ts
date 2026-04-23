import { supabase } from './supabase';

export type LobbyChatMode = 'battle' | 'raid';
export type RaidPartyRecruitmentType = 'normal' | 'boss';

export interface RaidPartyRecruitment {
  partyId: string;
  raidType: RaidPartyRecruitmentType;
  bossStage: number;
  raidName?: string;
  leaderNickname?: string;
}

export interface LobbyChatStoredMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  displayText: string;
  partyRecruitment?: RaidPartyRecruitment;
  createdAt: string;
}

interface LobbyChatMessageRow {
  id: string;
  user_id: string;
  nickname: string;
  text: string;
  created_at: string;
}

const RAID_PARTY_TOKEN_PATTERN = /\[BH_RAID_PARTY:([^\]]+)\]/;

export function getLobbyChatChannelKey(
  mode: LobbyChatMode,
  channelId: number,
): string {
  return `${mode}_${channelId}`;
}

function encodeTokenValue(value: string | number | undefined) {
  return encodeURIComponent(String(value ?? ''));
}

function decodeTokenValue(value: string | undefined) {
  return decodeURIComponent(value ?? '');
}

export function encodeRaidPartyRecruitment(
  recruitment: RaidPartyRecruitment,
): string {
  const params = [
    `partyId=${encodeTokenValue(recruitment.partyId)}`,
    `raidType=${encodeTokenValue(recruitment.raidType)}`,
    `bossStage=${encodeTokenValue(recruitment.bossStage)}`,
    `raidName=${encodeTokenValue(recruitment.raidName)}`,
    `leaderNickname=${encodeTokenValue(recruitment.leaderNickname)}`,
  ];

  return `[BH_RAID_PARTY:${params.join('&')}]`;
}

export function buildRaidPartyRecruitmentMessage(
  displayText: string,
  recruitment: RaidPartyRecruitment,
) {
  return `${displayText.trim()}\n${encodeRaidPartyRecruitment(recruitment)}`;
}

export function parseRaidPartyRecruitment(
  text: string,
): RaidPartyRecruitment | undefined {
  const match = text.match(RAID_PARTY_TOKEN_PATTERN);
  if (!match?.[1]) {
    return undefined;
  }

  const values = Object.fromEntries(
    match[1].split('&').map(pair => {
      const [key, value] = pair.split('=');
      return [key, decodeTokenValue(value)];
    }),
  );
  const bossStage = Number.parseInt(values.bossStage ?? '', 10);
  const raidType = values.raidType === 'boss' ? 'boss' : 'normal';

  if (!values.partyId || !Number.isFinite(bossStage) || bossStage <= 0) {
    return undefined;
  }

  return {
    partyId: values.partyId,
    raidType,
    bossStage,
    raidName: values.raidName || undefined,
    leaderNickname: values.leaderNickname || undefined,
  };
}

export function stripRaidPartyRecruitmentToken(text: string) {
  return text.replace(RAID_PARTY_TOKEN_PATTERN, '').trim();
}

function mapLobbyChatMessageRow(
  row: LobbyChatMessageRow,
): LobbyChatStoredMessage {
  const partyRecruitment = parseRaidPartyRecruitment(row.text);

  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    text: row.text,
    displayText: stripRaidPartyRecruitmentToken(row.text),
    partyRecruitment,
    createdAt: row.created_at,
  };
}

export async function fetchLobbyChatMessages(
  mode: LobbyChatMode,
  channelId: number,
  limit = 100,
) {
  const channelKey = getLobbyChatChannelKey(mode, channelId);

  const { data, error } = await supabase
    .from('lobby_chat_messages')
    .select('id, user_id, nickname, text, created_at')
    .eq('channel_key', channelKey)
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: (data ?? [])
      .slice()
      .reverse()
      .map(row => mapLobbyChatMessageRow(row as LobbyChatMessageRow)),
    error,
  };
}

export async function fetchRaidPartyRecruitmentMessages(limit = 50) {
  const { data, error } = await supabase
    .from('lobby_chat_messages')
    .select('id, user_id, nickname, text, created_at')
    .eq('mode', 'raid')
    .ilike('text', '%BH_RAID_PARTY%')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: (data ?? []).map(row =>
      mapLobbyChatMessageRow(row as LobbyChatMessageRow),
    ),
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
  const { id, mode, channelId, userId, nickname, text } = params;

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
