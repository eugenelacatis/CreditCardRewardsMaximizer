import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

// Accept the 'onLogout' prop passed from App.js
export default function ProfileScreen({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total_rewards: 0,
    total_transactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (userId) {
        // Fetch profile and stats in parallel
        const [profileResponse, statsResponse] = await Promise.all([
          API.getUserProfile(userId),
          API.getUserStats(userId)
        ]);

        setProfile(profileResponse.data);
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={styles.userSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile ? getInitials(profile.full_name) : 'U'}
                </Text>
              </View>
              <Text style={styles.userName}>
                {profile?.full_name || 'User'}
              </Text>
              <Text style={styles.userEmail}>
                {profile?.email || ''}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>${stats.total_rewards.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Rewards</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.total_transactions}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
            </View>

            {profile && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile.email}</Text>
                </View>
                {profile.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{profile.phone}</Text>
                  </View>
                )}
                {profile.default_optimization_goal && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Default Goal</Text>
                    <Text style={styles.infoValue}>
                      {profile.default_optimization_goal.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#4A90E2', padding: 20, paddingTop: 50 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1 },
  userSection: { alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#666' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  
  // --- ADDED THESE STYLES ---
  logoutButton: {
    backgroundColor: '#fff',
    borderColor: '#E74C3C',
    borderWidth: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: 'bold',
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
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});