import React, { useContext, useState, useEffect } from 'react';
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

// Admin
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
// ✅ NUEVO: Página de Anuncios
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage'; 

// Agent
import AgentDashboard from './pages/AgentDashboard';
import AgentTicketsPage from './pages/AgentTicketPage';
import AgentTicketDetailPage from './pages/AgentTicketDetailPage';

// Client
import ClientDashboard from './pages/ClientDashboard';
import ClientTicketsPage from './pages/ClientMyTicketsPage';
import ClientTicketDetailPage from './pages/ClientTicketDetailPage';

import PrivateRoute from './components/Common/PrivateRoute';
import ReportsPage from './pages/ReportsPage';

export type SocketInstance = ReturnType<typeof io>;

const SocketConnectionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, token } = useContext(AuthContext)!;
    const [socket, setSocket] = useState<SocketInstance | null>(null);

    useEffect(() => {
        if (isAuthenticated && token) {
            const currentHost = window.location.hostname;
            const BACKEND_PORT = 5050; 
            const socketUrl = `http://${currentHost}:${BACKEND_PORT}`;
            
            const newSocket = io(socketUrl, {
                auth: { token },
                transports: ['websocket', 'polling'] 
            });
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
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

                            {/* Admin */}
                            <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
                            <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsersPage /></PrivateRoute>} />
                            <Route path="/admin/companies" element={<PrivateRoute roles={['admin']}><AdminCompaniesPage /></PrivateRoute>} />
                            <Route path="/admin/companies/:companyId/departments" element={<PrivateRoute roles={['admin']}><AdminCompanyDepartmentsPage /></PrivateRoute>} />
                            <Route path="/admin/tickets" element={<PrivateRoute roles={['admin']}><AdminTicketsPage /></PrivateRoute>} />
                            <Route path="/admin/tickets/:id" element={<PrivateRoute roles={['admin']}><AdminTicketDetailPage /></PrivateRoute>} />
                            <Route path="/admin/reports" element={<PrivateRoute roles={['admin']}><AdminReportsPage /></PrivateRoute>} />
                            
                            <Route path="/admin/plans" element={<PrivateRoute roles={['admin']}><AdminPlansPage /></PrivateRoute>} />
                            <Route path="/admin/modules" element={<PrivateRoute roles={['admin']}><AdminModulesPage /></PrivateRoute>} />
                            <Route path="/admin/config" element={<PrivateRoute roles={['admin']}><AdminConfigPage /></PrivateRoute>} />
                            <Route path="/admin/problemas" element={<PrivateRoute roles={['admin']}><AdminProblemsPage /></PrivateRoute>} />
                            
                            {/* ✅ NUEVO: Ruta de Anuncios */}
                            <Route path="/admin/announcements" element={<PrivateRoute roles={['admin']}><AdminAnnouncementsPage /></PrivateRoute>} />

                            {/* Agente */}
                            <Route path="/agent" element={<PrivateRoute roles={['agent']}><AgentDashboard /></PrivateRoute>} />
                            <Route path="/agent/tickets" element={<PrivateRoute roles={['agent']}><AgentTicketDetailPage /></PrivateRoute>} />
                            <Route path="/agent/tickets/:id" element={<PrivateRoute roles={['agent']}><AgentTicketDetailPage /></PrivateRoute>} />
                            <Route path="/reports" element={<PrivateRoute roles={['admin', 'agent']}><ReportsPage /></PrivateRoute>} />
                            
                            {/* Cliente */}
                            <Route path="/client" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
                            <Route path="/client/tickets" element={<PrivateRoute roles={['client']}><ClientTicketsPage /></PrivateRoute>} />
                            <Route path="/client/tickets/:id" element={<PrivateRoute roles={['client']}><ClientTicketDetailPage /></PrivateRoute>} />
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