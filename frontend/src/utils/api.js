import axios from 'axios';

// Создаем базовый инстанс axios
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // URL твоего Django-бэкенда
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если бэкенд вернул 401 и мы еще не пробовали повторить этот запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Делаем запрос на рефреш через чистый axios (чтобы избежать зацикливания)
          const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // Обновляем заголовок в упавшем запросе и повторяем его заново
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Если рефреш-токен тоже протух — разлогиниваем пользователя
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login'; 
          return Promise.reject(refreshError);
        }
      }
    }

    // Пробрасываем ошибку дальше, если это не 401 или обновить токен не удалось
    return Promise.reject(error);
  }
);

export default api;