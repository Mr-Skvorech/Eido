import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import api from '../utils/api';
import { notifyError } from '../utils/notify';

const HostGame = () => {
  const { quizId, roomId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await api.get(`/api/quizzes/${quizId}/get/`);
        setQuiz(response.data);
      } catch (error) {
        notifyError("Ошибка загрузки квиза. Попробуйте ещё раз.");
        console.error('Ошибка загрузки квиза', error);
      }
    };
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    const handlePlayerAnswered = (data) => {
      const check_answers = (choices, selected) => {
        if (!selected) return false;
        if (Array.isArray(selected)) {
          const correctChoices = choices.filter(c => c.is_correct).map(c => c.id);
          return selected.length === correctChoices.length && selected.every(id => correctChoices.includes(id));
        } else {
          const choice = choices.find(c => c.id === selected);
          return choice?.is_correct || false;
        }
      };
      
      const { player_id, choice_id, time_taken } = data;
      
      const currentQuestion = quiz?.questions[currentQuestionIndex];
      let selectedChoices;
      if (choice_id.length > 0) {
        selectedChoices = choice_id; // Если это массив (множественный выбор)
      } else {
        selectedChoices = currentQuestion?.choices.find(c => c.id === choice_id);
      }
      
      if (selectedChoices?.is_correct || check_answers(currentQuestion?.choices, selectedChoices)) {
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

  useEffect(() => {
    let timer;
    if (isQuestionActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isQuestionActive && timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [isQuestionActive, timeLeft]);

  const startQuestion = () => {
    const question = quiz.questions[currentQuestionIndex];
  
    const safeQuestion = {
      id: question.id,
      text: question.text,
      image: question.image,
      is_multiple_choice: question.is_multiple_choice,
      choices: question.choices.map(c => ({ id: c.id, text: c.text }))
    };

    socket.emit('send_question', { room: roomId, question: safeQuestion });
    setTimeLeft(question.time_limit || 20); 
    setIsQuestionActive(true);
    setIsShowingResults(false);
  };

  const handleTimeUp = () => {
    setIsQuestionActive(false);
    setIsShowingResults(true);
    
    const question = quiz.questions[currentQuestionIndex];
    const correctChoicesIds = question.choices.filter(c => c.is_correct).map(c => c.id);

    socket.emit('show_results', { room: roomId, results: { correct_choice_ids: correctChoicesIds } });
    handleNext(); 
  };

  const handleNext = async () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsShowingResults(false);
    } else {
        try {
          const scoresPayload = {};
          Object.keys(players).forEach(token => {
              scoresPayload[token] = players[token].score;
          });

          await api.post(`/api/game/rooms/${roomId}/end/`, { scores: scoresPayload });

          const leaders = await api.get(`/api/game/rooms/${roomId}/results/`);
          socket.emit('end_quiz', { room: roomId, scores: scoresPayload, leaderBoard: leaders.data });

          navigate(`/host/results/${roomId}`);
        } catch (error) {
          console.error("Ошибка при сохранении игры:", error);
          notifyError("Ошибка при сохранении игры. Попробуйте ещё раз.");
          // Даже если API упало, сокет всё равно лучше бросить, чтобы игроки не зависли
          socket.emit('end_quiz', { room: roomId, scores: scoresPayload });
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
    </div>
    );
};

export default HostGame;