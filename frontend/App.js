import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import CardsScreen from './src/screens/CardsScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              if (route.name === 'Home') {
                iconName = 'home';
              } else if (route.name === 'Cards') {
                iconName = 'credit-card-multiple';
              } else if (route.name === 'Transaction') {
                iconName = 'shopping';
              } else if (route.name === 'History') {
                iconName = 'history';
              } else if (route.name === 'Profile') {
                iconName = 'account';
              }
              
              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#4A90E2',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Cards" component={CardsScreen} />
          <Tab.Screen 
            name="Transaction" 
            component={TransactionScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <Icon 
                  name="plus-circle" 
                  size={50} 
                  color={color}
                  style={{ marginTop: -20 }}
                />
              ),
            }}
          />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
