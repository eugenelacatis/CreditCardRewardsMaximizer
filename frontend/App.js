import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import CardsScreen from './src/screens/CardsScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import LandingScreen from './src/screens/LandingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * This component holds the main app navigation (the bottom tabs)
 * It will only be shown *after* the user is logged in.
 * * We must accept the 'onLogout' prop here to pass it down.
 */
function MainTabNavigator({ onLogout }) {
  return (
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

      {/* We use the render prop (children) syntax for ProfileScreen
        so we can pass the 'onLogout' prop to it.
      */}
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}

/**
 * Main App component
 * Manages authentication state and root navigation
 */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowLanding(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLanding(true);
  };

  const handleSkipToLogin = () => {
    setShowLanding(false);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            // User is logged in: Show the main app (Tab Navigator)
            <Stack.Screen name="MainApp">
              {(props) => <MainTabNavigator {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          ) : showLanding ? (
            // First time user: Show the Landing screen
            <Stack.Screen name="Landing">
              {(props) => (
                <LandingScreen
                  {...props}
                  onSkipToLogin={handleSkipToLogin}
                />
              )}
            </Stack.Screen>
          ) : (
            // User wants to login: Show the Login screen
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onLogin={handleLogin}
                  onBack={() => setShowLanding(true)}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
