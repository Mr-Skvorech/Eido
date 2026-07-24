import "./AnswerGrid.scss";

/*
  <AnswerGrid /> — сетка вариантов ответа в стиле Kahoot.

  props:
    choices          Array  — [{ id, text, is_correct }]
    selectedIds      Array  — id выбранных вариантов (для одиночного выбора — 1 элемент)
    disabled         Bool   — заблокировать клики (например, время вышло)
    revealCorrect    Bool   — подсветить правильные / неправильные ответы
    isMultiple       Bool   — множественный выбор (влияет только на подсказку/бейдж)
    onSelect(id)     Func   — колбэк при клике по варианту

  Пример:
    <AnswerGrid
      choices={question.choices}
      selectedIds={selected}
      disabled={timeLeft === 0}
      revealCorrect={showResults}
      isMultiple={question.is_multiple_choice}
      onSelect={(id) => handleSelect(id)}
    />
*/

// Простые геометрические фигуры-маркеры (как в Kahoot). Не декоративные — помогают
// быстро отличать варианты, в т.ч. для игроков, смотрящих на большой экран.
const Shape = ({ index }) => {
  const shapes = [
    <polygon key="t" points="12,3 22,21 2,21" />,
    <polygon key="d" points="12,2 22,12 12,22 2,12" />,
    <circle key="c" cx="12" cy="12" r="10" />,
    <rect key="s" x="3" y="3" width="18" height="18" rx="2" />,
  ];
  return (
    <svg className="answer-tile__shape" viewBox="0 0 24 24" aria-hidden="true">
      {shapes[index % shapes.length]}
    </svg>
  );
};

export default function AnswerGrid({
  choices = [],
  selectedIds = [],
  disabled = false,
  revealCorrect = false,
  isMultiple = false,
  onSelect = () => {},
}) {
  return (
    <div className="answer-grid" role="listbox" aria-multiselectable={isMultiple}>
      {choices.map((choice, index) => {
        const isSelected = selectedIds.includes(choice.id);
        const isCorrect = !!choice.is_correct;

        const classes = ["answer-tile", `answer-tile--c${index % 4}`];
        if (isSelected) classes.push("is-selected");
        if (disabled) classes.push("is-disabled");
        if (revealCorrect) {
          classes.push("is-revealed");
          if (isCorrect) classes.push("is-correct");
          else if (isSelected) classes.push("is-wrong");
          else classes.push("is-dimmed");
        }

        return (
          <button
            key={choice.id}
            type="button"
            className={classes.join(" ")}
            role="option"
            aria-selected={isSelected}
            disabled={disabled}
            onClick={() => onSelect(choice.id)}
          >
            <span className="answer-tile__icon">
              <Shape index={index} />
            </span>
            <span className="answer-tile__text">{choice.text}</span>
            {revealCorrect && isCorrect && (
              <span className="answer-tile__mark" uk-icon="icon: check; ratio: 1.1" />
            )}
            {revealCorrect && isSelected && !isCorrect && (
              <span className="answer-tile__mark" uk-icon="icon: close; ratio: 1.1" />
            )}
          </button>
        );
      })}
    </div>
  );
}
