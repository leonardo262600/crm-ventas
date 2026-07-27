import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Chat from './pages/Chat';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const Activities = lazy(() => import('./pages/Activities'));
const Quotes = lazy(() => import('./pages/Quotes'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Products = lazy(() => import('./pages/Products'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Communications = lazy(() => import('./pages/Communications'));
const Automations = lazy(() => import('./pages/Automations'));
const Admin = lazy(() => import('./pages/Admin'));
const Forecast = lazy(() => import('./pages/Forecast'));
const Profile = lazy(() => import('./pages/Profile'));
const QuoteAccept = lazy(() => import('./pages/QuoteAccept'));
const Workflows = lazy(() => import('./pages/Workflows'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));
const Settings = lazy(() => import('./pages/Settings'));
const Backup = lazy(() => import('./pages/Backup'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const DailyProspecting = lazy(() => import('./pages/DailyProspecting'));
const Demos = lazy(() => import('./pages/Demos'));

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
        <Route path="contacts"      element={<Contacts />} />
        <Route path="opportunities" element={<OperationalRoute><Opportunities /></OperationalRoute>} />
        <Route path="demos"          element={<OperationalRoute><Demos /></OperationalRoute>} />
        <Route path="activities"    element={<OperationalRoute><Activities /></OperationalRoute>} />
        <Route path="followups"     element={<OperationalRoute><FollowUps /></OperationalRoute>} />
        <Route path="prospecting"   element={<DailyProspecting />} />
        <Route path="chat"          element={<Chat />} />
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
        <Suspense fallback={<div className="app-loading"><img src="/icons/icon-192.png" alt=""/><span>Cargando CRM…</span></div>}>
          <AppRoutes />
        </Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
