// Reusable UI Components for Agentic Wallet
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, borderRadius, shadows, getGradient } from '../../theme';

// Gradient Header Component
export const GradientHeader = ({
  title,
  subtitle,
  rightComponent,
  gradientColors = getGradient('primary'),
  style,
}) => (
  <LinearGradient colors={gradientColors} style={[styles.gradientHeader, style]}>
    <View style={styles.headerContent}>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </View>
  </LinearGradient>
);

// Card Component
export const Card = ({
  children,
  style,
  elevated = false,
  onPress,
  disabled = false,
}) => {
  const cardStyle = [
    styles.card,
    elevated && styles.cardElevated,
    disabled && styles.cardDisabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// Gradient Card Component
export const GradientCard = ({
  children,
  gradientColors = getGradient('primary'),
  style,
  onPress,
}) => {
  const content = (
    <LinearGradient
      colors={gradientColors}
      style={[styles.gradientCard, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Button Component
export const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'text', 'danger'
  size = 'medium', // 'small', 'medium', 'large'
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.buttonFullWidth,
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
    disabled && styles.buttonTextDisabled,
    textStyle,
  ];

  const iconColor = variant === 'primary' || variant === 'danger'
    ? colors.text.inverse
    : variant === 'outline' || variant === 'text'
    ? colors.primary.main
    : colors.text.primary;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={size === 'small' ? 16 : 20} color={iconColor} style={styles.buttonIconLeft} />
          )}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={size === 'small' ? 16 : 20} color={iconColor} style={styles.buttonIconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Gradient Button Component
export const GradientButton = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  gradientColors = getGradient('primary'),
  style,
  textStyle,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    style={[disabled && styles.buttonDisabled]}
  >
    <LinearGradient
      colors={gradientColors}
      style={[styles.gradientButton, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.inverse} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={20} color={colors.text.inverse} style={styles.buttonIconLeft} />
          )}
          <Text style={[styles.gradientButtonText, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={20} color={colors.text.inverse} style={styles.buttonIconRight} />
          )}
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

// Input Component
export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
  inputStyle,
}) => (
  <View style={[styles.inputContainer, style]}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[
      styles.inputWrapper,
      error && styles.inputError,
      !editable && styles.inputDisabled,
    ]}>
      {icon && (
        <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.inputIcon} />
      )}
      <TextInput
        style={[
          styles.input,
          icon && styles.inputWithIcon,
          rightIcon && styles.inputWithRightIcon,
          multiline && styles.inputMultiline,
          inputStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.inputRightIcon}>
          <Icon name={rightIcon} size={20} color={colors.neutral[400]} />
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.inputErrorText}>{error}</Text>}
  </View>
);

// Badge Component
export const Badge = ({
  text,
  variant = 'primary', // 'primary', 'success', 'warning', 'error', 'neutral'
  size = 'medium', // 'small', 'medium', 'large'
  icon,
  style,
}) => (
  <View style={[
    styles.badge,
    styles[`badge_${variant}`],
    styles[`badge_${size}`],
    style,
  ]}>
    {icon && (
      <Icon
        name={icon}
        size={size === 'small' ? 10 : 12}
        color={styles[`badgeText_${variant}`]?.color || colors.text.primary}
        style={styles.badgeIcon}
      />
    )}
    <Text style={[styles.badgeText, styles[`badgeText_${variant}`], styles[`badgeText_${size}`]]}>
      {text}
    </Text>
  </View>
);

// Stat Card Component
export const StatCard = ({
  label,
  value,
  icon,
  iconColor = colors.primary.main,
  trend,
  trendValue,
  style,
}) => (
  <Card style={[styles.statCard, style]}>
    {icon && (
      <View style={[styles.statIconContainer, { backgroundColor: iconColor + '15' }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
    )}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {trend && (
      <View style={[
        styles.trendBadge,
        trend === 'up' ? styles.trendUp : styles.trendDown,
      ]}>
        <Icon
          name={trend === 'up' ? 'trending-up' : 'trending-down'}
          size={12}
          color={trend === 'up' ? colors.success.main : colors.error.main}
        />
        <Text style={[
          styles.trendText,
          trend === 'up' ? styles.trendTextUp : styles.trendTextDown,
        ]}>
          {trendValue}
        </Text>
      </View>
    )}
  </Card>
);

// Empty State Component
export const EmptyState = ({
  icon = 'inbox-outline',
  title,
  description,
  actionText,
  onAction,
  style,
}) => (
  <View style={[styles.emptyState, style]}>
    <View style={styles.emptyStateIconContainer}>
      <Icon name={icon} size={64} color={colors.neutral[300]} />
    </View>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    {description && (
      <Text style={styles.emptyStateDescription}>{description}</Text>
    )}
    {actionText && onAction && (
      <Button
        title={actionText}
        onPress={onAction}
        variant="primary"
        style={styles.emptyStateButton}
      />
    )}
  </View>
);

// Loading State Component
export const LoadingState = ({
  text = 'Loading...',
  color = colors.primary.main,
  style,
}) => (
  <View style={[styles.loadingState, style]}>
    <ActivityIndicator size="large" color={color} />
    <Text style={styles.loadingText}>{text}</Text>
  </View>
);

// Divider Component
export const Divider = ({ style, text }) => (
  <View style={[styles.dividerContainer, style]}>
    <View style={styles.dividerLine} />
    {text && <Text style={styles.dividerText}>{text}</Text>}
    {text && <View style={styles.dividerLine} />}
  </View>
);

// Chip/Tag Component
export const Chip = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
}) => (
  <TouchableOpacity
    style={[
      styles.chip,
      selected && styles.chipSelected,
      style,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && (
      <Icon
        name={icon}
        size={16}
        color={selected ? colors.primary.main : colors.neutral[500]}
        style={styles.chipIcon}
      />
    )}
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Avatar Component
export const Avatar = ({
  name,
  size = 48,
  backgroundColor = colors.primary.main,
  textColor = colors.text.inverse,
  style,
}) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0];
  };

  return (
    <View style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
      },
      style,
    ]}>
      <Text style={[
        styles.avatarText,
        {
          fontSize: size * 0.4,
          color: textColor,
        },
      ]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Gradient Header
  gradientHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },

  // Card
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.md,
  },
  cardElevated: {
    ...shadows.lg,
  },
  cardDisabled: {
    opacity: 0.6,
  },

  // Gradient Card
  gradientCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.lg,
  },

  // Button
  button: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconLeft: {
    marginRight: spacing.sm,
  },
  buttonIconRight: {
    marginLeft: spacing.sm,
  },
  button_primary: {
    backgroundColor: colors.primary.main,
    ...shadows.colored(colors.primary.main),
  },
  button_secondary: {
    backgroundColor: colors.neutral[100],
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  button_danger: {
    backgroundColor: colors.error.main,
  },
  button_small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  button_medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  button_large: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: typography.fontWeight.semibold,
  },
  buttonText_primary: {
    color: colors.text.inverse,
  },
  buttonText_secondary: {
    color: colors.text.primary,
  },
  buttonText_outline: {
    color: colors.primary.main,
  },
  buttonText_text: {
    color: colors.primary.main,
  },
  buttonText_danger: {
    color: colors.text.inverse,
  },
  buttonText_small: {
    fontSize: typography.fontSize.sm,
  },
  buttonText_medium: {
    fontSize: typography.fontSize.base,
  },
  buttonText_large: {
    fontSize: typography.fontSize.md,
  },
  buttonTextDisabled: {
    color: colors.neutral[400],
  },

  // Gradient Button
  gradientButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  gradientButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },

  // Input
  inputContainer: {
    marginBottom: spacing.base,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  inputRightIcon: {
    padding: spacing.xs,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  inputDisabled: {
    backgroundColor: colors.neutral[100],
    opacity: 0.7,
  },
  inputErrorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error.main,
    marginTop: spacing.xs,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: spacing.xs,
  },
  badgeText: {
    fontWeight: typography.fontWeight.semibold,
  },
  badge_primary: {
    backgroundColor: colors.primary[100],
  },
  badge_success: {
    backgroundColor: colors.success[100],
  },
  badge_warning: {
    backgroundColor: colors.warning[100],
  },
  badge_error: {
    backgroundColor: colors.error[100],
  },
  badge_neutral: {
    backgroundColor: colors.neutral[100],
  },
  badgeText_primary: {
    color: colors.primary[700],
  },
  badgeText_success: {
    color: colors.success[700],
  },
  badgeText_warning: {
    color: colors.warning[700],
  },
  badgeText_error: {
    color: colors.error[700],
  },
  badgeText_neutral: {
    color: colors.neutral[600],
  },
  badge_small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badge_medium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badge_large: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText_small: {
    fontSize: typography.fontSize.xs,
  },
  badgeText_medium: {
    fontSize: typography.fontSize.sm,
  },
  badgeText_large: {
    fontSize: typography.fontSize.base,
  },

  // Stat Card
  statCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trendUp: {
    backgroundColor: colors.success[50],
  },
  trendDown: {
    backgroundColor: colors.error[50],
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: 2,
  },
  trendTextUp: {
    color: colors.success.main,
  },
  trendTextDown: {
    color: colors.error.main,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyStateIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    marginTop: spacing.sm,
  },

  // Loading State
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary.main,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  chipTextSelected: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.semibold,
  },

  // Avatar
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: typography.fontWeight.bold,
  },
});

export default {
  GradientHeader,
  Card,
  GradientCard,
  Button,
  GradientButton,
  Input,
  Badge,
  StatCard,
  EmptyState,
  LoadingState,
  Divider,
  Chip,
  Avatar,
};
