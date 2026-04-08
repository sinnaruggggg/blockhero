import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from './BackImageButton';

const IMG_BG = require('../assets/ui/background.jpg');

export default function MenuScreenFrame({
  title,
  subtitle,
  onBack,
  children,
  contentContainerStyle,
  scrollEnabled = true,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}) {
  return (
    <ImageBackground source={IMG_BG} resizeMode="cover" style={styles.background}>
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerSide}>
              <BackImageButton onPress={onBack} size={44} />
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.eyebrow}>BLOCKHERO MENU</Text>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headerSide} />
          </View>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 20, 38, 0.72)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerSide: {
    width: 56,
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
  },
  eyebrow: {
    color: '#f7d89e',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  title: {
    color: '#fff7ec',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#f1dfbf',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
});
