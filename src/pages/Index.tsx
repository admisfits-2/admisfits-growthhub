import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import ProjectsTab from '@/components/dashboard/ProjectsTab';
import DataIntegrationTab from '@/components/dashboard/DataIntegrationTab';
import InvoicesTab from '@/components/dashboard/InvoicesTab';
import UsersTab from '@/components/dashboard/UsersTab';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'projects':
        return <ProjectsTab />;
      case 'data-integration':
        return <DataIntegrationTab />;
      case 'invoices':
        return <InvoicesTab />;
      case 'users':
        return <UsersTab />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTabContent()}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default Index;
