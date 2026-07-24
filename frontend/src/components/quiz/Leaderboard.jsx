import "./Leaderboard.scss";

/*
  <Leaderboard /> — таблица лидеров.

  props:
    players               Array  — [{ id, name, score, session_token }]
                                    (сортируется по score desc автоматически)
    highlightSessionToken String — session_token текущего игрока (его строка подсветится)
    maxRows               Number — показать только топ-N (0 = все)

  Пример:
    <Leaderboard players={players} highlightSessionToken={myToken} />
*/

const MEDALS = ["1", "2", "3"];

export default function Leaderboard({
  players = [],
  highlightSessionToken = null,
  maxRows = 0,
}) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const rows = maxRows > 0 ? sorted.slice(0, maxRows) : sorted;

  if (rows.length === 0) {
    return <p className="leaderboard__empty">Пока нет результатов</p>;
  }

  return (
    <div className="leaderboard">
      {rows.map((player, index) => {
        const rank = index + 1;
        const isMe =
          highlightSessionToken && player.session_token === highlightSessionToken;
        const rowClass = [
          "leaderboard__row",
          rank <= 3 ? `is-top is-top-${rank}` : "",
          isMe ? "is-me" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={player.id ?? player.session_token ?? index} className={rowClass}>
            <span className="leaderboard__rank">
              {rank <= 3 ? (
                <span className="leaderboard__medal">{MEDALS[index]}</span>
              ) : (
                rank
              )}
            </span>
            <span className="leaderboard__name">
              {player.name}
              {isMe && <span className="leaderboard__you">вы</span>}
            </span>
            <span className="leaderboard__score">
              {Math.round(player.score || 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
