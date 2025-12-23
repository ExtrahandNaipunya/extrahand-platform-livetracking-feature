// Multi-stop routing utility
import { Location } from '@/types';

export interface Waypoint extends Location {
  name?: string;
  order: number;
  type: 'pickup' | 'stop' | 'destination';
  completed?: boolean;
}

export interface MultiStopRoute {
  waypoints: Waypoint[];
  totalDistance: number;
  totalDuration: number;
  optimized: boolean;
}

/**
 * Calculate distance between two points (Haversine)
 */
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total route distance
 */
export function calculateRouteDistance(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

/**
 * Optimize waypoint order using nearest neighbor algorithm
 * Keeps first (pickup) and last (destination) fixed
 */
export function optimizeWaypoints(waypoints: Waypoint[]): Waypoint[] {
  if (waypoints.length <= 2) return waypoints;

  const fixedStart = waypoints[0];
  const fixedEnd = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1);

  if (middle.length === 0) return waypoints;

  // Simple nearest neighbor
  const optimized: Waypoint[] = [fixedStart];
  const remaining = [...middle];
  let current = fixedStart;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(current, remaining[0]);

    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistance(current, remaining[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    current = nearest;
  }

  optimized.push(fixedEnd);

  // Update order numbers
  return optimized.map((wp, index) => ({ ...wp, order: index }));
}

/**
 * Add waypoint to route
 */
export function addWaypoint(
  currentWaypoints: Waypoint[],
  newLocation: Location,
  name?: string
): Waypoint[] {
  const newWaypoint: Waypoint = {
    ...newLocation,
    name: name || `Stop ${currentWaypoints.length}`,
    order: currentWaypoints.length,
    type: 'stop',
  };

  // Insert before destination
  const destination = currentWaypoints[currentWaypoints.length - 1];
  const withoutDestination = currentWaypoints.slice(0, -1);
  
  return [...withoutDestination, newWaypoint, { ...destination, order: currentWaypoints.length }];
}

/**
 * Remove waypoint from route
 */
export function removeWaypoint(waypoints: Waypoint[], index: number): Waypoint[] {
  if (index === 0 || index === waypoints.length - 1) {
    // Cannot remove pickup or destination
    return waypoints;
  }

  const filtered = waypoints.filter((_, i) => i !== index);
  return filtered.map((wp, i) => ({ ...wp, order: i }));
}

/**
 * Reorder waypoints
 */
export function reorderWaypoints(
  waypoints: Waypoint[],
  fromIndex: number,
  toIndex: number
): Waypoint[] {
  // Cannot move pickup (0) or destination (last)
  if (fromIndex === 0 || fromIndex === waypoints.length - 1) return waypoints;
  if (toIndex === 0 || toIndex === waypoints.length - 1) return waypoints;

  const result = [...waypoints];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  return result.map((wp, i) => ({ ...wp, order: i }));
}

/**
 * Get next incomplete waypoint
 */
export function getNextWaypoint(waypoints: Waypoint[]): Waypoint | null {
  return waypoints.find((wp) => !wp.completed) || null;
}

/**
 * Mark waypoint as completed
 */
export function completeWaypoint(waypoints: Waypoint[], index: number): Waypoint[] {
  return waypoints.map((wp, i) => (i === index ? { ...wp, completed: true } : wp));
}

/**
 * Validate multi-stop route
 */
export function validateRoute(waypoints: Waypoint[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (waypoints.length < 2) {
    errors.push('Route must have at least pickup and destination');
  }

  if (waypoints[0].type !== 'pickup') {
    errors.push('First waypoint must be pickup location');
  }

  if (waypoints[waypoints.length - 1].type !== 'destination') {
    errors.push('Last waypoint must be destination');
  }

  if (waypoints.length > 10) {
    errors.push('Maximum 10 waypoints allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
