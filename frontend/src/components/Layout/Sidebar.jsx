import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users2, Target, CalendarCheck,
  BarChart2, Users, LogOut,
  MessageSquare, Settings, UserCircle, SlidersHorizontal, DatabaseBackup, Building2
} from 'lucide-react';

const navStyle = isActive => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  borderRadius: 10, marginBottom: 2, textDecoration: 'none',
  color: isActive ? '#173b60' : '#345879',
  background: isActive ? '#fff' : 'transparent',
  fontWeight: isActive ? 600 : 400, fontSize: 14,
  transition: 'all .15s',
});

const nav = [
  { to: '/',               icon: LayoutDashboard, label: 'Inicio',           exact: true },
  { to: '/contacts',       icon: Users2,          label: 'Contactos' },
  { to: '/opportunities',  icon: Target,          label: 'Oportunidades' },
  { to: '/followups',      icon: CalendarCheck,   label: 'Seguimientos' },
  { to: '/activities',     icon: CalendarCheck,   label: 'Tareas diarias' },
  { to: '/prospecting',    icon: Building2,       label: 'Prospección diaria' },
  { to: '/communications', icon: MessageSquare,   label: 'Plantillas' },
  { to: '/reports',        icon: BarChart2,       label: 'Informes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="app-sidebar" style={{
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
      <div className="sidebar-brand" style={{ padding: '22px 18px 18px', borderBottom: '1px solid #bfdcff' }}>
        <img src="/brand/realadvisor-wordmark.png" alt="RealAdvisor" style={{ display:'block', width:'100%', maxWidth:190, height:32, objectFit:'contain', objectPosition:'left center' }}/>
        <p style={{ color: '#52708d', fontSize: 11, marginTop:8 }}>Seguimiento comercial</p>
      </div>

      {/* User card — click to go to profile */}
      <NavLink className="sidebar-profile" to="/profile" style={{ textDecoration:'none' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #bfdcff', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.55)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,.2)', overflow:'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#173b60', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              <img src={user?.avatar || '/brand/leonardo-profile.jpg'} alt={user?.name || 'Leonardo'} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 22%'}}/>
            </div>
            <div style={{ overflow: 'hidden', flex:1 }}>
              <p style={{ color: '#173b60', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ color: '#52708d', fontSize: 11 }}>{user?.role === 'admin' ? 'Asesor' : user?.role}</p>
            </div>
            <UserCircle size={14} color="#6d89a3"/>
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {nav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            style={({ isActive }) => navStyle(isActive)}>
            <Icon size={17}/>
            {label}
          </NavLink>
        ))}

        {/* Admin-only links */}
        {(user?.role === 'admin' || user?.role === 'gerente') && (
          <div className="sidebar-admin-links">
            <div style={{ height:1, background:'#bfdcff', margin:'8px 4px' }}/>
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
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="sidebar-logout" style={{ padding: '12px 10px', borderTop: '1px solid #bfdcff' }}>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', background: 'rgba(239,68,68,.09)', border: 'none',
          borderRadius: 10, cursor: 'pointer', color: '#b42318', fontSize: 14, fontWeight: 500,
        }}>
          <LogOut size={17}/>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
