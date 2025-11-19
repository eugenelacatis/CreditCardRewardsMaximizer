import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import LocationService from '../services/locationService';
import NearbyPlacesCard from '../components/NearbyPlacesCard';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Card, GradientCard, Button, GradientButton, Badge, StatCard, EmptyState, LoadingState } from '../components/ui';

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
  const [userCards, setUserCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);

  const fetchUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('userFullName');

      if (fullName) {
        setUserName(fullName.split(' ')[0]);
      }

      if (userId) {
        try {
          const walletResponse = await API.getWalletCards(userId);
          const walletCards = Array.isArray(walletResponse.data) ? walletResponse.data : [];
          setHasCards(walletCards.length > 0);
          setCardsError(false);
        } catch (err) {
          if (err.response?.status === 404) {
            setHasCards(false);
            setCardsError(false);
          } else {
            setCardsError(true);
          }
        }

        try {
          const response = await API.getUserStats(userId);
          setStats(response.data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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

      const permissionStatus = await LocationService.getPermissionStatus();

      if (!permissionStatus.granted) {
        const hasAsked = await LocationService.hasRequestedPermission();

        if (!hasAsked) {
          const result = await LocationService.requestPermission();
          setLocationPermission(result.status);

          if (!result.granted) {
            setLocationError('Location permission denied. Enable in settings to see nearby recommendations.');
            return;
          }
        } else {
          setLocationError('Location permission required. Please enable in settings.');
          return;
        }
      } else {
        setLocationPermission('granted');
      }

      const location = await LocationService.getCurrentLocation();

      if (!location) {
        setLocationError('Unable to get your location');
        return;
      }

      const response = await API.getLocationBasedRecommendations(
        userId,
        location.latitude,
        location.longitude,
        2000
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

  const handleRecommendationPress = async (recommendation) => {
    setSelectedRecommendation(recommendation);
    setTransactionAmount('');
    setSelectedCard(null);
    setModalVisible(true);

    setLoadingCards(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await API.getWalletCards(userId);
        const cards = Array.isArray(response.data) ? response.data : [];
        setUserCards(cards);

        const recommendedCardId = recommendation.recommended_card.card_id;
        const matchingCard = cards.find(c => c.card_id === recommendedCardId);
        if (matchingCard) {
          setSelectedCard(matchingCard);
        } else if (cards.length > 0) {
          setSelectedCard(cards[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching user cards:', error);
    } finally {
      setLoadingCards(false);
    }
  };

  const mapPlaceCategoryToTransactionCategory = (placeCategory) => {
    const categoryMap = {
      'dining': 'dining', 'restaurant': 'dining', 'cafe': 'dining', 'bar': 'dining', 'fast_food': 'dining', 'food': 'dining',
      'groceries': 'groceries', 'supermarket': 'groceries', 'grocery': 'groceries', 'convenience': 'groceries',
      'gas': 'gas', 'fuel': 'gas', 'gas_station': 'gas',
      'entertainment': 'entertainment', 'cinema': 'entertainment', 'theatre': 'entertainment',
      'travel': 'travel', 'hotel': 'travel', 'airport': 'travel',
      'shopping': 'shopping', 'shop': 'shopping', 'mall': 'shopping', 'store': 'shopping', 'retail': 'shopping',
      'other': 'other',
    };
    return categoryMap[placeCategory.toLowerCase()] || 'other';
  };

  const calculateReward = (card, category, amount) => {
    if (!card || !amount) return 0;
    const cashBackRates = card.cash_back_rate || {};
    const pointsMultipliers = card.points_multiplier || {};
    const POINT_VALUE = 0.015;

    let cashBackRate = cashBackRates[category] || cashBackRates[category.toLowerCase()] || cashBackRates['default'] || cashBackRates['other'] || 0;
    const cashBackReward = amount * cashBackRate;

    let pointsMultiplier = pointsMultipliers[category] || pointsMultipliers[category.toLowerCase()] || pointsMultipliers['default'] || pointsMultipliers['other'] || 0;
    const pointsEarned = amount * pointsMultiplier;
    const pointsReward = pointsEarned * POINT_VALUE;

    return Math.max(cashBackReward, pointsReward);
  };

  const handleCreateTransaction = async () => {
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (!selectedCard) {
      Alert.alert('Select Card', 'Please select a card to use for this transaction');
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
      const transactionCategory = mapPlaceCategoryToTransactionCategory(recommendation.place.category);
      const totalReward = calculateReward(selectedCard, transactionCategory, amount);

      const recommendedCard = userCards.find(c => c.card_id === recommendation.recommended_card.card_id);
      const optimalReward = recommendedCard ? calculateReward(recommendedCard, transactionCategory, amount) : totalReward;

      const transactionData = {
        user_id: userId,
        merchant: recommendation.place.name,
        amount: amount,
        category: transactionCategory,
        card_used_id: selectedCard.card_id,
        recommended_card_id: recommendation.recommended_card.card_id,
        optimization_goal: 'cash_back',
        location: recommendation.place.address,
        total_value_earned: totalReward,
        optimal_value: optimalReward,
        recommendation_explanation: recommendation.recommended_card.explanation,
        confidence_score: 0.95
      };

      await API.createTransaction(transactionData);

      setModalVisible(false);
      setSelectedRecommendation(null);
      setTransactionAmount('');
      setSelectedCard(null);
      setUserCards([]);

      await fetchUserData();

      const isOptimal = selectedCard.card_id === recommendation.recommended_card.card_id;
      Alert.alert(
        'Transaction Added!',
        `Successfully recorded $${amount.toFixed(2)} at ${recommendation.place.name}.\nRewards earned: $${totalReward.toFixed(2)}${!isOptimal ? `\n\nTip: Using ${recommendation.recommended_card.card_name} would have earned $${optimalReward.toFixed(2)}` : ''}`,
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
    requestLocationPermissionAndFetchRecommendations();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{userName || 'there'}</Text>
            </View>
          </View>

          {/* Quick Stats in Header */}
          {!loading && hasCards && (
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>${stats.total_rewards.toFixed(2)}</Text>
                <Text style={styles.headerStatLabel}>Total Rewards</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.optimization_rate.toFixed(0)}%</Text>
                <Text style={styles.headerStatLabel}>Optimized</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {loading ? (
            <LoadingState text="Loading your dashboard..." />
          ) : !hasCards ? (
            <View style={styles.noCardsSection}>
              <GradientCard gradientColors={colors.gradients.purple} style={styles.welcomeCard}>
                <Icon name="wallet-giftcard" size={48} color={colors.text.inverse} />
                <Text style={styles.welcomeTitle}>Welcome to Agentic Wallet</Text>
                <Text style={styles.welcomeText}>
                  Add your credit cards to start getting AI-powered recommendations and maximize your rewards!
                </Text>
              </GradientCard>

              <Card elevated style={styles.actionCard}>
                <View style={styles.actionCardContent}>
                  <View style={styles.actionCardIcon}>
                    <Icon name="credit-card-plus" size={32} color={colors.primary.main} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Add Your First Card</Text>
                    <Text style={styles.actionCardDescription}>Browse our card library and add cards to your wallet</Text>
                  </View>
                </View>
                <GradientButton
                  title="Browse Cards"
                  icon="arrow-right"
                  iconPosition="right"
                  onPress={() => navigation.navigate('Cards')}
                  style={styles.actionCardButton}
                />
              </Card>
            </View>
          ) : (
            <>
              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <StatCard
                  label="Transactions"
                  value={stats.total_transactions}
                  icon="receipt"
                  iconColor={colors.primary.main}
                  style={styles.statCardItem}
                />
                <StatCard
                  label="Total Spent"
                  value={`$${stats.total_spent.toFixed(0)}`}
                  icon="cash"
                  iconColor={colors.secondary.main}
                  style={styles.statCardItem}
                />
              </View>
            </>
          )}

          {/* Location-based recommendations */}
          {loadingLocation && (
            <Card style={styles.locationCard}>
              <View style={styles.locationLoadingContent}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.locationLoadingText}>Finding nearby places...</Text>
              </View>
            </Card>
          )}

          {!loadingLocation && locationError && (
            <Card style={[styles.locationCard, styles.locationErrorCard]}>
              <View style={styles.locationErrorContent}>
                <Icon name="map-marker-off" size={24} color={colors.warning.main} />
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </View>
              <Button
                title="Try Again"
                variant="primary"
                size="small"
                onPress={requestLocationPermissionAndFetchRecommendations}
              />
            </Card>
          )}

          {!loadingLocation && !locationError && nearbyRecommendations.length > 0 && (
            <NearbyPlacesCard
              recommendations={nearbyRecommendations}
              onRefresh={requestLocationPermissionAndFetchRecommendations}
              onRecommendationPress={handleRecommendationPress}
            />
          )}

          {!loading && stats.total_transactions > 0 && (
            <Card elevated style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Icon name="lightbulb-outline" size={24} color={colors.warning.main} />
                <Text style={styles.insightTitle}>Performance Insight</Text>
              </View>
              <Text style={styles.insightText}>
                You've spent ${stats.total_spent.toFixed(2)} across {stats.total_transactions} transactions with a {stats.optimization_rate.toFixed(0)}% optimization rate.
              </Text>
              {stats.optimization_rate < 80 && (
                <Text style={styles.insightTip}>
                  Tip: Follow card recommendations to increase your optimization rate!
                </Text>
              )}
            </Card>
          )}
        </View>
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Transaction</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Icon name="close" size={24} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalPlaceInfo}>
                  <Text style={styles.modalPlaceName}>
                    {selectedRecommendation.place.name}
                  </Text>
                  <Badge
                    text={selectedRecommendation.place.category}
                    variant="primary"
                    size="small"
                  />
                </View>

                <View style={styles.modalCardSection}>
                  <Text style={styles.modalSectionLabel}>Select Card Used:</Text>
                  {loadingCards ? (
                    <ActivityIndicator size="small" color={colors.primary.main} style={{ marginVertical: 10 }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScrollView}>
                      {userCards.map((card) => {
                        const isRecommended = card.card_id === selectedRecommendation.recommended_card.card_id;
                        const isSelected = selectedCard && selectedCard.card_id === card.card_id;
                        return (
                          <TouchableOpacity
                            key={card.user_card_id || card.card_id}
                            style={[
                              styles.cardOption,
                              isSelected && styles.cardOptionSelected,
                              isRecommended && styles.cardOptionRecommended
                            ]}
                            onPress={() => setSelectedCard(card)}
                          >
                            <Text style={[
                              styles.cardOptionName,
                              isSelected && styles.cardOptionNameSelected
                            ]} numberOfLines={1}>
                              {card.card_name}
                            </Text>
                            {isRecommended && (
                              <Badge text="Best" variant="success" size="small" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Amount Spent</Text>
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalCurrencySymbol}>$</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.neutral[400]}
                      keyboardType="decimal-pad"
                      value={transactionAmount}
                      onChangeText={setTransactionAmount}
                      autoFocus={true}
                    />
                  </View>
                </View>

                {transactionAmount && parseFloat(transactionAmount) > 0 && selectedCard && (
                  <View style={styles.modalRewardPreview}>
                    <Text style={styles.modalRewardLabel}>Estimated Rewards:</Text>
                    <Text style={styles.modalRewardAmount}>
                      ${calculateReward(
                        selectedCard,
                        mapPlaceCategoryToTransactionCategory(selectedRecommendation.place.category),
                        parseFloat(transactionAmount)
                      ).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setModalVisible(false);
                      setSelectedRecommendation(null);
                      setTransactionAmount('');
                      setSelectedCard(null);
                      setUserCards([]);
                    }}
                    style={styles.modalCancelButton}
                  />

                  <GradientButton
                    title="Add Transaction"
                    onPress={handleCreateTransaction}
                    loading={creatingTransaction}
                    disabled={creatingTransaction}
                    style={styles.modalConfirmButton}
                  />
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
    backgroundColor: colors.background.primary,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    marginTop: spacing.xs,
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginTop: spacing.lg,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.base,
  },
  headerStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  headerStatLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },

  // Content
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },

  // No Cards Section
  noCardsSection: {
    gap: spacing.base,
  },
  welcomeCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  actionCard: {
    padding: spacing.lg,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  actionCardIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  actionCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionCardButton: {
    marginTop: spacing.sm,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCardItem: {
    flex: 1,
  },

  // Location Card
  locationCard: {
    marginBottom: spacing.base,
  },
  locationLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  locationLoadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  locationErrorCard: {
    borderWidth: 1,
    borderColor: colors.warning[200],
    backgroundColor: colors.warning[50],
  },
  locationErrorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationErrorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning[700],
    marginLeft: spacing.sm,
  },

  // Insight Card
  insightCard: {
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  insightText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  insightTip: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    marginTop: spacing.sm,
    fontWeight: typography.fontWeight.medium,
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
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlaceInfo: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  modalPlaceName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  modalCardSection: {
    marginBottom: spacing.base,
  },
  modalSectionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cardScrollView: {
    marginHorizontal: -spacing.xs,
  },
  cardOption: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border.light,
    minWidth: 120,
    alignItems: 'center',
  },
  cardOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary[50],
  },
  cardOptionRecommended: {
    borderColor: colors.success.main,
  },
  cardOptionName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardOptionNameSelected: {
    color: colors.primary.main,
  },
  modalInputContainer: {
    marginBottom: spacing.base,
  },
  modalInputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  modalCurrencySymbol: {
    fontSize: typography.fontSize['2xl'],
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.xs,
  },
  modalInput: {
    flex: 1,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    paddingVertical: spacing.base,
  },
  modalRewardPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  modalRewardLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.success[700],
  },
  modalRewardAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success[700],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
});
