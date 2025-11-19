// src/screens/HistoryScreen.js - Modern UI with theme system
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Card, Badge, Button, StatCard } from '../components/ui';

export default function HistoryScreen() {
  const [timeFilter, setTimeFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await API.getTransactionHistory(userId, 50);

      const formattedTransactions = response.data.transactions.map(t => ({
        id: t.transaction_id,
        merchant: t.merchant,
        amount: t.amount,
        category: t.category,
        card_used: t.card_used || 'Unknown Card',
        card_recommended: t.card_recommended || t.card_used,
        cash_back: t.rewards_earned || 0,
        points: 0,
        missed_value: t.missed_value || 0,
        date: t.date.split('T')[0],
        optimal: t.optimal
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const getCategoryIcon = (category) => {
    const icons = {
      dining: 'silverware-fork-knife',
      gas: 'gas-station',
      groceries: 'cart',
      shopping: 'shopping',
      entertainment: 'movie',
      travel: 'airplane',
    };
    return icons[category] || 'credit-card';
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      dining: colors.error.main,
      gas: colors.warning.main,
      groceries: colors.success.main,
      shopping: colors.secondary.main,
      entertainment: '#E91E63',
      travel: colors.primary.main,
    };
    return categoryColors[category] || colors.neutral[500];
  };

  const filteredTransactions = (() => {
    if (timeFilter === 'all') {
      return transactions;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);

      switch (timeFilter) {
        case 'today':
          return transactionDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return transactionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return transactionDate >= monthAgo;
        default:
          return true;
      }
    });
  })();

  const totalSaved = filteredTransactions
    .filter((t) => t.optimal)
    .reduce((sum, t) => sum + (t.cash_back || 0) + (t.points || 0) * 0.01, 0);

  const totalMissed = filteredTransactions
    .filter((t) => !t.optimal)
    .reduce((sum, t) => sum + Math.abs(t.missed_value || 0), 0);

  const TransactionItem = ({ transaction }) => {
    return (
      <Card
        style={[
          styles.transactionItem,
          !transaction.optimal && styles.transactionItemSuboptimal,
        ]}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.merchantRow}>
            <View style={[
              styles.categoryIconContainer,
              { backgroundColor: getCategoryColor(transaction.category) + '20' }
            ]}>
              <Icon
                name={getCategoryIcon(transaction.category)}
                size={20}
                color={getCategoryColor(transaction.category)}
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{transaction.merchant}</Text>
              <Text style={styles.transactionDate}>{transaction.date}</Text>
            </View>
          </View>
          <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.cardUsedRow}>
          <Icon name="credit-card-outline" size={14} color={colors.neutral[400]} />
          <Text style={styles.cardUsedName}>{transaction.card_used}</Text>
        </View>

        {transaction.optimal ? (
          <View style={styles.optimalBadge}>
            <Icon name="check-circle" size={14} color={colors.success[700]} />
            <Text style={styles.optimalBadgeText}>
              Optimal Choice - Earned ${(transaction.cash_back + transaction.points * 0.01).toFixed(2)}
            </Text>
          </View>
        ) : (
          <View style={styles.suboptimalBadge}>
            <Icon name="alert-circle-outline" size={14} color={colors.warning[700]} />
            <Text style={styles.suboptimalBadgeText}>
              Could have saved ${Math.abs(transaction.missed_value).toFixed(2)} with {transaction.card_recommended}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="chart-bar" size={64} color={colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyText}>
        Start using the app to track your transactions and see your history here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.header}
        >
          <Text style={styles.title}>Transaction History</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.header}
        >
          <Text style={styles.title}>Transaction History</Text>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.error.main} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            variant="primary"
            onPress={fetchTransactions}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>{filteredTransactions.length} transactions</Text>
      </LinearGradient>

      {/* Summary Stats */}
      <View style={styles.summarySection}>
        <View style={styles.statCard}>
          <Icon name="check-circle" size={24} color={colors.success.main} />
          <Text style={styles.statLabel}>Total Saved</Text>
          <Text style={[styles.statValue, { color: colors.success.main }]}>
            ${totalSaved.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="alert-circle-outline" size={24} color={colors.error.main} />
          <Text style={styles.statLabel}>Missed Value</Text>
          <Text style={[styles.statValue, { color: colors.error.main }]}>
            ${totalMissed.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Time Filter */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'today', 'week', 'month'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.transactionsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
            />
          }
        >
          {filteredTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}

          {/* Insights */}
          {filteredTransactions.length > 0 && (
            <Card elevated style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Icon name="lightbulb-outline" size={20} color={colors.warning.main} />
                <Text style={styles.insightsSectionTitle}>Insights</Text>
              </View>
              <Text style={styles.insightText}>
                You made {filteredTransactions.filter((t) => t.optimal).length} optimal decisions ({filteredTransactions.length > 0 ? ((filteredTransactions.filter((t) => t.optimal).length / filteredTransactions.length) * 100).toFixed(0) : 0}%)
              </Text>
              {totalMissed > 0 && (
                <Text style={styles.insightTip}>
                  You could save an extra ${totalMissed.toFixed(2)} by following all recommendations
                </Text>
              )}
            </Card>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
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

  // Summary
  summarySection: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },

  // Filter
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  filterButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
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

  // Transactions List
  transactionsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  transactionItem: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success.main,
  },
  transactionItemSuboptimal: {
    borderLeftColor: colors.warning.main,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  transactionAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  cardUsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardUsedName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  optimalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  optimalBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.success[700],
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  suboptimalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  suboptimalBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning[700],
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
    flex: 1,
  },

  // Insights
  insightsCard: {
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  insightsSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  insightText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  insightTip: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
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
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error.main,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
