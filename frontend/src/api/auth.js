const API_URL = 'http://localhost:8000/api/auth'; // Убедись, что порт совпадает с Django

export const loginUser = async (email, password) => {
    const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
        throw new Error('Ошибка авторизации. Проверьте почту и пароль.');
    }
    return response.json();
};

export const registerUser = async (username, email, password) => {
    const response = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
        throw new Error('Ошибка регистрации. Возможно, email уже занят.');
    }
    return response.json();
};