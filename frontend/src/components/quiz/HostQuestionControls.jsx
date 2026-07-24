import "./HostQuestionControls.scss";

/*
  <HostQuestionControls /> — панель управления ходом игры для хоста.

  props:
    current            Number — номер текущего вопроса (1-based)
    total              Number — всего вопросов
    isActive           Bool   — идёт ли сейчас показ вопроса / таймер
    resultsShown       Bool   — уже показаны ли результаты текущего вопроса
    onStart()          Func   — «Вывести вопрос»
    onReveal()         Func   — «Показать ответы»
    onShowLeaderboard  Func   — «Таблица лидеров»
    onNext()           Func   — «Следующий вопрос»

  Пример:
    <HostQuestionControls
      current={index + 1}
      total={quiz.questions.length}
      isActive={questionActive}
      resultsShown={resultsRevealed}
      onStart={sendQuestion}
      onReveal={showResults}
      onNext={nextQuestion}
    />
*/

export default function HostQuestionControls({
  current = 1,
  total = 1,
  isActive = false,
  resultsShown = false,
  onStart = () => {},
  onReveal = () => {},
  onShowLeaderboard = null,
  onNext = () => {},
}) {
  const isLast = current >= total;
  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="host-controls">
      <div className="host-controls__meta">
        <span className="host-controls__step">
          Вопрос <strong>{current}</strong> из {total}
        </span>
        <div className="host-controls__bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="host-controls__buttons">
        {!isActive && !resultsShown && (
          <button
            type="button"
            className="uk-button host-ctl host-ctl--primary"
            onClick={onStart}
          >
            <span uk-icon="icon: play; ratio: 0.9" />
            Вывести вопрос
          </button>
        )}

        {isActive && !resultsShown && (
          <button
            type="button"
            className="uk-button host-ctl host-ctl--warning"
            onClick={onReveal}
          >
            <span uk-icon="icon: bolt; ratio: 0.9" />
            Показать ответы
          </button>
        )}

        {onShowLeaderboard && (
          <button
            type="button"
            className="uk-button host-ctl host-ctl--ghost"
            onClick={onShowLeaderboard}
          >
            <span uk-icon="icon: star; ratio: 0.9" />
            Лидеры
          </button>
        )}

        {resultsShown && (
          <button
            type="button"
            className="uk-button host-ctl host-ctl--primary"
            onClick={onNext}
          >
            {isLast ? "Завершить игру" : "Следующий вопрос"}
            <span uk-icon={`icon: ${isLast ? "check" : "arrow-right"}; ratio: 1`} />
          </button>
        )}
      </div>
    </div>
  );
}
