import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function PlayerHistory() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/api/history/played/')
            .then(res => {
                setGames(res.data);
                setLoading(false);
            })
            .catch(err => {
                setError('Не удалось загрузить историю игр.');
                console.error(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        api.get('/api/auth/me/')
            .then(res => setCurrentUser(res.data))
            .catch(err => console.error('Не удалось загрузить данные аккаунта', err));
    }, []);

    return (
        <div className="uk-container uk-margin-large-top">
            {/* Плашка с текущим аккаунтом */}
            <div className="uk-flex uk-flex-middle uk-margin-small-bottom" style={{ opacity: 0.85 }}>
                <span uk-icon="icon: user" className="uk-margin-small-right uk-text-muted"></span>
                {currentUser ? (
                    <span className="uk-text-small uk-text-muted">
                        Вы вошли как <strong>{currentUser.email}</strong>
                        {currentUser.username ? ` (${currentUser.username})` : ''}
                    </span>
                ) : (
                    <span className="uk-text-small uk-text-muted">Загрузка данных аккаунта...</span>
                )}
            </div>
            <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-large-bottom">
                <div>
                    <h1 className="uk-heading-small uk-margin-remove">Моя история игр</h1>
                    <p className="uk-text-meta uk-margin-remove">Квизы, в которых вы участвовали</p>
                </div>
                <button className="uk-button uk-button-default" onClick={() => navigate('/')}>
                    ← Назад
                </button>
            </div>

            {loading && <div className="uk-text-center"><div uk-spinner="ratio: 3"></div></div>}
            {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}

            {!loading && !error && games.length === 0 && (
                <div className="uk-placeholder uk-text-center uk-margin-large-top">
                    <span uk-icon="icon: history; ratio: 2"></span>
                    <p className="uk-margin-small-top">
                        Вы пока не участвовали ни в одной завершённой игре.<br />
                        Учти: игра засчитывается в историю, только если ты был авторизован на момент входа по PIN.
                    </p>
                </div>
            )}

            <table className="uk-table uk-table-divider uk-table-hover uk-table-middle">
                {games.length > 0 && (
                    <thead>
                        <tr>
                            <th>Квиз</th>
                            <th>PIN</th>
                            <th>Дата</th>
                            <th className="uk-text-right">Очки</th>
                            <th className="uk-text-right">Игроков в комнате</th>
                        </tr>
                    </thead>
                )}
                <tbody>
                    {games.map(game => (
                        <tr key={game.id}>
                            <td>{game.quiz_title}</td>
                            <td><span className="uk-badge">{game.room_pin}</span></td>
                            <td>{new Date(game.game_date).toLocaleString()}</td>
                            <td className="uk-text-right uk-text-primary"><strong>{game.score}</strong></td>
                            <td className="uk-text-right uk-text-muted">{game.total_participants}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}