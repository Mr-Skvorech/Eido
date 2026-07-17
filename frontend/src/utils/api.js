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

// Обрабатываем истекший Access Token
api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // Если это не 401 — просто пробрасываем ошибку
        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // Если уже пытались обновить токен — выходим
        if (originalRequest._retry) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';

            return Promise.reject(error);
        }

        originalRequest._retry = true;

        const refreshToken = localStorage.getItem('refresh_token');

        // Refresh отсутствует
        if (!refreshToken) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';

            return Promise.reject(error);
        }

        try {
            // Получаем новый Access
            const response = await axios.post(
                'http://127.0.0.1:8000/api/token/refresh/',
                {
                    refresh: refreshToken,
                }
            );

            const newAccessToken = response.data.access;

            // Сохраняем новый токен
            localStorage.setItem('access_token', newAccessToken);

            // Обновляем дефолтный заголовок axios
            api.defaults.headers.common.Authorization =
                `Bearer ${newAccessToken}`;

            // Обновляем заголовок текущего запроса
            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            // Повторяем запрос
            return api(originalRequest);

        } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            window.location.href = '/login';

            return Promise.reject(refreshError);
        }
    }
);

export default api;