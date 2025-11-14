// src/services/api.js - CORRECTED: Backend doesn't use /api/v1 prefix

import axios from 'axios';

// 🔥 UPDATE THIS with your current tunnel URL from Terminal 2!
//const API_BASE_URL = 'https://hip-wolves-yell.loca.lt/api/v1'; //for mobile

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📡 API Configuration');
console.log('Base URL:', API_BASE_URL);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// Configuration
// Use your Mac's local IP address for physical device/iOS simulator testing
// For web browser testing, use localhost
// const API_BASE_URL = 'http://10.0.0.222:8000/api/v1';  // Mac local IP
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';  // For web browser only
// const API_BASE_URL = 'http://192.168.1.98:8000/api/v1';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',  // Skip localtunnel warning page
  },
  timeout: 30000, // 30 seconds (tunnels can be slow)
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    const fullURL = config.baseURL + config.url;
    console.log('→ Making request to:', fullURL);
    console.log('→ Method:', config.method?.toUpperCase());
    console.log('→ Data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ Success:', response.status, response.config.url);
    console.log('✅ Data:', response.data);
    return response;
  },
  (error) => {
    const fullURL = error.config?.baseURL + error.config?.url;
    console.error('❌ Request failed');
    console.error('❌ Status:', error.response?.status);
    console.error('❌ URL:', fullURL);
    console.error('❌ Error:', error.response?.data);
    return Promise.reject(error);
  }
);

export const API = {
  // Get AI recommendation for a transaction
  getRecommendation: async (transactionData) => {
    try {
      console.log('🤖 Getting recommendation...');
      const response = await api.post('/recommend', transactionData);
      console.log('✨ Recommendation received!');
      return response;
    } catch (error) {
      console.error('Failed to get recommendation');
      throw error;
    }
  },

  // Save transaction to database
  saveTransaction: async (transactionRecord) => {
    try {
      console.log('💾 Saving transaction...');
      const response = await api.post('/transactions', transactionRecord);
      console.log('✅ Transaction saved!');
      return response;
    } catch (error) {
      console.error('Failed to save transaction');
      // Don't throw - we don't want to block the user if saving fails
      return null;
    }
  },

  // Get all transactions for history
  getTransactions: async (userId = 'user123', filters = {}) => {
    try {
      console.log('📜 Getting transactions...');
      const params = {
        user_id: userId,
        ...filters,
      };
      const response = await api.get('/transactions', { params });
      console.log(`✅ Found ${response.data.length} transactions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get transactions');
      throw error;
    }
  },

  // Get user stats (total saved, transaction count, etc.)
  getUserStats: async (userId = 'user123') => {
    try {
      console.log('📊 Getting stats...');
      const response = await api.get(`/users/${userId}/stats`);
      console.log('✅ Stats received!');
      return response.data;
    } catch (error) {
      console.error('Failed to get stats');
      throw error;
    }
  },

  // Get all cards for user
  getCards: async (userId = 'user123') => {
    try {
      console.log('🃏 Getting cards...');
      const response = await api.get('/cards', {
        params: { user_id: userId }
      });
      console.log(`✅ Found ${response.data.length} cards`);
      return response.data;
    } catch (error) {
      console.error('Failed to get cards');
      throw error;
    }
  },

  // Add a new card
  addCard: async (cardData) => {
    try {
      console.log('➕ Adding card...');
      const response = await api.post('/cards', cardData);
      console.log('✅ Card added!');
      return response.data;
    } catch (error) {
      console.error('Failed to add card');
      throw error;
    }
  },

  // Delete a card
  deleteCard: async (cardId) => {
    try {
      console.log('🗑️  Deleting card...');
      const response = await api.delete(`/cards/${cardId}`);
      console.log('✅ Card deleted!');
      return response.data;
    } catch (error) {
      console.error('Failed to delete card');
      throw error;
    }
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
};

export default API;