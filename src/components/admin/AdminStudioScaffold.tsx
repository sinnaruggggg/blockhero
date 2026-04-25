import React from 'react';
import {ScrollView, StyleSheet, useWindowDimensions, View} from 'react-native';
import MenuScreenFrame from '../MenuScreenFrame';

export default function AdminStudioScaffold({
  title,
  subtitle,
  onBack,
  left,
  right,
  footer,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  left: React.ReactNode;
  right?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const windowDimensions = useWindowDimensions();
  const isLandscape = windowDimensions.width > windowDimensions.height;

  if (!isLandscape) {
    return (
      <MenuScreenFrame
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        contentContainerStyle={styles.mobileContent}>
        {left}
        {right}
        {footer}
      </MenuScreenFrame>
    );
  }

  return (
    <MenuScreenFrame
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      scrollEnabled={false}
      contentContainerStyle={styles.desktopContent}>
      <View style={styles.desktopRow}>
        <ScrollView
          style={[styles.desktopPane, styles.desktopPanePrimary]}
          contentContainerStyle={styles.desktopPaneContent}
          showsVerticalScrollIndicator={false}>
          {left}
        </ScrollView>
        {right ? (
          <ScrollView
            style={styles.desktopPane}
            contentContainerStyle={styles.desktopPaneContent}
            showsVerticalScrollIndicator={false}>
            {right}
          </ScrollView>
        ) : null}
      </View>
      {footer}
    </MenuScreenFrame>
  );
}

const styles = StyleSheet.create({
  mobileContent: {
    gap: 14,
  },
  desktopContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 560,
  },
  desktopPane: {
    flex: 1,
    backgroundColor: 'rgba(22, 17, 31, 0.1)',
    borderRadius: 24,
  },
  desktopPanePrimary: {
    flex: 1.08,
  },
  desktopPaneContent: {
    gap: 14,
    paddingBottom: 8,
  },
});
