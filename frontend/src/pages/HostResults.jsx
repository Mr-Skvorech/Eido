import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const HostResults = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinalResults = async () => {
      try {
        // # Запрашиваем участников этой комнаты
        // # (Эндпоинт получения игроков комнаты у тебя, скорее всего, уже есть для лобби, используем его)
        const response = await api.get(`api/game/rooms/${roomId}/results/`);
        
        // # Сортируем игроков по очкам (от большего к меньшему)
        const sortedPlayers = response.data.sort((a, b) => b.score - a.score);
        setLeaderboard(sortedPlayers);
      } catch (error) {
        console.error("Не удалось загрузить финальные результаты", error);
      } finally {
        // await api.post(`api/game/rooms/${roomId}/end/`); // Отправляем сигнал серверу о завершении игры
        setLoading(false);
      }
    };

    fetchFinalResults();
  }, [roomId]);

  if (loading) return <div className="uk-text-center uk-margin-large-top"><div uk-spinner="ratio: 3"></div></div>;

  return (
    <div className="uk-container uk-margin-large-top uk-text-center">
      <h1 className="uk-heading-medium">🏆 Финальные результаты 🏆</h1>
      <p className="uk-text-lead">Игра в комнате {roomId} завершена!</p>

      <div className="uk-width-1-2@m uk-container uk-margin-large-top">
        {/* Тройка лидеров (Подиум) */}
        <div className="uk-card uk-card-default uk-card-body">
          <table className="uk-table uk-table-divider uk-table-hover uk-text-left">
            <thead>
              <tr>
                <th className="uk-table-shrink">Место</th>
                <th>Имя игрока</th>
                <th className="uk-text-right">Очки</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr key={player.id} style={index === 0 ? { fontWeight: 'bold', backgroundColor: '#fff9e6' } : {}}>
                  <td>
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}`}
                  </td>
                  <td>{player.name}</td>
                  <td className="uk-text-right uk-text-primary">{player.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="uk-margin-large-top">
        <button className="uk-button uk-button-primary uk-button-large" onClick={() => navigate('/')}>
          Вернуться на главную
        </button>
      </div>
    </div>
  );
};

export default HostResults;