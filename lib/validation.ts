import { z } from 'zod';

export const driverUpdateSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).optional().default(0),
  timestamp: z.number().positive(),
});

export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;
