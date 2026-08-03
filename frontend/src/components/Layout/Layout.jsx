import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { clearAdminPreview, useAdminPreview } from '../../utils/adminPreview';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const preview = useAdminPreview(user?.role === 'admin');
  const stopPreview = () => {
    clearAdminPreview();
    navigate('/users');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="app-content" style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        {preview && (
          <div className="admin-preview-banner">
            <span><strong>Vista como {preview.name}</strong> · {preview.role === 'setter' ? 'Setter' : preview.role === 'vendedor' ? 'Closer' : preview.role}</span>
            <span className="admin-preview-note">Sigues conectado como administrador.</span>
            <button type="button" onClick={stopPreview}>Volver a mi vista</button>
          </div>
        )}
        <main className="app-main" style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
