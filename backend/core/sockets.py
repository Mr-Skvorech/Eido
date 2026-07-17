import socketio
from asgiref.sync import sync_to_async
from .models import GameRoom, Participant

# cors_allowed_origins='*' нужен для локальной разработки с React (Vite)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
connected_players = {}

@sio.event
async def connect(sid, environ, auth):
    """
    Событие при подключении клиента. 
    В 'auth' фронтенд будет передавать JWT-токен или session_token.
    """
    print(f"[Socket] Клиент подключился: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[Socket] Клиент отключился: {sid}")
 
    player = connected_players.pop(sid, None)
    if not player:
        return  # это был хост или кто-то без сохранённой сессии игрока
 
    pin = player.get('pin')
    session_token = player.get('session_token')
 
    if pin:
        # Сообщаем хосту в реальном времени убрать игрока из списка лобби
        await sio.emit('player_left', {'session_token': session_token}, room=pin)
 
    if session_token:
        await _remove_abandoned_participant(session_token)

@sync_to_async
def _remove_abandoned_participant(session_token):
    """Удаляет запись участника, если игра ещё не началась —
    он ничего не успел сыграть, терять по факту нечего.
    Если игра уже идёт — запись остаётся (частичный счёт валиден)."""
    try:
        participant = Participant.objects.select_related('room').get(session_token=session_token)
        if not participant.room.is_started:
            participant.delete()
    except Participant.DoesNotExist:
        pass
 
 
@sync_to_async
def _mark_room_started(pin):
    GameRoom.objects.filter(pin=pin).update(is_started=True)

@sio.event
async def join_room(sid, data):
    """
    Хост (или позже участник) присоединяется к "комнате" Socket.IO, 
    названной в честь PIN-кода.
    """
    pin = data.get('pin')
    if pin:
        await sio.enter_room(sid, pin)
        print(f"[Socket] {sid} вошел в комнату {pin}")
        await sio.emit('room_joined', {'message': f'Вы успешно вошли в комнату {pin}'}, room=sid)

@sio.event
async def player_joined(sid, data):
    """
    Игрок сообщает серверу, что он вошел.
    Сервер пересылает это сообщение ведущему (в комнату с PIN).
    """
    pin = data.get('pin')
    name = data.get('name')
    session_token = data.get('session_token')  # уникальный ID участника (из join_game)
 
    if pin and name:
        connected_players[sid] = {'pin': pin, 'session_token': session_token}
 
        await sio.emit('new_player', {'name': name, 'session_token': session_token}, room=pin)
        print(f"[Socket] Игрок {name} зашел в комнату {pin}")

@sio.event
async def start_quiz(sid, data):
    """
    Ведущий дает команду начать квиз.
    """
    pin = data.get('pin')
    if pin:
        print(f"[Socket] Запуск игры в комнате {pin}")
        # Рассылаем всем участникам комнаты событие 'game_started'
        await _mark_room_started(pin)  # с этого момента disconnect не удаляет участников
        await sio.emit('game_started', {'pin': pin}, room=pin)

@sio.on('send_question')
async def on_send_question(sid, data):
    """Ведущий отправляет новый вопрос игрокам."""
    room = data.get('room')
    question_data = data.get('question')
    # Пересылаем вопрос всем в комнате, кроме самого ведущего
    await sio.emit('receive_question', question_data, room=room, skip_sid=sid)

@sio.on('show_results')
async def on_show_results(sid, data):
    """Ведущий показывает правильный ответ и результаты после окончания таймера."""
    room = data.get('room')
    results_data = data.get('results')
    # Рассылаем результаты игрокам (например, id правильного ответа)
    await sio.emit('results_revealed', results_data, room=room, skip_sid=sid)

@sio.on('end_quiz')
async def on_end_quiz(sid, data):
    """Ведущий завершает игру (показан финальный подиум)."""
    room = data.get('room')
    scores = data.get('scores')  # Ожидаем словарь {session_token: score}
    leaderBoard = data.get('leaderBoard')
    await sio.emit('quiz_ended', {'scores': scores, 'leaderBoard': leaderBoard}, room=room, skip_sid=sid)


# --- ЛОГИКА ИГРОКА (Player -> Server -> Host) ---

@sio.on('submit_answer')
async def on_submit_answer(sid, data):
    """Игрок отправляет свой ответ."""
    room = data.get('room')
    answer_data = {
        'player_id': data.get('player_id'), # Уникальный ID или токен игрока
        'choice_id': data.get('choice_id'), # ID выбранного ответа
        'time_taken': data.get('time_taken') # За какое время ответил (для начисления очков)
    }
    # Отправляем ответ ТОЛЬКО ведущему, чтобы другие игроки не видели чужие ответы
    # Для простоты шлем всем в комнате, но фронтенд игроков будет игнорировать событие 'player_answered'
    # (Или можно сохранять sid ведущего при создании комнаты и слать адресно ему)
    await sio.emit('player_answered', answer_data, room=room, skip_sid=sid)