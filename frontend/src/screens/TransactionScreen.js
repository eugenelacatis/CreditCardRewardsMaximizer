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

    setLoading(true);

    try {
      console.log('Sending request to API...');

      const transactionData = {
        user_id: 'user123',
        merchant: merchant.trim(),
        amount: parseFloat(amount),
        category: selectedCategory,
      };

      const response = await API.getRecommendation(transactionData);
      console.log('API Response:', response.data);

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
    if (!recommendation) return null;

    const card = recommendation.recommended_card;

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

              {/* Recommended Card */}
              <View style={styles.recommendedCard}>
                <Text style={styles.useThisLabel}>USE THIS CARD</Text>
                <Text style={styles.cardName}>{card.card_name}</Text>

                <View style={styles.valueBox}>
                  <Text style={styles.valueLabel}>Estimated Value</Text>
                  <Text style={styles.valueAmount}>
                    {card.estimated_value}
                  </Text>
                </View>

                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>{card.reason}</Text>
                </View>
              </View>

              {/* Alternative Cards */}
              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <View style={styles.alternativesSection}>
                  <Text style={styles.alternativesTitle}>Other Options</Text>
                  {recommendation.alternatives.slice(0, 2).map((altCard, idx) => (
                    <View key={idx} style={styles.alternativeCard}>
                      <View>
                        <Text style={styles.alternativeCardName}>{altCard.card_name}</Text>
                        <Text style={styles.alternativeCardValue}>
                          {altCard.estimated_value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowResult(false);
                  setMerchant('');
                  setAmount('');
                }}
              >
                <Text style={styles.doneButtonText}>Got It!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            apiUrl="http://localhost:8000" // Change for production
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
  alternativeCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alternativeCardValue: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
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
});