// src/screens/CardLibraryScreen.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

// Mock card library data - Replace with API call later
const MOCK_CARD_LIBRARY = [
  {
    id: '1',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    annualFee: 95,
    bestFor: 'Travel & Dining',
    category: 'Travel',
    cashBackRate: { travel: '2x', dining: '2x' },
    pointsMultiplier: { travel: 2, dining: 2 },
  },
  {
    id: '2',
    name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    annualFee: 550,
    bestFor: 'Travel & Dining',
    category: 'Travel',
    cashBackRate: { travel: '3x', dining: '3x' },
    pointsMultiplier: { travel: 3, dining: 3 },
  },
  {
    id: '3',
    name: 'American Express Gold',
    issuer: 'American Express',
    annualFee: 250,
    bestFor: 'Dining & Groceries',
    category: 'Dining',
    cashBackRate: { dining: '4x', groceries: '4x' },
    pointsMultiplier: { dining: 4, groceries: 4 },
  },
  {
    id: '4',
    name: 'Citi Double Cash',
    issuer: 'Citi',
    annualFee: 0,
    bestFor: 'Everyday Purchases',
    category: 'Cash Back',
    cashBackRate: { all: '2%' },
    pointsMultiplier: { all: 2 },
  },
  {
    id: '5',
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    annualFee: 395,
    bestFor: 'Travel',
    category: 'Travel',
    cashBackRate: { travel: '2x', all: '2x' },
    pointsMultiplier: { travel: 2, all: 2 },
  },
  {
    id: '6',
    name: 'Wells Fargo Active Cash',
    issuer: 'Wells Fargo',
    annualFee: 0,
    bestFor: 'Cash Back',
    category: 'Cash Back',
    cashBackRate: { all: '2%' },
    pointsMultiplier: { all: 2 },
  },
  {
    id: '7',
    name: 'Discover it Cash Back',
    issuer: 'Discover',
    annualFee: 0,
    bestFor: 'Rotating Categories',
    category: 'Cash Back',
    cashBackRate: { rotating: '5%', all: '1%' },
    pointsMultiplier: { rotating: 5, all: 1 },
  },
  {
    id: '8',
    name: 'Blue Cash Preferred',
    issuer: 'American Express',
    annualFee: 95,
    bestFor: 'Groceries & Streaming',
    category: 'Cash Back',
    cashBackRate: { groceries: '6%', streaming: '6%' },
    pointsMultiplier: { groceries: 6, streaming: 6 },
  },
  {
    id: '9',
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    annualFee: 0,
    bestFor: 'Everyday Spending',
    category: 'No Fee',
    cashBackRate: { all: '1.5%', dining: '3%' },
    pointsMultiplier: { all: 1.5, dining: 3 },
  },
  {
    id: '10',
    name: 'Bank of America Customized Cash',
    issuer: 'Bank of America',
    annualFee: 0,
    bestFor: 'Custom Categories',
    category: 'No Fee',
    cashBackRate: { selected: '3%', all: '1%' },
    pointsMultiplier: { selected: 3, all: 1 },
  },
];

const FILTERS = ['All', 'Travel', 'Dining', 'Cash Back', 'No Fee'];

export default function CardLibraryScreen({ navigation, route }) {
  const [USER_ID, setUserId] = useState(null);
  const onCardAdded = route?.params?.onCardAdded;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(false);

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

  // Filter and search cards
  const filteredCards = useMemo(() => {
    let filtered = MOCK_CARD_LIBRARY;

    // Apply category filter
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(card => {
        if (selectedFilter === 'No Fee') {
          return card.annualFee === 0;
        }
        return card.category === selectedFilter;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(query) ||
        card.issuer.toLowerCase().includes(query) ||
        card.bestFor.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedFilter]);

  const handleAddCard = async (card) => {
    if (!USER_ID) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Convert string rates to numeric values
      const convertCashBackRate = (rate) => {
        if (typeof rate === 'string') {
          // Handle "2%" - convert to decimal (0.02)
          const num = parseFloat(rate.replace('%', ''));
          return isNaN(num) ? 0 : num / 100;
        }
        return typeof rate === 'number' ? rate : 0;
      };

      const convertPointsMultiplier = (rate) => {
        if (typeof rate === 'string') {
          // Handle "2x" - keep as is (2.0)
          const num = parseFloat(rate.replace('x', ''));
          return isNaN(num) ? 0 : num;
        }
        return typeof rate === 'number' ? rate : 0;
      };

      // Convert cashBackRate and pointsMultiplier objects to numeric values
      const convertCashBackRates = (rates) => {
        const converted = {};
        for (const [key, value] of Object.entries(rates || {})) {
          converted[key] = convertCashBackRate(value);
        }
        return converted;
      };

      const convertPointsMultipliers = (rates) => {
        const converted = {};
        for (const [key, value] of Object.entries(rates || {})) {
          converted[key] = convertPointsMultiplier(value);
        }
        return converted;
      };

      const payload = {
        card_name: card.name,
        issuer: card.issuer,
        cash_back_rate: convertCashBackRates(card.cashBackRate),
        points_multiplier: convertPointsMultipliers(card.pointsMultiplier),
        annual_fee: card.annualFee || 0,
        benefits: Array.isArray(card.bestFor) ? card.bestFor : [card.bestFor || 'General'],
        last_four_digits: null,
        credit_limit: null,
      };

      console.log('Adding card with payload:', payload);

      // Use the centralized API service
      const created = await API.addCard({
        ...payload,
        user_id: USER_ID
      });

      if (!created) {
        Alert.alert('Error', 'Unexpected server response.');
        return;
      }

      Alert.alert('Success', `${card.name} added to your wallet!`);
      
      // Callback to refresh cards list in CardsScreen
      if (onCardAdded) {
        onCardAdded();
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error adding card:', error);
      console.error('Error details:', error?.response?.data);
      const errorText = error?.response?.data?.detail || error?.message || 'Network error while adding the card.';
      Alert.alert('Error', errorText);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = ({ item: card }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => handleAddCard(card)}
      disabled={loading}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name="credit-card" size={24} color="#4A90E2" />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.cardIssuer}>{card.issuer}</Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.cardDetailRow}>
          <Text style={styles.cardDetailLabel}>Annual Fee:</Text>
          <Text style={styles.cardDetailValue}>
            {card.annualFee === 0 ? 'No Fee' : `$${card.annualFee}`}
          </Text>
        </View>
        <View style={styles.cardDetailRow}>
          <Text style={styles.cardDetailLabel}>Best For:</Text>
          <Text style={styles.cardDetailValue}>{card.bestFor}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.addButton, loading && styles.addButtonDisabled]}
        onPress={() => handleAddCard(card)}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>
          {loading ? 'Adding...' : '+ Add to Wallet'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Card Library</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="credit-card-off" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Cards Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search or filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardIssuer: {
    fontSize: 14,
    color: '#666',
  },
  cardDetails: {
    marginBottom: 12,
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  cardDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

