import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { notifyError } from '../utils/notify';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await registerUser(username, email, password);
            // После успешной регистрации отправляем на страницу логина
            navigate('/login');
        } catch (err) {
            notifyError("Ошибка при регистрации. Проверьте данные и попробуйте снова.");
            setError(err.message);
        }
    };

    return (
        <div className="uk-flex uk-flex-center uk-flex-middle" style={{ minHeight: '100vh' }}>
            <div className="uk-card uk-card-default uk-card-body uk-width-1-3@m">
                <h3 className="uk-card-title uk-text-center">Регистрация</h3>
                {error && <div className="uk-alert-danger" uk-alert="true"><p>{error}</p></div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="uk-margin">
                        <input 
                            className="uk-input" 
                            type="text" 
                            placeholder="Имя пользователя (Username)" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="uk-margin">
                        <input 
                            className="uk-input" 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="uk-margin">
                        <input 
                            className="uk-input" 
                            type="password" 
                            placeholder="Пароль" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="uk-margin">
                        <button className="uk-button uk-button-primary uk-width-1-1" type="submit">
                            Создать аккаунт
                        </button>
                    </div>
                </form>
                <div className="uk-text-center">
                    <span>Уже есть аккаунт? <Link to="/login">Войти</Link></span>
                </div>
            </div>
        </div>
    );
}