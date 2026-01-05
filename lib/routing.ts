import { Location } from '@/types';

/**
 * Fetch route from Google Directions API
 * Supports optional waypoint for routing through intermediate location
 */
export async function getRoute(
  origin: Location,
  destination: Location,
  waypoint?: Location
): Promise<Array<{ lat: number; lng: number }> | null> {
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.append('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.append('destination', `${destination.lat},${destination.lng}`);
    
    // Add waypoint if provided (for routing through pickup)
    if (waypoint) {
      url.searchParams.append('waypoints', `${waypoint.lat},${waypoint.lng}`);
    }
    
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const polyline = route.overview_polyline.points;
      
      // Decode polyline to array of coordinates
      const decodedPath = decodePolyline(polyline);
      return decodedPath;
    }

    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Decode Google Maps polyline string to array of coordinates
 * Algorithm from Google Polyline Encoding documentation
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return poly;
}

/**
 * Generate simple straight-line route as fallback
 */
export function generateFallbackRoute(
  origin: Location,
  destination: Location,
  points: number = 10
): Array<{ lat: number; lng: number }> {
  const route: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    route.push({
      lat: origin.lat + (destination.lat - origin.lat) * ratio,
      lng: origin.lng + (destination.lng - origin.lng) * ratio,
    });
  }

  return route;
}
