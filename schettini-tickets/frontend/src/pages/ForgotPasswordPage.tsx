import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { FaEnvelope } from 'react-icons/fa';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.warning('Ingresá tu correo electrónico.');
            return;
        }
        setLoading(true);
        setSent(false);
        try {
            await api.post('/api/auth/forgot-password', { email: email.trim() });
            setSent(true);
            toast.success('Si ese correo está registrado, recibirás un enlace por email.');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Error al enviar. Intentá de nuevo.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                <div>
                    <img className="mx-auto h-24 sm:h-28 w-auto object-contain" src="/images/Lila.png" alt="Schettini" />
                    <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
                        Recuperar contraseña
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                </div>

                {sent ? (
                    <div className="text-center space-y-4">
                        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-700">
                            Revisá tu bandeja de entrada. Si no aparece, revisá la carpeta de spam.
                        </div>
                        <Link to="/login" className="block text-red-600 font-medium hover:text-red-500">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="pl-10 w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 font-medium"
                        >
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>

                        <div className="text-center">
                            <Link to="/login" className="text-sm text-red-600 hover:text-red-500 font-medium">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
