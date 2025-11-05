import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Transaction History</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardText}>Your transaction history will appear here.</Text>
          <Text style={styles.cardText}>Coming soon! 📊</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  cardText: { fontSize: 16, color: '#666', marginBottom: 8 },
});
// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';

// export default function HistoryScreen() {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.text}>History - Coming Soon</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   text: { fontSize: 18 },
// });