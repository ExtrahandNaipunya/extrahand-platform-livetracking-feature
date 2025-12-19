import { Redis } from '@upstash/redis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN || '',
});

// Redis key patterns
export const REDIS_KEYS = {
  taskLocation: (taskId: string) => `task:${taskId}:location`,
  taskData: (taskId: string) => `task:${taskId}:data`,
  driverLocation: (driverId: string) => `driver:${driverId}:location`,
  etaCache: (taskId: string) => `task:${taskId}:eta`,
  routeCache: (taskId: string) => `task:${taskId}:route`,
};

// Redis TTL in seconds
export const REDIS_TTL = {
  location: 3600, // 1 hour
  eta: 300, // 5 minutes
  route: 1800, // 30 minutes
  taskData: 7200, // 2 hours
};

/**
 * Store task location in Redis
 */
export async function storeTaskLocation(
  taskId: string,
  data: any
): Promise<void> {
  const key = REDIS_KEYS.taskLocation(taskId);
  await redis.setex(key, REDIS_TTL.location, JSON.stringify(data));
}

/**
 * Get task location from Redis
 */
export async function getTaskLocation(taskId: string): Promise<any | null> {
  const key = REDIS_KEYS.taskLocation(taskId);
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Store complete task data
 */
export async function storeTaskData(taskId: string, data: any): Promise<void> {
  const key = REDIS_KEYS.taskData(taskId);
  await redis.setex(key, REDIS_TTL.taskData, JSON.stringify(data));
}

/**
 * Get complete task data
 */
export async function getTaskData(taskId: string): Promise<any | null> {
  const key = REDIS_KEYS.taskData(taskId);
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Cache ETA result
 */
export async function cacheETA(taskId: string, eta: any): Promise<void> {
  const key = REDIS_KEYS.etaCache(taskId);
  await redis.setex(key, REDIS_TTL.eta, JSON.stringify(eta));
}

/**
 * Get cached ETA
 */
export async function getCachedETA(taskId: string): Promise<any | null> {
  const key = REDIS_KEYS.etaCache(taskId);
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Cache route polyline
 */
export async function cacheRoute(taskId: string, route: any): Promise<void> {
  const key = REDIS_KEYS.routeCache(taskId);
  await redis.setex(key, REDIS_TTL.route, JSON.stringify(route));
}

/**
 * Get cached route
 */
export async function getCachedRoute(taskId: string): Promise<any | null> {
  const key = REDIS_KEYS.routeCache(taskId);
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Publish location update to subscribers
 * Uses Socket.IO if available, otherwise just stores in Redis
 */
export async function publishLocationUpdate(
  taskId: string,
  data: any
): Promise<void> {
  // Broadcast via WebSocket if available
  if (global.io) {
    const channel = `task:${taskId}`;
    global.io.to(channel).emit('location_update', data);
  }
  
  // Also publish to Redis pub/sub for scalability
  const channel = `task:${taskId}`;
  await redis.publish(channel, JSON.stringify(data));
}

export default redis;
