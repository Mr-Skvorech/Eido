from rest_framework import serializers
from .models import User, Quiz, Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    # Явно указываем вложенный сериализатор для вариантов ответов
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'time_limit', 'choices']

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
