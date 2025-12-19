import { Location } from '@/types';

/**
 * Linear interpolation between two points
 * Used for smooth marker animation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Interpolate between two locations
 */
export function interpolateLocation(
  start: Location,
  end: Location,
  t: number
): Location {
  return {
    lat: lerp(start.lat, end.lat, t),
    lng: lerp(start.lng, end.lng, t),
  };
}

/**
 * Calculate bearing (direction) between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(start: Location, end: Location): number {
  const startLat = toRadians(start.lat);
  const startLng = toRadians(start.lng);
  const endLat = toRadians(end.lat);
  const endLng = toRadians(end.lng);

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const bearing = Math.atan2(y, x);
  const degrees = toDegrees(bearing);

  return (degrees + 360) % 360;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Smooth location updates using exponential moving average
 * Reduces GPS jitter
 */
export class LocationSmoother {
  private lastLocation: Location | null = null;
  private alpha: number;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha; // Smoothing factor (0-1)
  }

  smooth(newLocation: Location): Location {
    if (!this.lastLocation) {
      this.lastLocation = newLocation;
      return newLocation;
    }

    const smoothed = {
      lat: this.alpha * newLocation.lat + (1 - this.alpha) * this.lastLocation.lat,
      lng: this.alpha * newLocation.lng + (1 - this.alpha) * this.lastLocation.lng,
    };

    this.lastLocation = smoothed;
    return smoothed;
  }

  reset() {
    this.lastLocation = null;
  }
}

/**
 * Kalman filter for location smoothing (simplified version)
 * Can be used for more advanced smoothing
 */
export class KalmanLocationFilter {
  private variance: number;
  private minAccuracy: number;
  private q: number;

  constructor() {
    this.variance = -1;
    this.minAccuracy = 1;
    this.q = 3;
  }

  filter(location: Location, accuracy: number = 10): Location {
    if (this.variance < 0) {
      this.variance = accuracy * accuracy;
      return location;
    }

    const predictionVariance = this.variance + this.q;
    const kalmanGain = predictionVariance / (predictionVariance + accuracy * accuracy);

    if (!this.lastLocation) {
      this.lastLocation = location;
      this.variance = (1 - kalmanGain) * predictionVariance;
      return location;
    }

    const filtered = {
      lat: this.lastLocation.lat + kalmanGain * (location.lat - this.lastLocation.lat),
      lng: this.lastLocation.lng + kalmanGain * (location.lng - this.lastLocation.lng),
    };

    this.variance = (1 - kalmanGain) * predictionVariance;
    this.lastLocation = filtered;

    return filtered;
  }

  private lastLocation: Location | null = null;

  reset() {
    this.variance = -1;
    this.lastLocation = null;
  }
}
