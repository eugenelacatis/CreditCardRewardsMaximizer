// src/services/api.js
import axios from 'axios';

// Configuration
// Use your Mac's local IP address for physical device/iOS simulator testing
// For web browser testing, use localhost
const API_BASE_URL = 'http://10.0.0.222:8000/api/v1';  // Mac local IP
// const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';  // For web browser only
// const API_BASE_URL = 'http://192.168.1.98:8000/api/v1';
// const API_BASE_URL = 'https://chubby-rats-listen.loca.lt/api/v1'

const API_TIMEOUT = 30000;

console.log('🔧 API Configuration Loaded:');
console.log('   Base URL:', API_BASE_URL);
console.log('   Timeout:', API_TIMEOUT);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ Interceptor caught error:', error.message);
    const errorMessage = error.response?.data?.detail 
      || error.message 
      || 'An error occurred';
    
    return Promise.reject(new Error(errorMessage));
  }
);

// API Service
export const API = {
  getRecommendation: async (transactionData) => {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('🚀 API.getRecommendation called');
    console.log('═══════════════════════════════');
    console.log('Full URL:', `${API_BASE_URL}/recommend`);
    console.log('Method: POST');
    console.log('Data:', JSON.stringify(transactionData, null, 2));
    
    try {
      console.log('📡 Sending request...');
      const response = await apiClient.post('/recommend', transactionData);
      console.log('✅ Success! Response:', response.data);
      return response;
    } catch (error) {
      console.error('');
      console.error('╔═══════════════════════════════╗');
      console.error('║       ERROR DETAILS           ║');
      console.error('╚═══════════════════════════════╝');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Has response?', !!error.response);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      console.error('Full error:', error);
      console.error('');
      throw error;
    }
  },

  // Legacy endpoint (old CreditCard model)
  getUserCards: async (userId) => {
    return await apiClient.get(`/users/${userId}/cards`);
  },

  // New UserCreditCard (Wallet) endpoints
  getWalletCards: async (userId, activeOnly = true) => {
    console.log('🔧 API.getWalletCards called for user:', userId);
    return await apiClient.get(`/users/${userId}/wallet/cards`, {
      params: { active_only: activeOnly }
    });
  },

  addCardToWallet: async (userId, cardData) => {
    console.log('🔧 API.addCardToWallet called');
    console.log('User:', userId);
    console.log('Card Data:', cardData);
    return await apiClient.post(`/users/${userId}/wallet/cards`, cardData);
  },

  updateWalletCard: async (userCardId, updateData) => {
    console.log('🔧 API.updateWalletCard called for card:', userCardId);
    return await apiClient.put(`/wallet/cards/${userCardId}`, updateData);
  },

  deleteWalletCard: async (userCardId, permanent = false) => {
    console.log('🔧 API.deleteWalletCard called for card:', userCardId);
    return await apiClient.delete(`/wallet/cards/${userCardId}`, {
      params: { permanent }
    });
  },

  getWalletCardDetails: async (userCardId) => {
    return await apiClient.get(`/wallet/cards/${userCardId}`);
  },

  // Card Library endpoints
  getCardLibrary: async (filters = {}) => {
    console.log('🔧 API.getCardLibrary called with filters:', filters);
    return await apiClient.get('/cards/library', {
      params: filters
    });
  },

  getTransactionHistory: async (userId, limit = 50, offset = 0) => {
    return await apiClient.get(`/users/${userId}/transactions`, {
      params: { limit, offset }
    });
  },

  createTransaction: async (transactionData) => {
    console.log('');
    console.log('===============================');
    console.log('API.createTransaction called');
    console.log('===============================');
    console.log('Full URL:', `${API_BASE_URL}/transactions`);
    console.log('Data:', JSON.stringify(transactionData, null, 2));

    try {
      const response = await apiClient.post('/transactions', transactionData);
      console.log('Transaction created:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating transaction:', error.message);
      throw error;
    }
  },

  getUserStats: async (userId) => {
    return await apiClient.get(`/users/${userId}/stats`);
  },

  getMonthlyRewards: async (userId, months = 6) => {
    return await apiClient.get(`/users/${userId}/rewards/monthly`, {
      params: { months }
    });
  },

  // Authentication methods
  signup: async (signupData) => {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('🚀 API.signup called');
    console.log('═══════════════════════════════');
    console.log('Full URL:', `${API_BASE_URL}/auth/signup`);
    console.log('Data:', JSON.stringify(signupData, null, 2));

    try {
      const response = await apiClient.post('/auth/signup', signupData);
      console.log('✅ Signup successful:', response.data);
      return response;
    } catch (error) {
      console.error('');
      console.error('╔═══════════════════════════════╗');
      console.error('║   SIGNUP ERROR DETAILS        ║');
      console.error('╚═══════════════════════════════╝');
      console.error('Error message:', error.message);
      console.error('Response data:', error.response?.data);
      console.error('');
      throw error;
    }
  },

  signin: async (signinData) => {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('🚀 API.signin called');
    console.log('═══════════════════════════════');
    console.log('Full URL:', `${API_BASE_URL}/auth/signin`);
    console.log('Email:', signinData.email);

    try {
      const response = await apiClient.post('/auth/signin', signinData);
      console.log('✅ Signin successful:', response.data);
      return response;
    } catch (error) {
      console.error('');
      console.error('╔═══════════════════════════════╗');
      console.error('║   SIGNIN ERROR DETAILS        ║');
      console.error('╚═══════════════════════════════╝');
      console.error('Error message:', error.message);
      console.error('Response data:', error.response?.data);
      console.error('');
      throw error;
    }
  },

  // User Profile methods
  getUserProfile: async (userId) => {
    return await apiClient.get(`/users/${userId}/profile`);
  },

  // Location-based methods
  getNearbyPlaces: async (latitude, longitude, radius = 2000) => {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('🚀 API.getNearbyPlaces called');
    console.log('═══════════════════════════════');
    console.log('Location:', { latitude, longitude, radius });

    try {
      const response = await apiClient.post('/location/nearby-places', {
        latitude,
        longitude,
        radius
      });
      console.log('✅ Nearby places fetched:', response.data.length, 'places');
      return response;
    } catch (error) {
      console.error('❌ Error fetching nearby places:', error.message);
      throw error;
    }
  },

  getLocationBasedRecommendations: async (userId, latitude, longitude, radius = 2000) => {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('🚀 API.getLocationBasedRecommendations called');
    console.log('═══════════════════════════════');
    console.log('User ID:', userId);
    console.log('Location:', { latitude, longitude, radius });

    try {
      const response = await apiClient.post('/location/recommendations', {
        user_id: userId,
        latitude,
        longitude,
        radius
      });
      console.log('✅ Location-based recommendations fetched:', response.data.top_recommendations.length, 'recommendations');
      return response;
    } catch (error) {
      console.error('❌ Error fetching location recommendations:', error.message);
      throw error;
    }
  },
};

export default API;
