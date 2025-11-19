// src/screens/ProfileScreen.js - Modern UI with theme system
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Card, Button, Avatar, Badge, GradientButton } from '../components/ui';

const OPTIMIZATION_GOALS = [
  { id: 'cash_back', label: 'Cash Back', icon: 'cash-multiple', description: 'Maximize cash back rewards on purchases' },
  { id: 'travel_points', label: 'Travel Points', icon: 'airplane', description: 'Earn points for flights and hotels' },
  { id: 'specific_discounts', label: 'Discounts', icon: 'sale', description: 'Get the best discounts and offers' },
  { id: 'balanced', label: 'Balanced', icon: 'scale-balance', description: 'Balance between all reward types' },
];

export default function ProfileScreen({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [updatingGoal, setUpdatingGoal] = useState(false);

  const fetchProfileData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (userId) {
        const profileResponse = await API.getUserProfile(userId);
        setProfile(profileResponse.data);
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

  const handleOpenGoalModal = () => {
    setSelectedGoal(profile?.default_optimization_goal || 'balanced');
    setGoalModalVisible(true);
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal || selectedGoal === profile?.default_optimization_goal) {
      setGoalModalVisible(false);
      return;
    }

    setUpdatingGoal(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const response = await API.updateUserProfile(userId, {
        optimization_goal: selectedGoal
      });

      setProfile(response.data);
      setGoalModalVisible(false);
      Alert.alert('Success', 'Your optimization goal has been updated.');
    } catch (error) {
      console.error('Error updating optimization goal:', error);
      Alert.alert('Error', 'Failed to update optimization goal. Please try again.');
    } finally {
      setUpdatingGoal(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const getGoalLabel = (goal) => {
    const labels = {
      'cash_back': 'Cash Back',
      'travel_points': 'Travel Points',
      'specific_discounts': 'Discounts',
      'balanced': 'Balanced',
    };
    return labels[goal] || goal?.replace('_', ' ').toUpperCase() || 'Not Set';
  };

  const getGoalIcon = (goal) => {
    const icons = {
      'cash_back': 'cash-multiple',
      'travel_points': 'airplane',
      'specific_discounts': 'sale',
      'balanced': 'scale-balance',
    };
    return icons[goal] || 'target';
  };

  const menuItems = [
    {
      icon: 'bell-outline',
      label: 'Notifications',
      sublabel: 'Manage your notification preferences',
      onPress: () => {},
    },
    {
      icon: 'shield-check-outline',
      label: 'Privacy & Security',
      sublabel: 'Password, 2FA, and privacy settings',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      sublabel: 'FAQs, contact us, feedback',
      onPress: () => {},
    },
    {
      icon: 'information-outline',
      label: 'About',
      sublabel: 'Version 1.0.0',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Profile</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            {/* User Profile Card */}
            <Card elevated style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Avatar
                  name={profile?.full_name}
                  size={80}
                  backgroundColor={colors.primary.main}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.userName}>
                    {profile?.full_name || 'User'}
                  </Text>
                  <Text style={styles.userEmail}>
                    {profile?.email || ''}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.goalContainer}
                onPress={handleOpenGoalModal}
                activeOpacity={0.7}
              >
                <View style={styles.goalIconContainer}>
                  <Icon
                    name={getGoalIcon(profile?.default_optimization_goal)}
                    size={20}
                    color={colors.primary.main}
                  />
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalLabel}>Optimization Goal</Text>
                  <Text style={styles.goalValue}>
                    {getGoalLabel(profile?.default_optimization_goal)}
                  </Text>
                </View>
                <Icon name="pencil" size={18} color={colors.primary.main} />
              </TouchableOpacity>
            </Card>

            {/* Account Information */}
            {profile && (
              <Card style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon name="account-details" size={20} color={colors.primary.main} />
                  <Text style={styles.sectionTitle}>Account Information</Text>
                </View>

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

                <View style={[styles.infoRow, styles.infoRowLast]}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>2024</Text>
                </View>
              </Card>
            )}

            {/* Settings Menu */}
            <Card style={styles.menuCard}>
              <View style={styles.infoHeader}>
                <Icon name="cog-outline" size={20} color={colors.primary.main} />
                <Text style={styles.sectionTitle}>Settings</Text>
              </View>

              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.menuItemLast
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Icon name={item.icon} size={22} color={colors.primary.main} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    <Text style={styles.menuItemSublabel}>{item.sublabel}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
                </TouchableOpacity>
              ))}
            </Card>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={20} color={colors.error.main} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* App Info */}
            <View style={styles.appInfo}>
              <Text style={styles.appInfoText}>Agentic Wallet v1.0.0</Text>
              <Text style={styles.appInfoSubtext}>Powered by AI</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Optimization Goal Modal */}
      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Optimization Goal</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setGoalModalVisible(false)}
              >
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose how you want to optimize your credit card rewards
            </Text>

            <View style={styles.goalOptions}>
              {OPTIMIZATION_GOALS.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalOption,
                      isSelected && styles.goalOptionSelected
                    ]}
                    onPress={() => setSelectedGoal(goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.goalOptionIcon,
                      isSelected && styles.goalOptionIconSelected
                    ]}>
                      <Icon
                        name={goal.icon}
                        size={24}
                        color={isSelected ? colors.primary.main : colors.neutral[400]}
                      />
                    </View>
                    <View style={styles.goalOptionContent}>
                      <Text style={[
                        styles.goalOptionLabel,
                        isSelected && styles.goalOptionLabelSelected
                      ]}>
                        {goal.label}
                      </Text>
                      <Text style={styles.goalOptionDescription}>
                        {goal.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Icon name="check-circle" size={24} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setGoalModalVisible(false)}
                style={styles.modalCancelButton}
              />
              <GradientButton
                title="Save"
                onPress={handleUpdateGoal}
                loading={updatingGoal}
                disabled={updatingGoal}
                style={styles.modalSaveButton}
              />
            </View>
          </View>
        </View>
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
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },

  // Content
  content: {
    flex: 1,
    padding: spacing.lg,
  },

  // Profile Card
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: spacing.base,
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  goalValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },

  // Info Card
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },

  // Menu Card
  menuCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  menuItemSublabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1.5,
    borderColor: colors.error.main,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  logoutButtonText: {
    color: colors.error.main,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.sm,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  appInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  appInfoSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  loadingText: {
    marginTop: spacing.md,
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
    paddingBottom: spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  goalOptions: {
    marginBottom: spacing.lg,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  goalOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary[50],
  },
  goalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  goalOptionIconSelected: {
    backgroundColor: colors.primary[100],
  },
  goalOptionContent: {
    flex: 1,
  },
  goalOptionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  goalOptionLabelSelected: {
    color: colors.primary.main,
  },
  goalOptionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSaveButton: {
    flex: 1,
  },
});
