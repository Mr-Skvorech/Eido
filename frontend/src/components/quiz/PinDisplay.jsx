import "./PinDisplay.scss";

/*
  <PinDisplay /> — крупный блок с PIN-кодом игры (для лобби хоста).

  props:
    pin       String|Number — PIN-код
    subtitle  String        — подпись (например, «Зайдите на quiz.app и введите код»)
    label     String        — заголовок над кодом

  Пример:
    <PinDisplay pin={game.pin} subtitle="Присоединяйтесь на quiz.app" />
*/

export default function PinDisplay({
  pin = "000000",
  subtitle = "Введите PIN, чтобы присоединиться",
  label = "PIN игры",
}) {
  const digits = String(pin).split("");

  return (
    <div className="pin-display">
      <span className="pin-display__label">{label}</span>
      <div className="pin-display__code" aria-label={`PIN ${pin}`}>
        {digits.map((d, i) => (
          <span key={i} className="pin-display__digit">
            {d}
          </span>
        ))}
      </div>
      <p className="pin-display__subtitle">{subtitle}</p>
    </div>
  );
}
