import { io } from 'socket.io-client';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket) socket.disconnect();

  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('register', { userId, role: 'student' });
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
