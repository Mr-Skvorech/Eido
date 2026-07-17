# Eido - Веб-сервис для проведения квизов в реальном времени

**Eido** - это учебный веб-сервис для создания и проведения интерактивных квизов в реальном времени (аналог Kahoot). Проект разработан в рамках практики Факультета компьютерных наук Высшей школы экономики на направдение Прикладная математика и информатика совместно с группой компания VK.

---

## 🚀 Функциональность

- **Регистрация и авторизация** пользователей (JWT).
- **Создание квизов** организатором:
  - Добавление вопросов с текстом или изображением.
  - Поддержка одиночного и множественного выбора ответа.
  - Настройка времени на ответ.
- **Запуск квиза** по уникальному 6‑значному PIN‑коду.
- **Подключение участников** в реальном времени через Socket.IO.
- **Синхронный показ вопросов** всем участникам.
- **Подсчёт баллов** и отображение **лидерборда**.
- **Личный кабинет**:
  - Организатор: список созданных квизов и история проведённых игр.
  - Участник: история участия (при входе под своей учётной записью).

---

## 🧰 Стек технологий

### Бэкенд
- **Django** + **Django REST Framework** — API.
- **SimpleJWT** - JWT‑авторизация.
- **python‑socketio** (AsyncServer, ASGI) - WebSocket.
- **Uvicorn** - ASGI‑сервер.
- **SQLite** (по умолчанию) - БД.

### Фронтенд
- **React** (Vite) - SPA.
- **react‑router‑dom** - маршрутизация.
- **axios** - HTTP‑запросы.
- **socket.io‑client** - WebSocket‑клиент.
- **UIkit** - стилизация (`uk-*` классы).

---

## 📁 Структура проекта
```text
Eido/
├── backend/
│ ├── core/
│ │ ├── models.py # Модели БД
│ │ ├── serializers.py # DRF‑сериализаторы
│ │ ├── views.py # API‑эндпоинты
│ │ ├── urls.py # Маршруты API
│ │ └── sockets.py # Socket.IO‑обработчики
│ ├── Eido_quiz/ # Настройки Django (ASGI, settings)
│ ├── manage.py
│ └── requirements.txt
├── frontend/
│ ├── src/
│ │ ├── api/ # axios‑инстанс
│ │ ├── components/ # React‑компоненты
│ │ ├── pages/ # Страницы (Dashboard, CreateQuiz, ...)
│ │ ├── utils/ # socket.js (синглтон) и др.
│ │ ├── App.jsx
│ │ └── main.jsx
│ └── package.json
└── README.md
```


---

## ⚙️ Установка и запуск

### Бэкенд

```bash
cd backend
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Для WebSocket‑соединений используйте Uvicorn (обязательно, т.к. используется ASGI):
```bash

uvicorn Eido_quiz.asgi:application --reload --port 8000
```

Фронтенд
```bash

cd frontend
npm install
npm run dev
```

Приложение будет доступно по адресу http://localhost:5173 (или другому порту, указанному Vite).
🔌 API‑эндпоинты (префикс /api/)
```text
Метод	Путь	Назначение
POST	/auth/register/	Регистрация
POST	/auth/login/	Вход (JWT)
GET	/auth/me/	Текущий пользователь
GET	/quizzes/	Список квизов текущего организатора
POST	/quizzes/	Создание квиза
GET	/quizzes/<id>/get/	Получение квиза по ID
POST	/quizzes/<id>/start/	Создание игровой комнаты (возвращает PIN)
POST	/game/join/	Вход участника по PIN
POST	/game/rooms/<pin>/end/	Завершение игры
GET	/game/rooms/<pin>/results/	Результаты игры
GET	/history/hosted/	История проведённых игр (орг)
GET	/history/played/	История участия (игрок)
```

    Примечание: в текущей версии URL‑ы содержат плейсхолдеры вида <int:quiz_id>. При реальном использовании они заменяются на числовые ID.

📡 Socket.IO‑события
```text
Клиент → Сервер	Сервер → Клиент	Описание
join_room	room_joined	Вход в комнату по PIN
player_joined	new_player	Уведомление хоста о новом игроке
start_quiz	game_started	Старт игры
send_question	receive_question	Отправка вопроса игрокам
submit_answer	player_answered	Ответ игрока (хосту)
show_results	results_revealed	Показ правильного ответа
end_quiz	quiz_ended	Завершение игры (лидерборд)
```

🧪 Тестирование

Для локального тестирования:

    Зарегистрируйтесь как организатор.

    Создайте квиз с вопросами (можно добавить изображения).

    Запустите квиз — получите PIN‑код.

    Откройте второй браузер (или режим инкогнито) и войдите как участник по PIN.

    Проходите квиз в реальном времени, наблюдайте за обновлением результатов у хоста.

🤝 Вклад

Проект выполнен в рамках учебного задания. Автор — Mr-Skvorech.
