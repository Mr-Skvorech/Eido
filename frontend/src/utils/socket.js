import { io } from 'socket.io-client';

// Указываем URL сервера, на котором висит Socket.io (Django бэкенд)
const SOCKET_URL = 'http://127.0.0.1:8000';

// Создаем и экспортируем единственный инстанс сокета.
// Он автоматически подключится при первом импорте.
const socket = io(SOCKET_URL, {
  // forceNew: false гарантирует, что инстанс переиспользуется
  forceNew: false, 
  // Явно указываем транспорты, чтобы избежать проблем с CORS на этапе polling'а
  transports: ['websocket', 'polling'],
});

export default socket;