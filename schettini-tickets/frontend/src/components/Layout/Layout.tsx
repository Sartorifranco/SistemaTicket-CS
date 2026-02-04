import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import NotificationBell from '../NotificationBell/NotificationBell';
import PromoModal from '../Common/PromoModal';
import HelpWidget from '../Common/HelpWidget'; // ✅ IMPORTADO
import { COMPANY_CONFIG } from '../../config/branding'; 
import { FaHome, FaUsers, FaTicketAlt, FaChartBar, FaBuilding, FaBullhorn, FaCogs, FaBox, FaList, FaHeadset, FaBook } from 'react-icons/fa';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.info('Sesión cerrada exitosamente.');
    };

    const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isActive ? 'bg-red-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`;

    const renderNavLinks = () => {
        if (!user) return null;

        switch (user.role) {
            case 'admin':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Admin</li>
                        <li><NavLink to="/admin" end className={getLinkClassName}><FaHome /> Dashboard</NavLink></li>
                        <li><NavLink to="/admin/users" className={getLinkClassName}><FaUsers /> Usuarios</NavLink></li>
                        <li><NavLink to="/admin/companies" className={getLinkClassName}><FaBuilding /> Empresas</NavLink></li>
                        <li><NavLink to="/admin/tickets" className={getLinkClassName}><FaTicketAlt /> Tickets</NavLink></li>
                        <li><NavLink to="/admin/reports" className={getLinkClassName}><FaChartBar /> Reportes</NavLink></li>
                        
                        {/* Panel de Novedades y Marketing */}
                        <li><NavLink to="/admin/announcements" className={getLinkClassName}><FaBullhorn /> Enviar Novedades</NavLink></li>

                        {/* Gestión de Soporte */}
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Soporte y Ayuda</li>
                        <li><NavLink to="/admin/chat" className={getLinkClassName}><FaHeadset /> Chat Soporte</NavLink></li>
                        <li><NavLink to="/admin/knowledge-base" className={getLinkClassName}><FaBook /> Base Conocimiento</NavLink></li>

                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Configuración</li>
                        <li><NavLink to="/admin/plans" className={getLinkClassName}><FaList /> Planes</NavLink></li>
                        <li><NavLink to="/admin/modules" className={getLinkClassName}><FaBox /> Módulos</NavLink></li>
                        <li><NavLink to="/admin/config" className={getLinkClassName}><FaCogs /> Config Global</NavLink></li>
                        <li><NavLink to="/admin/problemas" className={getLinkClassName}>Tipos Problema</NavLink></li>
                    </>
                );
            case 'agent':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Agente</li>
                        <li><NavLink to="/agent" end className={getLinkClassName}><FaHome /> Dashboard</NavLink></li>
                        <li><NavLink to="/agent/tickets" className={getLinkClassName}><FaTicketAlt /> Mis Tickets</NavLink></li>
                        
                        {/* El agente también puede atender el chat */}
                        <li><NavLink to="/admin/chat" className={getLinkClassName}><FaHeadset /> Chat Soporte</NavLink></li>
                        
                        <li><NavLink to="/reports" className={getLinkClassName}><FaChartBar /> Mis Reportes</NavLink></li>
                    </>
                );
            case 'client':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Cliente</li>
                        <li><NavLink to="/client" end className={getLinkClassName}><FaHome /> Dashboard</NavLink></li>
                        <li><NavLink to="/client/tickets" className={getLinkClassName}><FaTicketAlt /> Mis Tickets</NavLink></li>
                        <li><NavLink to="/profile" className={getLinkClassName}><FaUsers /> Mi Perfil</NavLink></li>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col shadow-xl 
                                transform transition-transform duration-300 ease-in-out 
                                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                                md:relative md:translate-x-0`}>
                
                <div className="h-20 flex items-center justify-center border-b border-gray-800 bg-gray-950 px-4">
                    <img 
                        src={COMPANY_CONFIG.logoPath} 
                        alt={COMPANY_CONFIG.name} 
                        className="h-10 w-auto object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <span className="hidden text-xl font-bold text-white tracking-wider ml-2">{COMPANY_CONFIG.shortName}</span>
                </div>

                <nav className="flex-grow p-4 overflow-y-auto">
                    <ul className="space-y-1">
                        {renderNavLinks()}
                    </ul>
                </nav>
                
                <div className="p-4 border-t border-gray-800 bg-gray-950">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-colors text-sm font-medium">
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 focus:outline-none">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6H20M4 12H20M4 18H20" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>

                    <div className="flex items-center space-x-4 ml-auto">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-gray-800">{user?.username || 'Usuario'}</span>
                            <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
                        </div>
                        <NotificationBell />
                    </div>
                </header>
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 relative">
                    <Outlet />
                </main>
            </div>
            
            {/* ELEMENTOS FLOTANTES (Fuera del main para asegurar z-index y posición) */}
            
            {/* 1. Modal de Promos y Alertas */}
            <PromoModal /> 
            
            {/* 2. Widget de Ayuda (Visible para CLIENTES y ADMINS para pruebas) */}
            {(user?.role === 'client' || user?.role === 'admin') && <HelpWidget />}

            {/* Overlay para móvil */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"></div>}
        </div>
    );
};

export default Layout;