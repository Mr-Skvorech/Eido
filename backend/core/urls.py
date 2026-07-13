from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, QuizListCreateView, start_game_room, join_game, HostedGamesHistoryListView, PlayerGamesHistoryListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('quizzes/', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('quizzes/<int:quiz_id>/start/', start_game_room, name='start-game-room'),
    path('game/join/', join_game, name='join-game'),
    path('api/history/hosted/', HostedGamesHistoryListView.as_view(), name='hosted-history'),
    path('api/history/played/', PlayerGamesHistoryListView.as_view(), name='player-history'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)