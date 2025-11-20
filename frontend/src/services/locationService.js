// src/services/locationService.js
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_PERMISSION_KEY = 'location_permission_requested';

export class LocationService {
  /**
   * Check if location permission has been requested before
   */
  static async hasRequestedPermission() {
    const requested = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
    return requested === 'true';
  }

  /**
   * Mark that location permission has been requested
   */
  static async markPermissionRequested() {
    await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
  }

  /**
   * Clear the permission request flag (allows re-prompting)
   * Useful for testing or if user wants to be asked again
   */
  static async clearPermissionRequested() {
    await AsyncStorage.removeItem(LOCATION_PERMISSION_KEY);
  }

  /**
   * Request location permissions from the user
   * Returns: { granted: boolean, status: string }
   */
  static async requestPermission() {
    try {
      console.log('Requesting location permission...');

      const { status } = await Location.requestForegroundPermissionsAsync();

      await this.markPermissionRequested();

      console.log('Location permission status:', status);

      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return {
        granted: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get the current permission status without requesting
   */
  static async getPermissionStatus() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }

  /**
   * Get current location coordinates
   * Returns: { latitude, longitude } or null if unavailable
   */
  static async getCurrentLocation() {
    try {
      const permissionStatus = await this.getPermissionStatus();

      if (!permissionStatus.granted) {
        console.log('Location permission not granted');
        return null;
      }

      console.log('Fetching current location...');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('Location obtained:', location.coords);

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Watch for location changes (useful for real-time updates)
   * Returns a subscription object that should be removed when done
   */
  static async watchLocation(callback) {
    try {
      const permissionStatus = await this.getPermissionStatus();

      if (!permissionStatus.granted) {
        console.log('Location permission not granted for watching');
        return null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Or when user moves 100 meters
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
          });
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error watching location:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display (km or m)
   */
  static formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  }
}

export default LocationService;
