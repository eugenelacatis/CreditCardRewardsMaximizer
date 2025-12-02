import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, typography } from '../theme';

export default function ModernButton({
  title,
  onPress,
  variant = 'gradient', // gradient, solid, outline, ghost
  size = 'medium', // small, medium, large
  gradient = colors.primary.gradient,
  color = colors.primary.main,
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) {
  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'large':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return typography.caption;
      case 'large':
        return typography.h4;
      default:
        return typography.body;
    }
  };

  const buttonSize = getButtonSize();
  const fontSize = getFontSize();

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[shadows.md, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={disabled ? [colors.neutral.light, colors.neutral.main] : gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, buttonSize, disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.text, fontSize, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          buttonSize,
          styles.outlineButton,
          { borderColor: disabled ? colors.neutral.main : color },
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text
              style={[
                styles.outlineText,
                fontSize,
                { color: disabled ? colors.neutral.main : color },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Solid variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        buttonSize,
        { backgroundColor: disabled ? colors.neutral.main : color },
        disabled && styles.disabled,
        shadows.md,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.inverse} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, fontSize, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  outlineText: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
