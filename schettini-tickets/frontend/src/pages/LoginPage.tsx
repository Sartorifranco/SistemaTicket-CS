import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import { COMPANY_CONFIG } from '../config/branding';
import {
    isWorldCupThemeActive,
    WorldCupLoginPanelFestive,
    WorldCupLoginHero,
    getWorldCupLoginPanelClass,
    getWorldCupSubmitButtonClass,
    getWorldCupSubmitButtonLabel,
    getWorldCupRegisterLinkClass,
    getWorldCupInputClass,
} from '../components/Common/WorldCupArgentinaTheme';

const INPUT_BASE =
    'appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:z-10 sm:text-sm';

const LoginPage: React.FC = () => {
    const [emailOrUser, setEmailOrUser] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, error, clearError } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const worldCup = isWorldCupThemeActive();

    useEffect(() => {
        if (user) {
            const roleDashboard = user.role === 'supervisor' ? '/agent' : `/${user.role}`;
            navigate(roleDashboard, { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError?.();
        setLoading(true);
        try {
            const result = await login({ email: emailOrUser, password });
            if (result.success) {
                addNotification('Inicio de sesión exitoso.', 'success');
            } else {
                toast.error(result.message || 'Credenciales incorrectas. Revisa usuario/email y contraseña.');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error en el inicio de sesión.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const panelClass = getWorldCupLoginPanelClass();
    const cardClasses = [
        'max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-2xl',
        panelClass,
        worldCup ? 'wc-argentina-root' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className={cardClasses}>
                {worldCup && <WorldCupLoginPanelFestive />}

                <div className="relative z-10">
                    {worldCup && <WorldCupLoginHero />}

                    <div>
                        <img
                            className="mx-auto h-24 sm:h-28 w-auto object-contain"
                            src="/images/Lila.png"
                            alt="Casa Schettini"
                        />
                        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-wide">
                            {worldCup ? '¡Entrá con garra!' : COMPANY_CONFIG.name}
                        </h2>
                        <p className="text-center text-sm text-gray-500 mt-1">
                            {worldCup
                                ? '🇦🇷 La Scaloneta te espera del otro lado del login 🇦🇷'
                                : 'Bienvenido'}
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="email-or-user" className="sr-only">
                                    Correo o usuario
                                </label>
                                <input
                                    id="email-or-user"
                                    name="email"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    className={getWorldCupInputClass(
                                        `${INPUT_BASE} rounded-t-md ${worldCup ? 'focus:ring-sky-400' : 'focus:ring-red-500 focus:border-red-500'}`
                                    )}
                                    placeholder="Correo electrónico o usuario"
                                    value={emailOrUser}
                                    onChange={(e) => setEmailOrUser(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className={getWorldCupInputClass(
                                        `${INPUT_BASE} rounded-b-md ${worldCup ? 'focus:ring-sky-400' : 'focus:ring-red-500 focus:border-red-500'}`
                                    )}
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className={getWorldCupSubmitButtonClass()}
                                disabled={loading}
                            >
                                {getWorldCupSubmitButtonLabel(loading)}
                            </button>
                        </div>
                    </form>

                    <div className="text-sm text-center space-y-2">
                        <Link to="/forgot-password" className={getWorldCupRegisterLinkClass()}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                        <Link to="/register" className={getWorldCupRegisterLinkClass()}>
                            ¿No tienes una cuenta? Regístrate aquí
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
