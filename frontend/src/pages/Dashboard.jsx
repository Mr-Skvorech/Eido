import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyQuizzes } from '../api/quizzes';
import api from '../utils/api';

export default function Dashboard() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Данные текущего аккаунта — показываем в шапке
    const [currentUser, setCurrentUser] = useState(null);

    // Вкладки: 'quizzes' — мои квизы, 'history' — история проведённых игр
    const [activeTab, setActiveTab] = useState('quizzes');
    const [hostedHistory, setHostedHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    useEffect(() => {
        // Проверяем, авторизован ли пользователь
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    // Загружаем квизы при монтировании компонента
    useEffect(() => {
        fetchMyQuizzes()
            .then(data => {
                setQuizzes(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    // Загружаем данные текущего аккаунта для шапки
    useEffect(() => {
        api.get('/api/auth/me/')
            .then(res => setCurrentUser(res.data))
            .catch(err => console.error('Не удалось загрузить данные аккаунта', err));
    }, []);

    // Историю проведённых игр грузим лениво — только когда открывают вкладку
    useEffect(() => {
        if (activeTab !== 'history' || historyLoaded) return;

        setHistoryLoading(true);
        setHistoryError(null);

        api.get('/api/history/hosted/')
            .then(res => {
                setHostedHistory(res.data);
                setHistoryLoaded(true);
            })
            .catch(err => {
                setHistoryError('Не удалось загрузить историю игр.');
                console.error(err);
            })
            .finally(() => setHistoryLoading(false));
    }, [activeTab, historyLoaded]);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const handleLaunchQuiz = async (quizId) => {
        try {
            const response = await api.post(`/api/quizzes/${quizId}/start/`);
            const { pin } = response.data;
            navigate(`/host/lobby/${quizId}/${pin}`);
        } catch (error) {
            console.error('Ошибка запуска игры:', error);
            alert('Не удалось запустить игру. Проверьте консоль.');
        }
    };

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

            {/* Шапка дашборда */}
            <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-large-bottom">
                <div>
                    <h1 className="uk-heading-small uk-margin-remove">Мои Квизы</h1>
                    <p className="uk-text-meta uk-margin-remove">Управляйте вашими викторинами или создайте новую</p>
                </div>
                <div>
                    <button 
                        className="uk-button uk-button-primary uk-margin-small-right"
                        onClick={() => navigate('/create-quiz')}
                    >
                        <span uk-icon="icon: plus" className="uk-margin-small-right"></span>
                        Создать квиз
                    </button>
                    <button
                        className="uk-button uk-button-secondary uk-margin-small-right"
                        onClick={() => navigate('/history/played')}
                    >
                        <span data-uk-icon="icon: user" className="uk-margin-small-right"></span>
                        Моя история игрока
                    </button>
                    <button 
                        className="uk-button uk-button-secondary uk-margin-small-right"
                        onClick={() => navigate('/player/join')}
                    >
                        <span data-uk-icon="icon: sign-in" className="uk-margin-small-right"></span>
                        Ввести PIN
                    </button>
                    <button className="uk-button uk-button-danger" onClick={handleLogout}>
                        Выйти
                    </button>
                </div>
            </div>

            {/* Переключатель вкладок */}
            <ul className="uk-tab uk-margin-bottom">
                <li className={activeTab === 'quizzes' ? 'uk-active' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('quizzes'); }}>
                        Мои квизы
                    </a>
                </li>
                <li className={activeTab === 'history' ? 'uk-active' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('history'); }}>
                        История проведённых игр
                    </a>
                </li>
            </ul>

            {/* --- Вкладка: Мои квизы --- */}
            {activeTab === 'quizzes' && (
                <>
                    {loading && <div className="uk-text-center"><div uk-spinner="ratio: 3"></div></div>}
                    {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}

                    {!loading && !error && quizzes.length === 0 && (
                        <div className="uk-placeholder uk-text-center uk-margin-large-top">
                            <span uk-icon="icon: album; ratio: 2"></span>
                            <p className="uk-margin-small-top">У вас пока нет созданных квизов. Создайте свой первый квиз прямо сейчас!</p>
                        </div>
                    )}

                    <div className="uk-grid-match uk-child-width-1-3@m uk-grid-medium" uk-grid="true">
                        {quizzes.map(quiz => (
                            <div key={quiz.id}>
                                <div className="uk-card uk-card-default uk-card-hover uk-card-body uk-flex uk-flex-column uk-flex-between">
                                    <div>
                                        <h3 className="uk-card-title uk-margin-remove-bottom">{quiz.title}</h3>
                                        <p className="uk-text-meta uk-margin-small-top">
                                            Дата создания: {new Date(quiz.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="uk-text-break">
                                            {quiz.description || 'Описание отсутствует.'}
                                        </p>
                                    </div>
                                    <div className="uk-margin-top">
                                        <button 
                                            className="uk-button uk-button-text uk-text-primary"
                                            onClick={() => navigate(`/quiz/${quiz.id}`)}
                                        >
                                            Открыть квиз →
                                        </button>
                                    </div>
                                    <div className="uk-container uk-margin-top">
                                        <button 
                                            className="uk-button uk-button-primary uk-button-large" 
                                            onClick={() => handleLaunchQuiz(quiz.id)}
                                        >
                                            Запустить квиз и получить PIN
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* --- Вкладка: История проведённых игр --- */}
            {activeTab === 'history' && (
                <>
                    {historyLoading && <div className="uk-text-center"><div uk-spinner="ratio: 3"></div></div>}
                    {historyError && <div className="uk-alert-danger" uk-alert="true"><p>{historyError}</p></div>}

                    {!historyLoading && !historyError && hostedHistory.length === 0 && (
                        <div className="uk-placeholder uk-text-center uk-margin-large-top">
                            <span uk-icon="icon: history; ratio: 2"></span>
                            <p className="uk-margin-small-top">Вы ещё не провели ни одной завершённой игры.</p>
                        </div>
                    )}

                    <div className="uk-grid-match uk-child-width-1-2@m uk-grid-medium" uk-grid="true">
                        {hostedHistory.map(game => {
                            const sortedParticipants = [...game.participants].sort((a, b) => b.score - a.score);
                            return (
                                <div key={game.id}>
                                    <div className="uk-card uk-card-default uk-card-body">
                                        <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                                            <h3 className="uk-card-title uk-margin-remove">{game.quiz_title}</h3>
                                            <span className="uk-badge">PIN {game.pin}</span>
                                        </div>
                                        <p className="uk-text-meta uk-margin-remove-top">
                                            {new Date(game.created_at).toLocaleString()} · {game.participants.length} участник(ов)
                                        </p>

                                        {sortedParticipants.length > 0 ? (
                                            <ul className="uk-list uk-list-divider uk-margin-small-top">
                                                {sortedParticipants.slice(0, 5).map((p, index) => (
                                                    <li key={p.id} className="uk-flex uk-flex-between">
                                                        <span>
                                                            <span className="uk-badge uk-margin-small-right">{index + 1}</span>
                                                            {p.name}
                                                        </span>
                                                        <strong>{p.score}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="uk-text-muted uk-margin-small-top">Участников не было.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}