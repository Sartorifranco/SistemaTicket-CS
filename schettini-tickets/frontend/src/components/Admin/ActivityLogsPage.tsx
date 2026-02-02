// src/pages/Admin/ActivityLogsPage.tsx
import React from 'react';
import Layout from '../../components/Layout/Layout';
import ActivityLogs from '../../components/System/ActivityLogDashboard'; // Asumo que ActivityLogDashboard es el componente de logs

const ActivityLogsPage: React.FC = () => {
    return (
            <ActivityLogs />
    );
};

export default ActivityLogsPage;
