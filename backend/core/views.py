from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .serializers import UserSerializer, QuizSerializer, HostedGameHistorySerializer, PlayerGameHistorySerializer
from .models import User, Quiz, GameRoom, Participant
from django.shortcuts import get_object_or_404
import random
import string
import uuid

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Доступно всем без токена
    serializer_class = UserSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Отдаёт данные текущего авторизованного пользователя (для шапки личного кабинета)."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class QuizListCreateView(generics.ListCreateAPIView):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated] # Доступ только по JWT-токену

    def get_queryset(self):
        # Возвращаем квизы только текущего пользователя, сортируем от новых к старым
        return Quiz.objects.filter(creator=self.request.user).order_by('-created_at')

def generate_unique_pin():
    """Генерирует уникальный 6-значный цифровой PIN для активной комнаты."""
    while True:
        pin = ''.join(random.choices(string.digits, k=6))
        # Проверяем, что PIN не используется в данный момент в активных комнатах
        if not GameRoom.objects.filter(pin=pin, is_active=True).exists():
            return pin

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quiz(request, quiz_id):
    """Возвращает данные квиза по его ID, если он принадлежит текущему пользователю."""
    quiz = get_object_or_404(Quiz, id=quiz_id, creator=request.user)
    serializer = QuizSerializer(quiz)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_quiz(request, quiz_id):
    """Полностью обновляет квиз (название, описание, вопросы, варианты ответов)."""
    quiz = get_object_or_404(Quiz, id=quiz_id, creator=request.user)
    serializer = QuizSerializer(quiz, data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_game_room(request, quiz_id):
    """Создает игровую комнату для квиза и возвращает PIN."""
    # Убедимся, что квиз существует и принадлежит текущему пользователю
    quiz = get_object_or_404(Quiz, id=quiz_id, creator=request.user)

    # Защита от дублей: если для этого квиза уже есть активная комната, возвращаем её
    active_room = GameRoom.objects.filter(quiz=quiz, is_active=True).first()
    if active_room:
        return Response({
            'pin': active_room.pin,
            'message': 'Room is already active.'
        }, status=status.HTTP_200_OK)

    pin = generate_unique_pin()
    room = GameRoom.objects.create(
        quiz=quiz,
        pin=pin,
        is_active=True,
        is_started=False  # Комната только что создана, игра ещё не началась
    )

    return Response({
        'pin': room.pin,
        'room_id': room.id
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def rejoin_game(request):
    """
    Переподключение игрока по уже существующему session_token (из localStorage),
    без создания нового участника — чтобы не терять имя и очки при разрыве связи.
    """
    pin = request.data.get('pin')
    session_token = request.data.get('session_token')

    if not pin or not session_token:
        return Response({'error': 'PIN и session_token обязательны.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        participant = Participant.objects.select_related('room').get(
            session_token=session_token, room__pin=pin
        )
    except (Participant.DoesNotExist, ValueError):
        return Response({'error': 'Сессия не найдена. Войдите заново.'}, status=status.HTTP_404_NOT_FOUND)

    if not participant.room.is_active:
        return Response({'error': 'Игра уже завершена.'}, status=status.HTTP_410_GONE)

    return Response({
        'session_token': str(participant.session_token),
        'name': participant.name,
        'score': participant.score,
        'is_started': participant.room.is_started,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny]) # Игрокам не нужен JWT-токен
def join_game(request):
    """Регистрация игрока в комнате по PIN-коду."""
    pin = request.data.get('pin')
    name = request.data.get('name')

    if not pin or not name:
        return Response({'error': 'PIN и имя обязательны.'}, status=status.HTTP_400_BAD_REQUEST)

    # Ищем активную комнату по PIN
    room = GameRoom.objects.filter(pin=pin, is_active=True).first()
    if not room:
        return Response({'error': 'Комната не найдена или игра уже завершена.'}, status=status.HTTP_404_NOT_FOUND)

    # Создаем участника
    session_token = uuid.uuid4()
    participant = Participant(
        room=room,
        name=name,
        session_token=session_token
    )
    
    # НОВАЯ ЛОГИКА: Если игрок авторизован, привязываем его профиль
    if request.user.is_authenticated:
        participant.user = request.user
        
    participant.save() # Сохраняем в БД

    return Response({
        'message': 'Успешно присоединились',
        'session_token': str(session_token),
        'participant_id': participant.id,
        'name': participant.name
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_room_results(request, pin):
    """Отдаёт список участников комнаты с их очками (для экрана финальных результатов)."""
    room = get_object_or_404(GameRoom, pin=pin)
    participants = Participant.objects.filter(room=room).order_by('-score')
    data = [
        {'id': p.id, 'name': p.name, 'score': p.score, 'session_token': str(p.session_token)}
        for p in participants
    ]
    return Response(data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Только авторизованный ведущий может закрыть игру
def end_game(request, pin):
    try:
        # Находим активную комнату по PIN
        room = GameRoom.objects.get(pin=pin, is_active=True)
    except GameRoom.DoesNotExist:
        return Response({"error": "Активная комната не найдена"}, status=status.HTTP_404_NOT_FOUND)
    
    # Получаем финальные скоры от фронтенда ведущего
    # Формат данных ожидается: {"scores": {"session_token_1": 2500, "session_token_2": 1800}}
    scores_data = request.data.get('scores', {})
    
    # Обновляем очки участников в БД
    for token, score in scores_data.items():
        Participant.objects.filter(room=room, session_token=token).update(score=score)
        
    # Деактивируем комнату, чтобы по этому PIN больше никто не зашел
    room.is_active = False
    room.save()
    
    return Response({"message": "Игра успешно завершена, результаты сохранены"}, status=status.HTTP_200_OK)

# История игр, которые пользователь ОРГАНИЗОВАЛ
class HostedGamesHistoryListView(generics.ListAPIView):
    serializer_class = HostedGameHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Выбираем только НЕАКТИВНЫЕ комнаты (игры завершены), созданные этим пользователем
        return GameRoom.objects.filter(
            quiz__creator=user, 
            is_active=False
        ).order_by('-created_at')

# История игр, в которых пользователь УЧАСТВОВАЛ как игрок
class PlayerGamesHistoryListView(generics.ListAPIView):
    serializer_class = PlayerGameHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Выбираем только те записи участников, которые привязаны к юзеру
        # и где комната уже закрыта (игра завершена)
        return Participant.objects.filter(
            user=user, 
            room__is_active=False
        ).order_by('-room__created_at')