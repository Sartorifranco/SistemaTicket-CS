import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import NotificationBell from '../NotificationBell/NotificationBell';
// Asegúrate de haber creado el archivo branding.ts en el PASO 1
import { COMPANY_CONFIG } from '../../config/branding'; 

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.info('Sesión cerrada exitosamente.');
    };

    const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
        `flex items-center p-3 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-red-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'
        }`;

    const renderNavLinks = () => {
        if (!user) return null;

        switch (user.role) {
            case 'admin':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-400 mt-2 mb-2 px-3">Admin</li>
                        <li><NavLink to="/admin" end className={getLinkClassName}>Dashboard</NavLink></li>
                        <li><NavLink to="/profile" className={getLinkClassName}>Mi Perfil</NavLink></li>
                        <li><NavLink to="/admin/users" className={getLinkClassName}>Usuarios</NavLink></li>
                        <li><NavLink to="/admin/companies" className={getLinkClassName}>Empresas</NavLink></li>
                        <li><NavLink to="/admin/tickets" className={getLinkClassName}>Tickets</NavLink></li>
                        <li><NavLink to="/admin/reports" className={getLinkClassName}>Reportes</NavLink></li>
                        <li className="mt-4 text-xs uppercase text-gray-500 px-3">Configuración</li>
                        <li><NavLink to="/admin/problemas" className={getLinkClassName}>Tipos de Problema</NavLink></li>
                    </>
                );
            case 'agent':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-400 mt-2 mb-2 px-3">Agente</li>
                        <li><NavLink to="/agent" end className={getLinkClassName}>Dashboard</NavLink></li>
                        <li><NavLink to="/profile" className={getLinkClassName}>Mi Perfil</NavLink></li>
                        <li><NavLink to="/agent/tickets" className={getLinkClassName}>Mis Tickets</NavLink></li>
                    </>
                );
            case 'client':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-400 mt-2 mb-2 px-3">Cliente</li>
                        <li><NavLink to="/client" end className={getLinkClassName}>Dashboard</NavLink></li>
                        <li><NavLink to="/profile" className={getLinkClassName}>Mi Perfil</NavLink></li>
                        <li><NavLink to="/client/tickets" className={getLinkClassName}>Mis Tickets</NavLink></li>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white flex flex-col shadow-lg 
                                transform transition-transform duration-300 ease-in-out 
                                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                                md:relative md:translate-x-0`}>
                
                {/* LOGO CONFIGURABLE */}
                <div className="p-4 flex justify-center items-center border-b border-gray-700 h-20">
                    <img 
                        src={COMPANY_CONFIG.logoPath} 
                        alt={COMPANY_CONFIG.name} 
                        className="h-12 w-auto object-contain" 
                        // Si no hay imagen, mostramos texto de respaldo
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <span className="hidden text-xl font-bold text-white">{COMPANY_CONFIG.shortName}</span>
                </div>

                <nav className="flex-grow p-4">
                    <ul className="space-y-2">
                        {renderNavLinks()}
                    </ul>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 hover:bg-red-700 font-medium transition-colors">
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 focus:outline-none">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <div className="flex items-center space-x-4 ml-auto">
                        <span className="text-md font-semibold text-gray-700 hidden sm:block">
                            Bienvenido, {user?.username || 'Usuario'}
                        </span>
                        <NotificationBell />
                    </div>
                </header>
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"></div>}
        </div>
    );
};

export default Layout;