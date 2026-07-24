"use client"

import { useEffect, useState } from "react"
import "./showcase.scss"

// Компоненты квиз-платформы (портируемые .jsx на UIkit + SCSS)
import AnswerGrid from "@/components/quiz/AnswerGrid"
import CountdownDisplay from "@/components/quiz/CountdownDisplay"
import Leaderboard from "@/components/quiz/Leaderboard"
import PlayerResultCard from "@/components/quiz/PlayerResultCard"
import FinalScoreCard from "@/components/quiz/FinalScoreCard"
import PinDisplay from "@/components/quiz/PinDisplay"
import PlayersGrid from "@/components/quiz/PlayersGrid"
import QuizCard from "@/components/quiz/QuizCard"
import HostQuestionControls from "@/components/quiz/HostQuestionControls"

// ---- Моковые данные строго по модели проекта ----
const question = {
  id: 1,
  text: "Какая планета Солнечной системы самая большая?",
  time_limit: 20,
  is_multiple_choice: false,
  image: null,
  choices: [
    { id: 11, text: "Марс", is_correct: false },
    { id: 12, text: "Юпитер", is_correct: true },
    { id: 13, text: "Земля", is_correct: false },
    { id: 14, text: "Венера", is_correct: false },
  ],
}

const players = [
  { id: 1, name: "Аня", score: 5820, session_token: "tok-anya" },
  { id: 2, name: "Максим", score: 5410, session_token: "tok-max" },
  { id: 3, name: "Лена", score: 4990, session_token: "tok-lena" },
  { id: 4, name: "Влад", score: 4310, session_token: "tok-vlad" },
  { id: 5, name: "Соня", score: 3870, session_token: "tok-sonya" },
]

const lobbyPlayers = [
  { id: 1, name: "Аня" },
  { id: 2, name: "Максим" },
  { id: 3, name: "Лена" },
  { id: 4, name: "Влад" },
  { id: 5, name: "Соня" },
  { id: 6, name: "Дима" },
]

const quizzes = [
  {
    id: 1,
    title: "Космос для новичков",
    description: "20 вопросов о планетах, звёздах и первых полётах человека в космос.",
    created_at: "2026-05-14",
    questions: new Array(20).fill(0),
  },
  {
    id: 2,
    title: "История России: XX век",
    description: "Ключевые события, даты и личности прошлого столетия.",
    created_at: "2026-06-02",
    questions: new Array(15).fill(0),
  },
]

function Section({
  title,
  tag,
  desc,
  children,
}: {
  title: string
  tag: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <section className="demo-section">
      <div className="demo-section__head">
        <h2 className="demo-section__title">{title}</h2>
        <span className="demo-section__tag">{tag}</span>
      </div>
      {desc && <p className="demo-section__desc">{desc}</p>}
      {children}
    </section>
  )
}

export default function Page() {
  // Инициализация иконок UIkit (в твоём проекте это делается один раз в точке входа)
  useEffect(() => {
    let mounted = true
    Promise.all([
      import("uikit"),
      // @ts-expect-error — у пакета иконок нет типов
      import("uikit/dist/js/uikit-icons"),
    ]).then(([uikit, icons]) => {
      if (!mounted) return
      const UIkit = uikit.default
      UIkit.use(icons.default)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Интерактив: выбор ответа + показ правильных
  const [selected, setSelected] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)

  // Интерактив: таймер обратного отсчёта
  const [timeLeft, setTimeLeft] = useState(question.time_limit)
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : question.time_limit))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="showcase">
      <header className="showcase__hero">
        <span className="showcase__eyebrow">Quiz Kit · React + UIkit</span>
        <h1 className="showcase__title">
          Компоненты для <em>живого квиза</em> в стиле Kahoot
        </h1>
        <p className="showcase__lead">
          Готовые презентационные компоненты: данные — через props, события — через
          колбэки. Вставляются в твои страницы Host* / Player* без переписывания логики.
          Ниже — живое демо на моковых данных по твоей модели.
        </p>
      </header>

      <div className="showcase__wrap">
        <Section
          title="Экран вопроса"
          tag="<AnswerGrid />"
          desc="Плитки-ответы с фигурами-маркерами. Кликай по вариантам, затем включи «Показать ответы»."
        >
          <p className="demo-label" style={{ textAlign: "left", marginBottom: 16 }}>
            {question.text}
          </p>
          <AnswerGrid
            choices={question.choices}
            selectedIds={selected}
            revealCorrect={revealed}
            isMultiple={question.is_multiple_choice}
            onSelect={(id: number) =>
              setSelected((prev) => (prev.includes(id) ? [] : [id]))
            }
          />
          <div className="demo-toolbar">
            <button
              className={`demo-btn ${revealed ? "is-active" : ""}`}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? "Скрыть ответы" : "Показать ответы"}
            </button>
            <button
              className="demo-btn"
              onClick={() => {
                setSelected([])
                setRevealed(false)
              }}
            >
              Сбросить
            </button>
          </div>
        </Section>

        <Section
          title="Таймер и результат хода"
          tag="<CountdownDisplay /> · <PlayerResultCard />"
          desc="Круговой отсчёт (тик остаётся в родителе) и полноэкранный отклик игрока."
        >
          <div className="demo-grid-2">
            <div className="demo-center">
              <CountdownDisplay timeLeft={timeLeft} total={question.time_limit} />
              <span className="demo-label">осталось секунд</span>
            </div>
            <PlayerResultCard isCorrect={revealed} points={850} correctText="Юпитер" />
          </div>
        </Section>

        <Section
          title="Лобби хоста"
          tag="<PinDisplay /> · <PlayersGrid />"
          desc="PIN-код игры и сетка подключившихся игроков с живой анимацией входа."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <PinDisplay pin="734182" subtitle="Зайдите на quiz.app и введите код" />
            <PlayersGrid players={lobbyPlayers} />
          </div>
        </Section>

        <Section
          title="Панель управления игрой"
          tag="<HostQuestionControls />"
          desc="Управление ходом: вывести вопрос, показать ответы, лидеры, следующий вопрос."
        >
          <HostQuestionControls
            current={3}
            total={20}
            isActive={!revealed}
            resultsShown={revealed}
            onStart={() => setRevealed(false)}
            onReveal={() => setRevealed(true)}
            onShowLeaderboard={() => {}}
            onNext={() => setRevealed(false)}
          />
        </Section>

        <Section
          title="Таблица лидеров и финал"
          tag="<Leaderboard /> · <FinalScoreCard />"
          desc="Ранжирование по очкам с медалями и подсветкой своей строки + итоговый экран игрока."
        >
          <div className="demo-grid-2">
            <Leaderboard players={players} highlightSessionToken="tok-max" />
            <FinalScoreCard rank={2} total={5} playerName="Максим" score={5410} />
          </div>
        </Section>

        <Section
          title="Карточки квизов (Dashboard)"
          tag="<QuizCard />"
          desc="Карточка квиза с счётчиком вопросов, датой и действиями запуска / редактирования."
        >
          <div className="demo-cards">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onLaunch={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </Section>
      </div>
    </main>
  )
}
