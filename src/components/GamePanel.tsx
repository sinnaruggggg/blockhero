import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

export default function GamePanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255, 245, 228, 0.96)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8a5e35',
    padding: 18,
    shadowColor: '#261409',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 7,
  },
});
