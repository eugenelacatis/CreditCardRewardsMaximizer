import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

const DEFAULT_RESULT_LIMIT = 100;

/**
 * MerchantAutocomplete component - Version before "tap outside" improvements
 * This version includes:
 * - Improved search with DEFAULT_RESULT_LIMIT
 * - Unified fetchMerchants function
 * - Shows all merchants on tap
 * - Filters as you type
 * - Closes on Enter or selection
 * 
 * Saved before adding:
 * - Keyboard listener for tap outside detection
 * - Improved blur handling with reduced delay
 * - Input ref for programmatic control
 */
export default function MerchantAutocomplete({
  value,
  onMerchantSelect,
  onCategorySelect,
  apiUrl,
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSelectingMerchant, setIsSelectingMerchant] = useState(false);
  const debounceTimer = useRef(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown and clear input when navigating away from the screen
  useEffect(() => {
    if (!isFocused) {
      setShowResults(false);
      setResults([]);
      setQuery('');
      Keyboard.dismiss();
    }
  }, [isFocused]);

  const fetchMerchants = async (searchQuery = '') => {
    if (isSelectingMerchant) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(DEFAULT_RESULT_LIMIT),
      });

      const response = await fetch(`${apiUrl}/api/v1/merchants/search?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setResults(data || []);
      } else {
        console.error('Merchant fetch error:', response.status);
        setResults([]);
      }
    } catch (error) {
      console.error('Merchant fetch error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMerchants = () => fetchMerchants('');

  const searchMerchants = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      loadAllMerchants();
      return;
    }

    fetchMerchants(searchQuery);
  };

  const handleTextChange = (text) => {
    setQuery(text);
    setIsSelectingMerchant(false);
    setShowResults(true);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce search - search even with empty text to show all
    debounceTimer.current = setTimeout(() => {
      searchMerchants(text);
    }, 300);
  };

  const handleSelectMerchant = (merchant) => {
    // Set flag immediately to prevent blur from interfering
    setIsSelectingMerchant(true);
    setQuery(merchant.merchant_name);
    setShowResults(false);
    setResults([]);
    
    // Notify parent components
    if (onMerchantSelect) {
      onMerchantSelect(merchant.merchant_name);
    }
    if (onCategorySelect && merchant.primary_category) {
      onCategorySelect(merchant.primary_category);
    }
    
    Keyboard.dismiss();
    
    // Reset flag after a short delay
    setTimeout(() => {
      setIsSelectingMerchant(false);
    }, 500);
  };

  const handleFocus = () => {
    // Don't show results if we just selected a merchant
    if (isSelectingMerchant) return;
    
    setShowResults(true);
    
    // Always load merchants when focusing
    // If there's a query, search for it; otherwise show all
    if (query && query.trim() !== '') {
      searchMerchants(query);
    } else {
      loadAllMerchants();
    }
  };

  const handleBlur = () => {
    // Don't hide if we're selecting a merchant
    if (isSelectingMerchant) return;
    
    // Delay hiding results to allow tap on result
    setTimeout(() => {
      if (!isSelectingMerchant) {
        setShowResults(false);
        setResults([]);
      }
    }, 150);
  };

  const handleCloseDropdown = () => {
    setShowResults(false);
    setResults([]);
    Keyboard.dismiss();
  };

  const getCategoryEmoji = (category) => {
    const emojiMap = {
      dining: '🍽️',
      travel: '✈️',
      groceries: '🛒',
      gas: '⛽',
      entertainment: '🎬',
      shopping: '🛍️',
      other: '📦',
    };
    return emojiMap[category] || '📦';
  };

  const shouldShowResults = showResults && !isSelectingMerchant;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="e.g., Starbucks, Amazon, Whole Foods"
        value={query}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={() => {
          setShowResults(false);
          setResults([]);
          Keyboard.dismiss();

          if (query.trim() && onMerchantSelect) {
            onMerchantSelect(query.trim());
          }
        }}
        placeholderTextColor="#999"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />

      {/* Results Dropdown - Show when focused */}
      {shouldShowResults && (
        <View style={styles.resultsContainer}>
          {/* Header with close button */}
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Select a merchant</Text>
            <TouchableOpacity
              onPress={handleCloseDropdown}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading merchants...</Text>
            </View>
          ) : results.length > 0 ? (
            <ScrollView 
              style={styles.resultsScrollView}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {results.slice(0, DEFAULT_RESULT_LIMIT).map((merchant, index) => (
                <TouchableOpacity
                  key={`${merchant.merchant_id}-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectMerchant(merchant)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultContent}>
                    <Text style={styles.merchantEmoji}>
                      {getCategoryEmoji(merchant.primary_category)}
                    </Text>
                    <View style={styles.merchantInfo}>
                      <Text style={styles.merchantName}>{merchant.merchant_name}</Text>
                      <Text style={styles.merchantCategory}>
                        {merchant.primary_category}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {results.length > DEFAULT_RESULT_LIMIT && (
                <View style={styles.moreResultsHint}>
                  <Text style={styles.moreResultsText}>
                    + {results.length - DEFAULT_RESULT_LIMIT} more merchants
                  </Text>
                  <Text style={styles.moreResultsSubtext}>
                    Keep typing to narrow results
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No merchants found</Text>
              <Text style={styles.noResultsHint}>
                {query ? 'Try a different search' : 'No merchants available'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultsContainer: {
    position: 'absolute',
    top: 55, // Just below the input
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  dropdownHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
    lineHeight: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  resultsScrollView: {
    // ScrollView for results - avoids nested VirtualizedLists warning
    maxHeight: 250,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  merchantEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  merchantCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  noResultsHint: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 4,
  },
  moreResultsHint: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  moreResultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  moreResultsSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});

