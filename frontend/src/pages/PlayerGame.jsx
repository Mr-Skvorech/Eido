import React, { useState, useEffect, useRef } from 'react';
import socket from '../utils/socket';

const PlayerGame = () => {
  const [status, setStatus] = useState('waiting'); // waiting, question, answered, results, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const playerName = localStorage.getItem('player_name');
  const sessionToken = localStorage.getItem('session_token');
  const roomId = localStorage.getItem('room_pin');

  const selectedIdsRef = useRef([]);
  useEffect(() => {
    selectedIdsRef.current = selectedChoiceIds;
  }, [selectedChoiceIds]);

  // При любом (пере)подключении сокета — заново входим в комнату.
  // Без этого короткий обрыв связи молча выкидывает игрока из комнаты
  // Socket.IO (новый sid не состоит в room=pin), и он перестаёт получать события.
  useEffect(() => {
    const rejoinRoom = () => {
      if (roomId) socket.emit('join_room', { pin: roomId });
    };
    if (socket.connected) rejoinRoom();
    socket.on('connect', rejoinRoom);
    return () => socket.off('connect', rejoinRoom);
  }, [roomId]);

  useEffect(() => {
    const onReceiveQuestion = (question) => {
        setCurrentQuestion(question);
        setStartTime(Date.now());
        setSelectedChoiceIds([]);
        setIsCorrect(null);
        setStatus('question');
    };

    const onResultsRevealed = (data) => {
        const correctIds = data.correct_choice_ids || (data.correct_choice_id ? [data.correct_choice_id] : []);
        const myAnswers = selectedIdsRef.current;

        const isWin = myAnswers.length > 0 &&
                      myAnswers.length === correctIds.length && 
                      myAnswers.every(id => correctIds.includes(id));
                      
        setIsCorrect(isWin);
        setStatus('results');
    };

    const onQuizEnded = (data) => {
      setFinalResults(data.scores);
      setLeaderboard(data.leaderBoard);
      setStatus('ended');
    };

    socket.on('receive_question', onReceiveQuestion);
    socket.on('results_revealed', onResultsRevealed);
    socket.on('quiz_ended', onQuizEnded);

    return () => {
      socket.off('receive_question', onReceiveQuestion);
      socket.off('results_revealed', onResultsRevealed);
      socket.off('quiz_ended', onQuizEnded);
    };
  }, []);

  const handleAnswer = (choiceId) => {
    if (status !== 'question') return;

    if (!currentQuestion.is_multiple_choice) {
        const timeTaken = (Date.now() - startTime) / 1000;
        setSelectedChoiceIds([choiceId]);
        setStatus('answered');
        
        socket.emit('submit_answer', {
            room: roomId, 
            player_id: sessionToken, 
            choice_id: choiceId, // ВАЖНО: для одиночного отправляем просто ID (не массив), чтобы не сломать бэкенд
            time_taken: timeTaken
        });
    } else {
        setSelectedChoiceIds(prev => 
            prev.includes(choiceId) ? prev.filter(id => id !== choiceId) : [...prev, choiceId]
        );
    }
  };

  const submitMultipleAnswers = () => {
    const timeTaken = (Date.now() - startTime) / 1000;
    setStatus('answered');
    socket.emit('submit_answer', {
        room: roomId, player_id: sessionToken, choice_id: selectedChoiceIds, time_taken: timeTaken
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
    console.log('../backend' + currentQuestion.image);
    return (
      <div className="uk-container uk-margin-top uk-text-center">
        <h3>{currentQuestion?.text}</h3>
        
        {currentQuestion?.image && (
            <div className="uk-margin-bottom">
                <img src={`http://localhost:8000${currentQuestion.image}`} alt="Вопрос" style={{maxHeight: '300px', borderRadius: '8px'}} />
            </div>
        )}

        <div className="uk-grid-small uk-child-width-1-2@m uk-grid-match" uk-grid="true">
          {currentQuestion?.choices.map((choice) => {
            const isSelected = selectedChoiceIds.includes(choice.id);
            return (
              <div key={choice.id}>
                <button
                  disabled={status === 'answered'}
                  className={`uk-button uk-button-large uk-width-1-1 uk-margin-small-bottom 
                    ${isSelected ? 'uk-button-primary' : 'uk-button-default'}`}
                  style={{ minHeight: '100px', fontSize: '1.5rem' }}
                  onClick={() => handleAnswer(choice.id)}
                >
                  {choice.text}
                </button>
              </div>
            );
          })}
        </div>

        {currentQuestion?.is_multiple_choice && status === 'question' && (
            <button 
                className="uk-button uk-button-secondary uk-button-large uk-margin-top"
                onClick={submitMultipleAnswers}
                disabled={selectedChoiceIds.length === 0}
            >
                Подтвердить выбор
            </button>
        )}

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
    // leaderboard приходит с бэкенда (GET .../results/) и содержит ВСЕХ участников
    // комнаты, включая тех, кто не ответил правильно ни разу (score: 0) —
    // именно поэтому ранг нужно считать по нему, а не по частичному finalResults
    // (тот содержит только тех, кто хоть раз ответил верно).
    const fullLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
    const sortedScores = [...fullLeaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));

    const myIndex = sortedScores.findIndex((p) => p.session_token === sessionToken);
    const myRank = myIndex >= 0 ? myIndex + 1 : null;
    const myScore = myIndex >= 0 ? Math.round(sortedScores[myIndex].score || 0) : 0;
    const totalPlayers = sortedScores.length;

    const medal = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : null;

    return (
      <div className="uk-container uk-margin-top uk-text-center" style={{ paddingTop: '8vh' }}>
        <h1 className="uk-heading-medium">Игра окончена!</h1>

        {myRank ? (
          <>
            {medal && <div style={{ fontSize: '4rem' }}>{medal}</div>}
            <p className="uk-text-lead uk-margin-remove-bottom uk-text-muted">Твоё место:</p>
            <div className="uk-heading-large uk-text-bolder uk-text-primary uk-margin-remove-top">
              {myRank}
              <span className="uk-text-muted" style={{ fontSize: '1.5rem' }}> из {totalPlayers}</span>
            </div>
            <p className="uk-text-large">
              {playerName || 'Ты'} — <strong>{myScore}</strong> очков
            </p>
          </>
        ) : (
          <p className="uk-text-lead">Твой результат сохранён.</p>
        )}

        {sortedScores.length > 0 && (
          <div className="uk-card uk-card-default uk-card-body uk-margin-large-top uk-width-1-1 uk-width-2-3@m uk-margin-auto uk-text-left">
            <h3 className="uk-text-muted uk-text-center">Топ игроков</h3>
            <ul className="uk-list uk-list-divider">
              {sortedScores.slice(0, 5).map((player, index) => (
                <li
                  key={player.id ?? player.session_token}
                  className={player.session_token === sessionToken ? 'uk-text-primary uk-text-bold' : ''}
                >
                  <span className="uk-badge uk-margin-small-right">{index + 1}</span>
                  {player.name}
                  {player.session_token === sessionToken && ' (ты)'}
                  <span className="uk-float-right">{Math.round(player.score || 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="uk-button uk-button-primary uk-margin-large-top"
          onClick={() => window.location.href = '/'}
        >
          На главную
        </button>
      </div>
    );
  }

  return null;
};

export default PlayerGame;