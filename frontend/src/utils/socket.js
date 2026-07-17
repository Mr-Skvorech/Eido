import { io } from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:8000';

const socket = io(SOCKET_URL, {
  forceNew: false, 
  transports: ['websocket', 'polling'],
});

export default socket;