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
    id = serializers.IntegerField(required=False)

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

    def update(self, instance, validated_data):
        """
        Полноценное редактирование квиза.
        Вопросы с переданным существующим 'id' обновляются на месте (картинка
        сохраняется, если новую не прислали). Вопросы без 'id' — новые, создаются.
        Вопросы, которых больше нет в присланных данных, — удаляются.
        Варианты ответов пересоздаются заново при каждом сохранении (они лёгкие,
        отдельно отслеживать их ID смысла нет).
        """
        questions_data = validated_data.pop('questions', None)
 
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.save()
 
        if questions_data is not None:
            existing_questions = {q.id: q for q in instance.questions.all()}
            kept_ids = set()
 
            for question_data in questions_data:
                q_id = question_data.pop('id', None)
                choices_data = question_data.pop('choices', [])
                new_image = question_data.pop('image', None)  # None, если картинку не меняли
 
                if q_id and q_id in existing_questions:
                    # Обновляем существующий вопрос на месте
                    question = existing_questions[q_id]
                    question.text = question_data.get('text', question.text)
                    question.time_limit = question_data.get('time_limit', question.time_limit)
                    question.is_multiple_choice = question_data.get(
                        'is_multiple_choice', question.is_multiple_choice
                    )
                    if new_image:  # Прислали новую картинку — заменяем. Иначе старая остаётся.
                        question.image = new_image
                    question.save()
                    kept_ids.add(q_id)
                else:
                    # Новый вопрос — создаём с нуля
                    question = Question.objects.create(
                        quiz=instance,
                        image=new_image,
                        **question_data
                    )
                    kept_ids.add(question.id)
 
                # Варианты ответов пересоздаём с нуля в любом случае
                question.choices.all().delete()
                for choice_data in choices_data:
                    choice_data.pop('id', None)
                    Choice.objects.create(question=question, **choice_data)
 
            # Удаляем вопросы, которые убрали из формы редактирования
            for old_id, old_question in existing_questions.items():
                if old_id not in kept_ids:
                    old_question.delete()
 
        return instance

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