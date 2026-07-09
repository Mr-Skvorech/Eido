import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
    // Проверяем, есть ли access-токен в хранилище
    const token = localStorage.getItem('access_token');

    // Если токена нет, перекидываем пользователя на страницу логина
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Если токен есть, рендерим вложенный компонент (наш дашборд)
    return children;
}