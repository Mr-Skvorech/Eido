import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
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
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });

    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // Если нет ответа сервера — это не проблема авторизации
        if (!error.response) {
            return Promise.reject(error);
        }

        // Обрабатываем только 401
        if (error.response.status !== 401) {
            return Promise.reject(error);
        }

        // Не пытаемся обновлять токен для самого refresh-запроса
        if (originalRequest.url.includes('/api/token/refresh/')) {
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Если запрос уже повторяли — выходим
        if (originalRequest._retry) {
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // Если обновление уже выполняется — ставим запрос в очередь
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            });
        }

        isRefreshing = true;

        try {
            const refreshToken = localStorage.getItem("refresh_token");

            if (!refreshToken) {
                throw new Error("Нет refresh token");
            }

            const response = await axios.post(
                "http://127.0.0.1:8000/api/token/refresh/",
                {
                    refresh: refreshToken,
                }
            );

            const newAccess = response.data.access;

            localStorage.setItem("access_token", newAccess);

            api.defaults.headers.common.Authorization =
                `Bearer ${newAccess}`;

            processQueue(null, newAccess);

            originalRequest.headers.Authorization =
                `Bearer ${newAccess}`;

            return api(originalRequest);

        } catch (err) {
            processQueue(err, null);

            localStorage.clear();
            window.location.href = "/login";

            return Promise.reject(err);

        } finally {
            isRefreshing = false;
        }
    }
);

export default api;