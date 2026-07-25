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

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/quote/:token" element={<QuoteAccept />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index                element={<Dashboard />} />
        <Route path="contacts"      element={<Contacts />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="activities"    element={<Activities />} />
        <Route path="quotes"        element={<Quotes />} />
        <Route path="invoices"      element={<Invoices />} />
        <Route path="products"      element={<Products />} />
        <Route path="reports"       element={<Reports />} />
        <Route path="users"         element={<Users />} />
        <Route path="communications" element={<Communications />} />
        <Route path="automations"   element={<Automations />} />
        <Route path="workflows"     element={<Workflows />} />
        <Route path="workflows/:id" element={<WorkflowBuilder />} />
        <Route path="admin"         element={<Admin />} />
        <Route path="forecast"      element={<Forecast />} />
        <Route path="profile"      element={<Profile />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="backups"      element={<Backup />} />
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
