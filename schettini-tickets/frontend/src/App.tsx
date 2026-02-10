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
import AdminModulesPage from './pages/AdminModulesPage'; 
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';
import AdminChatPage from './pages/AdminChatPage';
import AdminResourcesPage from './pages/AdminResourcesPage';
import AdminUserPaymentsPage from './pages/AdminUserPaymentsPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';

// --- AGENT PAGES ---
import AgentDashboard from './pages/AgentDashboard';
import AgentTicketsPage from './pages/AgentTicketPage';
import AgentTicketDetailPage from './pages/AgentTicketDetailPage'; 
import AgentReportsPage from './pages/AgentReportsPage';

// --- CLIENT PAGES ---
import ClientDashboard from './pages/ClientDashboard';
import ClientTicketsPage from './pages/ClientMyTicketsPage';
import ClientTicketDetailPage from './pages/ClientTicketDetailPage';
import ClientResourcesPage from './pages/ClientResourcesPage';
import ClientPaymentsPage from './pages/ClientPaymentsPage'; 
import OffersPage from './pages/OffersPage';

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
                console.log('[Socket] Cerrando conexión (Logout)...');
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
            return;
        }

        if (socketRef.current && socketRef.current.connected) return;

        // ✅ CORRECCIÓN AQUÍ: Usamos la variable de entorno, igual que Axios
        const SOCKET_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5050`;
        
        console.log(`[Socket] Conectando a: ${SOCKET_URL}`);

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            // Importante para Render: path por defecto es /socket.io
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
                            <Route path="/admin/problemas" element={<PrivateRoute roles={['admin']}><AdminProblemsPage /></PrivateRoute>} />
                            <Route path="/admin/chat" element={<PrivateRoute roles={['admin', 'agent']}><AdminChatPage /></PrivateRoute>} />
                            <Route path="/admin/knowledge-base" element={<PrivateRoute roles={['admin']}><AdminResourcesPage /></PrivateRoute>} />

                            {/* --- RUTAS AGENTE --- */}
                            <Route path="/agent" element={<PrivateRoute roles={['agent']}><AgentDashboard /></PrivateRoute>} />
                            <Route path="/agent/tickets" element={<PrivateRoute roles={['agent']}><AgentTicketsPage /></PrivateRoute>} />
                            <Route path="/agent/tickets/:id" element={<PrivateRoute roles={['agent']}><AgentTicketDetailPage /></PrivateRoute>} />
                            <Route path="/agent/reports" element={<PrivateRoute roles={['agent']}><AgentReportsPage /></PrivateRoute>} />
                            
                            {/* Ruta legacy */}
                            <Route path="/reports" element={<PrivateRoute roles={['admin', 'agent']}><ReportsPage /></PrivateRoute>} />
                            
                            {/* --- RUTAS CLIENTE --- */}
                            <Route path="/client" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
                            <Route path="/client/tickets" element={<PrivateRoute roles={['client']}><ClientTicketsPage /></PrivateRoute>} />
                            <Route path="/client/tickets/:id" element={<PrivateRoute roles={['client']}><ClientTicketDetailPage /></PrivateRoute>} />
                            <Route path="/client/help" element={<PrivateRoute roles={['client']}><ClientResourcesPage /></PrivateRoute>} />
                            <Route path="/client/payments" element={<PrivateRoute roles={['client']}><ClientPaymentsPage /></PrivateRoute>} />
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