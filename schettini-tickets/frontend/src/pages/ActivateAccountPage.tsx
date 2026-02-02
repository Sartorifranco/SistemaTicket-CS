import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Rutas de importación validadas para la estructura del proyecto
import api from '../config/axiosConfig';
import { ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

const ActivateAccountPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando tu cuenta, por favor espera...');

    useEffect(() => {
        const activate = async () => {
            const token = searchParams.get('token');
            if (!token) {
                setStatus('error');
                setMessage('No se encontró un token de activación. El enlace puede ser inválido.');
                return;
            }

            try {
                const response = await api.post('/api/auth/activate', { token });
                setStatus('success');
                setMessage(response.data.message);
                toast.success(response.data.message || "¡Cuenta activada!");
            } catch (err: any) {
                const errorMessage = isAxiosErrorTypeGuard(err) ? err.response?.data?.message || 'Ocurrió un error.' : 'Error inesperado.';
                setStatus('error');
                setMessage(errorMessage);
                toast.error(errorMessage);
            }
        };

        activate();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
                <img className="mx-auto h-24 w-auto mb-6" src="/images/logo-grupo-bacar-horizontal.png" alt="Grupo BACAR" />
                
                {status === 'loading' && (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800">Activando tu Cuenta</h2>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                        <p className="mt-4 text-gray-700">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <h2 className="text-2xl font-bold text-green-600">¡Cuenta Activada!</h2>
                        <p className="text-gray-700">{message}</p>
                        <Link to="/login" className="block w-full bg-red-600 text-white py-3 rounded-lg mt-6 hover:bg-red-700 font-semibold">
                            Ir a Iniciar Sesión
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <h2 className="text-2xl font-bold text-red-600">Error de Activación</h2>
                        <p className="text-gray-700">{message}</p>
                        <Link to="/register" className="block w-full bg-gray-300 text-gray-800 py-3 rounded-lg mt-6 hover:bg-gray-400 font-semibold">
                            Volver al Registro
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivateAccountPage;

