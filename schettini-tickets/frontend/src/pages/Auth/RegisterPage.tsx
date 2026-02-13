import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaBuilding, FaIdCard, FaStore } from 'react-icons/fa';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '', // Nombre y apellido (identificación)
        username: '', // Usuario para login (puede usar usuario o email)
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        cuit: '',
        business_name: '',
        fantasy_name: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validaciones
        const required = ['full_name', 'username', 'email', 'phone', 'password', 'confirmPassword', 'cuit', 'business_name', 'fantasy_name'];
        if (required.some(key => !formData[key as keyof typeof formData]?.trim())) {
            toast.warning('Todos los campos son obligatorios.');
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
            // 2. Envío al Backend
            await api.post('/api/auth/register', {
                full_name: formData.full_name,
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                cuit: formData.cuit,
                business_name: formData.business_name,
                fantasy_name: formData.fantasy_name
            });

            toast.success('¡Registro exitoso! Ya puedes iniciar sesión.');
            setTimeout(() => navigate('/login'), 1500);

        } catch (err: unknown) {
            console.error(err);
            const message = isAxiosErrorTypeGuard(err) 
                ? (err.response?.data as ApiResponseError)?.message || 'Error al registrarse.' 
                : 'No se pudo conectar con el servidor.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition text-sm";
    const labelStyle = "block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                
                {/* Panel Izquierdo (Visual) */}
                <div className="bg-red-700 p-8 flex flex-col justify-center items-center text-white md:w-1/3">
                    {/* ✅ LOGO ACTUALIZADO: Lila.png (Agregado aquí) */}
                    <img 
                        src="/images/Lila.png" 
                        alt="Schettini" 
                        className="h-20 w-auto object-contain mb-4 bg-white rounded-xl p-2" 
                    />
                    <h2 className="text-3xl font-extrabold mb-2">Schettini</h2>
                    <p className="text-red-100 text-center text-sm">Sistema de Gestión de Clientes</p>
                    <div className="mt-8 text-center text-xs opacity-80">
                        <p>¿Ya tienes cuenta?</p>
                        <Link to="/login" className="mt-2 inline-block bg-white text-red-700 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition">
                            Iniciar Sesión
                        </Link>
                    </div>
                </div>

                {/* Panel Derecho (Formulario) */}
                <div className="p-8 md:w-2/3">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Registro de Nuevo Cliente</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* SECCIÓN DATOS PERSONALES */}
                        <div>
                            <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2"><FaUser/> Datos de Contacto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Nombre y Apellido</label>
                                    <p className="text-xs text-gray-500 mb-1">Para identificarte (no se usa para iniciar sesión)</p>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="full_name" type="text" placeholder="Juan Perez" value={formData.full_name} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>Usuario</label>
                                    <p className="text-xs text-gray-500 mb-1">Para iniciar sesión (puedes usar usuario o email)</p>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="username" type="text" placeholder="juanperez" value={formData.username} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>Email</label>
                                    <p className="text-xs text-gray-500 mb-1">También puedes iniciar sesión con tu correo</p>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="email" type="email" placeholder="juan@mail.com" value={formData.email} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>Teléfono / WhatsApp</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="phone" type="text" placeholder="+54 9 351..." value={formData.phone} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN DATOS EMPRESA */}
                        <div>
                            <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2"><FaBuilding/> En Representación de</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Razón Social</label>
                                    <div className="relative">
                                        <FaBuilding className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="business_name" type="text" placeholder="Empresa S.A." value={formData.business_name} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>CUIT</label>
                                    <div className="relative">
                                        <FaIdCard className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="cuit" type="text" placeholder="20-12345678-9" value={formData.cuit} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>Nombre de Fantasía</label>
                                    <div className="relative">
                                        <FaStore className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                        <input name="fantasy_name" type="text" placeholder="Mi Negocio" value={formData.fantasy_name} onChange={handleChange} className={inputStyle} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN SEGURIDAD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            <div>
                                <label className={labelStyle}>Contraseña</label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                    <input name="password" type="password" placeholder="******" value={formData.password} onChange={handleChange} className={inputStyle} required />
                                </div>
                            </div>
                            <div>
                                <label className={labelStyle}>Confirmar</label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-3 text-gray-400 text-xs"/>
                                    <input name="confirmPassword" type="password" placeholder="******" value={formData.confirmPassword} onChange={handleChange} className={inputStyle} required />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}>
                            {loading ? 'Registrando...' : 'CREAR CUENTA'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;