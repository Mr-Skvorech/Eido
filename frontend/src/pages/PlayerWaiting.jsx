import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:8000');

export default function PlayerWaiting() {
  const navigate = useNavigate();

  useEffect(() => {
    // Слушаем сигнал от сервера о том, что ведущий запустил игру
    socket.on('game_started', () => {
      // Перенаправляем игрока на экран с кнопками ответов
      navigate('/player/game'); 
    });

    return () => {
      socket.off('game_started');
    };
  }, [navigate]);

  return (
    <div className="uk-flex uk-flex-center uk-flex-middle" style={{ height: '100vh', backgroundColor: '#f8f8f8' }}>
      <div className="uk-text-center">
        <div data-uk-spinner="ratio: 3" className="uk-margin-bottom uk-text-primary"></div>
        <h2 className="uk-text-bold">Вы в игре!</h2>
        <p className="uk-text-large uk-text-muted">
          Смотрите на главный экран ведущего.<br/>Игра скоро начнется...
        </p>
      </div>
    </div>
  );
}