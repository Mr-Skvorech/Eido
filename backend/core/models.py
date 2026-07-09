from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

# Переопределяем стандартного пользователя, чтобы логин был по Email
class User(AbstractUser):
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

# Модель самого квиза
class Quiz(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# Модель вопроса
class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.CharField(max_length=500)
    time_limit = models.IntegerField(default=20, help_text="Время на ответ в секундах")

    def __str__(self):
        return f"{self.quiz.title} - {self.text[:20]}"

# Модель варианта ответа
class Choice(models.Model):
    question = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text

# Игровая комната для проведения квиза
class GameRoom(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    pin = models.CharField(max_length=6, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room {self.pin} ({self.quiz.title})"

# Участник конкретной игры
class Participant(models.Model):
    room = models.ForeignKey(GameRoom, related_name='participants', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    score = models.IntegerField(default=0)
    session_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True) # Чтобы можно было перезайти

    def __str__(self):
        return f"{self.name} ({self.room.pin})"