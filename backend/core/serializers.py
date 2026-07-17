from rest_framework import serializers
from drf_extra_fields.fields import Base64ImageField
from .models import User, Quiz, Question, Choice, GameRoom, Participant

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=False, allow_null=True) # Само разберет Base64 строку в файл!
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'time_limit', 'image', 'is_multiple_choice', 'choices']

class QuizSerializer(serializers.ModelSerializer):
    # Явно указываем вложенный сериализатор для вопросов
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'created_at', 'questions']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        # 1. Извлекаем вложенные данные (вопросы) из общего словаря
        questions_data = validated_data.pop('questions')
        
        # 2. Получаем текущего авторизованного пользователя из контекста запроса
        user = self.context['request'].user
        
        # 3. Создаем сам объект Квиза
        quiz = Quiz.objects.create(creator=user, **validated_data)
        
        # 4. Проходимся по списку вопросов и создаем их, привязывая к квизу
        for question_data in questions_data:
            choices_data = question_data.pop('choices')
            question = Question.objects.create(quiz=quiz, **question_data)
            
            # 5. Проходимся по вариантам ответов и создаем их, привязывая к вопросу
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
                
        return quiz

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}} # Пароль не будет возвращаться в ответах API

    def create(self, validated_data):
        # Используем create_user, чтобы пароль правильно захешировался в базе
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

# Вспомогательный сериализатор для отображения участников внутри истории хоста
class ParticipantHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'name', 'score']

# 1. Сериализатор истории для Организатора
class HostedGameHistorySerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    participants = ParticipantHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = GameRoom
        fields = ['id', 'pin', 'quiz_title', 'created_at', 'participants']

# 2. Сериализатор истории для Игрока
class PlayerGameHistorySerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='room.quiz.title', read_only=True)
    room_pin = serializers.CharField(source='room.pin', read_only=True)
    game_date = serializers.DateTimeField(source='room.created_at', read_only=True)
    # Можно добавить поле, чтобы показать общее количество игроков в той комнате
    total_participants = serializers.IntegerField(source='room.participants.count', read_only=True)

    class Meta:
        model = Participant
        fields = ['id', 'room_pin', 'quiz_title', 'score', 'game_date', 'total_participants']