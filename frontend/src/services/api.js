// src/services/api.js
import axios from 'axios';

// Configuration
// const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.224.1:8000/api/v1'
  : 'https://your-production-api.com/api/v1';
const API_TIMEOUT = 15000;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Format error message
    const errorMessage = error.response?.data?.detail 
      || error.message 
      || 'An error occurred';
    
    return Promise.reject(new Error(errorMessage));
  }
);

// API Service
export const API = {
  // Credit Cards
  getUserCards: async (userId) => {
    return await apiClient.get(`/users/${userId}/cards`);
  },

  // Recommendations
  getRecommendation: async (transactionData) => {
    return await apiClient.post('/recommend', transactionData);
  },

  // Transactions
  getTransactionHistory: async (userId, limit = 50, offset = 0) => {
    return await apiClient.get(`/users/${userId}/transactions`, {
      params: { limit, offset }
    });
  },

  // User Stats
  getUserStats: async (userId) => {
    return await apiClient.get(`/users/${userId}/stats`);
  },

  getMonthlyRewards: async (userId, months = 6) => {
    return await apiClient.get(`/users/${userId}/rewards/monthly`, {
      params: { months }
    });
  },
};

export default API;