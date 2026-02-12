import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { toast } from 'react-toastify';

const LoginPage: React.FC = () => {
    const [emailOrUser, setEmailOrUser] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            const roleDashboard = `/${user.role}`;
            navigate(roleDashboard, { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const success = await login({ email: emailOrUser, password }); 
            if (success) {
                addNotification('Inicio de sesión exitoso.', 'success');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error en el inicio de sesión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                <div>
                    {/* ✅ LOGO ACTUALIZADO: Lila.png */}
                    <img
                        className="mx-auto h-24 sm:h-28 w-auto object-contain"
                        src="/images/Lila.png"
                        alt="Schettini"
                    />
                    <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
                        Bienvenido
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-or-user" className="sr-only">Correo o usuario</label>
                            <input
                                id="email-or-user"
                                name="email"
                                type="text"
                                autoComplete="username"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                placeholder="Correo electrónico o usuario"
                                value={emailOrUser}
                                onChange={(e) => setEmailOrUser(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Contraseña</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
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
                            className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
                            disabled={loading}
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <Link to="/register" className="font-medium text-red-600 hover:text-red-500">
                        ¿No tienes una cuenta? Regístrate aquí
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;