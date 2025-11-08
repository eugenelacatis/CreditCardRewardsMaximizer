// src/services/api.js
import axios from 'axios';

// Configuration

const API_BASE_URL = 'https://chubby-rats-listen.loca.lt/api/v1'
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

  getUserCards: async (userId) => {
    return await apiClient.get(`/users/${userId}/cards`);
  },

  getTransactionHistory: async (userId, limit = 50, offset = 0) => {
    return await apiClient.get(`/users/${userId}/transactions`, {
      params: { limit, offset }
    });
  },

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
