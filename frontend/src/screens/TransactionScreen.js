// src/screens/TransactionScreen.js - Modern UI with theme system
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Card, GradientButton, Button, Badge } from '../components/ui';

const CATEGORIES = [
  { id: 'dining', label: 'Dining', icon: 'silverware-fork-knife', color: colors.error.main },
  { id: 'travel', label: 'Travel', icon: 'airplane', color: colors.primary.main },
  { id: 'groceries', label: 'Groceries', icon: 'cart', color: colors.success.main },
  { id: 'gas', label: 'Gas', icon: 'gas-station', color: colors.warning.main },
  { id: 'entertainment', label: 'Entertainment', icon: 'movie', color: '#E91E63' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping', color: colors.secondary.main },
  { id: 'other', label: 'Other', icon: 'package-variant', color: colors.neutral[500] },
];

const GOALS = [
  { id: 'cash_back', label: 'Cash Back', icon: 'cash-multiple' },
  { id: 'travel_points', label: 'Travel Points', icon: 'airplane' },
  { id: 'balanced', label: 'Balanced', icon: 'scale-balance' },
];

export default function TransactionScreen() {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('dining');
  const [selectedGoal, setSelectedGoal] = useState('cash_back');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  const handleGetRecommendation = async () => {
    if (!merchant.trim()) {
      Alert.alert('Error', 'Please enter a merchant name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        user_id: userId || 'user123',
        merchant: merchant.trim(),
        amount: parseFloat(amount),
        category: selectedCategory,
        optimization_goal: selectedGoal,
      };

      const response = await API.getRecommendation(transactionData);
      setRecommendation(response.data);
      setShowResult(true);

    } catch (error) {
      console.error('API Error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Make sure backend is running.\n\nError: ' + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const CategoryButton = ({ category }) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isSelected && styles.categoryButtonSelected,
          isSelected && { borderColor: category.color }
        ]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <Icon
          name={category.icon}
          size={24}
          color={isSelected ? category.color : colors.neutral[400]}
        />
        <Text style={[
          styles.categoryText,
          isSelected && { color: category.color, fontWeight: typography.fontWeight.bold }
        ]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const GoalButton = ({ goal }) => {
    const isSelected = selectedGoal === goal.id;
    return (
      <TouchableOpacity
        style={[styles.goalButton, isSelected && styles.goalButtonSelected]}
        onPress={() => setSelectedGoal(goal.id)}
      >
        <Icon
          name={goal.icon}
          size={20}
          color={isSelected ? colors.primary.main : colors.neutral[400]}
        />
        <Text style={[styles.goalText, isSelected && styles.goalTextSelected]}>
          {goal.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ResultModal = () => {
    if (!recommendation) return null;

    const card = recommendation.recommended_card;

    return (
      <Modal visible={showResult} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Icon name="star" size={24} color={colors.warning.main} />
                  <Text style={styles.modalTitle}>AI Recommendation</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowResult(false)}
                >
                  <Icon name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Recommended Card */}
              <View style={styles.recommendedCard}>
                <Badge text="BEST CHOICE" variant="primary" size="small" />
                <Text style={styles.cardName}>{card.card_name}</Text>

                <View style={styles.valueBox}>
                  <Text style={styles.valueLabel}>Estimated Value</Text>
                  <Text style={styles.valueAmount}>
                    {card.estimated_value}
                  </Text>
                </View>

                <View style={styles.explanationBox}>
                  <Icon name="information-outline" size={18} color={colors.primary.main} />
                  <Text style={styles.explanationText}>{card.reason}</Text>
                </View>
              </View>

              {/* Alternative Cards */}
              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <View style={styles.alternativesSection}>
                  <Text style={styles.alternativesTitle}>Other Options</Text>
                  {recommendation.alternatives.slice(0, 2).map((altCard, idx) => (
                    <Card key={idx} style={styles.alternativeCard}>
                      <View style={styles.alternativeCardContent}>
                        <View>
                          <Text style={styles.alternativeCardName}>{altCard.card_name}</Text>
                          <Text style={styles.alternativeCardValue}>
                            {altCard.estimated_value}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* Action Button */}
              <GradientButton
                title="Got It!"
                icon="check"
                onPress={() => {
                  setShowResult(false);
                  setMerchant('');
                  setAmount('');
                }}
                style={styles.doneButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.title}>New Transaction</Text>
            <Text style={styles.subtitle}>Get AI-powered card recommendation</Text>
          </LinearGradient>

          {/* Form */}
          <View style={styles.form}>
            <Card elevated style={styles.formCard}>
              {/* Merchant Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Where are you shopping?</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="store" size={20} color={colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Starbucks, Amazon, Whole Foods"
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholderTextColor={colors.neutral[400]}
                  />
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>How much?</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.neutral[400]}
                  />
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What category?</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((category) => (
                    <CategoryButton key={category.id} category={category} />
                  ))}
                </View>
              </View>

              {/* Goal Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your goal?</Text>
                <View style={styles.goalsGrid}>
                  {GOALS.map((goal) => (
                    <GoalButton key={goal.id} goal={goal} />
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <GradientButton
                title="Get Smart Recommendation"
                icon="lightbulb-outline"
                onPress={handleGetRecommendation}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              />
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ResultModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },

  // Form
  form: {
    padding: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  currencySymbol: {
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },

  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    width: '31%',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary[50],
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Goals
  goalsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  goalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  goalButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary[50],
  },
  goalText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  goalTextSelected: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.bold,
  },

  submitButton: {
    marginTop: spacing.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.modal,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Recommended Card
  recommendedCard: {
    backgroundColor: colors.primary[50],
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  cardName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  valueBox: {
    backgroundColor: colors.background.secondary,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  valueLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  valueAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.success.main,
    marginTop: spacing.xs,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  explanationText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginLeft: spacing.sm,
  },

  // Alternatives
  alternativesSection: {
    marginTop: spacing.lg,
  },
  alternativesTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  alternativeCard: {
    marginBottom: spacing.sm,
  },
  alternativeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alternativeCardName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  alternativeCardValue: {
    fontSize: typography.fontSize.sm,
    color: colors.success.main,
    marginTop: spacing.xs,
  },

  doneButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
