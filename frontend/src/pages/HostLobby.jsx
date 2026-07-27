import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import api from '../utils/api';

export default function HostLobby() {
  const { quizId, pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    const fetchCurrentPlayers = async () => {
      try {
        const res = await api.get(`/api/game/rooms/${pin}/results/`);
        setPlayers(res.data.map(p => ({ name: p.name, session_token: p.session_token })));
      } catch (err) {
        console.error('Не удалось получить список игроков', err);
      }
    };
    fetchCurrentPlayers();
  }, [pin]);

  useEffect(() => {
    activeRef.current = true;

    const onPlayerJoined = (data) => {
      if (!activeRef.current) return;

      if (data?.name) {
        setPlayers(prev => {
            if (prev.some(p => p.session_token === data.session_token))
                return prev;
            return [...prev, data];
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

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать PIN', err);
    }
  };

  return (
    <div className="uk-container uk-margin-large-top uk-text-center">
      <div className="uk-card uk-card-default uk-card-body uk-box-shadow-large">
        <h2 className="uk-text-muted uk-margin-remove-bottom">Присоединяйтесь по PIN-коду:</h2>
        <h1 className="uk-heading-large uk-text-bolder uk-text-primary uk-margin-remove-top">
          {pin}
        </h1>
        <button className="uk-button uk-button-default uk-button-small" type="button" onClick={handleCopyPin}>
          <span uk-icon={copied ? 'icon: check' : 'icon: copy'} className="uk-margin-small-right"></span>
          {copied ? 'Скопировано!' : 'Скопировать PIN'}
        </button>
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

        <div
            className="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-grid-match"
            data-uk-grid
        >
            {players.map(player => (
                <div key={player.session_token}>
                    <div
                        className="uk-card uk-card-secondary uk-card-body uk-padding-small uk-border-rounded uk-flex uk-flex-center uk-flex-middle"
                        style={{ minHeight: "80px" }}
                    >
                        <strong
                            className="uk-text-center uk-text-truncate"
                            title={player.name}
                        >
                            {player.name}
                        </strong>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}