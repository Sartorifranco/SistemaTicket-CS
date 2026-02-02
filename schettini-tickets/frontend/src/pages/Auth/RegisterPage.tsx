import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Simplificamos el estado: Solo lo necesario para Schettini
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validaciones Locales
        if (!formData.username || !formData.email || !formData.password) {
            toast.warning('Por favor, completa todos los campos.');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }
        if (formData.password.length < 6) {
            toast.warning('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            // 2. Construcción del Payload
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: 'client',
                company_id: 1,
                department_id: 1
            };

            // 3. Envío al Backend (CORREGIDO: Agregado "/api")
            // Antes fallaba porque faltaba el prefijo "/api"
            await api.post('/api/auth/register', payload);

            // 4. Éxito
            toast.success('¡Registro exitoso! Redirigiendo...');
            setTimeout(() => navigate('/login'), 1500);

        } catch (err: unknown) {
            console.error(err);
            const message = isAxiosErrorTypeGuard(err) 
                ? (err.response?.data as ApiResponseError)?.message || 'Error al registrarse.' 
                : 'No se pudo conectar con el servidor.';
            
            // Si el error es por columnas faltantes (ej: company_id no existe en DB), avísame.
            toast.error(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-200";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 border-t-4 border-red-600">
                
                {/* Cabecera */}
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">Crear Cuenta</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Bienvenido al sistema de tickets de <span className="font-bold text-red-600">Schettini</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Campo: Usuario */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                        <input 
                            name="username" 
                            type="text" 
                            placeholder="Ej: juanperez" 
                            value={formData.username} 
                            onChange={handleChange} 
                            required 
                            autoComplete="username"
                            className={inputStyle} 
                        />
                    </div>

                    {/* Campo: Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <input 
                            name="email" 
                            type="email" 
                            placeholder="juan@ejemplo.com" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            autoComplete="email"
                            className={inputStyle} 
                        />
                    </div>

                    {/* Campo: Contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input 
                            name="password" 
                            type="password" 
                            placeholder="******" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            autoComplete="new-password"
                            className={inputStyle} 
                        />
                    </div>

                    {/* Campo: Confirmar Contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                        <input 
                            name="confirmPassword" 
                            type="password" 
                            placeholder="******" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                            autoComplete="new-password"
                            className={inputStyle} 
                        />
                    </div>

                    {/* Botón de Acción */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white uppercase tracking-wider
                        ${loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                        }`}
                    >
                        {loading ? 'Procesando...' : 'Registrarse'}
                    </button>
                </form>

                {/* Footer */}
                <div className="text-center pt-2">
                    <p className="text-sm text-gray-600">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login" className="font-medium text-red-600 hover:text-red-500 hover:underline">
                            Inicia Sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;