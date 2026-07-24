import "./FinalScoreCard.scss";

/*
  <FinalScoreCard /> — итоговый экран игрока в конце квиза.

  props:
    rank        Number — итоговое место (1, 2, 3, ...)
    total       Number — всего игроков
    playerName  String — имя игрока
    score       Number — набранные очки

  Пример:
    <FinalScoreCard rank={2} total={12} playerName="Аня" score={4820} />
*/

export default function FinalScoreCard({
  rank = 1,
  total = 1,
  playerName = "Игрок",
  score = 0,
}) {
  const isPodium = rank <= 3;
  const rankClass = isPodium ? `rank-${rank}` : "rank-other";

  return (
    <div className={`final-score final-score--${rankClass}`}>
      <div className="final-score__medal">
        {isPodium ? (
          <span uk-icon="icon: star; ratio: 1.8" />
        ) : (
          <span uk-icon="icon: happy; ratio: 1.8" />
        )}
      </div>

      <p className="final-score__place">
        {isPodium ? "Место" : "Твоё место"} <strong>#{rank}</strong> из {total}
      </p>

      <h2 className="final-score__name">{playerName}</h2>

      <div className="final-score__score">
        <span className="final-score__score-value">{Math.round(score)}</span>
        <span className="final-score__score-label">очков</span>
      </div>
    </div>
  );
}
