import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Opportunities from './pages/Opportunities';
import Activities from './pages/Activities';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Communications from './pages/Communications';
import Automations from './pages/Automations';
import Admin from './pages/Admin';
import Forecast from './pages/Forecast';
import Profile from './pages/Profile';
import QuoteAccept from './pages/QuoteAccept';
import Workflows from './pages/Workflows';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import FollowUps from './pages/FollowUps';
import DailyProspecting from './pages/DailyProspecting';
import Demos from './pages/Demos';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;
  return user ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />;
};

const OperationalRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'setter' ? <Navigate to="/prospecting" replace /> : children;
};

const HomeRoute = () => {
  const { user } = useAuth();
  return user?.role === 'setter' ? <Navigate to="/prospecting" replace /> : <Dashboard />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/quote/:token" element={<QuoteAccept />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index                element={<HomeRoute />} />
        <Route path="contacts"      element={<OperationalRoute><Contacts /></OperationalRoute>} />
        <Route path="opportunities" element={<OperationalRoute><Opportunities /></OperationalRoute>} />
        <Route path="demos"          element={<OperationalRoute><Demos /></OperationalRoute>} />
        <Route path="activities"    element={<OperationalRoute><Activities /></OperationalRoute>} />
        <Route path="followups"     element={<OperationalRoute><FollowUps /></OperationalRoute>} />
        <Route path="prospecting"   element={<DailyProspecting />} />
        <Route path="quotes"        element={<OperationalRoute><Quotes /></OperationalRoute>} />
        <Route path="invoices"      element={<OperationalRoute><Invoices /></OperationalRoute>} />
        <Route path="products"      element={<OperationalRoute><Products /></OperationalRoute>} />
        <Route path="reports"       element={<OperationalRoute><Reports /></OperationalRoute>} />
        <Route path="users"         element={<RoleRoute roles={['admin','gerente']}><Users /></RoleRoute>} />
        <Route path="communications" element={<OperationalRoute><Communications /></OperationalRoute>} />
        <Route path="automations"   element={<OperationalRoute><Automations /></OperationalRoute>} />
        <Route path="workflows"     element={<OperationalRoute><Workflows /></OperationalRoute>} />
        <Route path="workflows/:id" element={<OperationalRoute><WorkflowBuilder /></OperationalRoute>} />
        <Route path="admin"         element={<RoleRoute roles={['admin','gerente']}><Admin /></RoleRoute>} />
        <Route path="forecast"      element={<OperationalRoute><Forecast /></OperationalRoute>} />
        <Route path="profile"      element={<Profile />} />
        <Route path="settings"     element={<RoleRoute roles={['admin','gerente']}><Settings /></RoleRoute>} />
        <Route path="backups"      element={<RoleRoute roles={['admin','gerente']}><Backup /></RoleRoute>} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
