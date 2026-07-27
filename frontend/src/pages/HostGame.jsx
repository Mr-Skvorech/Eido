import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import api from '../utils/api';
import { notifyError } from '../utils/notify';

const HostGame = () => {
  const { quizId, roomId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [players, setPlayers] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const navigate = useNavigate();

  // Тянем общее число игроков при монтировании
  useEffect(() => {
    const fetchPlayerCount = async () => {
      try {
        const res = await api.get(`/api/game/rooms/${roomId}/results/`);
        setTotalPlayers(res.data.length);
      } catch (err) {
        console.error('Не удалось получить число игроков', err);
      }
    };
    fetchPlayerCount();
  }, [roomId]);

  // Загрузка квиза
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
    const doJoin = () => socket.emit('join_room', { pin: roomId });
    if (socket.connected) doJoin();
    socket.on('connect', doJoin);
    return () => socket.off('connect', doJoin);
  }, [roomId]);

  // Синхронизация состояния - только когда квиз уже загружен,
  // иначе host_state придёт раньше quiz и будет отброшен онлхендлером
  useEffect(() => {
    if (!quiz) return;
    const doSync = () => socket.emit('host_sync', { room: roomId });
    if (socket.connected) doSync();
    socket.on('connect', doSync);
    return () => socket.off('connect', doSync);
  }, [quiz, roomId]);

  // Обработка восстановления состояния от сервера
  useEffect(() => {
    const onHostState = (state) => {
      if (!quiz) return;
      console.log("HOST_STATE", state);

      // Восстанавливаем очки игроков - раньше терялись при реконнекте
      if (state.players) {
        const restoredPlayers = {};
        Object.entries(state.players).forEach(([token, score]) => {
          restoredPlayers[token] = { score };
        });
        setPlayers(restoredPlayers);
      }

      if (state.phase === "question") {
        setCurrentQuestionIndex(state.current_question);
        setIsQuestionActive(true);
        setIsShowingResults(false);
        if (state.time_left !== undefined) {
          setTimeLeft(Math.ceil(state.time_left));
        } else {
          const q = quiz.questions[state.current_question];
          if (q) setTimeLeft(q.time_limit || 20);
        }
      } else if (state.phase === "results") {
        setCurrentQuestionIndex(state.current_question);
        setIsQuestionActive(false);
        setIsShowingResults(true);
      } else if (state.phase === "unknown") {
        console.log("Нет сохранённого состояния игры");
      }
    };

    socket.on('host_state', onHostState);
    return () => socket.off('host_state', onHostState);
  }, [quiz]);

  // Обработка ответов игроков
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
      setAnsweredIds(prev => new Set(prev).add(player_id));
      const currentQuestion = quiz?.questions[currentQuestionIndex];
      if (!currentQuestion) return;

      let selectedChoices;
      if (Array.isArray(choice_id)) {
        selectedChoices = choice_id;
      } else {
        selectedChoices = currentQuestion.choices.find(c => c.id === choice_id);
      }
      
      if (selectedChoices?.is_correct || check_answers(currentQuestion.choices, selectedChoices)) {
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

  // Таймер
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
    if (!question) return;
    setAnsweredIds(new Set());

    const safeQuestion = {
      id: question.id,
      text: question.text,
      image: question.image,
      is_multiple_choice: question.is_multiple_choice,
      choices: question.choices.map(c => ({
        id: c.id,
        text: c.text,
      })),
      time_limit: question.time_limit,
    };

    socket.emit('send_question', {
      room: roomId,
      question: safeQuestion,      // для игроков
      full_question: question,     // только сервер будет использовать
      current_question: currentQuestionIndex,
    });
    setTimeLeft(question.time_limit || 20);
    setIsQuestionActive(true);
    setIsShowingResults(false);
  };

  const handleTimeUp = () => {
      setIsQuestionActive(false);
      setIsShowingResults(true);

      const question = quiz.questions[currentQuestionIndex];
      if (question) {
        const correctChoicesIds = question.choices.filter(c => c.is_correct).map(c => c.id);
        socket.emit('show_results', { room: roomId, results: { correct_choice_ids: correctChoicesIds } });
      }
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
        const scoresPayload = {};
        Object.keys(players).forEach(token => {
          scoresPayload[token] = players[token].score;
        });
        socket.emit('end_quiz', { room: roomId, scores: scoresPayload });
        navigate(`/host/results/${roomId}`);
      }
    }
  };

  if (!quiz) return <div>Загрузка квиза...</div>;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  if (!currentQuestion) return <div>Нет вопросов</div>;

  return (
    <div className="uk-container uk-margin-top uk-text-center">
      <div className="uk-alert-primary" uk-alert="true">
        <p className="uk-text-large">Квиз: <strong>{quiz.title}</strong></p>
      </div>

      <h2>Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}</h2>

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

      {isQuestionActive && (
        <div className="uk-card uk-card-secondary uk-card-body uk-light uk-margin-top">
          <h2 className="uk-margin-remove-bottom">{currentQuestion.text}</h2>
          <div className="uk-text-large uk-text-warning uk-margin-medium-top uk-margin-medium-bottom" style={{fontSize: '3rem'}}>
            {Math.ceil(timeLeft)}
          </div>
          <p className="uk-text-meta">Ответили: {answeredIds.size} из {totalPlayers}</p>
          <p>Игроки думают...</p>
          <button className="uk-button uk-button-danger" onClick={handleTimeUp}>
            Остановить таймер (Все ответили)
          </button>
        </div>
      )}
      {isShowingResults && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-top">
          <h3 className="uk-text-muted">Результаты вопроса показаны игрокам</h3>
          <button
            className="uk-button uk-button-primary uk-button-large uk-width-1-1"
            onClick={handleNext}
          >
            <span uk-icon="icon: chevron-right" className="uk-margin-small-right"></span>
            {currentQuestionIndex < quiz.questions.length - 1 ? 'Следующий вопрос' : 'Завершить игру'}
          </button>
        </div>
      )}
    </div>
  );
};

export default HostGame;