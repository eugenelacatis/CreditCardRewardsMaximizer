import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

// Accept the 'onLogout' prop passed from App.js
export default function ProfileScreen({ onLogout }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MT</Text>
          </View>
          <Text style={styles.userName}>Matt</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>$0</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>

        {/* --- ADDED THIS BUTTON --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        {/* ------------------------- */}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#4A90E2', padding: 20, paddingTop: 50 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1 },
  userSection: { alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  
  // --- ADDED THESE STYLES ---
  logoutButton: {
    backgroundColor: '#fff',
    borderColor: '#E74C3C',
    borderWidth: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // -------------------------
});