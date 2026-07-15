import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';

// Импортируем все недостающие страницы для Ведущего (Host)
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import HostResults from './pages/HostResults';

// Импортируем страницы для Игрока (Player)
import PlayerJoin from './pages/PlayerJoin';
import PlayerWaiting from './pages/PlayerWaiting';
import PlayerGame from './pages/PlayerGame';
import PlayerHistory from './pages/PlayerHistory';

import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Открытые страницы для авторизации */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Открытые страницы для игроков (им не нужна авторизация на сайте) */}
        <Route path="/player/join" element={<PlayerJoin />} />
        <Route path="/player/waiting" element={<PlayerWaiting />} />
        <Route path="/player/game/:roomId" element={<PlayerGame />} />
        
        {/* Защищенные страницы для организатора (через PrivateRoute) */}
        <Route 
            path="/" 
            element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            } 
        />
        <Route 
            path="/create-quiz" 
            element={
                <PrivateRoute>
                    <CreateQuiz />
                </PrivateRoute>
            } 
        />

        {/* История игрока — доступна только залогиненным (поток анонимного входа по PIN не трогаем) */}
        <Route
            path="/history/played"
            element={
                <PrivateRoute>
                    <PlayerHistory />
                </PrivateRoute>
            }
        />
        
        {/* Лобби ожидания: передаем ID квиза и PIN комнаты */}
        <Route 
            path="/host/lobby/:quizId/:pin" 
            element={
                <PrivateRoute>
                    <HostLobby />
                </PrivateRoute>
            } 
        />

        {/* Экран игры ведущего: принимает ID квиза и ID комнаты (PIN) */}
        <Route 
            path="/host/game/:quizId/:roomId" 
            element={
                <PrivateRoute>
                    <HostGame />
                </PrivateRoute>
            } 
        />

        {/* Результаты игры (Подиум) */}
        <Route 
            path="/host/results/:roomId" 
            element={
                <PrivateRoute>
                    <HostResults />
                </PrivateRoute>
            } 
        />
      </Routes>
    </Router>
  );
}

export default App;