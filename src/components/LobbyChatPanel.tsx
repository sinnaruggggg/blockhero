import React, { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { LobbyChatMessage } from '../hooks/useLobbyChat';

interface ChannelOption {
  id: number;
  count: number;
}

interface LobbyChatPanelProps {
  title: string;
  accentColor: string;
  isOpen: boolean;
  connected: boolean;
  currentChannelId: number | null;
  currentOccupancy: number;
  capacity: number;
  channelOptions: ChannelOption[];
  draft: string;
  messages: LobbyChatMessage[];
  onToggle: () => void;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onSwitchChannel: (channelId: number) => void;
  onRandomizeChannel: () => void;
  onJoinParty?: (partyId: string, message: LobbyChatMessage) => void;
  bottom?: number;
}

export default function LobbyChatPanel({
  title,
  accentColor,
  isOpen,
  connected,
  currentChannelId,
  currentOccupancy,
  capacity,
  channelOptions,
  draft,
  messages,
  onToggle,
  onChangeDraft,
  onSend,
  onSwitchChannel,
  onRandomizeChannel,
  onJoinParty,
  bottom = 22,
}: LobbyChatPanelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const shouldAutoScrollRef = useRef(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    shouldAutoScrollRef.current = distanceFromBottom <= 28;
  };

  useEffect(() => {
    if (isOpen) {
      shouldAutoScrollRef.current = true;
    }
  }, [currentChannelId, isOpen]);

  useEffect(() => {
    if (isOpen && shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [currentChannelId, isOpen, messages]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {isOpen ? (
        <View style={[styles.panel, { borderColor: `${accentColor}AA` }]}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.channelText, { color: accentColor }]}>
                {currentChannelId ? `채널 ${currentChannelId}` : '채널 연결 중'}
                {currentChannelId ? ` · ${currentOccupancy}/${capacity}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: `${accentColor}55` }]}
              onPress={onToggle}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.channelRow}>
            {channelOptions.map(option => {
              const active = option.id === currentChannelId;
              const full = !active && option.count >= capacity;
              return (
                <TouchableOpacity
                  key={`channel-${option.id}`}
                  style={[
                    styles.channelChip,
                    active && { backgroundColor: accentColor },
                    full && styles.channelChipFull,
                  ]}
                  disabled={full}
                  onPress={() => onSwitchChannel(option.id)}
                >
                  <Text
                    style={[
                      styles.channelChipText,
                      active && styles.channelChipTextActive,
                    ]}
                  >
                    {option.id}번
                  </Text>
                  <Text
                    style={[
                      styles.channelChipMeta,
                      active && styles.channelChipTextActive,
                    ]}
                  >
                    {option.count}/{capacity}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.randomButton, { borderColor: `${accentColor}88` }]}
              onPress={onRandomizeChannel}
            >
              <Text style={[styles.randomButtonText, { color: accentColor }]}>
                랜덤
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (!isOpen || !shouldAutoScrollRef.current) {
                return;
              }
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                {connected
                  ? '실시간 모집 채팅이 비어 있습니다.'
                  : '채팅 채널에 연결 중입니다.'}
              </Text>
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
                    {message.nickname}
                  </Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                  {message.partyRecruitment && onJoinParty ? (
                    <TouchableOpacity
                      style={[
                        styles.partyJoinButton,
                        message.self && styles.partyJoinButtonDisabled,
                      ]}
                      disabled={message.self}
                      onPress={() =>
                        onJoinParty(message.partyRecruitment!.partyId, message)
                      }
                    >
                      <Text style={styles.partyJoinButtonText}>
                        {message.self ? '내 파티 모집글' : '파티 참가'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              placeholder="모집 메시지를 입력하세요"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              maxLength={120}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: accentColor }]}
              onPress={onSend}
            >
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.fab, { borderColor: `${accentColor}AA` }]}
        onPress={onToggle}
      >
        <Text style={styles.fabTitle}>채팅</Text>
        <Text style={[styles.fabChannel, { color: accentColor }]}>
          {currentChannelId
            ? `${currentChannelId}번 · ${currentOccupancy}/${capacity}`
            : '연결 중'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: 12,
    alignItems: 'flex-end',
    zIndex: 60,
  },
  panel: {
    width: 310,
    maxHeight: 360,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  closeButtonText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  channelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  channelChip: {
    minWidth: 54,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 1,
  },
  channelChipFull: {
    opacity: 0.35,
  },
  channelChipText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  channelChipMeta: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  channelChipTextActive: {
    color: '#fff',
  },
  randomButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  randomButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  messages: {
    minHeight: 150,
    maxHeight: 170,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.68)',
  },
  messagesContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  messageBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  messageBubbleSelf: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
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
    fontSize: 12,
    lineHeight: 18,
  },
  partyJoinButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  partyJoinButtonDisabled: {
    backgroundColor: '#334155',
  },
  partyJoinButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  messageUserId: {
    color: '#93c5fd',
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: 'underline',
  },
  messageUserIdDisabled: {
    color: '#64748b',
    textDecorationLine: 'none',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  fab: {
    minWidth: 118,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  fabTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  fabChannel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
