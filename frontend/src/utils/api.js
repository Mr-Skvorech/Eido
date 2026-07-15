import axios from 'axios';

// Создаем базовый инстанс axios
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // URL твоего Django-бэкенда
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем "перехватчик" (interceptor), который автоматически 
// прикрепляет токен авторизации ко всем запросам
api.interceptors.request.use(
  (config) => {
    // Проверь, как именно ты сохраняешь токен при логине (здесь пример 'token')
    const token = localStorage.getItem('access_token'); 
    
    if (token) {
      // Для Django REST Framework обычно используется префикс 'Bearer' или 'Token'
      config.headers.Authorization = `Bearer ${token}`; 
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;