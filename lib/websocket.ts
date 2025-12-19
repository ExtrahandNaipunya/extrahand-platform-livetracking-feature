import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from './redis';

let io: SocketIOServer | null = null;

export function initializeWebSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token || token !== process.env.WEBSOCKET_SECRET) {
      // In production, implement proper authentication
      // For now, we'll allow connections
    }
    
    next();
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', async (taskId: string) => {
      if (!taskId) {
        socket.emit('error', { message: 'Task ID is required' });
        return;
      }

      const channel = `task:${taskId}`;
      await socket.join(channel);
      console.log(`Client ${socket.id} subscribed to ${channel}`);

      // Send initial data
      try {
        const taskLocation = await redis.get(`task:${taskId}:location`);
        if (taskLocation) {
          socket.emit('location_update', taskLocation);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    });

    socket.on('unsubscribe', async (taskId: string) => {
      const channel = `task:${taskId}`;
      await socket.leave(channel);
      console.log(`Client ${socket.id} unsubscribed from ${channel}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export async function broadcastLocationUpdate(taskId: string, data: any) {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return;
  }

  const channel = `task:${taskId}`;
  io.to(channel).emit('location_update', data);
}
