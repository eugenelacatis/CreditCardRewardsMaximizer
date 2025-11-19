import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { LocationService } from '../services/locationService';
import API from '../services/api';

const { width } = Dimensions.get('window');

export default function LandingScreen({ onSkipToLogin }) {
  const [showDemo, setShowDemo] = useState(false);
  const [demoPlaces, setDemoPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleTryDemo = async () => {
    setShowDemo(true);
    setLoadingPlaces(true);
    setLocationError(null);

    try {
      // Request location permission
      const permissionResult = await LocationService.requestPermission();

      if (!permissionResult.granted) {
        setLocationError('Location permission is required to find nearby places. Please enable location access in your device settings.');
        setLoadingPlaces(false);
        return;
      }

      // Get current location
      const location = await LocationService.getCurrentLocation();

      if (!location) {
        setLocationError('Unable to get your current location. Please check your GPS settings and try again.');
        setLoadingPlaces(false);
        return;
      }

      setCurrentLocation(location);

      // Fetch nearby places (without recommendations since no user)
      const response = await API.getNearbyPlaces(
        location.latitude,
        location.longitude,
        2000
      );

      if (response.data && response.data.length > 0) {
        setDemoPlaces(response.data);
      } else {
        setLocationError('No places found nearby. Try again in a different location.');
      }
    } catch (error) {
      console.error('Error fetching demo places:', error);
      setLocationError('Unable to fetch nearby places. Please check your connection and try again.');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const handleSeeRewards = () => {
    setShowLoginPrompt(true);
  };

  const handleLoginFromPrompt = () => {
    setShowLoginPrompt(false);
    onSkipToLogin();
  };

  const getCategoryIcon = (category) => {
    const icons = {
      restaurant: 'silverware-fork-knife',
      cafe: 'coffee',
      bar: 'glass-cocktail',
      supermarket: 'cart',
      grocery: 'cart',
      gas_station: 'gas-station',
      pharmacy: 'pill',
      shopping: 'shopping',
      entertainment: 'movie',
      hotel: 'bed',
      default: 'store',
    };
    return icons[category?.toLowerCase()] || icons.default;
  };

  const getCategoryColor = (category) => {
    const colors = {
      restaurant: '#FF6B6B',
      cafe: '#A0522D',
      bar: '#9B59B6',
      supermarket: '#27AE60',
      grocery: '#27AE60',
      gas_station: '#F39C12',
      pharmacy: '#E74C3C',
      shopping: '#3498DB',
      entertainment: '#E91E63',
      hotel: '#00BCD4',
      default: '#95A5A6',
    };
    return colors[category?.toLowerCase()] || colors.default;
  };

  const features = [
    {
      icon: 'brain',
      title: 'AI-Powered',
      description: 'Smart recommendations using advanced AI to maximize your rewards',
    },
    {
      icon: 'map-marker-radius',
      title: 'Location-Aware',
      description: 'Get card suggestions based on nearby merchants and offers',
    },
    {
      icon: 'chart-line',
      title: 'Track Savings',
      description: 'Monitor your rewards and see how much you\'re earning',
    },
    {
      icon: 'credit-card-multiple',
      title: 'All Cards',
      description: 'Support for all major credit cards and reward programs',
    },
  ];

  const renderHeroSection = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.heroGradient}
      >
        <Icon name="wallet-giftcard" size={80} color="#fff" />
        <Text style={styles.heroTitle}>Agentic Wallet</Text>
        <Text style={styles.heroSubtitle}>
          Maximize every purchase with AI-powered{'\n'}credit card recommendations
        </Text>
      </LinearGradient>
    </Animated.View>
  );

  const renderFeatures = () => (
    <Animated.View
      style={[
        styles.featuresSection,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Why Agentic Wallet?</Text>
      <View style={styles.featuresGrid}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Icon name={feature.icon} size={28} color="#4A90E2" />
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderDemoPlaceCard = (place, index) => (
    <View key={index} style={styles.demoPlaceCard}>
      <View style={styles.placeHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(place.category) + '20' }]}>
          <Icon name={getCategoryIcon(place.category)} size={16} color={getCategoryColor(place.category)} />
          <Text style={[styles.categoryText, { color: getCategoryColor(place.category) }]}>
            {place.category?.replace('_', ' ')?.toUpperCase() || 'MERCHANT'}
          </Text>
        </View>
        {place.rating && (
          <View style={styles.ratingBadge}>
            <Icon name="star" size={12} color="#F39C12" />
            <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.placeName}>{place.name}</Text>

      {place.address && (
        <View style={styles.addressRow}>
          <Icon name="map-marker" size={14} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>{place.address}</Text>
        </View>
      )}

      {place.distance_km !== undefined && (
        <Text style={styles.distanceText}>
          {LocationService.formatDistance(place.distance_km)} away
        </Text>
      )}

      {/* Blurred rewards section */}
      <TouchableOpacity
        style={styles.blurredRewardsContainer}
        onPress={handleSeeRewards}
        activeOpacity={0.8}
      >
        <View style={styles.blurredContent}>
          <View style={styles.blurredRewardRow}>
            <Icon name="credit-card" size={16} color="#999" />
            <Text style={styles.blurredText}>Best Card: ••••••••</Text>
          </View>
          <View style={styles.blurredRewardRow}>
            <Icon name="cash-multiple" size={16} color="#999" />
            <Text style={styles.blurredText}>Rewards: $••.••</Text>
          </View>
        </View>
        <View style={styles.unlockOverlay}>
          <Icon name="lock" size={20} color="#4A90E2" />
          <Text style={styles.unlockText}>Sign up to see rewards</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderDemoSection = () => (
    <View style={styles.demoSection}>
      <View style={styles.demoHeader}>
        <Text style={styles.demoTitle}>Nearby Places</Text>
        {currentLocation && (
          <TouchableOpacity onPress={handleTryDemo} style={styles.refreshButton}>
            <Icon name="refresh" size={20} color="#4A90E2" />
          </TouchableOpacity>
        )}
      </View>

      {loadingPlaces ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Finding places near you...</Text>
        </View>
      ) : locationError ? (
        <View style={styles.errorContainer}>
          <Icon name="map-marker-off" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleTryDemo}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : demoPlaces.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.placesScrollContent}
        >
          {demoPlaces.slice(0, 5).map((place, index) => renderDemoPlaceCard(place, index))}
        </ScrollView>
      ) : (
        <View style={styles.emptyDemoContainer}>
          <Icon name="map-search" size={48} color="#ccc" />
          <Text style={styles.emptyDemoText}>
            Tap "Try Demo" to discover places near you
          </Text>
        </View>
      )}
    </View>
  );

  const renderCTASection = () => (
    <Animated.View
      style={[
        styles.ctaSection,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {!showDemo ? (
        <TouchableOpacity style={styles.demoButton} onPress={handleTryDemo}>
          <Icon name="compass" size={24} color="#4A90E2" style={styles.buttonIcon} />
          <Text style={styles.demoButtonText}>Try Demo</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.getStartedButton} onPress={onSkipToLogin}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
        <Icon name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={onSkipToLogin}>
        <Text style={styles.loginLinkText}>
          Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLoginPromptModal = () => (
    <Modal
      visible={showLoginPrompt}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLoginPrompt(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.loginPromptCard}>
          <View style={styles.promptIconContainer}>
            <Icon name="account-lock" size={48} color="#4A90E2" />
          </View>

          <Text style={styles.promptTitle}>Unlock Rewards</Text>
          <Text style={styles.promptDescription}>
            Create a free account to see personalized card recommendations and maximize your rewards at every purchase.
          </Text>

          <View style={styles.promptBenefits}>
            <View style={styles.benefitRow}>
              <Icon name="check-circle" size={18} color="#4CAF50" />
              <Text style={styles.benefitText}>Get personalized card recommendations</Text>
            </View>
            <View style={styles.benefitRow}>
              <Icon name="check-circle" size={18} color="#4CAF50" />
              <Text style={styles.benefitText}>Track your rewards & savings</Text>
            </View>
            <View style={styles.benefitRow}>
              <Icon name="check-circle" size={18} color="#4CAF50" />
              <Text style={styles.benefitText}>Manage all your cards in one place</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.promptSignUpButton} onPress={handleLoginFromPrompt}>
            <Text style={styles.promptSignUpButtonText}>Sign Up Free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptCancelButton}
            onPress={() => setShowLoginPrompt(false)}
          >
            <Text style={styles.promptCancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeroSection()}
        {renderFeatures()}
        {showDemo && renderDemoSection()}
        {renderCTASection()}
      </ScrollView>
      {renderLoginPromptModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Features Section
  featuresSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },

  // Demo Section
  demoSection: {
    marginTop: 24,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  placesScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  demoPlaceCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 12,
  },

  // Blurred Rewards
  blurredRewardsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  blurredContent: {
    opacity: 0.5,
  },
  blurredRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  blurredText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
  },
  unlockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  unlockText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 6,
  },

  // Loading & Error States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyDemoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyDemoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  demoButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
  },
  buttonIcon: {
    marginHorizontal: 8,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 15,
    color: '#666',
  },
  loginLinkBold: {
    color: '#4A90E2',
    fontWeight: '600',
  },

  // Login Prompt Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  promptIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  promptDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  promptBenefits: {
    width: '100%',
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  promptSignUpButton: {
    width: '100%',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  promptSignUpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  promptCancelButton: {
    paddingVertical: 10,
  },
  promptCancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
});
