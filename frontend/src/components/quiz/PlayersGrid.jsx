import "./PlayersGrid.scss";

/*
  <PlayersGrid /> — сетка карточек подключившихся игроков (лобби / комната ожидания).

  props:
    players    Array   — массив игроков: [{ id, name }] или просто ["Аня", "Петя"]
    emptyText  String  — что показать, если игроков ещё нет
    onKick(p)  Func    — колбэк «удалить игрока» (если задан — появляется крестик)

  Пример:
    <PlayersGrid players={players} onKick={(p) => kickPlayer(p)} />
*/

export default function PlayersGrid({
  players = [],
  emptyText = "Ожидание игроков…",
  onKick = null,
}) {
  if (!players || players.length === 0) {
    return (
      <div className="players-grid__empty">
        <span uk-icon="icon: users; ratio: 1.4" />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="players-grid">
      {players.map((p, i) => {
        const name = typeof p === "string" ? p : p.name;
        const key = typeof p === "string" ? `${p}-${i}` : p.id ?? i;
        const initial = (name || "?").trim().charAt(0).toUpperCase();

        return (
          <div key={key} className="player-chip" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="player-chip__avatar">{initial}</span>
            <span className="player-chip__name">{name}</span>
            {onKick && (
              <button
                type="button"
                className="player-chip__kick"
                aria-label={`Удалить ${name}`}
                onClick={() => onKick(p)}
              >
                <span uk-icon="icon: close; ratio: 0.8" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
