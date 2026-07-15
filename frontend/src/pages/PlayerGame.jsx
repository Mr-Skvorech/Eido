import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

const PlayerGame = () => {
  const [status, setStatus] = useState('waiting'); // waiting, question, answered, results, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [finalResults, setFinalResults] = useState(null);

  const playerName = localStorage.getItem('player_name');
  const sessionToken = localStorage.getItem('session_token');
  const roomId = localStorage.getItem('room_pin');

  useEffect(() => {
    const onReceiveQuestion = (question) => {
      setCurrentQuestion(question);
      setStartTime(Date.now());
      setSelectedChoiceId(null);
      setIsCorrect(null);
      setStatus('question');
    };

    // Сервер рассылает именно 'results_revealed' (не 'show_results' —
    // это имя хост шлёт СЕРВЕРУ, а сервер рассылает игрокам под другим именем)
    const onResultsRevealed = (data) => {
      const { correct_choice_id } = data;
      setIsCorrect((prevSelected) => selectedChoiceId === correct_choice_id);
      setStatus('results');
    };

    // Аналогично — сервер рассылает 'quiz_ended', а не 'end_quiz'
    const onQuizEnded = (leaderboard) => {
      setFinalResults(leaderboard);
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
  }, [selectedChoiceId]);

  const handleAnswer = (choiceId) => {
    if (status !== 'question') return;

    const timeTaken = (Date.now() - startTime) / 1000;
    setSelectedChoiceId(choiceId);
    setStatus('answered');

    socket.emit('submit_answer', {
      room: roomId,
      player_id: sessionToken,
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
          {currentQuestion?.choices.map((choice) => (
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
    // finalResults приходит как объект { [session_token]: { name, score } }
    const entries = finalResults ? Object.entries(finalResults) : [];
    const sortedEntries = [...entries].sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0));

    const myIndex = sortedEntries.findIndex(([id]) => id === sessionToken);
    const myRank = myIndex >= 0 ? myIndex + 1 : null;
    const myScore = myIndex >= 0 ? sortedEntries[myIndex][1]?.score || 0 : 0;
    const totalPlayers = sortedEntries.length;

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

        {sortedEntries.length > 0 && (
          <div className="uk-card uk-card-default uk-card-body uk-margin-large-top uk-width-1-1 uk-width-2-3@m uk-margin-auto uk-text-left">
            <h3 className="uk-text-muted uk-text-center">Топ игроков</h3>
            <ul className="uk-list uk-list-divider">
              {sortedEntries.slice(0, 5).map(([id, player], index) => (
                <li
                  key={id}
                  className={id === sessionToken ? 'uk-text-primary uk-text-bold' : ''}
                >
                  <span className="uk-badge uk-margin-small-right">{index + 1}</span>
                  {player?.name}
                  {id === sessionToken && ' (ты)'}
                  <span className="uk-float-right">{player?.score}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="uk-button uk-button-primary uk-margin-large-top"
          onClick={() => window.location.href = '/player/join'}
        >
          На главную
        </button>
      </div>
    );
  }

  return null;
};

export default PlayerGame;