from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import User, Quiz
from .serializers import UserSerializer, QuizSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Доступно всем без токена
    serializer_class = UserSerializer

class QuizListCreateView(generics.ListCreateAPIView):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated] # Доступ только по JWT-токену

    def get_queryset(self):
        # Возвращаем квизы только текущего пользователя, сортируем от новых к старым
        return Quiz.objects.filter(creator=self.request.user).order_by('-created_at')