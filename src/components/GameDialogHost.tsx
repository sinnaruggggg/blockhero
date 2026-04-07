import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  closeActiveGameDialog,
  subscribeGameDialog,
  type GameDialogRequest,
} from '../services/gameDialogService';

const VARIANT_META = {
  notice: {eyebrow: 'NOTICE', accent: '#d68f47', plate: '#fff0d9'},
  confirm: {eyebrow: 'CONFIRM', accent: '#6177d8', plate: '#e7edff'},
  success: {eyebrow: 'SUCCESS', accent: '#3da36c', plate: '#e7fae8'},
  error: {eyebrow: 'ALERT', accent: '#c95b4c', plate: '#ffe3d9'},
} as const;

function getButtonStyle(style?: 'default' | 'cancel' | 'destructive') {
  if (style === 'cancel') {
    return {
      backgroundColor: '#f6ead4',
      borderColor: '#b38b5f',
      textColor: '#6f4e2a',
    };
  }

  if (style === 'destructive') {
    return {
      backgroundColor: '#bc5a47',
      borderColor: '#7b3428',
      textColor: '#fff9f1',
    };
  }

  return {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
    textColor: '#fff7ef',
  };
}

export default function GameDialogHost() {
  const [request, setRequest] = useState<GameDialogRequest | null>(null);

  useEffect(() => subscribeGameDialog(setRequest), []);

  const meta = useMemo(() => {
    if (!request) {
      return VARIANT_META.notice;
    }
    return VARIANT_META[request.variant];
  }, [request]);

  if (!request) {
    return null;
  }

  const canDismissByBackdrop =
    request.options?.cancelable === true &&
    request.buttons.length <= 1 &&
    request.buttons[0]?.style !== 'destructive';

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          disabled={!canDismissByBackdrop}
          onPress={() => closeActiveGameDialog(0)}
          style={styles.backdrop}
        />

        <View style={styles.frame}>
          <View style={[styles.card, {borderColor: meta.accent}]}>
            <View style={[styles.topPlate, {backgroundColor: meta.plate}]}>
              <Text style={[styles.eyebrow, {color: meta.accent}]}>
                {meta.eyebrow}
              </Text>
              {request.title ? (
                <Text style={styles.title}>{request.title}</Text>
              ) : null}
            </View>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}>
              {request.imageUrl ? (
                <Image
                  source={{uri: request.imageUrl}}
                  resizeMode="cover"
                  style={styles.image}
                />
              ) : null}
              {request.message ? (
                <Text style={styles.message}>{request.message}</Text>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.buttonRow,
                request.buttons.length > 2 && styles.buttonColumn,
              ]}>
              {request.buttons.map((button, index) => {
                const palette = getButtonStyle(button.style);
                return (
                  <TouchableOpacity
                    key={`${request.id}-${index}-${button.text ?? 'button'}`}
                    activeOpacity={0.9}
                    style={[
                      styles.button,
                      request.buttons.length > 2 && styles.buttonWide,
                      {
                        backgroundColor: palette.backgroundColor,
                        borderColor: palette.borderColor,
                      },
                    ]}
                    onPress={() => closeActiveGameDialog(index)}>
                    <Text style={[styles.buttonText, {color: palette.textColor}]}>
                      {button.text ?? '확인'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(20, 13, 8, 0.62)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#7a4a26',
    borderWidth: 3,
    borderColor: '#4d2d17',
    padding: 8,
    shadowColor: '#120801',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 16,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff6e8',
    borderWidth: 2,
  },
  topPlate: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 49, 24, 0.15)',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  title: {
    color: '#4d2f17',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  bodyScroll: {
    maxHeight: 320,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  image: {
    width: '100%',
    height: 168,
    borderRadius: 16,
    backgroundColor: '#eadbc3',
  },
  message: {
    color: '#5f4428',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 2,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonWide: {
    width: '100%',
    flex: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
  },
});
