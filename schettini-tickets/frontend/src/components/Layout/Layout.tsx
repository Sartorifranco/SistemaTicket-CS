import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import NotificationBell from '../NotificationBell/NotificationBell';
import PromoModal from '../Common/PromoModal';
import { getPlanLabel } from '../../utils/traslations';
import PromoPopup from '../Common/PromoPopup';
import { FaHome, FaUsers, FaTicketAlt, FaChartBar, FaBuilding, FaBullhorn, FaCogs, FaBox, FaList, FaBook, FaTags, FaCrown, FaClock, FaHistory, FaTasks, FaCalculator, FaWrench, FaTools, FaRecycle, FaFileAlt, FaBoxOpen, FaTv, FaExclamationTriangle, FaTimes, FaShieldAlt, FaCashRegister, FaFileInvoiceDollar, FaUserFriends, FaCubes } from 'react-icons/fa';
import { hasAnyPermission, SIDEBAR_PERMISSION_MAP } from '../../utils/permissions';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const { socket } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const isMonitor = location.pathname.endsWith('/monitor');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [delayedOrdersAlert, setDelayedOrdersAlert] = useState<{ message: string; count: number } | null>(null);
    const [agentsCanViewMovements, setAgentsCanViewMovements] = useState<boolean>(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    // @ts-ignore
    const [realTimePlan, setRealTimePlan] = useState(user?.plan || 'Gratis');

    useEffect(() => {
        const timer = setInterval(() => setCurrentDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (user?.role === 'client') {
            api.get('/api/dashboard/client')
                .then(res => {
                    if (res.data.data && res.data.data.plan) {
                        setRealTimePlan(res.data.data.plan);
                    }
                })
                .catch(() => {});
        }
    }, [user]);

    useEffect(() => {
        if (!socket || (user?.role !== 'agent' && user?.role !== 'supervisor')) return;
        const handler = (payload: { message?: string; count?: number }) => {
            const count = payload.count ?? 0;
            if (count <= 0) {
                setDelayedOrdersAlert(null);
                return;
            }
            setDelayedOrdersAlert({
                message: payload.message || '¡Atención! Tenés equipos demorados que revisar.',
                count
            });
        };
        socket.on('delayed_orders_alert', handler);
        return () => {
            socket.off('delayed_orders_alert', handler);
        };
    }, [socket, user?.role]);

    useEffect(() => {
        if (user?.role !== 'agent') return;
        api.get('/api/settings/company')
            .then((res) => {
                const data = res.data?.data ?? res.data;
                setAgentsCanViewMovements(!!(data?.agents_can_view_movements === 1 || data?.agents_can_view_movements === true));
            })
            .catch(() => setAgentsCanViewMovements(false));
    }, [user?.role]);

    const handleLogout = () => {
        logout();
        toast.info('Sesión cerrada correctamente.');
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
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Administración</li>
                        <li><NavLink to="/admin" end className={getLinkClassName}><FaHome /> Inicio</NavLink></li>
                        <li><NavLink to="/admin/users" className={getLinkClassName}><FaUsers /> Usuarios</NavLink></li>
                        <li><NavLink to="/tech/clients" className={getLinkClassName}><FaUserFriends /> Clientes / Empresas</NavLink></li>
                        <li><NavLink to="/admin/companies" className={getLinkClassName}><FaBuilding /> Empresas</NavLink></li>
                        <li><NavLink to="/admin/tickets" className={getLinkClassName}><FaTicketAlt /> Tickets</NavLink></li>
                        <li><NavLink to="/admin/reports" className={getLinkClassName}><FaChartBar /> Reportes</NavLink></li>
                        <li><NavLink to="/admin/promotions" className={getLinkClassName}><FaBullhorn /> Marketing y Ofertas</NavLink></li>
                        <li><NavLink to="/admin/announcements" className={getLinkClassName}><FaBullhorn /> Enviar Novedades</NavLink></li>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Soporte</li>
                        <li><NavLink to="/admin/knowledge-base" className={getLinkClassName}><FaBook /> Centro de Ayuda</NavLink></li>
                        <li><NavLink to="/admin/tasks" className={getLinkClassName}><FaTasks /> Tareas del Equipo</NavLink></li>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Área Técnica</li>
                        <li><NavLink to="/admin/repair-orders" className={getLinkClassName}><FaWrench /> Órdenes de Taller</NavLink></li>
                        <li><NavLink to="/admin/recycling-area" className={getLinkClassName}><FaRecycle /> Área de Reciclaje</NavLink></li>
                        <li><NavLink to="/admin/monitor" className={getLinkClassName}><FaTv /> Monitor Órdenes</NavLink></li>
                        <li><NavLink to="/admin/warranties" className={getLinkClassName}><FaShieldAlt /> Garantías</NavLink></li>
                        <li><NavLink to="/admin/activations" className={getLinkClassName}><FaFileAlt /> Gestión de Planillas</NavLink></li>
                        <li><NavLink to="/admin/ready-equipments" className={getLinkClassName}><FaBoxOpen /> Equipos Listos</NavLink></li>
                        <li><NavLink to="/admin/refurbished" className={getLinkClassName}><FaCubes /> Equipos Reacondicionados</NavLink></li>
                        <li><NavLink to="/admin/movements" className={getLinkClassName}><FaBoxOpen /> Movimientos de Artículos</NavLink></li>
                        <li><NavLink to="/admin/cotizador" className={getLinkClassName}><FaCalculator /> Cotizador</NavLink></li>
                        {(user.role === 'admin' || user.role === 'supervisor' || user.can_manage_tech_finances) && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Finanzas Técnicas</li>
                                <li><NavLink to="/admin/tech-cash" className={getLinkClassName}><FaCashRegister /> Caja Técnica</NavLink></li>
                                <li><NavLink to="/admin/tech-debts" className={getLinkClassName}><FaFileInvoiceDollar /> Reportes de Deudas</NavLink></li>
                            </>
                        )}
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Configuración</li>
                        <li><NavLink to="/admin/company-settings" className={getLinkClassName}><FaBuilding /> Configuración Central</NavLink></li>
                        <li><NavLink to="/admin/plans" className={getLinkClassName}><FaList /> Planes</NavLink></li>
                        <li><NavLink to="/admin/modules" className={getLinkClassName}><FaBox /> Módulos</NavLink></li>
                        <li><NavLink to="/admin/config" className={getLinkClassName}><FaCogs /> Config. Global</NavLink></li>
                        <li><NavLink to="/admin/activity-logs" className={getLinkClassName}><FaHistory /> Registro de Actividad</NavLink></li>
                    </>
                );
            case 'agent': {
                const perms = user.permissions || [];
                const hasTickets = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tickets);
                const hasTasks = hasAnyPermission(perms, ['tasks_view']) || hasTickets;
                // Marketing & Ofertas + Enviar Novedades habilitado globalmente para agentes (DOC1.2)
                const hasRepairs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.repair_orders);
                const hasActivations = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activations);
                const hasReady = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.ready_equipments);
                const hasRefurbished = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.refurbished);
                const hasMovements = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.movements) || (hasRepairs && agentsCanViewMovements);
                const hasWarranties = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.warranties);
                const hasCotizador = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.cotizador);
                const hasReports = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.reports);
                const hasActivityLogs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activity_logs);
                const hasTechFinances = user.can_manage_tech_finances || hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tech_finances);
                const hasResources = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.resources);
                const hasClients = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.clients);
                const hasMarketingPromotions = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.marketing_promotions);
                const hasMarketingAnnouncements = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.marketing_announcements);
                const hasMarketingSection = hasMarketingPromotions || hasMarketingAnnouncements;
                const hasAreaTecnica = hasRepairs || hasActivations || hasReady || hasRefurbished || hasMovements || hasWarranties || hasCotizador;
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Agente</li>
                        <li><NavLink to="/agent" end className={getLinkClassName}><FaHome /> Inicio</NavLink></li>
                        {(hasResources || !perms.length) && <li><NavLink to="/agent/knowledge-base" className={getLinkClassName}><FaBook /> Centro de Ayuda</NavLink></li>}
                        {hasTickets && (
                            <>
                                <li><NavLink to="/agent/tickets" className={getLinkClassName}><FaTicketAlt /> Mis Tickets</NavLink></li>
                                {hasTasks && <li><NavLink to="/agent/tasks" className={getLinkClassName}><FaTasks /> Mis Tareas</NavLink></li>}
                                {hasReports && <li><NavLink to="/agent/reports" className={getLinkClassName}><FaChartBar /> Mis Reportes</NavLink></li>}
                                {hasActivityLogs && <li><NavLink to="/agent/activity-logs" className={getLinkClassName}><FaHistory /> Registro de Actividad</NavLink></li>}
                            </>
                        )}
                        {hasMarketingSection && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Comunicación</li>
                                {hasMarketingPromotions && (
                                    <li><NavLink to="/agent/promotions" className={getLinkClassName}><FaBullhorn /> Marketing y Ofertas</NavLink></li>
                                )}
                                {hasMarketingAnnouncements && (
                                    <li><NavLink to="/agent/announcements" className={getLinkClassName}><FaBullhorn /> Enviar Novedades</NavLink></li>
                                )}
                            </>
                        )}
                        {hasAreaTecnica && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Área Técnica</li>
                                {hasRepairs && <li><NavLink to="/agent/repair-orders" className={getLinkClassName}><FaWrench /> Órdenes de Taller</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/recycling-area" className={getLinkClassName}><FaRecycle /> Área de Reciclaje</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/monitor" className={getLinkClassName}><FaTv /> Monitor Órdenes</NavLink></li>}
                                {hasWarranties && <li><NavLink to="/admin/warranties" className={getLinkClassName}><FaShieldAlt /> Garantías</NavLink></li>}
                                {hasActivations && <li><NavLink to="/agent/activations" className={getLinkClassName}><FaFileAlt /> Gestión de Planillas</NavLink></li>}
                                {hasReady && <li><NavLink to="/agent/ready-equipments" className={getLinkClassName}><FaBoxOpen /> Equipos Listos</NavLink></li>}
                                {hasRefurbished && <li><NavLink to="/agent/refurbished" className={getLinkClassName}><FaCubes /> Equipos Reacondicionados</NavLink></li>}
                                {hasMovements && <li><NavLink to="/agent/movements" className={getLinkClassName}><FaBoxOpen /> Movimientos de Artículos</NavLink></li>}
                                {hasCotizador && <li><NavLink to="/agent/cotizador" className={getLinkClassName}><FaCalculator /> Cotizador</NavLink></li>}
                            </>
                        )}
                        {hasTechFinances && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Finanzas Técnicas</li>
                                <li><NavLink to="/admin/tech-cash" className={getLinkClassName}><FaCashRegister /> Caja Técnica</NavLink></li>
                                <li><NavLink to="/admin/tech-debts" className={getLinkClassName}><FaFileInvoiceDollar /> Reportes de Deudas</NavLink></li>
                            </>
                        )}
                        {(hasClients || !perms.length) && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Clientes</li>
                                <li><NavLink to="/tech/clients" className={getLinkClassName}><FaUserFriends /> Clientes / Empresas</NavLink></li>
                            </>
                        )}
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Diccionarios</li>
                        <li><NavLink to="/admin/company-settings" className={getLinkClassName}><FaBuilding /> Configuración Central</NavLink></li>
                    </>
                );
            }
            case 'viewer': {
                const perms = user.permissions || [];
                const hasTickets = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tickets);
                const hasTasks = hasAnyPermission(perms, ['tasks_view']) || hasTickets;
                const hasRepairs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.repair_orders);
                const hasActivations = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activations);
                const hasReady = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.ready_equipments);
                const hasRefurbished = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.refurbished);
                const hasMovements = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.movements);
                const hasWarranties = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.warranties);
                const hasCotizador = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.cotizador);
                const hasReports = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.reports);
                const hasActivityLogs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activity_logs);
                const hasTechFinances = user.can_manage_tech_finances || hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tech_finances);
                const hasResources = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.resources);
                const hasClients = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.clients);
                const hasAreaTecnica = hasRepairs || hasActivations || hasReady || hasRefurbished || hasMovements || hasWarranties || hasCotizador;
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Vista (solo lectura)</li>
                        <li><NavLink to="/agent" end className={getLinkClassName}><FaHome /> Inicio</NavLink></li>
                        {hasResources && <li><NavLink to="/agent/knowledge-base" className={getLinkClassName}><FaBook /> Centro de Ayuda</NavLink></li>}
                        {hasTickets && (
                            <>
                                <li><NavLink to="/agent/tickets" className={getLinkClassName}><FaTicketAlt /> Tickets</NavLink></li>
                                {hasTasks && <li><NavLink to="/agent/tasks" className={getLinkClassName}><FaTasks /> Tareas</NavLink></li>}
                                {hasReports && <li><NavLink to="/agent/reports" className={getLinkClassName}><FaChartBar /> Reportes</NavLink></li>}
                                {hasActivityLogs && <li><NavLink to="/agent/activity-logs" className={getLinkClassName}><FaHistory /> Registro de Actividad</NavLink></li>}
                            </>
                        )}
                        {hasAreaTecnica && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Área Técnica</li>
                                {hasRepairs && <li><NavLink to="/agent/repair-orders" className={getLinkClassName}><FaWrench /> Órdenes de Taller</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/recycling-area" className={getLinkClassName}><FaRecycle /> Área de Reciclaje</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/monitor" className={getLinkClassName}><FaTv /> Monitor Órdenes</NavLink></li>}
                                {hasWarranties && <li><NavLink to="/admin/warranties" className={getLinkClassName}><FaShieldAlt /> Garantías</NavLink></li>}
                                {hasActivations && <li><NavLink to="/agent/activations" className={getLinkClassName}><FaFileAlt /> Gestión de Planillas</NavLink></li>}
                                {hasReady && <li><NavLink to="/agent/ready-equipments" className={getLinkClassName}><FaBoxOpen /> Equipos Listos</NavLink></li>}
                                {hasRefurbished && <li><NavLink to="/agent/refurbished" className={getLinkClassName}><FaCubes /> Equipos Reacondicionados</NavLink></li>}
                                {hasMovements && <li><NavLink to="/agent/movements" className={getLinkClassName}><FaBoxOpen /> Movimientos de Artículos</NavLink></li>}
                                {hasCotizador && <li><NavLink to="/agent/cotizador" className={getLinkClassName}><FaCalculator /> Cotizador</NavLink></li>}
                            </>
                        )}
                        {hasTechFinances && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Finanzas Técnicas</li>
                                <li><NavLink to="/admin/tech-cash" className={getLinkClassName}><FaCashRegister /> Caja Técnica</NavLink></li>
                                <li><NavLink to="/admin/tech-debts" className={getLinkClassName}><FaFileInvoiceDollar /> Reportes de Deudas</NavLink></li>
                            </>
                        )}
                        {hasClients && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Clientes</li>
                                <li><NavLink to="/tech/clients" className={getLinkClassName}><FaUserFriends /> Clientes / Empresas</NavLink></li>
                            </>
                        )}
                    </>
                );
            }
            case 'supervisor': {
                const perms = user.permissions || [];
                const hasTickets = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tickets) || perms.length === 0;
                const hasTasks = hasAnyPermission(perms, ['tasks_view']) || hasTickets;
                const hasRepairs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.repair_orders);
                const hasActivations = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activations);
                const hasReady = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.ready_equipments);
                const hasRefurbished = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.refurbished);
                const hasMovements = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.movements);
                const hasWarranties = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.warranties);
                const hasCotizador = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.cotizador);
                const hasReports = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.reports);
                const hasActivityLogs = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.activity_logs);
                const hasTechFinances = user.role === 'supervisor' || user.can_manage_tech_finances || hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.tech_finances);
                const hasResources = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.resources) || !perms.length;
                const hasClients = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.clients) || !perms.length;
                const hasMarketingPromotions = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.marketing_promotions);
                const hasMarketingAnnouncements = hasAnyPermission(perms, SIDEBAR_PERMISSION_MAP.marketing_announcements);
                const hasMarketingSection = hasMarketingPromotions || hasMarketingAnnouncements;
                const hasAreaTecnica = hasRepairs || hasActivations || hasReady || hasRefurbished || hasMovements || hasWarranties || hasCotizador;
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Supervisor</li>
                        <li><NavLink to="/agent" end className={getLinkClassName}><FaHome /> Inicio</NavLink></li>
                        {hasResources && <li><NavLink to="/agent/knowledge-base" className={getLinkClassName}><FaBook /> Centro de Ayuda</NavLink></li>}
                        {hasTickets && (
                            <>
                                <li><NavLink to="/agent/tickets" className={getLinkClassName}><FaTicketAlt /> Mis Tickets</NavLink></li>
                                {hasTasks && <li><NavLink to="/agent/tasks" className={getLinkClassName}><FaTasks /> Tareas</NavLink></li>}
                                {hasReports && <li><NavLink to="/agent/reports" className={getLinkClassName}><FaChartBar /> Mis Reportes</NavLink></li>}
                                {hasActivityLogs && <li><NavLink to="/agent/activity-logs" className={getLinkClassName}><FaHistory /> Registro de Actividad</NavLink></li>}
                            </>
                        )}
                        {hasMarketingSection && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Comunicación</li>
                                {hasMarketingPromotions && (
                                    <li><NavLink to="/agent/promotions" className={getLinkClassName}><FaBullhorn /> Marketing y Ofertas</NavLink></li>
                                )}
                                {hasMarketingAnnouncements && (
                                    <li><NavLink to="/agent/announcements" className={getLinkClassName}><FaBullhorn /> Enviar Novedades</NavLink></li>
                                )}
                            </>
                        )}
                        {hasAreaTecnica && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Área Técnica</li>
                                {hasRepairs && <li><NavLink to="/agent/repair-orders" className={getLinkClassName}><FaWrench /> Órdenes de Taller</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/recycling-area" className={getLinkClassName}><FaRecycle /> Área de Reciclaje</NavLink></li>}
                                {hasRepairs && <li><NavLink to="/agent/monitor" className={getLinkClassName}><FaTv /> Monitor Órdenes</NavLink></li>}
                                {hasWarranties && <li><NavLink to="/admin/warranties" className={getLinkClassName}><FaShieldAlt /> Garantías</NavLink></li>}
                                {hasActivations && <li><NavLink to="/agent/activations" className={getLinkClassName}><FaFileAlt /> Gestión de Planillas</NavLink></li>}
                                {hasReady && <li><NavLink to="/agent/ready-equipments" className={getLinkClassName}><FaBoxOpen /> Equipos Listos</NavLink></li>}
                                {hasRefurbished && <li><NavLink to="/agent/refurbished" className={getLinkClassName}><FaCubes /> Equipos Reacondicionados</NavLink></li>}
                                {hasMovements && <li><NavLink to="/agent/movements" className={getLinkClassName}><FaBoxOpen /> Movimientos de Artículos</NavLink></li>}
                                {hasCotizador && <li><NavLink to="/agent/cotizador" className={getLinkClassName}><FaCalculator /> Cotizador</NavLink></li>}
                            </>
                        )}
                        {hasTechFinances && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Finanzas Técnicas</li>
                                <li><NavLink to="/admin/tech-cash" className={getLinkClassName}><FaCashRegister /> Caja Técnica</NavLink></li>
                                <li><NavLink to="/admin/tech-debts" className={getLinkClassName}><FaFileInvoiceDollar /> Reportes de Deudas</NavLink></li>
                            </>
                        )}
                        {hasClients && (
                            <>
                                <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Clientes</li>
                                <li><NavLink to="/tech/clients" className={getLinkClassName}><FaUserFriends /> Clientes / Empresas</NavLink></li>
                            </>
                        )}
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Configuración</li>
                        <li><NavLink to="/admin/company-settings" className={getLinkClassName}><FaBuilding /> Configuración Central</NavLink></li>
                    </>
                );
            }
            case 'client':
                return (
                    <>
                        <li className="text-xs uppercase text-gray-500 font-bold mt-4 mb-2 px-4">Cliente</li>
                        <li><NavLink to="/client" end className={getLinkClassName}><FaHome /> Inicio</NavLink></li>
                        <li><NavLink to="/client/offers" className={getLinkClassName}><FaTags /> Ofertas y Beneficios</NavLink></li>
                        <li><NavLink to="/client/tickets" className={getLinkClassName}><FaTicketAlt /> Mis Tickets</NavLink></li>
                        <li><NavLink to="/client/repairs" className={getLinkClassName}><FaTools /> Mis Reparaciones</NavLink></li>
                        <li><NavLink to="/client/activations" className={getLinkClassName}><FaFileAlt /> Activaciones / Planillas</NavLink></li>
                        <li><NavLink to="/client/help" className={getLinkClassName}><FaBook /> Centro de Ayuda</NavLink></li>
                        <li><NavLink to="/profile" className={getLinkClassName}><FaUsers /> Mi Perfil</NavLink></li>
                    </>
                );
            default:
                return null;
        }
    };

    const isPremium = String(realTimePlan).toLowerCase().includes('enterprise') || String(realTimePlan).toLowerCase().includes('premium');

    if (isMonitor) {
        return <Outlet />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans print:hidden">
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center justify-center border-b border-gray-800 bg-gray-950 px-4">
                    {/* ✅ LOGO NUEVO: Lila.png */}
                    <img src="/images/Lila.png" alt="Casa Schettini" className="h-12 w-auto object-contain" />
                </div>
                <nav className="flex-grow p-4 overflow-y-auto"><ul className="space-y-1">{renderNavLinks()}</ul></nav>
                <div className="p-4 border-t border-gray-800 bg-gray-950">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-colors text-sm font-medium">Cerrar Sesión</button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                {delayedOrdersAlert && (user?.role === 'agent' || user?.role === 'supervisor') && (
                    <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-red-600 text-white border-b-2 border-red-700 shadow-md z-20">
                        <div className="flex items-center gap-3">
                            <FaExclamationTriangle className="text-2xl shrink-0" />
                            <div>
                                <p className="font-bold text-lg">{delayedOrdersAlert.message}</p>
                                {delayedOrdersAlert.count > 0 && (
                                    <p className="text-sm text-red-100">{delayedOrdersAlert.count} orden(es) demorada(s)</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => navigate('/agent/monitor')}
                                className="px-3 py-1.5 bg-white text-red-700 font-medium rounded-lg hover:bg-red-50 text-sm"
                            >
                                Ver monitor
                            </button>
                            <button
                                type="button"
                                onClick={() => setDelayedOrdersAlert(null)}
                                className="p-2 text-white/90 hover:bg-white/20 rounded-lg"
                                aria-label="Cerrar"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                )}
                <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 focus:outline-none">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6H20M4 12H20M4 18H20" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    
                    <div className="flex flex-1 items-center justify-end space-x-6">
                        <div className="hidden md:flex flex-col items-end text-right mr-4 border-r pr-6 border-gray-200">
                             <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                                <FaClock className="text-indigo-500 text-sm"/>
                                {currentDate.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                             </div>
                             <span className="text-xs text-gray-500 capitalize">
                                {currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                             </span>
                        </div>

                        {user?.role === 'client' && (
                            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isPremium ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                <FaCrown className={isPremium ? 'text-yellow-500' : 'text-gray-400'} size={14} />
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Tu Plan</p>
                                    <p className={`text-sm font-extrabold leading-tight ${isPremium ? 'text-yellow-700' : 'text-gray-600'}`}>
                                        {getPlanLabel(realTimePlan as string)}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-4">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-800">{user?.full_name || user?.username || 'Usuario'}</span>
                                <span className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : user?.role === 'supervisor' ? 'Supervisor' : user?.role === 'agent' ? 'Agente' : user?.role === 'viewer' ? 'Vista' : 'Cliente'}</span>
                            </div>
                            <NotificationBell />
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 relative"><Outlet /></main>
            </div>
            
            <PromoModal /> 
            {user?.role === 'client' && <PromoPopup />}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"></div>}
        </div>
    );
};

export default Layout;