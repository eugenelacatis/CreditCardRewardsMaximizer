import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import LocationService from '../services/locationService';
import NearbyPlacesCard from '../components/NearbyPlacesCard';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    total_rewards: 0,
    total_transactions: 0,
    total_spent: 0,
    optimization_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [locationPermission, setLocationPermission] = useState(null);
  const [nearbyRecommendations, setNearbyRecommendations] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [hasCards, setHasCards] = useState(true);
  const [cardsError, setCardsError] = useState(false);

  // Transaction modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [creatingTransaction, setCreatingTransaction] = useState(false);

  const fetchUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('userFullName');

      if (fullName) {
        setUserName(fullName.split(' ')[0]); // Get first name
      }

      if (userId) {
        // Check if user has cards in wallet
        try {
          const walletResponse = await API.getWalletCards(userId);
          const walletCards = Array.isArray(walletResponse.data) ? walletResponse.data : [];
          setHasCards(walletCards.length > 0);
          setCardsError(false);
        } catch (err) {
          // If 404, user has no cards - this is normal for new users
          if (err.response?.status === 404) {
            setHasCards(false);
            setCardsError(false);
          } else {
            setCardsError(true);
          }
        }

        // Fetch stats
        try {
          const response = await API.getUserStats(userId);
          setStats(response.data);
        } catch (error) {
          console.error('Error fetching stats:', error);
          // Keep default values on error
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermissionAndFetchRecommendations = async () => {
    try {
      setLoadingLocation(true);
      setLocationError(null);

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.log('No user ID found, skipping location request');
        return;
      }

      // Check if permission already granted
      const permissionStatus = await LocationService.getPermissionStatus();

      if (!permissionStatus.granted) {
        // Check if we've asked before
        const hasAsked = await LocationService.hasRequestedPermission();

        if (!hasAsked) {
          // First time - request permission
          const result = await LocationService.requestPermission();
          setLocationPermission(result.status);

          if (!result.granted) {
            setLocationError('Location permission denied. Enable in settings to see nearby recommendations.');
            return;
          }
        } else {
          // Already asked before and denied
          setLocationError('Location permission required. Please enable in settings.');
          return;
        }
      } else {
        setLocationPermission('granted');
      }

      // Get current location
      const location = await LocationService.getCurrentLocation();

      if (!location) {
        setLocationError('Unable to get your location');
        return;
      }

      console.log('Current location:', location);

      // Fetch nearby recommendations
      const response = await API.getLocationBasedRecommendations(
        userId,
        location.latitude,
        location.longitude,
        2000 // 2km radius
      );

      setNearbyRecommendations(response.data.top_recommendations || []);

    } catch (error) {
      console.error('Error with location recommendations:', error);
      setLocationError('Failed to load nearby recommendations');
    } finally {
      setLoadingLocation(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await requestLocationPermissionAndFetchRecommendations();
    setRefreshing(false);
  };

  const handleRecommendationPress = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setTransactionAmount('');
    setModalVisible(true);
  };

  // Map place categories to valid transaction categories
  const mapPlaceCategoryToTransactionCategory = (placeCategory) => {
    const categoryMap = {
      'restaurant': 'dining',
      'cafe': 'dining',
      'bar': 'dining',
      'fast_food': 'dining',
      'food': 'dining',
      'supermarket': 'groceries',
      'grocery': 'groceries',
      'convenience': 'groceries',
      'fuel': 'gas',
      'gas_station': 'gas',
      'cinema': 'entertainment',
      'theatre': 'entertainment',
      'entertainment': 'entertainment',
      'hotel': 'travel',
      'travel': 'travel',
      'airport': 'travel',
      'shop': 'shopping',
      'mall': 'shopping',
      'store': 'shopping',
      'retail': 'shopping',
    };

    const lowerCategory = placeCategory.toLowerCase();
    return categoryMap[lowerCategory] || 'other';
  };

  const handleCreateTransaction = async () => {
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    setCreatingTransaction(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const amount = parseFloat(transactionAmount);
      const recommendation = selectedRecommendation;

      // Calculate rewards based on the expected reward ratio
      const rewardRate = recommendation.expected_reward / 50; // API uses $50 as default
      const totalReward = amount * rewardRate;

      // Map the place category to a valid transaction category
      const transactionCategory = mapPlaceCategoryToTransactionCategory(recommendation.place.category);

      const transactionData = {
        user_id: userId,
        merchant: recommendation.place.name,
        amount: amount,
        category: transactionCategory,
        card_used_id: recommendation.recommended_card.card_id,
        recommended_card_id: recommendation.recommended_card.card_id,
        optimization_goal: 'cash_back',
        location: recommendation.place.address,
        total_value_earned: totalReward,
        optimal_value: totalReward,
        recommendation_explanation: recommendation.recommended_card.explanation,
        confidence_score: 0.95
      };

      await API.createTransaction(transactionData);

      // Close modal and refresh data
      setModalVisible(false);
      setSelectedRecommendation(null);
      setTransactionAmount('');

      // Refresh stats to show updated totals
      await fetchUserData();

      Alert.alert(
        'Transaction Added!',
        `Successfully recorded $${amount.toFixed(2)} at ${recommendation.place.name}.\nRewards earned: $${totalReward.toFixed(2)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    } finally {
      setCreatingTransaction(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // Request location permission and fetch recommendations on mount
    requestLocationPermissionAndFetchRecommendations();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>💳 Agentic Wallet</Text>
          <Text style={styles.subtitle}>AI-Powered Card Optimizer</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome{userName ? ` ${userName}` : ''}! 👋</Text>
          <Text style={styles.cardText}>
            Your intelligent credit card recommendation system is ready.
          </Text>
          {!loading && !hasCards ? (
            <Text style={styles.cardText}>
              Get started by adding your credit cards in the Cards tab!
            </Text>
          ) : (
            <Text style={styles.cardText}>
              Tap the Transaction tab below to get AI-powered recommendations!
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading your stats...</Text>
          </View>
        ) : !hasCards ? (
          <View style={styles.noCardsContainer}>
            <Text style={styles.noCardsEmoji}>🃏</Text>
            <Text style={styles.noCardsTitle}>No Cards Yet</Text>
            <Text style={styles.noCardsText}>
              Add your credit cards to start getting personalized recommendations and maximize your rewards!
            </Text>
            <TouchableOpacity
              style={styles.addCardsButton}
              onPress={() => navigation.navigate('Cards')}
            >
              <Text style={styles.addCardsButtonText}>📚 Add Cards Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>${stats.total_rewards.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Rewards</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_transactions}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
          </View>
        )}

        {!loading && stats.total_transactions > 0 && (
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>📊 Your Performance</Text>
            <Text style={styles.insightText}>
              Total Spent: ${stats.total_spent.toFixed(2)}
            </Text>
            <Text style={styles.insightText}>
              Optimization Rate: {(stats.optimization_rate * 100).toFixed(1)}%
            </Text>
            {stats.missed_value > 0 && (
              <Text style={[styles.insightText, { color: '#FF9800' }]}>
                Potential Savings: ${stats.missed_value.toFixed(2)}
              </Text>
            )}
          </View>
        )}

        {/* Location-based recommendations */}
        {loadingLocation && (
          <View style={styles.locationLoadingCard}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.locationLoadingText}>Finding nearby places...</Text>
          </View>
        )}

        {!loadingLocation && locationError && (
          <View style={styles.locationErrorCard}>
            <Text style={styles.locationErrorText}>📍 {locationError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={requestLocationPermissionAndFetchRecommendations}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loadingLocation && !locationError && nearbyRecommendations.length > 0 && (
          <NearbyPlacesCard
            recommendations={nearbyRecommendations}
            onRefresh={requestLocationPermissionAndFetchRecommendations}
            onRecommendationPress={handleRecommendationPress}
          />
        )}
      </ScrollView>

      {/* Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {selectedRecommendation && (
              <>
                <Text style={styles.modalTitle}>Add Transaction</Text>

                <View style={styles.modalPlaceInfo}>
                  <Text style={styles.modalPlaceName}>
                    {selectedRecommendation.place.name}
                  </Text>
                  <Text style={styles.modalPlaceCategory}>
                    {selectedRecommendation.place.category}
                  </Text>
                </View>

                <View style={styles.modalCardInfo}>
                  <Text style={styles.modalCardLabel}>Using:</Text>
                  <Text style={styles.modalCardName}>
                    {selectedRecommendation.recommended_card.card_name}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Amount Spent</Text>
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalCurrencySymbol}>$</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={transactionAmount}
                      onChangeText={setTransactionAmount}
                      autoFocus={true}
                    />
                  </View>
                </View>

                {transactionAmount && parseFloat(transactionAmount) > 0 && (
                  <View style={styles.modalRewardPreview}>
                    <Text style={styles.modalRewardLabel}>Estimated Rewards:</Text>
                    <Text style={styles.modalRewardAmount}>
                      ${((parseFloat(transactionAmount) * selectedRecommendation.expected_reward) / 50).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setModalVisible(false);
                      setSelectedRecommendation(null);
                      setTransactionAmount('');
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      creatingTransaction && styles.modalButtonDisabled
                    ]}
                    onPress={handleCreateTransaction}
                    disabled={creatingTransaction}
                  >
                    {creatingTransaction ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmButtonText}>Add Transaction</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  noCardsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCardsEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noCardsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noCardsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  addCardsButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCardsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  locationLoadingCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationLoadingText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#666',
  },
  locationErrorCard: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalPlaceInfo: {
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalPlaceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalPlaceCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  modalCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCardLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  modalCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalInputContainer: {
    marginBottom: 15,
  },
  modalInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCurrencySymbol: {
    fontSize: 24,
    color: '#333',
    fontWeight: '600',
    marginRight: 5,
  },
  modalInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 15,
  },
  modalRewardPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalRewardLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  modalRewardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
});