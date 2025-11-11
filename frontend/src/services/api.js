// src/services/api.js - Complete API Service

import axios from 'axios';

// Backend URL - Configured via environment variable or defaults to Docker-compatible URL
// For Docker: uses localhost (backend exposed on host port 8000)
// For mobile testing: set EXPO_PUBLIC_API_URL environment variable or use localtunnel
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

export const API = {
  // Get AI recommendation for a transaction
  getRecommendation: async (transactionData) => {
    try {
      console.log('API: Getting recommendation for:', transactionData);
      const response = await api.post('/recommend', transactionData);
      return response;
    } catch (error) {
      console.error('API Error (getRecommendation):', error);
      throw error;
    }
  },

  // Save transaction to database
  saveTransaction: async (transactionRecord) => {
    try {
      console.log('API: Saving transaction:', transactionRecord);
      const response = await api.post('/transactions', transactionRecord);
      return response;
    } catch (error) {
      console.error('API Error (saveTransaction):', error);
      // Don't throw - we don't want to block the user if saving fails
      return null;
    }
  },

  // Get all transactions for history
  getTransactions: async (userId = 'user123', filters = {}) => {
    try {
      console.log('API: Getting transactions for user:', userId);
      const params = {
        user_id: userId,
        ...filters,
      };
      const response = await api.get('/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('API Error (getTransactions):', error);
      throw error;
    }
  },

  // Get user stats (total saved, transaction count, etc.)
  getUserStats: async (userId = 'user123') => {
    try {
      console.log('API: Getting stats for user:', userId);
      const response = await api.get(`/users/${userId}/stats`);
      return response.data;
    } catch (error) {
      console.error('API Error (getUserStats):', error);
      throw error;
    }
  },

  // Get all cards for user
  getCards: async (userId = 'user123') => {
    try {
      console.log('API: Getting cards for user:', userId);
      const response = await api.get('/cards', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('API Error (getCards):', error);
      throw error;
    }
  },

  // Add a new card
  addCard: async (cardData) => {
    try {
      console.log('API: Adding card:', cardData);
      const response = await api.post('/cards', cardData);
      return response.data;
    } catch (error) {
      console.error('API Error (addCard):', error);
      throw error;
    }
  },

  // Delete a card
  deleteCard: async (cardId) => {
    try {
      console.log('API: Deleting card:', cardId);
      const response = await api.delete(`/cards/${cardId}`);
      return response.data;
    } catch (error) {
      console.error('API Error (deleteCard):', error);
      throw error;
    }
  },
};

export default API;// // src/services/api.js
// import axios from 'axios';

// // Configuration

// // for const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
// // const API_BASE_URL = 'http://192.168.1.98:8000/api/v1';
// const API_BASE_URL = 'https://chubby-rats-listen.loca.lt/api/v1'

// const API_TIMEOUT = 30000;

// console.log('🔧 API Configuration Loaded:');
// console.log('   Base URL:', API_BASE_URL);
// console.log('   Timeout:', API_TIMEOUT);

// // Create axios instance
// const apiClient = axios.create({
//   baseURL: API_BASE_URL,
//   timeout: API_TIMEOUT,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Response interceptor
// apiClient.interceptors.response.use(
//   (response) => {
//     console.log('✅ Response received:', response.status);
//     return response;
//   },
//   async (error) => {
//     console.error('❌ Interceptor caught error:', error.message);
//     const errorMessage = error.response?.data?.detail 
//       || error.message 
//       || 'An error occurred';
    
//     return Promise.reject(new Error(errorMessage));
//   }
// );

// // API Service
// export const API = {
//   getRecommendation: async (transactionData) => {
//     console.log('');
//     console.log('═══════════════════════════════');
//     console.log('🚀 API.getRecommendation called');
//     console.log('═══════════════════════════════');
//     console.log('Full URL:', `${API_BASE_URL}/recommend`);
//     console.log('Method: POST');
//     console.log('Data:', JSON.stringify(transactionData, null, 2));
    
//     try {
//       console.log('📡 Sending request...');
//       const response = await apiClient.post('/recommend', transactionData);
//       console.log('✅ Success! Response:', response.data);
//       return response;
//     } catch (error) {
//       console.error('');
//       console.error('╔═══════════════════════════════╗');
//       console.error('║       ERROR DETAILS           ║');
//       console.error('╚═══════════════════════════════╝');
//       console.error('Error name:', error.name);
//       console.error('Error message:', error.message);
//       console.error('Error code:', error.code);
//       console.error('Has response?', !!error.response);
//       if (error.response) {
//         console.error('Response status:', error.response.status);
//         console.error('Response data:', error.response.data);
//       }
//       console.error('Full error:', error);
//       console.error('');
//       throw error;
//     }
//   },

//   getUserCards: async (userId) => {
//     return await apiClient.get(`/users/${userId}/cards`);
//   },

//   getTransactionHistory: async (userId, limit = 50, offset = 0) => {
//     return await apiClient.get(`/users/${userId}/transactions`, {
//       params: { limit, offset }
//     });
//   },

//   getUserStats: async (userId) => {
//     return await apiClient.get(`/users/${userId}/stats`);
//   },

//   getMonthlyRewards: async (userId, months = 6) => {
//     return await apiClient.get(`/users/${userId}/rewards/monthly`, {
//       params: { months }
//     });
//   },
// };

// export default API;
