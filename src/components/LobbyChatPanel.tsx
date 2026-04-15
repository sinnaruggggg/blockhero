import React, {useEffect, useRef} from 'react';
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
import type {LobbyChatMessage} from '../hooks/useLobbyChat';

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
  onPressUser?: (userId: string, nickname: string) => void;
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
  onPressUser,
  bottom = 22,
}: LobbyChatPanelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const shouldAutoScrollRef = useRef(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
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
        scrollRef.current?.scrollToEnd({animated: true});
      });
    }
  }, [currentChannelId, isOpen, messages]);

  const channelLabel = currentChannelId
    ? `채널 ${currentChannelId} · ${currentOccupancy}/${capacity}`
    : '채널 연결 중';

  return (
    <View pointerEvents="box-none" style={[styles.host, {bottom}]}>
      {isOpen ? (
        <View style={[styles.panel, {borderColor: 'rgba(226, 169, 77, 0.82)'}]}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.eyebrow}>SOCIAL CHAT</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.channelText, {color: accentColor}]}>
                {channelLabel}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onToggle}>
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
                    active && {backgroundColor: accentColor, borderColor: '#ffffff'},
                    full && styles.channelChipFull,
                  ]}
                  disabled={full}
                  onPress={() => onSwitchChannel(option.id)}>
                  <Text
                    style={[
                      styles.channelChipText,
                      active && styles.channelChipTextActive,
                    ]}>
                    {option.id}번
                  </Text>
                  <Text
                    style={[
                      styles.channelChipMeta,
                      active && styles.channelChipTextActive,
                    ]}>
                    {option.count}/{capacity}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.randomButton, {borderColor: `${accentColor}88`}]}
              onPress={onRandomizeChannel}>
              <Text style={[styles.randomButtonText, {color: accentColor}]}>
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
              scrollRef.current?.scrollToEnd({animated: true});
            }}>
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
                  ]}>
                  <Text
                    style={[
                      styles.messageNickname,
                      message.self && styles.messageNicknameSelf,
                    ]}>
                    {message.nickname}
                  </Text>
                  {message.userId && onPressUser ? (
                    <TouchableOpacity
                      disabled={message.self}
                      onPress={() => onPressUser(message.userId!, message.nickname)}>
                      <Text
                        style={[
                          styles.messageUserId,
                          message.self && styles.messageUserIdDisabled,
                        ]}>
                        ID: {message.userId}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              placeholder="모집 메시지를 입력하세요"
              placeholderTextColor="#b7a8e6"
              style={styles.input}
              maxLength={120}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />
            <TouchableOpacity
              style={[styles.sendButton, {backgroundColor: accentColor}]}
              onPress={onSend}>
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TouchableOpacity style={styles.fab} onPress={onToggle}>
        <Text style={styles.fabEyebrow}>CHAT</Text>
        <Text style={styles.fabTitle}>채팅</Text>
        <Text style={[styles.fabChannel, {color: accentColor}]}>
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
    width: 316,
    maxHeight: 380,
    backgroundColor: 'rgba(33, 20, 82, 0.96)',
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
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
  eyebrow: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#fff7de',
    fontSize: 15,
    fontWeight: '900',
  },
  channelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  closeButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeButtonText: {
    color: '#fff4d7',
    fontSize: 11,
    fontWeight: '900',
  },
  channelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  channelChip: {
    minWidth: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 1,
  },
  channelChipFull: {
    opacity: 0.35,
  },
  channelChipText: {
    color: '#f0e9ff',
    fontSize: 11,
    fontWeight: '900',
  },
  channelChipMeta: {
    color: '#d4c6ff',
    fontSize: 9,
    fontWeight: '700',
  },
  channelChipTextActive: {
    color: '#ffffff',
  },
  randomButton: {
    marginLeft: 'auto',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  randomButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  messages: {
    minHeight: 156,
    maxHeight: 176,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 7, 36, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messagesContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  emptyText: {
    color: '#d4c6ff',
    fontSize: 12,
    lineHeight: 18,
  },
  messageBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageBubbleSelf: {
    backgroundColor: 'rgba(45, 168, 255, 0.18)',
  },
  messageNickname: {
    color: '#ffd88a',
    fontSize: 11,
    fontWeight: '900',
  },
  messageNicknameSelf: {
    color: '#93dcff',
  },
  messageText: {
    color: '#fff7de',
    fontSize: 12,
    lineHeight: 18,
  },
  messageUserId: {
    color: '#9bddff',
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: 'underline',
  },
  messageUserIdDisabled: {
    color: '#9185bd',
    textDecorationLine: 'none',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 7, 36, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff7de',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  fab: {
    minWidth: 122,
    borderRadius: 22,
    backgroundColor: 'rgba(33, 20, 82, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(226, 169, 77, 0.76)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 8,
  },
  fabEyebrow: {
    color: '#ffd88a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fabTitle: {
    color: '#fff7de',
    fontSize: 13,
    fontWeight: '900',
  },
  fabChannel: {
    fontSize: 11,
    fontWeight: '800',
  },
});
