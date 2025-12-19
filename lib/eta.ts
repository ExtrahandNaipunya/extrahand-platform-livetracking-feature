import { Location } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistance(
  point1: Location,
  point2: Location
): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA using Google Distance Matrix API
 */
export async function calculateETAWithGoogle(
  origin: Location,
  destination: Location
): Promise<{ eta: string; distance: number; duration: number } | null> {
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_KEY;

  if (!apiKey) {
    console.warn('Google Distance Matrix API key not configured');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', `${origin.lat},${origin.lng}`);
    url.searchParams.append('destinations', `${destination.lat},${destination.lng}`);
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const durationInSeconds = element.duration.value;
      const distanceInMeters = element.distance.value;

      return {
        eta: formatDuration(durationInSeconds),
        distance: distanceInMeters / 1000, // Convert to km
        duration: durationInSeconds,
      };
    }

    return null;
  } catch (error) {
    console.error('Error calculating ETA with Google API:', error);
    return null;
  }
}

/**
 * Fallback ETA calculation using Haversine distance
 * Assumes average speed if not provided
 */
export function calculateETAFallback(
  current: Location,
  destination: Location,
  speedKmh: number = 40
): { eta: string; distance: number; duration: number } {
  const distance = haversineDistance(current, destination);
  const durationHours = distance / speedKmh;
  const durationSeconds = Math.round(durationHours * 3600);

  return {
    eta: formatDuration(durationSeconds),
    distance,
    duration: durationSeconds,
  };
}

/**
 * Calculate comprehensive ETA with Google API and fallback
 */
export async function calculateETA(
  current: Location,
  destination: Location,
  speedKmh?: number
): Promise<{ eta: string; distance: number; duration: number }> {
  // Try Google API first
  const googleResult = await calculateETAWithGoogle(current, destination);
  
  if (googleResult) {
    return googleResult;
  }

  // Fallback to Haversine calculation
  return calculateETAFallback(current, destination, speedKmh);
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min';
  }

  const minutes = Math.round(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }

  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes > 1 ? 's' : ''}`;
}

/**
 * Determine task status based on distance to destination
 */
export function determineTaskStatus(distanceKm: number): string {
  if (distanceKm < 0.5) {
    return 'ARRIVING';
  } else if (distanceKm < 1) {
    return 'ON_THE_WAY';
  }
  return 'ON_THE_WAY';
}
