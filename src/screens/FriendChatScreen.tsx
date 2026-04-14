import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import { supabase } from '../services/supabase';
import {
  fetchFriendChatMessages,
  getFriendChatThreadKey,
  insertFriendChatMessage,
} from '../services/friendChatService';
import { getNickname, getPlayerId } from '../stores/gameStore';

interface FriendChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  self: boolean;
}

function appendMessage(
  current: FriendChatMessage[],
  next: FriendChatMessage,
  limit = 200,
) {
  if (current.some(message => message.id === next.id)) {
    return current;
  }

  const nextMessages = [...current, next];
  return nextMessages.slice(-limit);
}

export default function FriendChatScreen({ route, navigation }: any) {
  const friendId = String(route.params?.friendId ?? '');
  const friendNickname = String(route.params?.friendNickname ?? '친구');

  const [loading, setLoading] = useState(true);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [messages, setMessages] = useState<FriendChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [playerId, nickname] = await Promise.all([
          getPlayerId(),
          getNickname(),
        ]);
        if (!mounted) {
          return;
        }

        setMyPlayerId(playerId);
        setMyNickname(nickname);
        const nextThreadKey = getFriendChatThreadKey(playerId, friendId);

        const channel = supabase
          .channel(`friend-chat:${nextThreadKey}`)
          .on('broadcast', { event: 'message' }, ({ payload }: any) => {
            const messageId =
              typeof payload?.id === 'string' ? payload.id : null;
            const senderId =
              typeof payload?.senderId === 'string' ? payload.senderId : null;
            const senderNickname =
              typeof payload?.senderNickname === 'string'
                ? payload.senderNickname
                : 'Unknown';
            const text = typeof payload?.text === 'string' ? payload.text : '';

            if (!messageId || !senderId || !text) {
              return;
            }

            setMessages(current =>
              appendMessage(current, {
                id: messageId,
                senderId,
                senderNickname,
                text,
                self: senderId === playerId,
              }),
            );
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'friend_chat_messages',
              filter: `thread_key=eq.${nextThreadKey}`,
            },
            ({ payload }: any) => {
              const messageId =
                typeof payload?.new?.id === 'string' ? payload.new.id : null;
              const senderId =
                typeof payload?.new?.sender_id === 'string'
                  ? payload.new.sender_id
                  : null;
              const senderNickname =
                typeof payload?.new?.sender_nickname === 'string'
                  ? payload.new.sender_nickname
                  : 'Unknown';
              const text =
                typeof payload?.new?.text === 'string' ? payload.new.text : '';

              if (!messageId || !senderId || !text) {
                return;
              }

              setMessages(current =>
                appendMessage(current, {
                  id: messageId,
                  senderId,
                  senderNickname,
                  text,
                  self: senderId === playerId,
                }),
              );
            },
          );

        channelRef.current = channel;

        channel.subscribe(async status => {
          if (!mounted || status !== 'SUBSCRIBED') {
            return;
          }

          try {
            const { data: history } = await fetchFriendChatMessages(
              playerId,
              friendId,
            );
            if (!mounted) {
              return;
            }

            setMessages(
              history.map(message => ({
                id: message.id,
                senderId: message.senderId,
                senderNickname: message.senderNickname,
                text: message.text,
                self: message.senderId === playerId,
              })),
            );
          } catch (error) {
            console.warn('FriendChatScreen history load failed:', error);
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        });
      } catch (error) {
        if (mounted) {
          setLoading(false);
          Alert.alert(
            '오류',
            error instanceof Error
              ? error.message
              : '대화 정보를 불러오지 못했습니다.',
          );
        }
      }
    };

    void load();

    return () => {
      mounted = false;
      cleanupChannel();
    };
  }, [cleanupChannel, friendId]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (
      !text ||
      !myPlayerId ||
      !myNickname ||
      !friendId ||
      !channelRef.current
    ) {
      return;
    }

    const messageId = `${myPlayerId}-${Date.now()}`;
    const optimisticMessage: FriendChatMessage = {
      id: messageId,
      senderId: myPlayerId,
      senderNickname: myNickname,
      text,
      self: true,
    };

    setMessages(current => appendMessage(current, optimisticMessage));
    setDraft('');

    let broadcastSucceeded = false;
    try {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          id: messageId,
          senderId: myPlayerId,
          senderNickname: myNickname,
          text,
        },
      });
      broadcastSucceeded = result === 'ok';
    } catch (error) {
      console.warn('FriendChatScreen broadcast failed:', error);
    }

    const { error } = await insertFriendChatMessage({
      id: messageId,
      senderId: myPlayerId,
      receiverId: friendId,
      senderNickname: myNickname,
      text,
    });

    if (error && !broadcastSucceeded) {
      Alert.alert('대화 전송 실패', error.message);
    } else if (error) {
      console.warn('FriendChatScreen insert failed:', error.message);
    }
  }, [draft, friendId, myNickname, myPlayerId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <View style={styles.headerMeta}>
          <Text style={styles.title}>대화하기</Text>
          <Text style={styles.subtitle}>{friendNickname}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>아직 대화가 없습니다.</Text>
            ) : (
              messages.map(message => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.self && styles.messageBubbleSelf,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageNickname,
                      message.self && styles.messageNicknameSelf,
                    ]}
                  >
                    {message.senderNickname}
                  </Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지를 입력하세요"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              maxLength={200}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerMeta: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  headerSpacer: {
    width: 42,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 40,
  },
  messageBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  messageBubbleSelf: {
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
  },
  messageNickname: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
  },
  messageNicknameSelf: {
    color: '#93c5fd',
  },
  messageText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.16)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
