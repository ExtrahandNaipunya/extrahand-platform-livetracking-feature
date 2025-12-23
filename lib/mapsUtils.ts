// Google Maps utilities and optimizations

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Round coordinates to reduce precision (6 decimals = 11cm accuracy)
export function roundCoordinates(lat: number, lng: number, precision: number = 6) {
  return {
    lat: Number(lat.toFixed(precision)),
    lng: Number(lng.toFixed(precision)),
  };
}

// Geocoding cache using Map
const geocodeCache = new Map<string, string>();
const CACHE_MAX_SIZE = 100;

export function getCachedGeocode(key: string): string | undefined {
  return geocodeCache.get(key);
}

export function setCachedGeocode(key: string, value: string): void {
  // Limit cache size
  if (geocodeCache.size >= CACHE_MAX_SIZE) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) {
      geocodeCache.delete(firstKey);
    }
  }
  geocodeCache.set(key, value);
}

// Create geocode cache key from coordinates
export function createGeocodeKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Reverse geocode with caching
export async function reverseGeocodeWithCache(
  lat: number,
  lng: number
): Promise<string> {
  const rounded = roundCoordinates(lat, lng);
  const cacheKey = createGeocodeKey(rounded.lat, rounded.lng);

  // Check cache first
  const cached = getCachedGeocode(cacheKey);
  if (cached) {
    return cached;
  }

  // If not in cache, geocode
  if (!window.google) {
    return `${rounded.lat.toFixed(6)}, ${rounded.lng.toFixed(6)}`;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: rounded });
    const address = result.results[0]?.formatted_address || cacheKey;
    
    // Cache the result
    setCachedGeocode(cacheKey, address);
    return address;
  } catch (error) {
    console.error('Geocoding error:', error);
    return cacheKey;
  }
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if coordinates are within city bounds
export function isWithinCityBounds(
  lat: number,
  lng: number,
  cityBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean {
  return (
    lat >= cityBounds.south &&
    lat <= cityBounds.north &&
    lng >= cityBounds.west &&
    lng <= cityBounds.east
  );
}

// City boundaries (example for major Indian cities)
export const CITY_BOUNDS = {
  hyderabad: {
    north: 17.6,
    south: 17.2,
    east: 78.7,
    west: 78.2,
  },
  bangalore: {
    north: 13.2,
    south: 12.7,
    east: 77.9,
    west: 77.3,
  },
  mumbai: {
    north: 19.3,
    south: 18.9,
    east: 73.0,
    west: 72.7,
  },
  delhi: {
    north: 28.9,
    south: 28.4,
    east: 77.4,
    west: 76.8,
  },
  chennai: {
    north: 13.3,
    south: 12.8,
    east: 80.4,
    west: 80.0,
  },
};

// Optimize autocomplete options for city
export function getAutocompleteOptions(cityId: string) {
  const bounds = CITY_BOUNDS[cityId.toLowerCase() as keyof typeof CITY_BOUNDS];
  
  return {
    componentRestrictions: { country: 'in' },
    bounds: bounds
      ? new google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east }
        )
      : undefined,
    strictBounds: false, // Allow outside bounds but prioritize inside
  };
}
