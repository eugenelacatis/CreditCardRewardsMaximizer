// src/screens/CardsScreen.js - Modern UI with theme system
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Card, GradientButton, Button, Badge, EmptyState } from '../components/ui';

export default function CardsScreen() {
  const [userId, setUserId] = useState(null);
  const [walletCards, setWalletCards] = useState([]);
  const [libraryCards, setLibraryCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssuer, setSelectedIssuer] = useState('All');

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  const walletCardToUi = useCallback((c) => {
    return {
      id: c?.user_card_id ?? String(Math.random()),
      userCardId: c?.user_card_id,
      cardId: c?.card_id,
      name: c?.card_name || 'Card',
      cardName: c?.card_name,
      issuer: c?.issuer ?? 'Unknown',
      lastFour: c?.last_four_digits,
      creditLimit: c?.credit_limit,
      balance: c?.current_balance,
      isActive: c?.is_active,
      annualFee: c?.annual_fee,
      benefits: c?.benefits || [],
      cashBackRate: c?.cash_back_rate || {},
      pointsMultiplier: c?.points_multiplier || {},
      _raw: c,
    };
  }, []);

  const libraryCardToUi = useCallback((c) => {
    const benefitsText = Array.isArray(c?.benefits) && c.benefits.length > 0
      ? c.benefits.slice(0, 2).join(', ')
      : 'Standard rewards';

    return {
      id: c?.card_id ?? String(Math.random()),
      cardId: c?.card_id,
      name: c?.card_name ?? 'Card',
      issuer: c?.issuer ?? 'Unknown',
      annualFee: c?.annual_fee ?? 0,
      benefits: c?.benefits || [],
      benefitsPreview: benefitsText,
      cashBackRate: c?.cash_back_rate || {},
      pointsMultiplier: c?.points_multiplier || {},
      _raw: c,
    };
  }, []);

  const fetchWalletCards = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await API.getWalletCards(userId);
      const list = Array.isArray(response.data) ? response.data : [];
      setWalletCards(list.map(walletCardToUi));
      setErrorMsg(null);
    } catch (err) {
      console.error('Error fetching wallet cards:', err);
      setWalletCards([]);

      if (err.response?.status === 404) {
        setErrorMsg(null);
      } else {
        setErrorMsg('Could not load wallet. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, walletCardToUi]);

  const fetchLibraryCards = useCallback(async () => {
    try {
      const response = await API.getCardLibrary({ limit: 100 });
      const list = Array.isArray(response.data) ? response.data : [];
      setLibraryCards(list.map(libraryCardToUi));
    } catch (err) {
      console.error('Error fetching library:', err);
      Alert.alert('Error', 'Could not load card library');
    }
  }, [libraryCardToUi]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWalletCards();
    } finally {
      setRefreshing(false);
    }
  }, [fetchWalletCards]);

  useEffect(() => {
    fetchWalletCards();
  }, [fetchWalletCards]);

  const handleAddCardToWallet = useCallback(async (libraryCard) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    Alert.alert(
      'Add to Wallet',
      `Add ${libraryCard.name} to your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              const payload = {
                card_id: libraryCard.cardId,
                nickname: null,
                last_four_digits: null,
                credit_limit: null,
              };

              await API.addCardToWallet(userId, payload);

              setShowLibraryModal(false);
              await fetchWalletCards();

              Alert.alert('Success', `${libraryCard.name} added to your wallet!`);
            } catch (error) {
              console.error('Error adding card:', error);
              const message = error.response?.data?.detail || error.message || 'Could not add card';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  }, [userId, fetchWalletCards]);

  const handleDeleteCard = useCallback((card) => {
    Alert.alert(
      'Remove Card',
      `Remove ${card.name} from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.deleteWalletCard(card.userCardId, true);
              await fetchWalletCards();
              Alert.alert('Removed', 'Card removed from wallet');
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Could not remove card');
            }
          },
        },
      ]
    );
  }, [fetchWalletCards]);

  const filteredLibraryCards = useMemo(() => {
    let filtered = libraryCards;

    if (selectedIssuer && selectedIssuer !== 'All') {
      filtered = filtered.filter(c => c.issuer === selectedIssuer);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.issuer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [libraryCards, selectedIssuer, searchQuery]);

  const issuers = useMemo(() => {
    const unique = new Set(libraryCards.map(c => c.issuer));
    return ['All', ...Array.from(unique).sort()];
  }, [libraryCards]);

  const getCardGradient = (issuer) => {
    const gradients = {
      'Chase': ['#1A73E8', '#0D47A1'],
      'American Express': ['#006FCF', '#003087'],
      'Capital One': ['#D03027', '#8B0000'],
      'Discover': ['#FF6600', '#CC5200'],
      'Citi': ['#003B70', '#001F3F'],
      'Bank of America': ['#E31837', '#B71C1C'],
      'Wells Fargo': ['#D71E28', '#8B0000'],
    };
    return gradients[issuer] || colors.gradients.primary;
  };

  const WalletCardItem = ({ card }) => (
    <TouchableOpacity
      style={styles.walletCard}
      onLongPress={() => handleDeleteCard(card)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={getCardGradient(card.issuer)}
        style={styles.walletCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.walletCardHeader}>
          <Text style={styles.walletCardIssuer}>{card.issuer}</Text>
          <Icon name="contactless-payment" size={24} color="rgba(255,255,255,0.8)" />
        </View>

        <View style={styles.walletCardChip}>
          <View style={styles.chipIcon} />
        </View>

        <Text style={styles.walletCardName}>{card.name}</Text>

        {card.creditLimit && (
          <View style={styles.walletCardFooter}>
            <Text style={styles.walletCardLimit}>
              Limit: ${card.creditLimit.toLocaleString()}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const LibraryCardItem = ({ card }) => (
    <Card style={styles.libraryCardItem}>
      <View style={styles.libraryCardContent}>
        <View style={styles.libraryCardInfo}>
          <Text style={styles.libraryCardName}>{card.name}</Text>
          <Text style={styles.libraryCardIssuer}>{card.issuer}</Text>
          <View style={styles.libraryCardMeta}>
            <Badge
              text={card.annualFee === 0 ? 'No Annual Fee' : `$${card.annualFee}/yr`}
              variant={card.annualFee === 0 ? 'success' : 'warning'}
              size="small"
            />
          </View>
          <Text style={styles.libraryCardBenefits} numberOfLines={2}>
            {card.benefitsPreview}
          </Text>
        </View>
        <Button
          title="Add"
          icon="plus"
          variant="primary"
          size="small"
          onPress={() => handleAddCardToWallet(card)}
        />
      </View>
    </Card>
  );

  const EmptyWalletState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="credit-card-off-outline" size={64} color={colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>No Cards in Wallet</Text>
      <Text style={styles.emptyText}>
        Browse the card library and add cards to your wallet to start getting AI-powered recommendations
      </Text>
      <GradientButton
        title="Browse Card Library"
        icon="credit-card-search"
        onPress={() => {
          fetchLibraryCards();
          setShowLibraryModal(true);
        }}
        style={styles.emptyButton}
      />
    </View>
  );

  const cardCountText = useMemo(() => {
    const n = walletCards.length;
    return `${n} card${n !== 1 ? 's' : ''} in wallet`;
  }, [walletCards.length]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>My Wallet</Text>
            <Text style={styles.subtitle}>{cardCountText}</Text>
          </View>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => {
              fetchLibraryCards();
              setShowLibraryModal(true);
            }}
          >
            <Icon name="plus" size={20} color={colors.primary.main} />
            <Text style={styles.browseButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Error banner */}
      {!!errorMsg && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={20} color={colors.error.main} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Loading / List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      ) : walletCards.length === 0 ? (
        <EmptyWalletState />
      ) : (
        <FlatList
          data={walletCards}
          renderItem={({ item }) => <WalletCardItem card={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
            />
          }
        />
      )}

      {/* Card Library Modal */}
      <Modal
        visible={showLibraryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLibraryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Card Library</Text>
                <Text style={styles.modalSubtitle}>{filteredLibraryCards.length} cards available</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLibraryModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cards..."
                placeholderTextColor={colors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={20} color={colors.neutral[400]} />
                </TouchableOpacity>
              )}
            </View>

            {/* Issuer Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {issuers.map((issuer) => (
                <TouchableOpacity
                  key={issuer}
                  style={[
                    styles.filterButton,
                    selectedIssuer === issuer && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedIssuer(issuer)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedIssuer === issuer && styles.filterButtonTextActive,
                    ]}
                  >
                    {issuer}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Library Cards List */}
            <FlatList
              data={filteredLibraryCards}
              renderItem={({ item }) => <LibraryCardItem card={item} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.libraryList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {!loading && walletCards.length > 0 && (
        <View style={styles.helpBox}>
          <Icon name="gesture-tap-hold" size={18} color={colors.primary.main} />
          <Text style={styles.helpText}>Long press on a card to remove it</Text>
        </View>
      )}
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
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  browseButtonText: {
    color: colors.primary.main,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.xs,
  },

  // List
  list: {
    padding: spacing.lg,
  },

  // Wallet Card
  walletCard: {
    marginBottom: spacing.base,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  walletCardGradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 180,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletCardIssuer: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletCardChip: {
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  chipIcon: {
    width: 40,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: borderRadius.sm,
  },
  walletCardName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
    marginTop: spacing.sm,
  },
  walletCardFooter: {
    marginTop: 'auto',
    paddingTop: spacing.sm,
  },
  walletCardLimit: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  // Library Card
  libraryCardItem: {
    marginBottom: spacing.sm,
  },
  libraryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  libraryCardInfo: {
    flex: 1,
  },
  libraryCardName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  libraryCardIssuer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  libraryCardMeta: {
    marginBottom: spacing.sm,
  },
  libraryCardBenefits: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.main,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
  },

  // Error & Loading
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error[700],
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },

  // Filter
  filterRow: {
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingRight: spacing.lg,
  },
  filterButton: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonTextActive: {
    color: colors.text.inverse,
  },
  libraryList: {
    paddingBottom: spacing.xl,
  },

  // Help Box
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    backgroundColor: colors.primary[50],
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: borderRadius.lg,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
});
