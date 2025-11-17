import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

export default function HomeScreen() {
  const [stats, setStats] = useState({
    total_rewards: 0,
    total_transactions: 0,
    total_spent: 0,
    optimization_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const fetchUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('userFullName');

      if (fullName) {
        setUserName(fullName.split(' ')[0]); // Get first name
      }

      if (userId) {
        const response = await API.getUserStats(userId);
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserData();
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
          <Text style={styles.cardText}>
            Tap the Transaction tab below to get AI-powered recommendations!
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading your stats...</Text>
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
});