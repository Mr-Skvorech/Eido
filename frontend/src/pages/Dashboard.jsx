import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyQuizzes } from '../api/quizzes';

export default function Dashboard() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

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

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div className="uk-container uk-margin-large-top">
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
                    <button className="uk-button uk-button-danger" onClick={handleLogout}>
                        Выйти
                    </button>
                </div>
            </div>

            {/* Состояния загрузки и ошибок */}
            {loading && <div className="uk-text-center"><div uk-spinner="ratio: 3"></div></div>}
            {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}

            {/* Если квизов еще нет */}
            {!loading && !error && quizzes.length === 0 && (
                <div className="uk-placeholder uk-text-center uk-margin-large-top">
                    <span uk-icon="icon: album; ratio: 2"></span>
                    <p className="uk-margin-small-top">У вас пока нет созданных квизов. Создайте свой первый квиз прямо сейчас!</p>
                </div>
            )}

            {/* Сетка со списком квизов */}
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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}