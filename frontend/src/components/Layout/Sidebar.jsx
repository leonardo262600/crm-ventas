import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users2, Target, CalendarCheck, FileText, FileCheck,
  Package, BarChart2, Users, TrendingUp, LogOut,
  MessageSquare, Zap, Settings, TrendingDown, UserCircle, Network, SlidersHorizontal, DatabaseBackup
} from 'lucide-react';

const navStyle = isActive => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  borderRadius: 10, marginBottom: 2, textDecoration: 'none',
  color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
  background: isActive ? 'rgba(255,255,255,.18)' : 'transparent',
  fontWeight: isActive ? 600 : 400, fontSize: 14,
  transition: 'all .15s',
});

const nav = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard',        exact: true },
  { to: '/contacts',       icon: Users2,          label: 'Contactos' },
  { to: '/opportunities',  icon: Target,          label: 'Oportunidades' },
  { to: '/forecast',       icon: TrendingUp,      label: 'Pronóstico' },
  { to: '/activities',     icon: CalendarCheck,   label: 'Actividades' },
  { to: '/communications', icon: MessageSquare,   label: 'Comunicaciones' },
  { to: '/quotes',         icon: FileText,        label: 'Cotizaciones' },
  { to: '/invoices',       icon: FileCheck,       label: 'Facturación' },
  { to: '/products',       icon: Package,         label: 'Productos' },
  { to: '/reports',        icon: BarChart2,       label: 'Reportes' },
  { to: '/automations',    icon: Zap,             label: 'Automatizaciones' },
  { to: '/workflows',      icon: Network,         label: 'Workflows' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 10, padding: 8, display: 'flex' }}>
            <TrendingUp size={20} color="#fff"/>
          </div>
          <div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>CRM Ventas</span>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>Panel de control</p>
          </div>
        </div>
      </div>

      {/* User card — click to go to profile */}
      <NavLink to="/profile" style={{ textDecoration:'none' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.1)', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.07)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex:1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
            <UserCircle size={14} color="rgba(255,255,255,.4)"/>
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {nav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            style={({ isActive }) => navStyle(isActive)}>
            <Icon size={17}/>
            {label}
          </NavLink>
        ))}

        {/* Admin-only links */}
        {(user?.role === 'admin' || user?.role === 'gerente') && (
          <>
            <div style={{ height:1, background:'rgba(255,255,255,.08)', margin:'8px 4px' }}/>
            <NavLink to="/settings"
              style={({ isActive }) => navStyle(isActive)}>
              <SlidersHorizontal size={17}/>
              Configuración
            </NavLink>
            <NavLink to="/backups"
              style={({ isActive }) => navStyle(isActive)}>
              <DatabaseBackup size={17}/>
              Backups y Datos
            </NavLink>
            <NavLink to="/admin"
              style={({ isActive }) => navStyle(isActive)}>
              <Settings size={17}/>
              Administración
            </NavLink>
            <NavLink to="/users"
              style={({ isActive }) => navStyle(isActive)}>
              <Users size={17}/>
              Usuarios
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', background: 'rgba(239,68,68,.15)', border: 'none',
          borderRadius: 10, cursor: 'pointer', color: '#fca5a5', fontSize: 14, fontWeight: 500,
        }}>
          <LogOut size={17}/>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
