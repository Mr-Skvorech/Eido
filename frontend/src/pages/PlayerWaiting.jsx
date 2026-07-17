import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';

export default function PlayerWaiting() {
  const navigate = useNavigate();

  useEffect(() => {
    const onGameStarted = (data) => {
      const pin = data?.pin || localStorage.getItem('room_pin');
      navigate(`/player/game/${pin}`);
    };

    socket.on('game_started', onGameStarted);

    return () => {
      socket.off('game_started', onGameStarted);
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