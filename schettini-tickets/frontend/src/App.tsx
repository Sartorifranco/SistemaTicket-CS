import React, { useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';

// --- ADMIN PAGES ---
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUserPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminCompanyDepartmentsPage from './pages/AdminCompanyDeparmentsPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminTicketDetailPage from './pages/AdminTicketDetailPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminProblemsPage from './pages/AdminProblemsPage'; 
import AdminPlansPage from './pages/AdminPlansPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AdminCompanySettingsPage from './pages/AdminCompanySettingsPage'; 
import AdminModulesPage from './pages/AdminModulesPage'; 
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';
import AdminResourcesPage from './pages/AdminResourcesPage';
import AdminUserPaymentsPage from './pages/AdminUserPaymentsPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';
import AdminActivityLogsPage from './pages/AdminActivityLogsPage';
import QuoterPage from './pages/QuoterPage';
import RepairOrdersListPage from './pages/RepairOrdersListPage';
import NewRepairOrderPage from './pages/NewRepairOrderPage';
import ManageRepairOrderPage from './pages/ManageRepairOrderPage';
import RecyclingAreaPage from './pages/RecyclingAreaPage';
import OrderMonitorPage from './pages/OrderMonitorPage';
import WarrantiesDashboardPage from './pages/WarrantiesDashboardPage';

// --- AGENT PAGES ---
import AgentDashboard from './pages/AgentDashboard';
import AgentTicketsPage from './pages/AgentTicketPage';
import AgentTicketDetailPage from './pages/AgentTicketDetailPage'; 
import AgentReportsPage from './pages/AgentReportsPage';
import AgentTasksPage from './pages/AgentTasksPage';

// --- CLIENT PAGES ---
import ClientDashboard from './pages/ClientDashboard';
import ClientTicketsPage from './pages/ClientMyTicketsPage';
import ClientTicketDetailPage from './pages/ClientTicketDetailPage';
import ClientResourcesPage from './pages/ClientResourcesPage';
import ClientRepairsPage from './pages/ClientRepairsPage';
import ClientActivationsPage from './pages/ClientActivationsPage';
import OffersPage from './pages/OffersPage';
import AdminActivationsPage from './pages/AdminActivationsPage';
import ReadyEquipmentsPage from './pages/ReadyEquipmentsPage';

import PrivateRoute from './components/Common/PrivateRoute';
import ReportsPage from './pages/ReportsPage';

export type SocketInstance = ReturnType<typeof io>;

const SocketConnectionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, token } = useContext(AuthContext)!;
    const [socket, setSocket] = useState<SocketInstance | null>(null);
    const socketRef = useRef<SocketInstance | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
            return;
        }

        if (socketRef.current && socketRef.current.connected) return;

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const SOCKET_URL = isLocal
            ? 'http://localhost:5050'
            : (process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || window.location.origin);

        console.log(`[Socket] Conectando a: ${SOCKET_URL}`);

        const newSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'], // <--- REMOVE 'polling', keep only 'websocket'
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    // Add this to ensure secure connection details are handled correctly
    withCredentials: true,
    secure: true, 
});

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {};
    }, [isAuthenticated, token]);

    return (
        // @ts-ignore
        <NotificationProvider socket={socket}>
            {children}
        </NotificationProvider>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <SocketConnectionManager>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/activate-account" element={<ActivateAccountPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />

                        <Route element={<Layout />}>
                            <Route path="/" element={<Navigate to="/profile" replace />} />
                            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

                            {/* --- RUTAS ADMIN --- */}
                            <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
                            <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsersPage /></PrivateRoute>} />
                            <Route path="/admin/users/:userId/payments" element={<PrivateRoute roles={['admin']}><AdminUserPaymentsPage /></PrivateRoute>} />
                            <Route path="/admin/companies" element={<PrivateRoute roles={['admin']}><AdminCompaniesPage /></PrivateRoute>} />
                            <Route path="/admin/companies/:companyId/departments" element={<PrivateRoute roles={['admin']}><AdminCompanyDepartmentsPage /></PrivateRoute>} />
                            <Route path="/admin/tickets" element={<PrivateRoute roles={['admin']}><AdminTicketsPage /></PrivateRoute>} />
                            <Route path="/admin/tickets/:id" element={<PrivateRoute roles={['admin']}><AdminTicketDetailPage /></PrivateRoute>} />
                            <Route path="/admin/reports" element={<PrivateRoute roles={['admin']}><AdminReportsPage /></PrivateRoute>} />
                            <Route path="/admin/announcements" element={<PrivateRoute roles={['admin']}><AdminAnnouncementsPage /></PrivateRoute>} />
                            <Route path="/admin/promotions" element={<PrivateRoute roles={['admin']}><AdminPromotionsPage /></PrivateRoute>} />
                            <Route path="/admin/plans" element={<PrivateRoute roles={['admin']}><AdminPlansPage /></PrivateRoute>} />
                            <Route path="/admin/modules" element={<PrivateRoute roles={['admin']}><AdminModulesPage /></PrivateRoute>} />
                            <Route path="/admin/config" element={<PrivateRoute roles={['admin']}><AdminConfigPage /></PrivateRoute>} />
                            <Route path="/admin/company-settings" element={<PrivateRoute roles={['admin']}><AdminCompanySettingsPage /></PrivateRoute>} />
                            <Route path="/admin/problemas" element={<PrivateRoute roles={['admin']}><AdminProblemsPage /></PrivateRoute>} />
                            <Route path="/admin/activity-logs" element={<PrivateRoute roles={['admin']}><AdminActivityLogsPage /></PrivateRoute>} />
                            <Route path="/admin/knowledge-base" element={<PrivateRoute roles={['admin']}><AdminResourcesPage /></PrivateRoute>} />
                            <Route path="/admin/cotizador" element={<PrivateRoute roles={['admin']}><QuoterPage /></PrivateRoute>} />
                            <Route path="/admin/repair-orders" element={<PrivateRoute roles={['admin']}><RepairOrdersListPage /></PrivateRoute>} />
                            <Route path="/admin/repair-orders/new" element={<PrivateRoute roles={['admin']}><NewRepairOrderPage /></PrivateRoute>} />
                            <Route path="/admin/repair-orders/:id" element={<PrivateRoute roles={['admin']}><ManageRepairOrderPage /></PrivateRoute>} />
                            <Route path="/admin/recycling-area" element={<PrivateRoute roles={['admin']}><RecyclingAreaPage /></PrivateRoute>} />
                            <Route path="/admin/monitor" element={<PrivateRoute roles={['admin', 'agent', 'supervisor']}><OrderMonitorPage /></PrivateRoute>} />
                            <Route path="/admin/warranties" element={<PrivateRoute roles={['admin', 'supervisor']}><WarrantiesDashboardPage /></PrivateRoute>} />
                            <Route path="/admin/activations" element={<PrivateRoute roles={['admin']}><AdminActivationsPage /></PrivateRoute>} />
                            <Route path="/admin/ready-equipments" element={<PrivateRoute roles={['admin']}><ReadyEquipmentsPage /></PrivateRoute>} />
                            <Route path="/admin/tasks" element={<PrivateRoute roles={['admin']}><AgentTasksPage mode="admin" /></PrivateRoute>} />

                            {/* --- RUTAS AGENTE Y SUPERVISOR --- */}
                            <Route path="/agent" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']}><AgentDashboard /></PrivateRoute>} />
                            <Route path="/agent/tickets" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="tickets_view"><AgentTicketsPage /></PrivateRoute>} />
                            <Route path="/agent/tickets/:id" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="tickets_view"><AgentTicketDetailPage /></PrivateRoute>} />
                            <Route path="/agent/tasks" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="tickets_view"><AgentTasksPage /></PrivateRoute>} />
                            <Route path="/agent/knowledge-base" element={<PrivateRoute roles={['agent', 'supervisor']}><AdminResourcesPage /></PrivateRoute>} />
                            <Route path="/agent/reports" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="reports_view"><AgentReportsPage /></PrivateRoute>} />
                            <Route path="/agent/cotizador" element={<PrivateRoute roles={['agent', 'supervisor']} permission="quoter_access"><QuoterPage /></PrivateRoute>} />
                            <Route path="/agent/repair-orders" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><RepairOrdersListPage /></PrivateRoute>} />
                            <Route path="/agent/repair-orders/new" element={<PrivateRoute roles={['agent', 'supervisor']} permission="repairs_view"><NewRepairOrderPage /></PrivateRoute>} />
                            <Route path="/agent/repair-orders/:id" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><ManageRepairOrderPage /></PrivateRoute>} />
                            <Route path="/agent/recycling-area" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><RecyclingAreaPage /></PrivateRoute>} />
                            <Route path="/agent/monitor" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><OrderMonitorPage /></PrivateRoute>} />
                            <Route path="/agent/activations" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><AdminActivationsPage /></PrivateRoute>} />
                            <Route path="/agent/ready-equipments" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="repairs_view"><ReadyEquipmentsPage /></PrivateRoute>} />
                            <Route path="/agent/activity-logs" element={<PrivateRoute roles={['agent', 'supervisor', 'viewer']} permission="tickets_view"><AdminActivityLogsPage title="Mi Actividad" /></PrivateRoute>} />
                            
                            {/* Ruta legacy */}
                            <Route path="/reports" element={<PrivateRoute roles={['admin', 'agent', 'supervisor']}><ReportsPage /></PrivateRoute>} />
                            
                            {/* --- RUTAS CLIENTE --- */}
                            <Route path="/client" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
                            <Route path="/client/tickets" element={<PrivateRoute roles={['client']}><ClientTicketsPage /></PrivateRoute>} />
                            <Route path="/client/tickets/:id" element={<PrivateRoute roles={['client']}><ClientTicketDetailPage /></PrivateRoute>} />
                            <Route path="/client/repairs" element={<PrivateRoute roles={['client']}><ClientRepairsPage /></PrivateRoute>} />
                            <Route path="/client/activations" element={<PrivateRoute roles={['client']}><ClientActivationsPage /></PrivateRoute>} />
                            <Route path="/client/help" element={<PrivateRoute roles={['client']}><ClientResourcesPage /></PrivateRoute>} />
                            <Route path="/client/offers" element={<PrivateRoute roles={['client']}><OffersPage /></PrivateRoute>} />
                        </Route>

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
                </SocketConnectionManager>
            </AuthProvider>
        </Router>
    );
};

export default App;