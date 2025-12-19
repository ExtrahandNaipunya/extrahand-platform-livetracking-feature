require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Redis } = require('@upstash/redis');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN || '',
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // WebSocket connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', async (taskId) => {
      if (!taskId) {
        socket.emit('error', { message: 'Task ID is required' });
        return;
      }

      const channel = `task:${taskId}`;
      await socket.join(channel);
      console.log(`Client ${socket.id} subscribed to ${channel}`);

      // Send initial data from Redis
      try {
        const taskLocation = await redis.get(`task:${taskId}:location`);
        if (taskLocation) {
          const data = typeof taskLocation === 'string' 
            ? JSON.parse(taskLocation) 
            : taskLocation;
          socket.emit('location_update', data);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    });

    socket.on('unsubscribe', async (taskId) => {
      const channel = `task:${taskId}`;
      await socket.leave(channel);
      console.log(`Client ${socket.id} unsubscribed from ${channel}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Store io instance globally for API routes
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server initialized`);
  });
});
