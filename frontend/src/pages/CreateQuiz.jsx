import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz } from '../api/quizzes';
import { notifyError } from '../utils/notify';

export default function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = (error) => reject(error);
        });
    };

    // Структура по умолчанию: 1 вопрос, 4 варианта (первый помечен как правильный)
    const [questions, setQuestions] = useState([
        { 
            text: '', 
            time_limit: 30, 
            is_multiple_choice: false, // по умолчанию одиночный выбор
            image: null, // строка Base64
            choices: [
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]
        }
    ]);

    // Добавление нового пустого вопроса в форму (Исправлено: добавлены дефолтные поля)
    const handleAddQuestion = () => {
        setQuestions([...questions, {
            text: '',
            time_limit: 30,
            is_multiple_choice: false,
            image: null,
            choices: [
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]
        }]);
    };

    const handleImageChange = async (qIndex, file) => {
        if (!file) return;
        try {
            const base64 = await convertToBase64(file);
            const updatedQuestions = [...questions];
            updatedQuestions[qIndex].image = base64; // сохраняем строку в стейт
            setQuestions(updatedQuestions);
        } catch (err) {
            notifyError("Ошибка кодирования картинки. Попробуйте другой файл.");
            console.error("Ошибка кодирования картинки", err);
        }
    };

    // Изменение текста вопроса или лимита времени
    // Изменение текста вопроса, лимита времени или типа выбора
    const handleQuestionChange = (qIndex, field, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex][field] = value;

        // Если переключаем на одиночный выбор, оставляем только один правильный ответ
        if (field === 'is_multiple_choice' && value === false) {
            let foundCorrect = false;
            updatedQuestions[qIndex].choices.forEach(choice => {
                if (choice.is_correct && !foundCorrect) {
                    foundCorrect = true; // Оставляем первый найденный правильный
                } else {
                    choice.is_correct = false; // Все остальные сбрасываем
                }
            });
            
            // Защита от дурака: если ни одного правильного не осталось, делаем правильным первый
            if (!foundCorrect && updatedQuestions[qIndex].choices.length > 0) {
                updatedQuestions[qIndex].choices[0].is_correct = true;
            }
        }

        setQuestions(updatedQuestions);
    };

    // Изменение текста конкретного варианта ответа
    const handleChoiceChange = (qIndex, cIndex, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices[cIndex].text = value;
        setQuestions(updatedQuestions);
    };

    // Переключение правильного ответа
    const handleCorrectChoiceChange = (qIndex, cIndex) => {
        const updatedQuestions = [...questions];
        const question = updatedQuestions[qIndex];

        if (question.is_multiple_choice) {
            // Для мультивыбора - инвертируем значение (чекбоксы)
            question.choices[cIndex].is_correct = !question.choices[cIndex].is_correct;
        } else {
            // Для одиночного выбора - зануляем остальные (радио)
            question.choices.forEach((choice, index) => {
                choice.is_correct = index === cIndex;
            });
        }
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
            notifyError(err.message || "Ошибка при создании квиза.");
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

                        {/* Панель настроек вопроса (Тип и Картинка) */}
                        <div className="uk-grid-small uk-margin uk-child-width-1-2@m" uk-grid="true">
                            <div>
                                <label className="uk-form-label uk-margin-small-right">
                                    <input 
                                        className="uk-checkbox uk-margin-small-right" 
                                        type="checkbox" 
                                        checked={question.is_multiple_choice}
                                        onChange={(e) => handleQuestionChange(qIndex, 'is_multiple_choice', e.target.checked)}
                                    />
                                    Множественный выбор ответов (несколько правильных)
                                </label>
                            </div>

                            <div>
                                <div uk-form-custom="target: true">
                                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(qIndex, e.target.files[0])} />
                                    <button className="uk-button uk-button-default uk-button-small" type="button" tabIndex="-1">
                                        <span uk-icon="icon: image" className="uk-margin-small-right"></span>
                                        {question.image ? 'Картинка загружена (изменить)' : 'Добавить картинку'}
                                    </button>
                                </div>
                                {question.image && (
                                    <div className="uk-margin-small-top">
                                        <img src={question.image} alt="Превью" style={{ maxHeight: '60px', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Варианты ответов (Исправлено: возвращен текстовый инпут) */}
                        <div className="uk-child-width-1-2@m uk-grid-small" uk-grid="true">
                            {question.choices.map((choice, cIndex) => (
                                <div key={cIndex} className="uk-flex uk-flex-middle uk-margin-small-bottom">
                                    <input 
                                        className={question.is_multiple_choice ? "uk-checkbox uk-margin-right" : "uk-radio uk-margin-right"} 
                                        type={question.is_multiple_choice ? "checkbox" : "radio"} 
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
                ))} {/* Исправлено: синтаксически корректное закрытие цикла */}

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