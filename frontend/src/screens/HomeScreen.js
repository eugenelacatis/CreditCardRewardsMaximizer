import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
          />
        )}
      </ScrollView>
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
});