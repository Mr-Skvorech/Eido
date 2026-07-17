import { useNavigate } from 'react-router-dom';

export default function ErrorPage({
    code = "404",
    title = "Что-то пошло не так",
    message = "Запрашиваемая страница не найдена."
}) {
    const navigate = useNavigate();

    return (
        <div
            className="uk-flex uk-flex-center uk-flex-middle"
            style={{
                minHeight: "100vh",
                background: "#f5f5f5"
            }}
        >
            <div
                className="uk-card uk-card-default uk-card-body uk-box-shadow-large uk-text-center"
                style={{ maxWidth: "600px", width: "90%" }}
            >
                <span class="uk-margin-small" uk-icon="icon: close-circle; ratio: 4"></span>
                <div
                    className="uk-text-danger"
                    style={{
                        fontSize: "5rem",
                        fontWeight: "bold",
                        lineHeight: 1
                    }}
                >
                    {code}
                </div>

                <h2 className="uk-margin-small-top">
                    {title}
                </h2>

                <p className="uk-text-muted">
                    {message}
                </p>

                <div className="uk-margin-large-top">
                    <button
                        className="uk-button uk-button-primary uk-margin-small-right"
                        onClick={() => navigate('/')}
                    >
                        На главную
                    </button>

                    <button
                        className="uk-button uk-button-default"
                        onClick={() => navigate(-1)}
                    >
                        Назад
                    </button>
                </div>
            </div>
        </div>
    );
}