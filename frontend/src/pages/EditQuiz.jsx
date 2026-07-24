import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchQuiz, updateQuiz } from '../api/quizzes';
import { notifyError } from '../utils/notify';

const emptyQuestion = () => ({
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
});

export default function EditQuiz() {
    const { id: quizId } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Загружаем существующий квиз при монтировании
    useEffect(() => {
        fetchQuiz(quizId)
            .then(data => {
                setTitle(data.title);
                setDescription(data.description || '');
                setQuestions(data.questions.map(q => ({
                    id: q.id,
                    text: q.text,
                    time_limit: q.time_limit,
                    is_multiple_choice: q.is_multiple_choice,
                    image: q.image, // строка-URL с бэкенда (не base64!) — пересылать как есть нельзя
                    choices: q.choices.map(c => ({ id: c.id, text: c.text, is_correct: c.is_correct }))
                })));
                setLoading(false);
            })
            .catch(err => {
                notifyError(err.message || 'Не удалось загрузить квиз.');
                setError(err.message);
                setLoading(false);
            });
    }, [quizId]);

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = (error) => reject(error);
        });
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, emptyQuestion()]);
    };

    const handleImageChange = async (qIndex, file) => {
        if (!file) return;
        try {
            const base64 = await convertToBase64(file);
            const updatedQuestions = [...questions];
            updatedQuestions[qIndex].image = base64; // новая картинка — теперь это data:-строка
            setQuestions(updatedQuestions);
        } catch (err) {
            notifyError("Ошибка кодирования картинки. Попробуйте другой файл.");
            console.error("Ошибка кодирования картинки", err);
        }
    };

    const handleQuestionChange = (qIndex, field, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex][field] = value;

        if (field === 'is_multiple_choice' && value === false) {
            let foundCorrect = false;
            updatedQuestions[qIndex].choices.forEach(choice => {
                if (choice.is_correct && !foundCorrect) {
                    foundCorrect = true;
                } else {
                    choice.is_correct = false;
                }
            });
            if (!foundCorrect && updatedQuestions[qIndex].choices.length > 0) {
                updatedQuestions[qIndex].choices[0].is_correct = true;
            }
        }

        setQuestions(updatedQuestions);
    };

    const handleChoiceChange = (qIndex, cIndex, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices[cIndex].text = value;
        setQuestions(updatedQuestions);
    };

    const handleCorrectChoiceChange = (qIndex, cIndex) => {
        const updatedQuestions = [...questions];
        const question = updatedQuestions[qIndex];

        if (question.is_multiple_choice) {
            question.choices[cIndex].is_correct = !question.choices[cIndex].is_correct;
        } else {
            question.choices.forEach((choice, index) => {
                choice.is_correct = index === cIndex;
            });
        }
        setQuestions(updatedQuestions);
    };

    const handleRemoveQuestion = (index) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleAddChoice = (qIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].choices.push({ text: '', is_correct: false });
        setQuestions(updatedQuestions);
    };

    const handleRemoveChoice = (qIndex, cIndex) => {
        const updatedQuestions = [...questions];
        if (updatedQuestions[qIndex].choices.length <= 2) return; // минимум 2 варианта
        updatedQuestions[qIndex].choices.splice(cIndex, 1);
        // Если убрали единственный правильный — делаем правильным первый оставшийся
        if (!updatedQuestions[qIndex].choices.some(c => c.is_correct)) {
            updatedQuestions[qIndex].choices[0].is_correct = true;
        }
        setQuestions(updatedQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            // Готовим вопросы к отправке: картинку шлём, ТОЛЬКО если она новая (data:-строка).
            // Если это старый URL с бэкенда — просто убираем ключ, чтобы бэкенд не пытался
            // распарсить обычную ссылку как Base64 и не потерял существующую картинку.
            const preparedQuestions = questions.map((q) => {
                const { image, ...rest } = q;
                if (typeof image === 'string' && image.startsWith('data:')) {
                    return { ...rest, image };
                }
                return rest; // без ключа 'image' — бэкенд оставит текущую картинку как есть
            });

            await updateQuiz(quizId, { title, description, questions: preparedQuestions });
            navigate('/');
        } catch (err) {
            notifyError(err.message || "Ошибка при сохранении квиза.");
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="uk-container uk-margin-large-top uk-text-center">
                <div uk-spinner="ratio: 3"></div>
            </div>
        );
    }

    return (
        <div className="uk-container uk-margin-large-top uk-margin-large-bottom">
            <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-medium-bottom">
                <h2>Редактирование квиза</h2>
                <button className="uk-button uk-button-default" type="button" onClick={() => navigate('/')}>
                    Отмена
                </button>
            </div>

            {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}

            <form onSubmit={handleSubmit}>
                <div className="uk-card uk-card-default uk-card-body uk-margin-bottom">
                    <h3 className="uk-card-title">Основная информация</h3>
                    <div className="uk-margin">
                        <label className="uk-form-label">Название квиза</label>
                        <input
                            className="uk-input"
                            type="text"
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
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                {questions.map((question, qIndex) => (
                    <div key={question.id ?? `new-${qIndex}`} className="uk-card uk-card-default uk-card-body uk-margin-bottom" style={{ borderLeft: '5px solid #1e87f3' }}>
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
                                        <img
                                            src={question.image.startsWith('data:') ? question.image : `http://localhost:8000${question.image}`}
                                            alt="Превью"
                                            style={{ maxHeight: '60px', borderRadius: '4px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

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
                                    {question.choices.length > 2 && (
                                        <button
                                            type="button"
                                            className="uk-button uk-button-danger uk-button-small uk-margin-small-left"
                                            onClick={() => handleRemoveChoice(qIndex, cIndex)}
                                            title="Удалить вариант"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="uk-button uk-button-text uk-margin-small-top"
                            onClick={() => handleAddChoice(qIndex)}
                        >
                            + Добавить вариант ответа
                        </button>
                    </div>
                ))}

                <div className="uk-margin-medium-top uk-flex uk-flex-between">
                    <button
                        type="button"
                        className="uk-button uk-button-secondary"
                        onClick={handleAddQuestion}
                    >
                        <span uk-icon="icon: plus" className="uk-margin-small-right"></span>
                        Добавить вопрос
                    </button>
                    <button type="submit" className="uk-button uk-button-primary" disabled={saving}>
                        {saving ? <div uk-spinner="ratio: 0.8"></div> : 'Сохранить изменения'}
                    </button>
                </div>
            </form>
        </div>
    );
}