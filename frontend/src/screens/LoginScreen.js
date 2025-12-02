import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../theme';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimizationGoal, setOptimizationGoal] = useState('balanced');
  const [showPassword, setShowPassword] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLoginPress = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await API.signin({
        email: email.trim(),
        password: password,
      });

      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

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
        optimization_goal: optimizationGoal,
      });

      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => onLogin(response.data.user_id),
        },
      ]);
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
    {
      value: 'cash_back',
      label: 'Cash Back',
      icon: 'cash-multiple',
      gradient: colors.success.gradient,
    },
    {
      value: 'travel_points',
      label: 'Travel',
      icon: 'airplane',
      gradient: colors.primary.gradient,
    },
    {
      value: 'specific_discounts',
      label: 'Discounts',
      icon: 'sale',
      gradient: colors.warning.gradient,
    },
    {
      value: 'balanced',
      label: 'Balanced',
      icon: 'scale-balance',
      gradient: colors.secondary.gradient,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.primary.gradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
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
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                disabled={loading}
              >
                <Icon name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
            )}

            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <Icon name="wallet-giftcard" size={60} color="#fff" />
              </View>
              <Text style={styles.title}>Agentic Wallet</Text>
              <Text style={styles.subtitle}>
                {isSignupMode
                  ? 'Create your account'
                  : 'Welcome back'}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <BlurView intensity={20} tint="light" style={styles.blurContainer}>
                <View style={styles.formContent}>
                  {isSignupMode && (
                    <View style={styles.inputContainer}>
                      <Icon
                        name="account"
                        size={20}
                        color={colors.neutral.dark}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor={colors.neutral.main}
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Icon
                      name="email"
                      size={20}
                      color={colors.neutral.dark}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={colors.neutral.main}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Icon
                      name="lock"
                      size={20}
                      color={colors.neutral.dark}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Password"
                      placeholderTextColor={colors.neutral.main}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Icon
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.neutral.main}
                      />
                    </TouchableOpacity>
                  </View>

                  {isSignupMode && (
                    <View style={styles.goalSection}>
                      <Text style={styles.goalLabel}>
                        Choose your rewards goal
                      </Text>
                      <View style={styles.goalOptions}>
                        {optimizationGoals.map((goal) => {
                          const isSelected = optimizationGoal === goal.value;
                          return (
                            <TouchableOpacity
                              key={goal.value}
                              style={[
                                styles.goalOption,
                                isSelected && styles.goalOptionSelected,
                              ]}
                              onPress={() => setOptimizationGoal(goal.value)}
                              disabled={loading}
                            >
                              {isSelected ? (
                                <LinearGradient
                                  colors={goal.gradient}
                                  style={styles.goalGradient}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                >
                                  <Icon
                                    name={goal.icon}
                                    size={18}
                                    color="#fff"
                                  />
                                  <Text style={styles.goalOptionTextSelected}>
                                    {goal.label}
                                  </Text>
                                </LinearGradient>
                              ) : (
                                <>
                                  <Icon
                                    name={goal.icon}
                                    size={18}
                                    color={colors.neutral.dark}
                                  />
                                  <Text style={styles.goalOptionText}>
                                    {goal.label}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={isSignupMode ? handleSignupPress : handleLoginPress}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={
                        loading
                          ? [colors.neutral.light, colors.neutral.main]
                          : isSignupMode
                          ? colors.success.gradient
                          : colors.primary.gradient
                      }
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>
                          {isSignupMode ? 'Create Account' : 'Sign In'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      {isSignupMode
                        ? 'Already have an account?'
                        : "Don't have an account?"}
                    </Text>
                    <TouchableOpacity onPress={toggleMode} disabled={loading}>
                      <Text style={styles.toggleText}>
                        {isSignupMode ? 'Sign In' : 'Sign Up'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...shadows.lg,
  },
  blurContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  formContent: {
    padding: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.sm,
  },
  goalSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  goalOption: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '48%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  goalOptionSelected: {
    ...shadows.md,
  },
  goalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  goalOptionText: {
    fontSize: 13,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  goalOptionTextSelected: {
    fontSize: 13,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  button: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.md,
    marginTop: spacing.lg,
  },
  buttonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  toggleText: {
    fontSize: 15,
    color: colors.primary.main,
    fontWeight: '600',
  },
});
