// src/screens/CardsScreen.js
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

// const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE = "https://hip-wolves-yell.loca.lt/api/v1"

export default function CardsScreen({ navigation, route }) {
  const USER_ID = route?.params?.userId || 'demo-user-123';

const API_BASE_URL = 'http://10.0.0.222:8000';
>>>>>>> cae5d2f2f118266d9490068b8bd8f79d42f4adc6

export default function CardsScreen() {
  const [userId, setUserId] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    name: '',
    type: 'Visa',
    rewards: '',
    last4: '',
  });

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const apiCardToUi = useCallback((c) => {
    const rewardsText = Array.isArray(c?.benefits) && c.benefits.length > 0
      ? c.benefits.join(', ')
      : 'Standard rewards';

    return {
      id: c?.card_id ?? String(Math.random()),
      name: c?.card_name ?? 'Card',
      type: c?.issuer ?? 'Unknown',
      rewards: rewardsText,
      cashBackRate: 0,
      pointsMultiplier: 0,
      _raw: c,
    };
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${encodeURIComponent(USER_ID)}/cards`);
      if (!res.ok) {
        // Treat 404 as "no cards"/empty state
        if (res.status === 404) {
          setCards([]);
          setErrorMsg(null);
        } else {
          const text = await res.text().catch(() => '');
          setCards([]); // ensure safe empty state
          setErrorMsg(text || `Failed to load cards (HTTP ${res.status})`);
        }
      } else {
        const data = await safeJson(res);
        const list = Array.isArray(data) ? data : [];
        setCards(list.map(apiCardToUi));
      }
    } catch (err) {
      // Network or unexpected error: still render with empty list
      setCards([]);
      setErrorMsg('Network error while loading cards. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [userId, apiCardToUi]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCards();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCards]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleAddCard = useCallback(async () => {
    if (!newCard.name.trim()) {
      Alert.alert('Error', 'Please enter a card name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        card_name: newCard.name.trim(),
        issuer: newCard.type,
        cash_back_rate: {},
        points_multiplier: {},
        annual_fee: 0,
        benefits: newCard.rewards
          ? newCard.rewards.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        last_four_digits: newCard.last4?.trim() || null,
        credit_limit: null,
      };

      const res = await fetch(`${API_BASE}/api/v1/cards?user_id=${encodeURIComponent(USER_ID)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // keep modal open; show friendly error
        Alert.alert('Error', text || 'Could not add the card.');
        return;
        // Do not throw; we want to keep UI responsive
      }

      const created = await safeJson(res);
      if (!created || typeof created !== 'object') {
        Alert.alert('Error', 'Unexpected server response.');
        return;
      }

      const uiCard = apiCardToUi(created);
      setCards(prev => [...prev, uiCard]);
      setShowAddModal(false);
      setNewCard({ name: '', type: 'Visa', rewards: '', last4: '' });
      Alert.alert('Success', `${uiCard.name} added to your wallet!`);
    } catch {
      Alert.alert('Error', 'Network error while adding the card.');
    } finally {
      setSubmitting(false);
    }
  }, [USER_ID, newCard, apiCardToUi]);

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
              const res = await fetch(`${API_BASE}/api/v1/cards/${encodeURIComponent(cardId)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
              });
              if (!res.ok) {
                const text = await res.text().catch(() => '');
                Alert.alert('Error', text || 'Could not delete the card.');
                return;
              }
              setCards(prev => prev.filter(c => c.id !== cardId));
              Alert.alert('Removed', 'Card has been deactivated.');
            } catch {
              Alert.alert('Error', 'Network error while deleting the card.');
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
        onPress={() => setShowAddModal(true)}
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
          onPress={() => setShowAddModal(true)}
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

      {/* Add Card Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Card</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                  disabled={submitting}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Card Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chase Sapphire Preferred"
                  value={newCard.name}
                  onChangeText={(text) => setNewCard({ ...newCard, name: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Issuer</Text>
                <View style={styles.cardTypeRow}>
                  {['Visa', 'Mastercard', 'Amex', 'Discover'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        newCard.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewCard({ ...newCard, type })}
                      disabled={submitting}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newCard.type === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Benefits (comma-separated, optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. 3x travel, 2x dining"
                  value={newCard.rewards}
                  onChangeText={(text) => setNewCard({ ...newCard, rewards: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last 4 Digits (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1234"
                  value={newCard.last4}
                  onChangeText={(text) => setNewCard({ ...newCard, last4: text })}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Tip: You can edit reward categories later in a detail screen.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                onPress={handleAddCard}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Adding…' : 'Add Card'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 20, color: '#666' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  cardTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { flex: 1, minWidth: '45%', backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  typeButtonText: { fontSize: 14, color: '#666', fontWeight: '500' },
  typeButtonTextActive: { color: '#fff' },
  infoBox: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 20 },
  infoText: { fontSize: 14, color: '#856404' },
  submitButton: { backgroundColor: '#4A90E2', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 16, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  helpBox: { padding: 16, backgroundColor: '#E3F2FD', margin: 20, borderRadius: 8 },
  helpText: { fontSize: 14, color: '#1976D2', textAlign: 'center' },
});
