// src/screens/CardsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

export default function CardsScreen({ navigation, route }) {
  const [USER_ID, setUserId] = useState(null);

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load user ID from AsyncStorage on mount
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          console.log('✅ Loaded user ID from storage:', storedUserId);
        } else {
          // Fallback to route params or demo user
          const routeUserId = route?.params?.userId;
          if (routeUserId) {
            setUserId(routeUserId);
          } else {
            console.warn('⚠️ No user ID found, using demo user');
            setUserId('demo-user-123');
          }
        }
      } catch (error) {
        console.error('Error loading user ID:', error);
        setUserId(route?.params?.userId || 'demo-user-123');
      }
    };
    loadUserId();
  }, [route?.params?.userId]);

  const apiCardToUi = useCallback((c) => {
    const rewardsText = Array.isArray(c?.benefits) && c.benefits.length > 0
      ? c.benefits.join(', ')
      : 'Standard rewards';

    // Handle issuer - it might be a string or an object with .value
    const issuerValue = typeof c?.issuer === 'string' 
      ? c.issuer 
      : c?.issuer?.value || 'Unknown';

    return {
      id: c?.card_id ?? String(Math.random()),
      name: c?.card_name ?? 'Card',
      type: issuerValue,
      rewards: rewardsText,
      cashBackRate: 0,
      pointsMultiplier: 0,
      _raw: c,
    };
  }, []);

  const fetchCards = useCallback(async () => {
    if (!USER_ID) {
      console.log('⏳ Waiting for user ID...');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      console.log('🃏 Fetching cards for user:', USER_ID);
      // Use the centralized API service
      const data = await API.getCards(USER_ID);
      const list = Array.isArray(data) ? data : [];
      setCards(list.map(apiCardToUi));
      setErrorMsg(null);
    } catch (err) {
      console.error('Error fetching cards:', err);
      // Handle different error types
      const status = err?.response?.status;
      if (status === 404) {
        // Treat 404 as "no cards"/empty state
        setCards([]);
        setErrorMsg(null);
      } else {
        setCards([]);
        const errorText = err?.response?.data?.detail || err?.message || 'Network error while loading cards. Pull to retry.';
        console.error('Cards fetch error:', errorText);
        setErrorMsg(errorText);
      }
    } finally {
      setLoading(false);
    }
  }, [USER_ID, apiCardToUi]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCards();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCards]);

  // Fetch cards when USER_ID is available
  useEffect(() => {
    if (USER_ID) {
      fetchCards();
    }
  }, [USER_ID, fetchCards]);

  // Refresh cards when screen comes into focus (e.g., returning from CardLibraryScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCards();
    });
    return unsubscribe;
  }, [navigation, fetchCards]);

  const handleNavigateToLibrary = useCallback(() => {
    navigation.navigate('CardLibrary', {
      userId: USER_ID,
      onCardAdded: fetchCards,
    });
  }, [navigation, USER_ID, fetchCards]);

  const handleDeleteCard = useCallback((cardId) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to remove this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.deleteCard(cardId);
              setCards(prev => prev.filter(c => c.id !== cardId));
              Alert.alert('Removed', 'Card has been deactivated.');
            } catch (err) {
              const errorText = err.response?.data?.detail || err.message || 'Could not delete the card.';
              Alert.alert('Error', errorText);
            }
          },
        },
      ]
    );
  }, []);

  const CardItem = ({ card }) => (
    <TouchableOpacity 
      style={styles.cardItem}
      onLongPress={() => handleDeleteCard(card.id)}
    >
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>💳</Text>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.cardName}>{card.name}</Text>
        <Text style={styles.cardType}>{card.type}</Text>
        <Text style={styles.cardRewards}>{card.rewards}</Text>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🃏</Text>
      <Text style={styles.emptyTitle}>No Cards Yet</Text>
      <Text style={styles.emptyText}>
        Add your first credit card to start getting personalized recommendations
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={handleNavigateToLibrary}
      >
        <Text style={styles.emptyButtonText}>+ Add Your First Card</Text>
      </TouchableOpacity>
    </View>
  );

  const cardCountText = useMemo(() => {
    const n = cards.length;
    return `${n} card${n !== 1 ? 's' : ''} in wallet`;
  }, [cards.length]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Cards</Text>
          <Text style={styles.subtitle}>{cardCountText}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleNavigateToLibrary}
        >
          <Text style={styles.addButtonText}>+ Add Card</Text>
        </TouchableOpacity>
      </View>

      {/* Error banner (non-blocking) */}
      {!!errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Loading / List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading cards…</Text>
        </View>
      ) : cards.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={cards}
          renderItem={({ item }) => <CardItem card={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}


      {!loading && cards.length > 0 && (
        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            💡 Long press on a card to delete it
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { 
    backgroundColor: '#4A90E2', 
    padding: 20, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  addButton: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#4A90E2', fontSize: 14, fontWeight: 'bold' },
  list: { padding: 20 },
  cardItem: { 
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 24 },
  cardDetails: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardType: { fontSize: 13, color: '#666', marginBottom: 4 },
  cardRewards: { fontSize: 13, color: '#4A90E2', fontWeight: '500' },

  // Empty/Error
  errorBox: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12 },
  errorText: { color: '#C62828', fontSize: 14 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  emptyButton: { backgroundColor: '#4A90E2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  helpBox: { padding: 16, backgroundColor: '#E3F2FD', margin: 20, borderRadius: 8 },
  helpText: { fontSize: 14, color: '#1976D2', textAlign: 'center' },
});
