from rest_framework import serializers
from drf_extra_fields.fields import Base64ImageField
from .models import User, Quiz, Question, Choice, GameRoom, Participant

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=False, allow_null=True)
    choices = ChoiceSerializer(many=True)
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Question
        fields = ['id', 'text', 'time_limit', 'image', 'is_multiple_choice', 'choices']

    def validate(self, data):
        choices = data.get('choices', [])
        if not any(choice.get('is_correct') for choice in choices):
            raise serializers.ValidationError({
                'choices': 'У вопроса должен быть хотя бы один правильный вариант ответа.'
            })
        return data

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    active_room = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'created_at', 'questions', 'active_room']
        read_only_fields = ['id', 'created_at']

    def get_active_room(self, obj):
        room = GameRoom.objects.filter(quiz=obj, is_active=True).first()
        if not room:
            return None
        return {'pin': room.pin, 'is_started': room.is_started}

    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        user = self.context['request'].user
        quiz = Quiz.objects.create(creator=user, **validated_data)

        for question_data in questions_data:
            choices_data = question_data.pop('choices')
            question = Question.objects.create(quiz=quiz, **question_data)

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
                new_image = question_data.pop('image', None)
 
                if q_id and q_id in existing_questions:
                    question = existing_questions[q_id]
                    question.text = question_data.get('text', question.text)
                    question.time_limit = question_data.get('time_limit', question.time_limit)
                    question.is_multiple_choice = question_data.get(
                        'is_multiple_choice', question.is_multiple_choice
                    )
                    if new_image:
                        question.image = new_image
                    question.save()
                    kept_ids.add(q_id)
                else:
                    question = Question.objects.create(
                        quiz=instance,
                        image=new_image,
                        **question_data
                    )
                    kept_ids.add(question.id)
 
                question.choices.all().delete()
                for choice_data in choices_data:
                    choice_data.pop('id', None)
                    Choice.objects.create(question=question, **choice_data)

            for old_id, old_question in existing_questions.items():
                if old_id not in kept_ids:
                    old_question.delete()
 
        return instance

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже зарегистрирован.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Это имя пользователя уже занято.")
        return value

    def create(self, validated_data):
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
    total_participants = serializers.IntegerField(source='room.participants.count', read_only=True)
    placement = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = ['id', 'room_pin', 'quiz_title', 'score', 'game_date', 'total_participants', 'placement']

    def get_placement(self, obj):
        # Место по убыванию очков среди участников той же комнаты
        ordered_ids = list(obj.room.participants.order_by('-score').values_list('id', flat=True))
        try:
            return ordered_ids.index(obj.id) + 1
        except ValueError:
            return None