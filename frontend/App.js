import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from './src/theme';

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
            iconName = 'plus-circle';
          } else if (route.name === 'History') {
            iconName = 'chart-timeline-variant';
          } else if (route.name === 'Profile') {
            iconName = 'account-circle';
          }

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: route.name === 'Transaction' ? 60 : 40,
                height: route.name === 'Transaction' ? 60 : 40,
                borderRadius: route.name === 'Transaction' ? 30 : 0,
                marginTop: route.name === 'Transaction' ? -25 : 0,
              }}
            >
              {route.name === 'Transaction' && focused ? (
                <LinearGradient
                  colors={colors.primary.gradient}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.primary.main,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Icon name={iconName} size={32} color="#fff" />
                </LinearGradient>
              ) : route.name === 'Transaction' ? (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.primary.main,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Icon name={iconName} size={28} color="#fff" />
                </View>
              ) : (
                <Icon
                  name={iconName}
                  size={focused ? 26 : 24}
                  color={color}
                />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral.main,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{ tabBarLabel: 'My Cards' }}
      />
      <Tab.Screen
        name="Transaction"
        component={TransactionScreen}
        options={{ tabBarLabel: 'Scan' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Activity' }}
      />

      {/* We use the render prop (children) syntax for ProfileScreen
        so we can pass the 'onLogout' prop to it.
      */}
      <Tab.Screen
        name="Profile"
        options={{ tabBarLabel: 'Profile' }}
      >
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
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: {
                opacity: progress,
              },
            }),
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 300 } },
              close: { animation: 'timing', config: { duration: 300 } },
            },
          }}
        >
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
