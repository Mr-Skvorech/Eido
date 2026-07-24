import "./PlayerResultCard.scss";

/*
  <PlayerResultCard /> — полноэкранный отклик «верно / ошибка» после ответа.

  props:
    isCorrect   Bool    — правильный ли был ответ
    points      Number  — сколько очков начислено (опционально, показывается при верном)
    correctText String  — текст правильного ответа (опционально, показывается при ошибке)

  Пример:
    <PlayerResultCard isCorrect={result.correct} points={result.points} />
*/

export default function PlayerResultCard({
  isCorrect = false,
  points = null,
  correctText = null,
}) {
  return (
    <div className={`result-card ${isCorrect ? "is-correct" : "is-wrong"}`}>
      <div className="result-card__badge">
        <span uk-icon={`icon: ${isCorrect ? "check" : "close"}; ratio: 2.4`} />
      </div>
      <h2 className="result-card__title">{isCorrect ? "Верно!" : "Мимо"}</h2>

      {isCorrect && points != null && (
        <p className="result-card__points">+{Math.round(points)} очков</p>
      )}
      {!isCorrect && correctText && (
        <p className="result-card__hint">
          Правильный ответ: <strong>{correctText}</strong>
        </p>
      )}
    </div>
  );
}
