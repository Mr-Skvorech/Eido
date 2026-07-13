import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

const PlayerGame = () => {
  // Состояния экрана игрока
  const [status, setStatus] = useState('waiting'); // waiting, question, answered, results, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [startTime, setStartTime] = useState(null); // Для замера времени ответа
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [finalResults, setFinalResults] = useState(null);

  // Данные игрока (достаем из localStorage после регистрации в лобби)
  const playerName = localStorage.getItem('player_name');
  const sessionToken = localStorage.getItem('session_token'); 
  const roomId = localStorage.getItem('room_pin');

  useEffect(() => {
    // 1. Слушаем новый вопрос от ведущего
    socket.on('receive_question', (question) => {
      setCurrentQuestion(question);
      setStartTime(Date.now()); // Засекаем время появления
      setSelectedChoiceId(null);
      setIsCorrect(null);
      setStatus('question');
    });

    // 2. Слушаем вскрытие результатов вопроса
    socket.on('results_revealed', (data) => {
      const { correct_choice_id } = data;
      setIsCorrect(selectedChoiceId === correct_choice_id);
      setStatus('results');
    });

    // 3. Конец игры
    socket.on('quiz_ended', (leaderboard) => {
      setFinalResults(leaderboard);
      setStatus('ended');
    });

    return () => {
      socket.off('receive_question');
      socket.off('results_revealed');
      socket.off('quiz_ended');
    };
  }, [selectedChoiceId]);

  // Отправка ответа
  const handleAnswer = (choiceId) => {
    if (status !== 'question') return;

    const timeTaken = (Date.now() - startTime) / 1000; // Секунды
    setSelectedChoiceId(choiceId);
    setStatus('answered');

    socket.emit('submit_answer', {
      room: roomId,
      player_id: sessionToken, // Используем токен как уникальный ID
      choice_id: choiceId,
      time_taken: timeTaken
    });
  };

  // --- РЕНДЕР ---

  if (status === 'waiting') {
    return (
      <div className="uk-flex uk-flex-column uk-flex-middle uk-flex-center" style={{height: '100vh'}}>
        <div className="uk-spinner uk-icon" uk-spinner="ratio: 3"></div>
        <h2 className="uk-margin-top">Приготовься...</h2>
        <p>Вопрос скоро появится на экране ведущего!</p>
      </div>
    );
  }

  if (status === 'question' || status === 'answered') {
    return (
      <div className="uk-container uk-margin-top">
        <h3 className="uk-text-center">{currentQuestion?.text}</h3>
        <div className="uk-grid-small uk-child-width-1-2@m uk-grid-match" uk-grid="true">
          {currentQuestion?.choices.map((choice, index) => (
            <div key={choice.id}>
              <button
                disabled={status === 'answered'}
                className={`uk-button uk-button-large uk-width-1-1 uk-margin-small-bottom 
                  ${selectedChoiceId === choice.id ? 'uk-button-primary' : 'uk-button-default'}`}
                style={{ minHeight: '100px', fontSize: '1.5rem' }}
                onClick={() => handleAnswer(choice.id)}
              >
                {choice.text}
              </button>
            </div>
          ))}
        </div>
        {status === 'answered' && (
          <div className="uk-alert-primary uk-text-center uk-margin-top" uk-alert="true">
            Ответ принят! Ждем остальных...
          </div>
        )}
      </div>
    );
  }

  if (status === 'results') {
    return (
      <div className={`uk-flex uk-flex-column uk-flex-middle uk-flex-center`} 
           style={{height: '100vh', backgroundColor: isCorrect ? '#dff2bf' : '#ffbaba', transition: '0.5s'}}>
        <span uk-icon={`icon: ${isCorrect ? 'check' : 'close'}; ratio: 5`}></span>
        <h1 className="uk-heading-medium">{isCorrect ? 'ВЕРНО!' : 'ОШИБКА!'}</h1>
        <p className="uk-text-large">Жди следующего вопроса...</p>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="uk-container uk-margin-top uk-text-center">
        <h1>Игра окончена!</h1>
        <p className="uk-text-lead">Твой результат сохранен.</p>
        <button className="uk-button uk-button-primary" onClick={() => window.location.href = '/'}>
          На главную
        </button>
      </div>
    );
  }

  return null;
};

export default PlayerGame;