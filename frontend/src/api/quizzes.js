const API_URL = 'http://localhost:8000/api';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const fetchMyQuizzes = async () => {
    const response = await fetch(`${API_URL}/quizzes/`, {
        method: 'GET',
        headers: getHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Не удалось загрузить список квизов.');
    }
    return response.json();
};

export const createQuiz = async (quizData) => {
    const response = await fetch(`${API_URL}/quizzes/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(quizData)
    });

    if (!response.ok) {
        throw new Error('Ошибка при создании квиза. Проверьте правильность заполнения.');
    }
    return response.json();
};

export const fetchQuiz = async (quizId) => {
    const response = await fetch(`${API_URL}/quizzes/${quizId}/get/`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Не удалось загрузить квиз.');
    }
    return response.json();
};

export const updateQuiz = async (quizId, quizData) => {
    const response = await fetch(`${API_URL}/quizzes/${quizId}/update/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(quizData)
    });

    if (!response.ok) {
        throw new Error('Ошибка при сохранении квиза. Проверьте правильность заполнения.');
    }
    return response.json();
};