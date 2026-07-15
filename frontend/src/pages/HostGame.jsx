import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket'; // Твой инстанс socket.io-client
import api from '../utils/api'; // Твой настроенный axios

const HostGame = () => {
  const { quizId, roomId } = useParams(); // ID квиза и комнаты из URL
  const navigate = useNavigate();

  // Игровой стейт
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [players, setPlayers] = useState({}); // { 'player_id': { name: 'Ivan', score: 0 } }

  // 1. Загрузка квиза при монтировании
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await api.get(`/api/quizzes/${quizId}/get/`);
        setQuiz(response.data);
      } catch (error) {
        console.error('Ошибка загрузки квиза', error);
      }
    };
    fetchQuiz();
  }, [quizId]);

  // 2. Слушаем ответы игроков
  useEffect(() => {
    const handlePlayerAnswered = (data) => {
      const { player_id, choice_id, time_taken } = data;
      
      // Находим текущий вопрос и проверяем ответ
      const currentQuestion = quiz?.questions[currentQuestionIndex];
      const selectedChoice = currentQuestion?.choices.find(c => c.id === choice_id);
      
      if (selectedChoice?.is_correct) {
        // Простая формула очков: чем быстрее, тем больше очков
        const points = Math.max(0, 1000 - (time_taken * 10)); 
        setPlayers(prev => ({
          ...prev,
          [player_id]: {
            ...prev[player_id],
            score: (prev[player_id]?.score || 0) + points
          }
        }));
      }
    };

    socket.on('player_answered', handlePlayerAnswered);
    return () => socket.off('player_answered', handlePlayerAnswered);
  }, [quiz, currentQuestionIndex]);

  // 3. Управление таймером
  useEffect(() => {
    let timer;
    if (isQuestionActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isQuestionActive && timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [isQuestionActive, timeLeft]);

  // Запуск вопроса
  const startQuestion = () => {
    const question = quiz.questions[currentQuestionIndex];
    
    // Очищаем флаги правильных ответов, чтобы игроки не читерили
    const safeQuestion = {
      id: question.id,
      text: question.text,
      choices: question.choices.map(c => ({ id: c.id, text: c.text }))
    };

    socket.emit('send_question', { room: roomId, question: safeQuestion });
    setTimeLeft(question.time_limit || 20); // Дефолтно 20 секунд
    setIsQuestionActive(true);
    setIsShowingResults(false);
  };

  // Время вышло (или все ответили)
  const handleTimeUp = () => {
    setIsQuestionActive(false);
    setIsShowingResults(true);
    
    const question = quiz.questions[currentQuestionIndex];
    const correctChoice = question.choices.find(c => c.is_correct);

    socket.emit('show_results', { room: roomId, results: { correct_choice_id: correctChoice.id } });
    handleNext(); // Переходим к следующему вопросу или концу игры
  };

  // Переход к следующему вопросу или концу игры
  const handleNext = async () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsShowingResults(false);
    } else {
        try {
        // Формируем объект с очками, где ключ - ID (токен) игрока, значение - его очки
        const scoresPayload = {};
        Object.keys(players).forEach(token => {
            scoresPayload[token] = players[token].score;
        });

        // 1. Сохраняем результаты в БД через API
        await api.post(`/api/game/rooms/${roomId}/end/`, { scores: scoresPayload });

        // 2. Оповещаем игроков через сокеты, что игра окончена, и шлем им финальный стейт
        socket.emit('end_quiz', { room: roomId, leaderboard: players });

        // 3. Уводим ведущего на экран подиума
        navigate(`/host/results/${roomId}`);
        } catch (error) {
        console.error("Ошибка при сохранении игры:", error);
        // Даже если API упало, сокет всё равно лучше бросить, чтобы игроки не зависли
        socket.emit('end_quiz', { room: roomId, leaderboard: players });
        navigate(`/host/results/${roomId}`);
        }
    }
  };

  if (!quiz) return <div>Загрузка квиза...</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="uk-container uk-margin-top uk-text-center">
        {/* Сверху пишем статус игры */}
        <div className="uk-alert-primary" uk-alert="true">
        <p className="uk-text-large">Квиз: <strong>{quiz.title}</strong></p>
        </div>

        <h2>Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}</h2>
        
        {/* ЭКРАН ОЖИДАНИЯ ЗАПУСКА ВОПРОСА */}
        {!isQuestionActive && !isShowingResults && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-top">
            <h3 className="uk-text-muted">Следующий вопрос на очереди:</h3>
            <h1 className="uk-heading-small">"{currentQuestion.text}"</h1>
            
            <p>Время на ответ: {currentQuestion.time_limit} сек.</p>
            
            <button 
            className="uk-button uk-button-primary uk-button-large uk-width-1-1" 
            onClick={startQuestion}
            >
            <span uk-icon="icon: play" className="uk-margin-small-right"></span>
            Вывести вопрос на экраны игроков!
            </button>
        </div>
        )}

        {/* ЭКРАН АКТИВНОГО ТАЙМЕРА (Идет игра) */}
        {isQuestionActive && (
        <div className="uk-card uk-card-secondary uk-card-body uk-light uk-margin-top">
            <h2 className="uk-margin-remove-bottom">{currentQuestion.text}</h2>
            <div className="uk-text-large uk-text-warning uk-margin-medium-top uk-margin-medium-bottom" style={{fontSize: '3rem'}}>
            {timeLeft}
            </div>
            <p>Игроки думают...</p>
            <button className="uk-button uk-button-danger" onClick={handleTimeUp}>
              Остановить таймер (Все ответили)
            </button>
        </div>
        )}

        {/* ... остальной код рендера результатов вопроса ... */}
    </div>
    );
};

export default HostGame;