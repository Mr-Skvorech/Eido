import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz } from '../api/quizzes';

export default function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    
    // Структура по умолчанию: 1 вопрос, 4 варианта (первый помечен как правильный)
    const [questions, setQuestions] = useState([
        { 
            text: '', 
            time_limit: 30, 
            choices: [
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]
        }
    ]);

    // Добавление нового пустого вопроса в форму
    const handleAddQuestion = () => {
        setQuestions([...questions, {
            text: '',
            time_limit: 30,
            choices: [
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]
        }]);
    };

    // Изменение текста вопроса или лимита времени
    const handleQuestionChange = (qIndex, field, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex][field] = value;
        setQuestions(updatedQuestions);
    };

    // Изменение текста конкретного варианта ответа
    const handleChoiceChange = (qIndex, cIndex, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices[cIndex].text = value;
        setQuestions(updatedQuestions);
    };

    // Переключение правильного ответа через Radio button
    const handleCorrectChoiceChange = (qIndex, cIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices.forEach((choice, index) => {
            choice.is_correct = index === cIndex;
        });
        setQuestions(updatedQuestions);
    };

    // Удаление вопроса из конструктора
    const handleRemoveQuestion = (index) => {
        if (questions.length === 1) return; // Нельзя удалить единственный вопрос
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            // Отправляем собранный большой объект на бэкенд
            await createQuiz({ title, description, questions });
            navigate('/'); // Возвращаемся на главную
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="uk-container uk-margin-large-top uk-margin-large-bottom">
            <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-medium-bottom">
                <h2>Конструктор квиза</h2>
                <button className="uk-button uk-button-default" type="button" onClick={() => navigate('/')}>
                    Отмена
                </button>
            </div>

            {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}

            <form onSubmit={handleSubmit}>
                {/* Блок основной информации */}
                <div className="uk-card uk-card-default uk-card-body uk-margin-bottom">
                    <h3 className="uk-card-title">Основная информация</h3>
                    <div className="uk-margin">
                        <label className="uk-form-label">Название квиза</label>
                        <input 
                            className="uk-input" 
                            type="text" 
                            placeholder="Например: Квиз по тригонометрии" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="uk-margin">
                        <label className="uk-form-label">Описание</label>
                        <textarea 
                            className="uk-textarea" 
                            rows="3" 
                            placeholder="Кратко расскажите, о чем этот квиз..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                {/* Динамический список вопросов */}
                {questions.map((question, qIndex) => (
                    <div key={qIndex} className="uk-card uk-card-default uk-card-body uk-margin-bottom" style={{ borderLeft: '5px solid #1e87f3' }}>
                        <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h4 className="uk-margin-remove">Вопрос №{qIndex + 1}</h4>
                            {questions.length > 1 && (
                                <button 
                                    type="button" 
                                    className="uk-button uk-button-danger uk-button-small"
                                    onClick={() => handleRemoveQuestion(qIndex)}
                                >
                                    Удалить вопрос
                                </button>
                            )}
                        </div>

                        {/* Текст вопроса и Таймер */}
                        <div className="uk-grid-small uk-margin" uk-grid="true">
                            <div className="uk-width-3-4@m">
                                <input 
                                    className="uk-input" 
                                    type="text" 
                                    placeholder="Введите текст вопроса" 
                                    value={question.text}
                                    onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="uk-width-1-4@m">
                                <select 
                                    className="uk-select"
                                    value={question.time_limit}
                                    onChange={(e) => handleQuestionChange(qIndex, 'time_limit', parseInt(e.target.value))}
                                >
                                    <option value="10">10 секунд</option>
                                    <option value="20">20 секунд</option>
                                    <option value="30">30 секунд</option>
                                    <option value="60">60 секунд</option>
                                </select>
                            </div>
                        </div>

                        {/* Варианты ответов */}
                        <div className="uk-child-width-1-2@m uk-grid-small" uk-grid="true">
                            {question.choices.map((choice, cIndex) => (
                                <div key={cIndex} className="uk-flex uk-flex-middle uk-margin-small-bottom">
                                    <input 
                                        className="uk-radio uk-margin-right" 
                                        type="radio" 
                                        name={`correct-choice-${qIndex}`}
                                        checked={choice.is_correct}
                                        onChange={() => handleCorrectChoiceChange(qIndex, cIndex)}
                                        title="Пометить как правильный"
                                    />
                                    <input 
                                        className="uk-input" 
                                        type="text" 
                                        placeholder={`Вариант ответа ${cIndex + 1}`} 
                                        value={choice.text}
                                        onChange={(e) => handleChoiceChange(qIndex, cIndex, e.target.value)}
                                        required 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Нижняя панель действий */}
                <div className="uk-margin-medium-top uk-flex uk-flex-between">
                    <button 
                        type="button" 
                        className="uk-button uk-button-secondary"
                        onClick={handleAddQuestion}
                    >
                        <span uk-icon="icon: plus" className="uk-margin-small-right"></span>
                        Добавить вопрос
                    </button>
                    <button type="submit" className="uk-button uk-button-primary">
                        Сохранить квиз
                    </button>
                </div>
            </form>
        </div>
    );
}