import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:8000');

export default function PlayerJoin() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Подготавливаем заголовки. Добавляем токен, если он есть.
      // ВАЖНО: замени 'access_token' на тот ключ, под которым ты хранишь токен при логине!
      const token = localStorage.getItem('access_token'); 
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Отправляем запрос на бэкенд (регистрация в MySQL)
      const res = await fetch('http://127.0.0.1:8000/api/game/join/', {
        method: 'POST',
        headers: headers, // Используем наши заголовки
        body: JSON.stringify({ pin, name })
      });
      
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка подключения');
        setIsLoading(false);
        return;
      }

      // 2. Сохраняем session_token, чтобы игрок мог обновить страницу
      localStorage.setItem('session_token', data.session_token);

      // 3. Отправляем событие по WebSockets, чтобы ведущий увидел имя
      socket.emit('player_joined', { pin, name });

      // 4. Переводим игрока в его комнату ожидания (заглушка на будущее)
      navigate('/player/waiting');

    } catch (err) {
      setError('Ошибка сети. Проверьте подключение к серверу.');
      setIsLoading(false);
    }
  };

  return (
    <div className="uk-flex uk-flex-center uk-flex-middle" style={{ height: '100vh', backgroundColor: '#f8f8f8' }}>
      <div className="uk-card uk-card-default uk-card-body uk-width-1-1 uk-width-1-3@m uk-box-shadow-large">
        <h2 className="uk-card-title uk-text-center uk-text-bold">Eido_quiz</h2>
        
        {error && (
          <div className="uk-alert-danger" data-uk-alert>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div className="uk-margin">
            <div className="uk-inline uk-width-1-1">
              <span className="uk-form-icon" data-uk-icon="icon: hashtag"></span>
              <input 
                className="uk-input uk-form-large uk-text-center" 
                type="text" 
                placeholder="PIN-код" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                required
              />
            </div>
          </div>

          <div className="uk-margin">
            <div className="uk-inline uk-width-1-1">
              <span className="uk-form-icon" data-uk-icon="icon: user"></span>
              <input 
                className="uk-input uk-form-large uk-text-center" 
                type="text" 
                placeholder="Ваше имя" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
            </div>
          </div>

          <div className="uk-margin">
            <button 
              type="submit" 
              className="uk-button uk-button-primary uk-button-large uk-width-1-1"
              disabled={isLoading}
            >
              {isLoading ? <div data-uk-spinner="ratio: 0.8"></div> : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}