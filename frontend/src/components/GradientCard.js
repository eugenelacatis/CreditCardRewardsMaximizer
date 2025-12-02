import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, borderRadius } from '../theme';

export default function GradientCard({
  children,
  gradient = colors.primary.gradient,
  style,
  containerStyle,
  shadowStyle = shadows.md,
}) {
  return (
    <View style={[shadowStyle, containerStyle]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, style]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: borderRadius.lg,
    padding: 20,
  },
});
