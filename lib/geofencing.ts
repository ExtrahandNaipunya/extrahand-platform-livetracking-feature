// Geofencing utility for zone detection and alerts
import { Location } from '@/types';

export interface GeofenceZone {
  center: Location;
  radius: number; // in meters
  type: 'pickup' | 'destination';
  name?: string;
}

export interface GeofenceEvent {
  type: 'entered' | 'exited' | 'approaching';
  zone: GeofenceZone;
  distance: number;
  timestamp: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is inside a geofence zone
 */
export function isInsideGeofence(point: Location, zone: GeofenceZone): boolean {
  const distance = calculateDistance(point, zone.center);
  return distance <= zone.radius;
}

/**
 * Check if a point is approaching a geofence zone
 * Returns true if within 2x the radius but not inside
 */
export function isApproachingGeofence(point: Location, zone: GeofenceZone): boolean {
  const distance = calculateDistance(point, zone.center);
  return distance > zone.radius && distance <= zone.radius * 2;
}

/**
 * Get the closest zone to a point
 */
export function getClosestZone(point: Location, zones: GeofenceZone[]): {
  zone: GeofenceZone;
  distance: number;
} | null {
  if (zones.length === 0) return null;

  let closestZone = zones[0];
  let minDistance = calculateDistance(point, closestZone.center);

  for (let i = 1; i < zones.length; i++) {
    const distance = calculateDistance(point, zones[i].center);
    if (distance < minDistance) {
      minDistance = distance;
      closestZone = zones[i];
    }
  }

  return { zone: closestZone, distance: minDistance };
}

/**
 * Monitor geofence zones and detect events
 */
export class GeofenceMonitor {
  private zones: GeofenceZone[] = [];
  private previousStates: Map<string, boolean> = new Map();
  private listeners: ((event: GeofenceEvent) => void)[] = [];

  constructor(zones: GeofenceZone[]) {
    this.zones = zones;
  }

  /**
   * Add event listener
   */
  addListener(listener: (event: GeofenceEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Update current location and check for geofence events
   */
  checkLocation(currentLocation: Location): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];

    this.zones.forEach((zone) => {
      const zoneKey = `${zone.type}-${zone.center.lat}-${zone.center.lng}`;
      const isInside = isInsideGeofence(currentLocation, zone);
      const wasInside = this.previousStates.get(zoneKey) || false;
      const distance = calculateDistance(currentLocation, zone.center);

      // Entered zone
      if (isInside && !wasInside) {
        const event: GeofenceEvent = {
          type: 'entered',
          zone,
          distance,
          timestamp: Date.now(),
        };
        events.push(event);
        this.notifyListeners(event);
      }

      // Exited zone
      if (!isInside && wasInside) {
        const event: GeofenceEvent = {
          type: 'exited',
          zone,
          distance,
          timestamp: Date.now(),
        };
        events.push(event);
        this.notifyListeners(event);
      }

      // Approaching zone
      if (!isInside && !wasInside && isApproachingGeofence(currentLocation, zone)) {
        const event: GeofenceEvent = {
          type: 'approaching',
          zone,
          distance,
          timestamp: Date.now(),
        };
        events.push(event);
        this.notifyListeners(event);
      }

      this.previousStates.set(zoneKey, isInside);
    });

    return events;
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: GeofenceEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Update zones
   */
  updateZones(zones: GeofenceZone[]): void {
    this.zones = zones;
    this.previousStates.clear();
  }

  /**
   * Get current zones
   */
  getZones(): GeofenceZone[] {
    return [...this.zones];
  }
}

/**
 * Default geofence radius configurations
 */
export const GEOFENCE_CONFIG = {
  PICKUP_RADIUS: 200, // 200 meters
  DESTINATION_RADIUS: 200, // 200 meters
  APPROACH_MULTIPLIER: 2, // Alert when 2x radius away
};

/**
 * Create geofence zones from pickup and destination
 */
export function createGeofenceZones(pickup: Location, destination: Location): GeofenceZone[] {
  return [
    {
      center: pickup,
      radius: GEOFENCE_CONFIG.PICKUP_RADIUS,
      type: 'pickup',
      name: pickup.address || 'Pickup Location',
    },
    {
      center: destination,
      radius: GEOFENCE_CONFIG.DESTINATION_RADIUS,
      type: 'destination',
      name: destination.address || 'Destination',
    },
  ];
}
