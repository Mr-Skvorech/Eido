from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, QuizListCreateView, start_game_room, get_quiz, update_quiz, join_game, rejoin_game, end_game, get_room_results, me, HostedGamesHistoryListView, PlayerGamesHistoryListView

urlpatterns = [
    # Добавили префикс  к авторизации
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/me/', me, name='auth-me'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Добавили префикс  к квизам (из-за этого была 404)
    path('quizzes/', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('quizzes/<int:quiz_id>/start/', start_game_room, name='start-game-room'),
    path('quizzes/<int:quiz_id>/get/', get_quiz, name='get-quiz'),
    path('quizzes/<int:quiz_id>/update/', update_quiz, name='update-quiz'),
    
    # Эти пути у тебя уже были правильными
    path('game/join/', join_game, name='join-game'),
    path('game/rejoin/', rejoin_game, name='rejoin-game'),
    path('game/rooms/<str:pin>/end/', end_game, name='end-game'),
    path('game/rooms/<str:pin>/results/', get_room_results, name='room-results'),
    path('history/hosted/', HostedGamesHistoryListView.as_view(), name='hosted-history'),
    path('history/played/', PlayerGamesHistoryListView.as_view(), name='player-history'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)   