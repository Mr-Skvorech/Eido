import "./CountdownDisplay.scss";

/*
  <CountdownDisplay /> — крупный круговой индикатор оставшегося времени.
  ЧИСТО презентационный: тик таймера (setInterval) остаётся в родителе,
  сюда передаётся уже посчитанное timeLeft.

  props:
    timeLeft   Number — сколько секунд осталось
    total      Number — исходная длительность (для расчёта дуги)
    size       Number — диаметр в px (по умолчанию 132)

  Пример:
    <CountdownDisplay timeLeft={timeLeft} total={question.time_limit} />
*/

export default function CountdownDisplay({ timeLeft = 0, total = 20, size = 132 }) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, timeLeft / safeTotal));

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isLow = ratio <= 0.33;

  return (
    <div
      className={`countdown${isLow ? " is-low" : ""}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`Осталось ${Math.ceil(timeLeft)} секунд`}
    >
      <svg viewBox="0 0 120 120" className="countdown__svg">
        <circle className="countdown__track" cx="60" cy="60" r={radius} />
        <circle
          className="countdown__bar"
          cx="60"
          cy="60"
          r={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <span className="countdown__value">{Math.ceil(timeLeft)}</span>
    </div>
  );
}
