import { useEffect, useState } from 'react';
import { useParams, useNavigate, Maps } from 'react-router-dom';
import { io } from 'socket.io-client';

// Подключаемся к нашему серверу (в будущем URL лучше вынести в .env)
const socket = io('http://127.0.0.1:8000');

export default function HostLobby() {
  const { pin } = useParams(); // Получаем PIN из URL
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // 1. Ведущий заходит в комнату (чтобы слушать события именно этого PIN)
    socket.emit('join_room', { pin });

    // 2. Слушаем событие добавления новых игроков
    socket.on('new_player', (data) => {
      setPlayers((prev) => [...prev, data.name]);
    });

    // Очистка слушателей при уходе со страницы
    return () => {
      socket.off('new_player');
    };
  }, [pin]);

  const handleStartQuiz = () => {
    // Отправляем на бэкенд команду о старте игры, передавая PIN
    socket.emit('start_quiz', { pin });
    
    // Переводим ведущего на экран отображения первого вопроса
    navigate(`/host/game/${pin}`); 
  };

  return (
    <div className="uk-container uk-margin-large-top uk-text-center">
      <div className="uk-card uk-card-default uk-card-body uk-box-shadow-large">
        <h2 className="uk-text-muted uk-margin-remove-bottom">Присоединяйтесь по PIN-коду:</h2>
        <h1 className="uk-heading-large uk-text-bolder uk-text-primary uk-margin-remove-top">
          {pin}
        </h1>
      </div>

      <div className="uk-margin-large-top">
        <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-bottom">
          <h3 className="uk-margin-remove">
            Игроков: <span className="uk-badge">{players.length}</span>
          </h3>
          <button 
            className="uk-button uk-button-primary uk-button-large"
            onClick={handleStartQuiz}
            disabled={players.length === 0}
          >
            Начать игру
          </button>
        </div>

        {/* Сетка с именами подключившихся игроков */}
        <div className="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@s uk-text-center" data-uk-grid>
          {players.length === 0 ? (
            <div className="uk-width-1-1 uk-text-muted">
              Ожидание игроков...
            </div>
          ) : (
            players.map((name, index) => (
              <div key={index}>
                <div className="uk-card uk-card-secondary uk-card-body uk-padding-small uk-border-rounded">
                  <strong>{name}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}