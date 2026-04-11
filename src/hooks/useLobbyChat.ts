import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import {
  buildLobbyChatChannelInfos,
  buildLobbyChatChannelOptions,
  getLobbyChatOccupancy,
  pickRandomLobbyChatChannel,
  type LobbyChatChannelInfo,
} from '../game/lobbyChatChannels';
import {
  fetchLobbyChatMessages,
  getLobbyChatChannelKey,
  insertLobbyChatMessage,
  type LobbyChatMode,
} from '../services/lobbyChatService';

export interface LobbyChatMessage {
  id: string;
  userId?: string;
  nickname: string;
  text: string;
  self?: boolean;
}

interface UseLobbyChatOptions {
  mode: LobbyChatMode;
  userId: string;
  nickname: string;
  enabled: boolean;
  sessionKey: number;
  capacity?: number;
}

const DEFAULT_CAPACITY = 30;
const MESSAGE_LIMIT = 100;
const lobbyChatHistoryCache = new Map<string, LobbyChatMessage[]>();

function getLobbyChatHistoryKey(mode: LobbyChatMode, channelId: number) {
  return `${mode}:${channelId}`;
}

function readLobbyChatHistory(
  mode: LobbyChatMode,
  channelId: number | null | undefined,
): LobbyChatMessage[] {
  if (!channelId) {
    return [];
  }

  return (
    lobbyChatHistoryCache.get(getLobbyChatHistoryKey(mode, channelId)) ?? []
  );
}

function writeLobbyChatHistory(
  mode: LobbyChatMode,
  channelId: number,
  messages: LobbyChatMessage[],
) {
  lobbyChatHistoryCache.set(
    getLobbyChatHistoryKey(mode, channelId),
    messages.slice(-MESSAGE_LIMIT),
  );
}

function appendLobbyChatMessage(
  current: LobbyChatMessage[],
  next: LobbyChatMessage,
  limit = MESSAGE_LIMIT,
) {
  if (current.some(message => message.id === next.id)) {
    return current;
  }

  const nextMessages = [...current, next];
  return nextMessages.slice(-limit);
}

export function useLobbyChat({
  mode,
  userId,
  nickname,
  enabled,
  sessionKey,
  capacity = DEFAULT_CAPACITY,
}: UseLobbyChatOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<number | null>(null);
  const [channelInfos, setChannelInfos] = useState<LobbyChatChannelInfo[]>([]);

  const directoryChannelRef = useRef<any>(null);
  const chatChannelRef = useRef<any>(null);
  const currentChannelIdRef = useRef<number | null>(null);
  const lifecycleTokenRef = useRef(0);

  const cleanupChatChannel = useCallback(() => {
    if (chatChannelRef.current) {
      void supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
  }, []);

  const cleanupAllChannels = useCallback(() => {
    cleanupChatChannel();
    if (directoryChannelRef.current) {
      void supabase.removeChannel(directoryChannelRef.current);
      directoryChannelRef.current = null;
    }
  }, [cleanupChatChannel]);

  const refreshChannelInfos = useCallback(() => {
    const nextInfos = buildLobbyChatChannelInfos(
      directoryChannelRef.current?.presenceState?.() ?? {},
    );
    setChannelInfos(nextInfos);
    return nextInfos;
  }, []);

  const connectChatChannel = useCallback(
    async (targetChannelId: number, token: number) => {
      cleanupChatChannel();

      setMessages(readLobbyChatHistory(mode, targetChannelId));
      currentChannelIdRef.current = targetChannelId;
      setCurrentChannelId(targetChannelId);

      const channelKey = getLobbyChatChannelKey(mode, targetChannelId);
      const chatChannel = supabase
        .channel(`lobby-chat-db:${mode}:${targetChannelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lobby_chat_messages',
            filter: `channel_key=eq.${channelKey}`,
          },
          ({ payload }: any) => {
            const incomingId =
              typeof payload?.new?.id === 'string' ? payload.new.id : null;
            const incomingNickname =
              typeof payload?.new?.nickname === 'string'
                ? payload.new.nickname
                : 'Unknown';
            const incomingText =
              typeof payload?.new?.text === 'string' ? payload.new.text : '';

            if (!incomingId || !incomingText) {
              return;
            }

            setMessages(current => {
              const nextMessages = appendLobbyChatMessage(current, {
                id: incomingId,
                userId:
                  typeof payload?.new?.user_id === 'string'
                    ? payload.new.user_id
                    : undefined,
                nickname: incomingNickname,
                text: incomingText,
                self: payload?.new?.user_id === userId,
              });
              writeLobbyChatHistory(mode, targetChannelId, nextMessages);
              return nextMessages;
            });
          },
        );

      chatChannelRef.current = chatChannel;
      await new Promise<void>(resolve => {
        chatChannel.subscribe(async status => {
          if (token !== lifecycleTokenRef.current) {
            void supabase.removeChannel(chatChannel);
            resolve();
            return;
          }

          if (status !== 'SUBSCRIBED') {
            if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              setConnected(false);
              resolve();
            }
            return;
          }

          if (directoryChannelRef.current?.track) {
            await directoryChannelRef.current.track({
              userId,
              nickname,
              channelId: targetChannelId,
              updatedAt: Date.now(),
            });
            refreshChannelInfos();
          }

          const { data: history } = await fetchLobbyChatMessages(
            mode,
            targetChannelId,
            MESSAGE_LIMIT,
          );

          if (token === lifecycleTokenRef.current) {
            const hydratedMessages = history.map(message => ({
              id: message.id,
              userId: message.userId,
              nickname: message.nickname,
              text: message.text,
              self: message.userId === userId,
            }));
            writeLobbyChatHistory(mode, targetChannelId, hydratedMessages);
            setMessages(hydratedMessages);
          }

          resolve();
        });
      });
    },
    [cleanupChatChannel, mode, nickname, refreshChannelInfos, userId],
  );

  const switchChannel = useCallback(
    async (targetChannelId: number) => {
      if (!enabled || !directoryChannelRef.current || targetChannelId < 1) {
        return false;
      }

      const nextInfos = refreshChannelInfos();
      const targetOccupancy = getLobbyChatOccupancy(nextInfos, targetChannelId);
      const isCurrentChannel = currentChannelIdRef.current === targetChannelId;
      if (!isCurrentChannel && targetOccupancy >= capacity) {
        Alert.alert(
          '채널 이동 불가',
          `채널 ${targetChannelId}번은 정원(${capacity}명)입니다.`,
        );
        return false;
      }

      lifecycleTokenRef.current += 1;
      await connectChatChannel(targetChannelId, lifecycleTokenRef.current);
      return true;
    },
    [capacity, connectChatChannel, enabled, refreshChannelInfos],
  );

  const joinRandomChannel = useCallback(async () => {
    if (!directoryChannelRef.current) {
      return;
    }

    const nextInfos = refreshChannelInfos();
    const targetChannelId = pickRandomLobbyChatChannel(nextInfos, capacity);
    await switchChannel(targetChannelId);
  }, [capacity, refreshChannelInfos, switchChannel]);

  useEffect(() => {
    cleanupAllChannels();
    setConnected(false);
    setMessages([]);
    setDraft('');
    setCurrentChannelId(null);
    currentChannelIdRef.current = null;

    if (!enabled || !userId || !nickname) {
      return;
    }

    let active = true;
    lifecycleTokenRef.current += 1;
    const token = lifecycleTokenRef.current;

    const directoryChannel = supabase
      .channel(`lobby-directory:${mode}`, {
        config: { presence: { key: userId } },
      })
      .on('presence', { event: 'sync' }, () => {
        if (!active) {
          return;
        }
        refreshChannelInfos();
      });

    directoryChannelRef.current = directoryChannel;

    directoryChannel.subscribe(async status => {
      if (!active || token !== lifecycleTokenRef.current) {
        return;
      }

      if (status === 'SUBSCRIBED') {
        setConnected(true);
        await joinRandomChannel();
        return;
      }

      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        setConnected(false);
      }
    });

    return () => {
      active = false;
      cleanupAllChannels();
    };
  }, [
    cleanupAllChannels,
    enabled,
    joinRandomChannel,
    mode,
    nickname,
    refreshChannelInfos,
    sessionKey,
    userId,
  ]);

  const toggleOpen = useCallback(() => {
    setIsOpen(current => !current);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    const activeChannelId = currentChannelIdRef.current;
    if (!text || !chatChannelRef.current || !activeChannelId) {
      return;
    }

    const message: LobbyChatMessage = {
      id: `${userId}-${Date.now()}`,
      userId,
      nickname,
      text,
      self: true,
    };
    setMessages(current => {
      const nextMessages = appendLobbyChatMessage(current, message);
      writeLobbyChatHistory(mode, activeChannelId, nextMessages);
      return nextMessages;
    });
    setDraft('');

    const { error } = await insertLobbyChatMessage({
      id: message.id,
      mode,
      channelId: activeChannelId,
      userId,
      nickname,
      text,
    });

    if (error) {
      Alert.alert('채팅 전송 실패', error.message);
    }
  }, [draft, mode, nickname, userId]);

  const channelOptions = useMemo(
    () => buildLobbyChatChannelOptions(channelInfos, currentChannelId),
    [channelInfos, currentChannelId],
  );

  return {
    isOpen,
    toggleOpen,
    draft,
    setDraft,
    messages,
    connected,
    currentChannelId,
    currentOccupancy: getLobbyChatOccupancy(channelInfos, currentChannelId),
    capacity,
    channelOptions,
    switchChannel,
    joinRandomChannel,
    sendMessage,
  };
}
