# location_service.py - Google Places Integration for Location-Based Recommendations
import os
import logging
from typing import List, Dict, Optional
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class LocationService:
    """Service for finding nearby places using Google Places API (New)"""

    def __init__(self):
        self.api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        self.use_osm = os.getenv('USE_OSM_API', 'true').lower() == 'true'

        if self.use_osm:
            logger.info("Using OpenStreetMap Overpass API (free, no API key required)")
            self.api_key = None  # Don't use Google API when OSM is enabled
        elif not self.api_key or self.api_key == 'your_google_places_api_key_here':
            logger.warning("Google Places API key not configured. Location features will be limited.")
            self.api_key = None
        else:
            logger.info("Google Places API (New) initialized")

    def get_nearby_places(
        self,
        latitude: float,
        longitude: float,
        radius: int = 2000,
        place_types: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Get nearby places from Google Places API (New)

        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius: Search radius in meters (default 2000m = 2km)
            place_types: Optional list of place types to search for

        Returns:
            List of nearby places with details
        """
        # Use OpenStreetMap if enabled (default) or if no Google API key
        if self.use_osm or not self.api_key:
            return self._get_osm_nearby_places(latitude, longitude, radius)

        try:
            # Default place types relevant for credit card rewards
            # Using new API type names (snake_case)
            if not place_types:
                place_types = [
                    'restaurant',
                    'grocery_store',
                    'gas_station',
                    'shopping_mall',
                    'department_store',
                    'cafe',
                    'movie_theater',
                    'airport',
                    'hotel'
                ]

            all_places = []

            # Use the new Places API (v1) endpoint
            url = "https://places.googleapis.com/v1/places:searchNearby"

            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "places.id,places.displayName,places.types,places.formattedAddress,places.location,places.rating,places.priceLevel,places.regularOpeningHours"
            }

            # Search for each type
            api_errors = 0
            for place_type in place_types:
                try:
                    request_body = {
                        "includedTypes": [place_type],
                        "maxResultCount": 20,
                        "locationRestriction": {
                            "circle": {
                                "center": {
                                    "latitude": latitude,
                                    "longitude": longitude
                                },
                                "radius": float(radius)
                            }
                        }
                    }

                    response = requests.post(url, json=request_body, headers=headers)

                    if response.status_code != 200:
                        error_msg = response.json().get('error', {}).get('message', 'Unknown error')
                        logger.error(f"Error searching for {place_type}: {response.status_code} - {error_msg}")
                        api_errors += 1
                        if api_errors >= 3:
                            logger.warning("Multiple API errors encountered. Falling back to mock data.")
                            return self._get_mock_nearby_places(latitude, longitude)
                        continue

                    results = response.json()

                    if results.get('places'):
                        for place in results['places']:
                            location = place.get('location', {})
                            place_lat = location.get('latitude', latitude)
                            place_lng = location.get('longitude', longitude)

                            # Map to our format
                            place_data = {
                                'place_id': place.get('id'),
                                'name': place.get('displayName', {}).get('text', 'Unknown'),
                                'category': self._map_place_type_to_category(place.get('types', [])),
                                'place_types': place.get('types', []),
                                'address': place.get('formattedAddress', ''),
                                'latitude': place_lat,
                                'longitude': place_lng,
                                'rating': place.get('rating'),
                                'price_level': self._map_price_level(place.get('priceLevel')),
                                'is_open': self._check_if_open(place.get('regularOpeningHours')),
                                'distance_meters': self._calculate_distance(
                                    latitude, longitude,
                                    place_lat,
                                    place_lng
                                )
                            }
                            all_places.append(place_data)

                except Exception as e:
                    logger.error(f"Error searching for {place_type}: {e}")
                    api_errors += 1
                    if api_errors >= 3:
                        logger.warning("Multiple API errors encountered. Falling back to mock data.")
                        return self._get_mock_nearby_places(latitude, longitude)
                    continue

            # Remove duplicates (same place might appear in multiple type searches)
            unique_places = {p['place_id']: p for p in all_places if p['place_id']}.values()

            # Sort by distance
            sorted_places = sorted(unique_places, key=lambda x: x['distance_meters'])

            # Return top 20 closest places
            return list(sorted_places)[:20]

        except Exception as e:
            logger.error(f"Error fetching nearby places: {e}", exc_info=True)
            return self._get_mock_nearby_places(latitude, longitude)

    def _get_osm_nearby_places(
        self,
        latitude: float,
        longitude: float,
        radius: int = 2000
    ) -> List[Dict]:
        """
        Get nearby places from OpenStreetMap Overpass API (FREE, no API key required)

        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius: Search radius in meters

        Returns:
            List of nearby places with details
        """
        try:
            # Overpass API endpoint
            url = "https://overpass-api.de/api/interpreter"

            # Build Overpass QL query for places relevant to credit card rewards
            # Query for amenities: restaurants, cafes, fuel stations, etc.
            query = f"""
            [out:json][timeout:25];
            (
              // Dining
              node["amenity"="restaurant"](around:{radius},{latitude},{longitude});
              node["amenity"="cafe"](around:{radius},{latitude},{longitude});
              node["amenity"="fast_food"](around:{radius},{latitude},{longitude});
              node["amenity"="bar"](around:{radius},{latitude},{longitude});

              // Groceries
              node["shop"="supermarket"](around:{radius},{latitude},{longitude});
              node["shop"="grocery"](around:{radius},{latitude},{longitude});
              node["shop"="convenience"](around:{radius},{latitude},{longitude});

              // Gas stations
              node["amenity"="fuel"](around:{radius},{latitude},{longitude});

              // Shopping
              node["shop"="mall"](around:{radius},{latitude},{longitude});
              node["shop"="department_store"](around:{radius},{latitude},{longitude});
              node["shop"="clothes"](around:{radius},{latitude},{longitude});
              node["shop"="electronics"](around:{radius},{latitude},{longitude});

              // Entertainment
              node["amenity"="cinema"](around:{radius},{latitude},{longitude});
              node["leisure"="bowling_alley"](around:{radius},{latitude},{longitude});

              // Travel
              node["tourism"="hotel"](around:{radius},{latitude},{longitude});
              node["aeroway"="aerodrome"](around:{radius},{latitude},{longitude});
            );
            out body;
            """

            response = requests.post(url, data={"data": query}, timeout=30)

            if response.status_code != 200:
                logger.error(f"OSM Overpass API error: {response.status_code}")
                return self._get_mock_nearby_places(latitude, longitude)

            results = response.json()
            all_places = []

            for element in results.get('elements', []):
                if element.get('type') != 'node':
                    continue

                tags = element.get('tags', {})
                place_lat = element.get('lat')
                place_lng = element.get('lon')

                if not place_lat or not place_lng:
                    continue

                # Determine category from OSM tags
                category = self._map_osm_tags_to_category(tags)

                # Get place name
                name = tags.get('name', tags.get('brand', 'Unknown Place'))

                place_data = {
                    'place_id': f"osm_{element.get('id')}",
                    'name': name,
                    'category': category,
                    'place_types': self._get_osm_place_types(tags),
                    'address': self._build_osm_address(tags),
                    'latitude': place_lat,
                    'longitude': place_lng,
                    'rating': None,  # OSM doesn't have ratings
                    'price_level': None,  # OSM doesn't have price levels
                    'is_open': None,  # Would need additional parsing for opening_hours
                    'distance_meters': self._calculate_distance(
                        latitude, longitude,
                        place_lat,
                        place_lng
                    )
                }
                all_places.append(place_data)

            # Remove duplicates and sort by distance
            unique_places = {p['place_id']: p for p in all_places if p['place_id']}.values()
            sorted_places = sorted(unique_places, key=lambda x: x['distance_meters'])

            logger.info(f"Found {len(sorted_places)} places from OpenStreetMap")
            return list(sorted_places)[:20]

        except Exception as e:
            logger.error(f"Error fetching from OSM Overpass API: {e}", exc_info=True)
            return self._get_mock_nearby_places(latitude, longitude)

    def _map_osm_tags_to_category(self, tags: Dict) -> str:
        """Map OpenStreetMap tags to our credit card categories"""
        # Check amenity tags
        amenity = tags.get('amenity', '')
        if amenity in ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court']:
            return 'dining'
        if amenity == 'fuel':
            return 'gas'
        if amenity == 'cinema':
            return 'entertainment'

        # Check shop tags
        shop = tags.get('shop', '')
        if shop in ['supermarket', 'grocery', 'convenience']:
            return 'groceries'
        if shop in ['mall', 'department_store', 'clothes', 'electronics', 'shoes', 'jewelry']:
            return 'shopping'

        # Check tourism tags
        if tags.get('tourism') == 'hotel':
            return 'travel'

        # Check aeroway tags
        if tags.get('aeroway') == 'aerodrome':
            return 'travel'

        # Check leisure tags
        if tags.get('leisure') in ['bowling_alley', 'amusement_arcade']:
            return 'entertainment'

        return 'other'

    def _get_osm_place_types(self, tags: Dict) -> List[str]:
        """Extract place types from OSM tags"""
        types = []
        if 'amenity' in tags:
            types.append(tags['amenity'])
        if 'shop' in tags:
            types.append(tags['shop'])
        if 'tourism' in tags:
            types.append(tags['tourism'])
        if 'leisure' in tags:
            types.append(tags['leisure'])
        if 'aeroway' in tags:
            types.append(tags['aeroway'])
        return types

    def _build_osm_address(self, tags: Dict) -> str:
        """Build address string from OSM tags"""
        parts = []
        if tags.get('addr:housenumber'):
            parts.append(tags['addr:housenumber'])
        if tags.get('addr:street'):
            parts.append(tags['addr:street'])
        if tags.get('addr:city'):
            parts.append(tags['addr:city'])
        if tags.get('addr:postcode'):
            parts.append(tags['addr:postcode'])

        return ', '.join(parts) if parts else ''

    def _map_price_level(self, price_level: Optional[str]) -> Optional[int]:
        """Map new API price level string to integer"""
        if not price_level:
            return None
        price_mapping = {
            'PRICE_LEVEL_FREE': 0,
            'PRICE_LEVEL_INEXPENSIVE': 1,
            'PRICE_LEVEL_MODERATE': 2,
            'PRICE_LEVEL_EXPENSIVE': 3,
            'PRICE_LEVEL_VERY_EXPENSIVE': 4
        }
        return price_mapping.get(price_level)

    def _check_if_open(self, opening_hours: Optional[Dict]) -> Optional[bool]:
        """Check if place is currently open based on opening hours"""
        if not opening_hours:
            return None
        return opening_hours.get('openNow')

    def _map_place_type_to_category(self, place_types: List[str]) -> str:
        """Map Google place types to our credit card categories"""
        type_mapping = {
            # Dining
            'restaurant': 'dining',
            'cafe': 'dining',
            'bar': 'dining',
            'meal_delivery': 'dining',
            'meal_takeaway': 'dining',
            'food': 'dining',
            'coffee_shop': 'dining',
            'bakery': 'dining',
            'fast_food_restaurant': 'dining',
            'american_restaurant': 'dining',
            'italian_restaurant': 'dining',
            'mexican_restaurant': 'dining',
            'chinese_restaurant': 'dining',
            'japanese_restaurant': 'dining',
            'indian_restaurant': 'dining',
            'thai_restaurant': 'dining',
            'vietnamese_restaurant': 'dining',
            'pizza_restaurant': 'dining',
            'seafood_restaurant': 'dining',
            'steak_house': 'dining',
            'sushi_restaurant': 'dining',
            'ice_cream_shop': 'dining',
            # Groceries
            'grocery_or_supermarket': 'groceries',
            'grocery_store': 'groceries',
            'supermarket': 'groceries',
            # Gas
            'gas_station': 'gas',
            # Travel
            'airport': 'travel',
            'hotel': 'travel',
            'lodging': 'travel',
            'travel_agency': 'travel',
            'extended_stay_hotel': 'travel',
            'motel': 'travel',
            # Entertainment
            'movie_theater': 'entertainment',
            'amusement_park': 'entertainment',
            'bowling_alley': 'entertainment',
            'night_club': 'entertainment',
            'performing_arts_theater': 'entertainment',
            # Shopping
            'shopping_mall': 'shopping',
            'department_store': 'shopping',
            'clothing_store': 'shopping',
            'electronics_store': 'shopping',
            'furniture_store': 'shopping',
            'home_goods_store': 'shopping',
            'jewelry_store': 'shopping',
            'shoe_store': 'shopping',
            'sporting_goods_store': 'shopping',
            'store': 'shopping',
        }

        for place_type in place_types:
            if place_type in type_mapping:
                return type_mapping[place_type]

        return 'other'

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in meters using Haversine formula"""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371000  # Earth's radius in meters

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        a = sin(delta_lat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c
        return distance

    def _get_mock_nearby_places(self, latitude: float, longitude: float) -> List[Dict]:
        """
        Return mock nearby places when Google API is not configured.
        Useful for development and testing.
        """
        logger.info("Using mock nearby places (Google API not available)")

        # Mock places based on common categories with realistic locations
        mock_places = [
            {
                'place_id': 'mock_target_1',
                'name': 'Target',
                'category': 'shopping',
                'place_types': ['department_store', 'shopping'],
                'address': '123 Main St',
                'latitude': latitude + 0.01,
                'longitude': longitude + 0.01,
                'rating': 4.2,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 500
            },
            {
                'place_id': 'mock_whole_foods_1',
                'name': 'Whole Foods Market',
                'category': 'groceries',
                'place_types': ['grocery_or_supermarket', 'supermarket'],
                'address': '456 Oak Ave',
                'latitude': latitude + 0.005,
                'longitude': longitude + 0.005,
                'rating': 4.5,
                'price_level': 3,
                'is_open': True,
                'distance_meters': 750
            },
            {
                'place_id': 'mock_chipotle_1',
                'name': 'Chipotle Mexican Grill',
                'category': 'dining',
                'place_types': ['restaurant', 'food'],
                'address': '789 Restaurant Row',
                'latitude': latitude + 0.008,
                'longitude': longitude + 0.003,
                'rating': 4.0,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 900
            },
            {
                'place_id': 'mock_shell_1',
                'name': 'Shell Gas Station',
                'category': 'gas',
                'place_types': ['gas_station'],
                'address': '321 Highway Blvd',
                'latitude': latitude + 0.012,
                'longitude': longitude + 0.008,
                'rating': 3.8,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 1200
            },
            {
                'place_id': 'mock_starbucks_1',
                'name': 'Starbucks',
                'category': 'dining',
                'place_types': ['cafe', 'food'],
                'address': '555 Coffee Lane',
                'latitude': latitude + 0.003,
                'longitude': longitude + 0.007,
                'rating': 4.3,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 600
            },
            {
                'place_id': 'mock_walmart_1',
                'name': 'Walmart Supercenter',
                'category': 'groceries',
                'place_types': ['grocery_or_supermarket', 'department_store'],
                'address': '888 Commerce Dr',
                'latitude': latitude + 0.015,
                'longitude': longitude + 0.002,
                'rating': 3.9,
                'price_level': 1,
                'is_open': True,
                'distance_meters': 1500
            },
            {
                'place_id': 'mock_costco_1',
                'name': 'Costco Wholesale',
                'category': 'groceries',
                'place_types': ['grocery_or_supermarket', 'warehouse_club'],
                'address': '999 Wholesale Way',
                'latitude': latitude + 0.018,
                'longitude': longitude + 0.005,
                'rating': 4.4,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 1800
            },
            {
                'place_id': 'mock_panerabread_1',
                'name': 'Panera Bread',
                'category': 'dining',
                'place_types': ['restaurant', 'cafe', 'bakery'],
                'address': '222 Bakery Street',
                'latitude': latitude + 0.006,
                'longitude': longitude + 0.009,
                'rating': 4.1,
                'price_level': 2,
                'is_open': True,
                'distance_meters': 800
            }
        ]

        return mock_places

    def format_distance(self, distance_meters: float) -> str:
        """Format distance for display"""
        if distance_meters < 1000:
            return f"{int(distance_meters)}m"
        else:
            return f"{distance_meters / 1000:.1f}km"


# Singleton instance
location_service = LocationService()
