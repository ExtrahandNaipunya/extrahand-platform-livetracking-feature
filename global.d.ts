/**
 * Global declarations for WebSocket server instance
 * Allows API routes to access Socket.IO server
 */

import { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
}

export {};
