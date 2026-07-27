import socketio
import asyncio
import time
from asgiref.sync import sync_to_async
from .models import GameRoom, Participant

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
connected_players = {}
game_states = {}

@sio.event
async def connect(sid, environ, auth):
    print(f"[Socket] Клиент подключился: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[Socket] Клиент отключился: {sid}")
    player = connected_players.pop(sid, None)
    if not player:
        return
    pin = player.get('pin')
    session_token = player.get('session_token')
    if pin:
        await sio.emit('player_left', {'session_token': session_token}, room=pin)
    if session_token:
        asyncio.create_task(_maybe_remove_abandoned_participant(session_token))


async def _maybe_remove_abandoned_participant(session_token):
    # Даём игроку несколько секунд на переподключение (например, при F5),
    # прежде чем считать его окончательно ушедшим
    await asyncio.sleep(10)
    still_connected = any(
        p.get('session_token') == session_token for p in connected_players.values()
    )
    if still_connected:
        return
    await _remove_abandoned_participant(session_token)

@sync_to_async
def _remove_abandoned_participant(session_token):
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
    pin = data.get('pin')
    if pin:
        await sio.enter_room(sid, pin)
        print(f"[Socket] {sid} вошел в комнату {pin}")
        await sio.emit('room_joined', {'message': f'Вы успешно вошли в комнату {pin}'}, room=sid)

@sio.event
async def player_joined(sid, data):
    pin = data.get('pin')
    name = data.get('name')
    session_token = data.get('session_token')
    if pin and name:
        connected_players[sid] = {'pin': pin, 'session_token': session_token}
        await sio.emit('new_player', {'name': name, 'session_token': session_token}, room=pin)
        print(f"[Socket] Игрок {name} зашел в комнату {pin}")

@sio.event
async def start_quiz(sid, data):
    pin = data.get('pin')
    if pin:
        await _mark_room_started(pin)
        await sio.emit('game_started', {'pin': pin}, room=pin)
        print(f"[Socket] Запуск игры в комнате {pin}")

@sio.on('send_question')
async def on_send_question(sid, data):
    room = data.get('room')
    question_data = data.get('question')
    full_question = data.get('full_question')
    current_question = data.get('current_question', 0)
    time_limit = question_data.get('time_limit', 20) if question_data else 20

    state = {
        "phase": "question",
        "question": question_data,          # публичная версия
        "full_question": full_question,     # серверная версия
        "current_question": current_question,
        "start_time": time.time(),
        "time_limit": time_limit,
        "players": game_states.get(room, {}).get("players", {})
    }
    game_states[room] = state
    await sio.emit('receive_question', question_data, room=room, skip_sid=sid)

@sio.on('show_results')
async def on_show_results(sid, data):
    room = data.get('room')
    results_data = data.get('results')
    state = game_states.get(room, {})
    state["phase"] = "results"
    state["results"] = results_data
    game_states[room] = state
    await sio.emit('results_revealed', results_data, room=room, skip_sid=sid)

@sio.on('end_quiz')
async def on_end_quiz(sid, data):
    room = data.get('room')
    scores = data.get('scores')
    leaderBoard = data.get('leaderBoard')
    await sio.emit('quiz_ended', {'scores': scores, 'leaderBoard': leaderBoard}, room=room, skip_sid=sid)
    game_states.pop(room, None)

@sio.on("host_sync")
async def host_sync(sid, data):
    room = data.get("room")
    state = game_states.get(room)
    if not state:
        await sio.emit("host_state", {"phase": "unknown"}, room=sid)
        return

    response = {
        "phase": state["phase"],
        "current_question": state.get("current_question", 0),
        "question": state.get("question"),
        "results": state.get("results"),
        "players": state.get("players", {})
    }
    if state["phase"] == "question":
        elapsed = time.time() - state["start_time"]
        remaining = max(0, state["time_limit"] - elapsed)
        response["time_left"] = remaining

    await sio.emit("host_state", response, room=sid)

@sio.on('submit_answer')
async def on_submit_answer(sid, data):
    room = data.get('room')
    player_id = data.get('player_id')  # session_token игрока
    choice_id = data.get('choice_id')
    time_taken = data.get('time_taken')

    # Вычисляем очки (дублируем логику хоста)
    # Для этого нужно знать текущий вопрос и правильные ответы
    state = game_states.get(room)
    if not state or state["phase"] != "question":
        return

    question_data = state.get("full_question")
    if not question_data:
        return

    choices = question_data.get("choices", [])
    correct_ids = [c["id"] for c in choices if c.get("is_correct", False)]
    is_correct = False
    if isinstance(choice_id, list):
        is_correct = sorted(choice_id) == sorted(correct_ids)
    else:
        is_correct = choice_id in correct_ids

    points_awarded = 0
    if is_correct:
        points_awarded = max(0, 1000 - (time_taken * 10))

    if "players" not in state:
        state["players"] = {}
    state["players"][player_id] = state["players"].get(player_id, 0) + points_awarded

    await sio.emit('player_answered', {
        'player_id': player_id,
        'choice_id': choice_id,
        'time_taken': time_taken,
        'points_awarded': points_awarded,
        'total_score': state["players"][player_id]
    }, room=room, skip_sid=sid)