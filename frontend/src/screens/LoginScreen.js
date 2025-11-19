import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Input, Button, GradientButton, Chip } from '../components/ui';

export default function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimizationGoal, setOptimizationGoal] = useState('balanced');
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginPress = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await API.signin({
        email: email.trim(),
        password: password
      });

      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

      console.log('Login successful, user ID:', response.data.user_id);
      onLogin(response.data.user_id);

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupPress = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await API.signup({
        email: email.trim(),
        password: password,
        full_name: fullName.trim(),
        optimization_goal: optimizationGoal
      });

      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

      console.log('Signup successful, user ID:', response.data.user_id);

      Alert.alert(
        'Welcome!',
        'Your account has been created successfully.',
        [
          {
            text: 'Get Started',
            onPress: () => onLogin(response.data.user_id)
          }
        ]
      );

    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Signup Failed',
        error.message || 'Could not create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignupMode(!isSignupMode);
    setFullName('');
    setOptimizationGoal('balanced');
  };

  const optimizationGoals = [
    { value: 'cash_back', label: 'Cash Back', icon: 'cash-multiple' },
    { value: 'travel_points', label: 'Travel', icon: 'airplane' },
    { value: 'specific_discounts', label: 'Discounts', icon: 'sale' },
    { value: 'balanced', label: 'Balanced', icon: 'scale-balance' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
              <Icon name="arrow-left" size={24} color={colors.primary.main} />
            </TouchableOpacity>
          )}

          {/* Logo & Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="wallet" size={40} color={colors.text.inverse} />
            </LinearGradient>
            <Text style={styles.title}>Agentic Wallet</Text>
            <Text style={styles.subtitle}>
              {isSignupMode ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {isSignupMode && (
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                icon="account-outline"
                autoCapitalize="words"
                editable={!loading}
              />
            )}

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              icon="lock-outline"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              editable={!loading}
            />

            {isSignupMode && (
              <View style={styles.goalSection}>
                <Text style={styles.goalLabel}>Optimization Goal</Text>
                <View style={styles.goalOptions}>
                  {optimizationGoals.map((goal) => (
                    <TouchableOpacity
                      key={goal.value}
                      style={[
                        styles.goalOption,
                        optimizationGoal === goal.value && styles.goalOptionSelected
                      ]}
                      onPress={() => setOptimizationGoal(goal.value)}
                      disabled={loading}
                    >
                      <Icon
                        name={goal.icon}
                        size={20}
                        color={optimizationGoal === goal.value ? colors.primary.main : colors.neutral[400]}
                      />
                      <Text style={[
                        styles.goalOptionText,
                        optimizationGoal === goal.value && styles.goalOptionTextSelected
                      ]}>
                        {goal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <GradientButton
              title={isSignupMode ? 'Create Account' : 'Sign In'}
              onPress={isSignupMode ? handleSignupPress : handleLoginPress}
              loading={loading}
              disabled={loading}
              icon={isSignupMode ? 'account-plus' : 'login'}
              iconPosition="left"
              style={styles.submitButton}
            />

            {!isSignupMode && (
              <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignupMode ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={loading}>
              <Text style={styles.switchModeText}>
                {isSignupMode ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Login Divider - For future use */}
          {!isSignupMode && (
            <View style={styles.socialSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} disabled>
                  <Icon name="google" size={24} color={colors.neutral[400]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} disabled>
                  <Icon name="apple" size={24} color={colors.neutral[400]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    ...shadows.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },

  // Goal Section
  goalSection: {
    marginBottom: spacing.base,
  },
  goalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  goalOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary[50],
  },
  goalOptionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  goalOptionTextSelected: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.bold,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  switchModeText: {
    fontSize: typography.fontSize.base,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.xs,
  },

  // Social Login
  socialSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.base,
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
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
});
