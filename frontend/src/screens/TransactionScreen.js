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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { API } from '../services/api';
import MerchantAutocomplete from '../components/MerchantAutocomplete';

const CATEGORIES = [
  { id: 'dining', label: 'Dining', emoji: '🍽️' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'gas', label: 'Gas', emoji: '⛽' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

export default function TransactionScreen() {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('dining');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [userId, setUserId] = useState(null);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    // Load user ID from AsyncStorage
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  // Clear merchant and amount inputs when navigating away from the screen
  useEffect(() => {
    if (!isFocused) {
      setMerchant('');
      setAmount('');
    }
  }, [isFocused]);

  const handleGetRecommendation = async () => {
    // Validation
    if (!merchant.trim()) {
      Alert.alert('Error', 'Please enter a merchant name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'Please log in to get recommendations');
      return;
    }

    setLoading(true);

    try {
      console.log('Sending request to API...');

      const transactionData = {
        user_id: userId,
        merchant: merchant.trim(),
        amount: parseFloat(amount),
        category: selectedCategory,
      };

      const response = await API.getRecommendation(transactionData);
      console.log('API Response:', response.data);

      setRecommendation(response.data);
      setSelectedCard(response.data.recommended_card);
      setShowResult(true);

    } catch (error) {
      console.error('API Error:', error);

      // Check for specific error messages
      const errorMessage = error.message || '';

      if (errorMessage.includes('No active credit cards')) {
        Alert.alert(
          'No Cards Found',
          'You need to add credit cards to your wallet before getting recommendations. Go to the Cards tab to add your cards.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('User not found')) {
        Alert.alert(
          'Account Error',
          'Your account was not found. Please try logging in again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Connection Error',
          'Could not connect to server. Make sure backend is running.\n\nError: ' + errorMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTransactions = async () => {
    if (!recommendation || !userId || !selectedCard) return;

    // Prevent multiple calls
    if (savingTransaction) return;

    setSavingTransaction(true);

    const card = selectedCard;
    const optimalCard = recommendation.recommended_card;

    // Parse the estimated values
    const estimatedValue = card.estimated_value || '$0.00';
    const valueAmount = parseFloat(estimatedValue.replace('$', '')) || 0;

    const optimalValue = optimalCard.estimated_value || '$0.00';
    const optimalAmount = parseFloat(optimalValue.replace('$', '')) || 0;

    const transactionData = {
      user_id: userId,
      merchant: merchant.trim(),
      amount: parseFloat(amount),
      category: selectedCategory,
      card_used_id: card.card_id,
      recommended_card_id: optimalCard.card_id,
      total_value_earned: valueAmount,
      optimal_value: optimalAmount,
      recommendation_explanation: card.reason || '',
    };

    // Close modal FIRST before API call to prevent UI blocking
    setShowResult(false);
    
    // Clear loading state immediately so UI is responsive
    setSavingTransaction(false);

    // Clear form immediately (optimistic update)
    setMerchant('');
    setAmount('');
    setRecommendation(null);
    setSelectedCard(null);

    // Make API call in background (non-blocking)
    API.createTransaction(transactionData)
      .then(() => {
        console.log('Transaction saved successfully');
      })
      .catch((error) => {
        console.error('Transaction save error:', error);
        // Show error but don't block UI
        setTimeout(() => {
          Alert.alert(
            'Error',
            'Transaction may not have been saved. Please check your history.\n\nError: ' + (error.message || 'Unknown error')
          );
        }, 500);
      });
  };

  const CategoryButton = ({ category }) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ResultModal = () => {
    if (!recommendation || !selectedCard) return null;

    const optimalCard = recommendation.recommended_card;
    const isOptimalSelected = selectedCard.card_id === optimalCard.card_id;

    // Calculate difference from optimal
    const selectedValue = parseFloat(selectedCard.estimated_value?.replace('$', '') || '0');
    const optimalValue = parseFloat(optimalCard.estimated_value?.replace('$', '') || '0');
    const difference = optimalValue - selectedValue;

    return (
      <Modal visible={showResult} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✨ AI Recommendation</Text>
                <TouchableOpacity onPress={() => setShowResult(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Card */}
              <View style={[styles.recommendedCard, !isOptimalSelected && styles.selectedCardNotOptimal]}>
                <Text style={styles.useThisLabel}>
                  {isOptimalSelected ? 'BEST CARD' : 'SELECTED CARD'}
                </Text>
                <Text style={styles.cardName}>{selectedCard.card_name}</Text>

                <View style={styles.valueBox}>
                  <Text style={styles.valueLabel}>You'll Earn</Text>
                  <Text style={styles.valueAmount}>
                    {selectedCard.estimated_value}
                  </Text>
                </View>

                {!isOptimalSelected && difference > 0 && (
                  <View style={styles.missedValueBox}>
                    <Text style={styles.missedValueText}>
                      You'll miss ${difference.toFixed(2)} by not using {optimalCard.card_name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Other Cards */}
              {(recommendation.alternatives && recommendation.alternatives.length > 0) || !isOptimalSelected ? (
                <View style={styles.alternativesSection}>
                  <Text style={styles.alternativesTitle}>
                    {isOptimalSelected ? 'Other Options' : 'All Cards'}
                  </Text>

                  {/* Show optimal card if not selected */}
                  {!isOptimalSelected && (
                    <TouchableOpacity
                      style={[styles.alternativeCard, styles.optimalCardOption]}
                      onPress={() => setSelectedCard(optimalCard)}
                    >
                      <View style={styles.alternativeCardContent}>
                        <View>
                          <Text style={styles.alternativeCardName}>{optimalCard.card_name}</Text>
                          <Text style={styles.optimalLabel}>RECOMMENDED</Text>
                        </View>
                        <Text style={styles.alternativeCardValueGreen}>
                          {optimalCard.estimated_value}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Show alternatives */}
                  {recommendation.alternatives.slice(0, 3).map((altCard, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.alternativeCard,
                        selectedCard.card_id === altCard.card_id && styles.alternativeCardSelected
                      ]}
                      onPress={() => setSelectedCard(altCard)}
                    >
                      <View style={styles.alternativeCardContent}>
                        <Text style={styles.alternativeCardName}>{altCard.card_name}</Text>
                        <Text style={styles.alternativeCardValue}>
                          {altCard.estimated_value}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.addTransactionButton, savingTransaction && styles.submitButtonDisabled]}
                onPress={handleAddToTransactions}
                disabled={savingTransaction}
              >
                {savingTransaction ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.addTransactionButtonText}>  Saving...</Text>
                  </>
                ) : (
                  <Text style={styles.addTransactionButtonText}>Add to Transactions</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowResult(false);
                  setMerchant('');
                  setAmount('');
                }}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Transaction</Text>
          <Text style={styles.subtitle}>Get AI-powered recommendations</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Merchant Input with Autocomplete */}
          <Text style={styles.label}>Where are you shopping?</Text>
          <MerchantAutocomplete
            value={merchant}
            onMerchantSelect={(merchantName) => setMerchant(merchantName)}
            onCategorySelect={(categoryId) => setSelectedCategory(categoryId)}
          />
          <Text style={styles.hint}>
            Start typing to search merchants
          </Text>

          {/* Amount Input */}
          <Text style={styles.label}>How much?</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />

          {/* Category Selection */}
          <Text style={styles.label}>What category?</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <CategoryButton key={category.id} category={category} />
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleGetRecommendation}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>  Getting AI Recommendation...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>⚡ Get Smart Recommendation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ResultModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  categoryButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  categoryTextSelected: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
  },
  recommendedCard: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  useThisLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  valueBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  rewardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  rewardDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  rewardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  explanationBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  benefitsBox: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    marginVertical: 2,
  },
  alternativesSection: {
    marginTop: 20,
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  alternativeCard: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  alternativeCardSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  alternativeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alternativeCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alternativeCardValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  alternativeCardValueGreen: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  optimalCardOption: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  optimalLabel: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
  },
  selectedCardNotOptimal: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  missedValueBox: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  missedValueText: {
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addTransactionButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addTransactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalButton: {
    backgroundColor: '#E0E0E0',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});