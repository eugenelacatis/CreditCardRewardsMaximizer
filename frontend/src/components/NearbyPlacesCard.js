// src/components/NearbyPlacesCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const NearbyPlacesCard = ({ recommendations, onRefresh, onRecommendationPress }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Nearby Recommendations</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No nearby places found</Text>
          <Text style={styles.emptySubtext}>
            Make sure location services are enabled
          </Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Recommendations</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshLink}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {recommendations.map((rec, index) => (
          <TouchableOpacity
            key={rec.place.place_id || index}
            style={styles.placeCard}
            onPress={() => onRecommendationPress && onRecommendationPress(rec)}
            activeOpacity={0.7}
          >
            <View style={styles.placeHeader}>
              <Text style={styles.placeName} numberOfLines={1}>
                {rec.place.name}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{rec.place.category}</Text>
              </View>
            </View>

            <Text style={styles.placeAddress} numberOfLines={1}>
              {rec.place.address}
            </Text>

            <View style={styles.distanceRow}>
              <Text style={styles.distanceText}>{rec.place.distance_formatted}</Text>
              {rec.place.rating && (
                <Text style={styles.rating}>{rec.place.rating.toFixed(1)}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.recommendationSection}>
              <Text style={styles.recommendationLabel}>Best Card:</Text>
              <Text style={styles.cardName} numberOfLines={1}>
                {rec.recommended_card.card_name}
              </Text>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardAmount}>
                  ${rec.expected_reward.toFixed(2)}
                </Text>
                <Text style={styles.rewardLabel}> in rewards</Text>
              </View>
              <Text style={styles.explanation} numberOfLines={2}>
                {rec.recommended_card.explanation}
              </Text>
            </View>

            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap to add transaction</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshLink: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  scrollView: {
    marginHorizontal: -5,
  },
  placeCard: {
    width: 280,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  placeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  rating: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  recommendationSection: {
    marginTop: 5,
  },
  recommendationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 6,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rewardLabel: {
    fontSize: 13,
    color: '#666',
  },
  explanation: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  tapHint: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NearbyPlacesCard;
