import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { COMPANY_CONFIG } from '../../config/branding';
import { ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaBuilding, FaIdCard, FaStore, FaFileSignature } from 'react-icons/fa';

const DEFAULT_AGREEMENT = `Acuerdo de Confidencialidad

El presente Acuerdo de Confidencialidad establece los términos bajo los cuales la información proporcionada por el usuario será tratada por nuestra empresa.

1. Información Confidencial

Se considerará Información Confidencial toda aquella información técnica, comercial, financiera, operativa o de cualquier otra naturaleza que el usuario proporcione a través de nuestro sitio web, formularios de registro, consultas o cualquier otro medio de contacto.

2. Uso de la Información

La información recopilada será utilizada exclusivamente para fines comerciales, administrativos, técnicos o de contacto vinculados con los servicios y productos ofrecidos por nuestra empresa. No será utilizada con fines distintos a los aquí establecidos.

3. Protección y Resguardo

Nos comprometemos a adoptar las medidas técnicas y organizativas necesarias para proteger la información contra accesos no autorizados, alteración, divulgación o destrucción indebida.

4. No Divulgación

La Información Confidencial no será divulgada a terceros, salvo obligación legal o cuando resultare necesario para la correcta prestación del servicio (por ejemplo, proveedores técnicos o administrativos), quienes estarán sujetos a iguales obligaciones de confidencialidad.

5. Vigencia

Las obligaciones de confidencialidad se mantendrán vigentes aun después de finalizada la relación comercial entre las partes.

6. Aceptación

El registro en nuestro sitio web implica la aceptación expresa de los términos del presente Acuerdo de Confidencialidad.`;

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [agreementText, setAgreementText] = useState(DEFAULT_AGREEMENT);
    const [acceptedAgreement, setAcceptedAgreement] = useState(false);
    
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

    useEffect(() => {
        api.get('/api/config/public')
            .then(res => {
                const text = res.data?.data?.confidentiality_agreement?.trim();
                if (text) setAgreementText(text);
            })
            .catch(() => { /* usar default */ });
    }, []);

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
        if (!acceptedAgreement) {
            toast.warning('Debes leer y aceptar el Acuerdo de Confidencialidad para registrarte.');
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
                fantasy_name: formData.fantasy_name,
                accepted_confidentiality_agreement: true
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
                
                {/* Panel Izquierdo (Visual): min-w y texto centrado/envuelto para que "Casa Schettini" no se corte */}
                <div className="bg-red-700 p-6 sm:p-8 flex flex-col justify-center items-center text-white w-full md:w-[min(100%,18rem)] md:flex-shrink-0 md:max-w-[40%] min-w-0">
                    {/* ✅ LOGO ACTUALIZADO: Lila.png (Agregado aquí) */}
                    <img 
                        src="/images/Lila.png" 
                        alt="Schettini" 
                        className="h-20 w-auto max-w-full object-contain mb-4 bg-white rounded-xl p-2" 
                    />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-center px-2 w-full leading-tight break-words">
                        {COMPANY_CONFIG.name}
                    </h2>
                    <p className="text-red-100 text-center text-sm px-2">Sistema de Gestión de Clientes</p>
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

                        {/* ACUERDO DE CONFIDENCIALIDAD */}
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2"><FaFileSignature/> Acuerdo de Confidencialidad</h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto text-xs text-gray-700 mb-3 whitespace-pre-wrap">
                                {agreementText}
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={acceptedAgreement}
                                    onChange={e => setAcceptedAgreement(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm font-medium text-gray-700">He leído y acepto el Acuerdo de Confidencialidad. Entiendo que el registro implica la aceptación expresa de sus términos.</span>
                            </label>
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

                        <button type="submit" disabled={loading || !acceptedAgreement} className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition ${(loading || !acceptedAgreement) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                            {loading ? 'Registrando...' : 'CREAR CUENTA'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;