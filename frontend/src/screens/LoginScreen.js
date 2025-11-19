import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';

// The 'onLogin' and 'onBack' props are passed down from App.js
export default function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimizationGoal, setOptimizationGoal] = useState('balanced');

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

      // Store user data
      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

      console.log('✅ Login successful, user ID:', response.data.user_id);

      // Call onLogin with user data
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

      // Store user data
      await AsyncStorage.setItem('userId', response.data.user_id);
      await AsyncStorage.setItem('userEmail', response.data.email);
      await AsyncStorage.setItem('userFullName', response.data.full_name);

      console.log('✅ Signup successful, user ID:', response.data.user_id);

      Alert.alert(
        'Success',
        'Account created successfully!',
        [
          {
            text: 'OK',
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
    { value: 'cash_back', label: 'Cash Back', icon: 'cash-multiple', description: 'Maximize cash back rewards' },
    { value: 'travel_points', label: 'Travel Points', icon: 'airplane', description: 'Maximize travel points & miles' },
    { value: 'specific_discounts', label: 'Specific Discounts', icon: 'sale', description: 'Focus on category discounts' },
    { value: 'balanced', label: 'Balanced', icon: 'scale-balance', description: 'Best overall value' },
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
              <Icon name="arrow-left" size={24} color="#4A90E2" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.header}>
            <Icon name="wallet" size={60} color="#4A90E2" />
            <Text style={styles.title}>Agentic Wallet</Text>
            <Text style={styles.subtitle}>
              {isSignupMode ? 'Create your account' : 'Sign in to continue'}
            </Text>
          </View>

        <View style={styles.form}>
          {isSignupMode && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#888"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
                      size={16}
                      color={optimizationGoal === goal.value ? '#4A90E2' : '#666'}
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled, isSignupMode && styles.buttonSignup]}
            onPress={isSignupMode ? handleSignupPress : handleLoginPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignupMode ? 'Sign Up' : 'Login'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignupMode ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={loading}>
              <Text style={styles.signupText}>
                {isSignupMode ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Re-using and adapting styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonSignup: {
    marginTop: 5,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  signupText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  goalSection: {
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'space-between',
  },
  goalOption: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  goalOptionSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  goalOptionText: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  goalOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '700',
  },
});
