import "./QuizCard.scss";

/*
  <QuizCard /> — карточка квиза для Dashboard.

  props:
    quiz          Object — { id, title, description, created_at, questions }
                           (questions — массив; берём его длину для счётчика)
    onLaunch(q)   Func   — «Запустить игру»
    onEdit(q)     Func   — «Редактировать»
    onDelete(q)   Func   — «Удалить» (опционально; если нет — кнопка скрыта)

  Пример:
    <QuizCard quiz={quiz} onLaunch={host} onEdit={edit} onDelete={remove} />
*/

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function QuizCard({
  quiz = {},
  onLaunch = () => {},
  onEdit = () => {},
  onDelete = null,
}) {
  const count = Array.isArray(quiz.questions) ? quiz.questions.length : quiz.questions ?? 0;

  return (
    <div className="quiz-card">
      <div className="quiz-card__head">
        <span className="quiz-card__count">
          <span uk-icon="icon: list; ratio: 0.8" />
          {count} {count === 1 ? "вопрос" : "вопр."}
        </span>
        {quiz.created_at && (
          <span className="quiz-card__date">{formatDate(quiz.created_at)}</span>
        )}
      </div>

      <h3 className="quiz-card__title">{quiz.title || "Без названия"}</h3>
      {quiz.description && (
        <p className="quiz-card__desc">{quiz.description}</p>
      )}

      <div className="quiz-card__actions">
        <button
          type="button"
          className="uk-button quiz-btn quiz-btn--primary"
          onClick={() => onLaunch(quiz)}
        >
          <span uk-icon="icon: play; ratio: 0.9" />
          Запустить
        </button>
        <button
          type="button"
          className="uk-button quiz-btn quiz-btn--ghost"
          onClick={() => onEdit(quiz)}
        >
          <span uk-icon="icon: pencil; ratio: 0.9" />
          Изменить
        </button>
        {onDelete && (
          <button
            type="button"
            className="uk-button quiz-btn quiz-btn--icon-danger"
            aria-label="Удалить квиз"
            onClick={() => onDelete(quiz)}
          >
            <span uk-icon="icon: trash; ratio: 0.9" />
          </button>
        )}
      </div>
    </div>
  );
}
