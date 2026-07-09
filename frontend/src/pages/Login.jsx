import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const data = await loginUser(email, password);
            // Сохраняем токены в localStorage
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            // Перенаправляем на главную/дашборд
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="uk-flex uk-flex-center uk-flex-middle" style={{ minHeight: '100vh' }}>
            <div className="uk-card uk-card-default uk-card-body uk-width-1-3@m">
                <h3 className="uk-card-title uk-text-center">Вход в Eido_quiz</h3>
                {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="uk-margin">
                        <div className="uk-inline uk-width-1-1">
                            <span className="uk-form-icon" uk-icon="icon: mail"></span>
                            <input 
                                className="uk-input" 
                                type="email" 
                                placeholder="Email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                    </div>
                    <div className="uk-margin">
                        <div className="uk-inline uk-width-1-1">
                            <span className="uk-form-icon" uk-icon="icon: lock"></span>
                            <input 
                                className="uk-input" 
                                type="password" 
                                placeholder="Пароль" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                    </div>
                    <div className="uk-margin">
                        <button className="uk-button uk-button-primary uk-width-1-1" type="submit">
                            Войти
                        </button>
                    </div>
                </form>
                <div className="uk-text-center">
                    <span>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></span>
                </div>
            </div>
        </div>
    );
}