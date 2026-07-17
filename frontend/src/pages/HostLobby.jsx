import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';

export default function HostLobby() {
  const { quizId, pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  // Флаг актуальности эффекта — защищает от гонки при StrictMode double-mount
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const onPlayerJoined = (data) => {
      // Игнорируем событие, если этот инстанс эффекта уже "неактуален"
      // (например, компонент успел размонтироваться/перемонтироваться)
      if (!activeRef.current) return;

      if (data?.name) {
        setPlayers((prev) => {
          // Защита от дублей на случай повторного join_room в StrictMode
          if (prev.includes(data.name)) return prev;
          return [...prev, data.name];
        });
      } else {
        console.warn('Неизвестный формат данных:', data);
      }
    };

    const onPlayerLeft = (data) => {
      if (!activeRef.current) return;
      setPlayers((prev) => prev.filter((p) => p.session_token !== data.session_token));
    };

    const onRoomJoined = (data) => {
      // Игнорируем, т.к. мы уже в комнате и просто ждём игроков
    };

    socket.on('new_player', onPlayerJoined);
    socket.on('room_joined', onRoomJoined);
    socket.on('player_left', onPlayerLeft);

    const doJoin = () => {
      socket.emit('join_room', { pin });
    };

    if (socket.connected) {
      doJoin();
    } else {
      // Если на момент монтирования сокет ещё не подключён —
      // ждём connect и входим в комнату сразу после него
      socket.once('connect', doJoin);
    }

    return () => {
      activeRef.current = false;
      socket.off('new_player', onPlayerJoined);
      socket.off('room_joined', onRoomJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('connect', doJoin);
    };
  }, [pin]);

  const handleStartQuiz = () => {
    socket.emit('start_quiz', { pin });
    navigate(`/host/game/${quizId}/${pin}`);
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

        <div className="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@s uk-text-center" data-uk-grid>
          {players.length === 0 ? (
            <div className="uk-width-1-1 uk-text-muted">
              Ожидание игроков...
            </div>
          ) : (
            players.map((player) => (
              <div key={player}>
                <div className="uk-card uk-card-secondary uk-card-body uk-padding-small uk-border-rounded">
                  <strong>{player}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}