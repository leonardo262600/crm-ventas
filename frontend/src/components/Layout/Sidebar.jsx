import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users2, Target, CalendarCheck, CalendarClock,
  BarChart2, Users, LogOut,
  MessageSquare, Settings, UserCircle, SlidersHorizontal, DatabaseBackup, Building2,
  Milestone, FileText, PhoneCall, BadgeEuro, CalendarDays
} from 'lucide-react';
import { getUserSymbol } from '../../utils/userAvatar';
import { clearAdminPreview, useAdminPreview } from '../../utils/adminPreview';

const navStyle = isActive => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  borderRadius: 10, marginBottom: 2, textDecoration: 'none',
  color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
  background: isActive ? 'var(--nav-active)' : 'transparent',
  fontWeight: isActive ? 600 : 400, fontSize: 14,
  transition: 'all .15s',
});

const nav = [
  { to: '/',               icon: LayoutDashboard, label: 'Inicio',             mobileLabel: 'Inicio', exact: true },
  { to: '/prospecting',    icon: Building2,       label: 'Prospección diaria', mobileLabel: 'P. diaria' },
  { to: '/contacts',       icon: Users2,          label: 'Clientes',           mobileLabel: 'Clientes' },
  { to: '/followups',      icon: Milestone,       label: 'Seguimientos',       mobileLabel: 'Seguim.' },
  { to: '/activities',     icon: CalendarCheck,   label: 'Tareas y avisos',    mobileLabel: 'Tareas' },
  { to: '/communications', icon: FileText,        label: 'Plantillas',         mobileLabel: 'Plantillas' },
  { to: '/reports',        icon: BarChart2,       label: 'KPI',                mobileLabel: 'KPI' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const preview = useAdminPreview(user?.role === 'admin');
  const displayUser = preview || user;
  const effectiveRole = preview?.role || user?.role;
  const handleLogout = () => { clearAdminPreview(); logout(); navigate('/login'); };

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
      {/* Identidad personal — click para ir al perfil */}
      <NavLink className="sidebar-profile" to={preview ? `/team-workspaces/${preview.id}` : '/profile'} style={{ textDecoration:'none' }}>
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid #bfdcff', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.55)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,.2)', overflow:'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#173b60', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {displayUser?.role === 'setter'
                ? <span style={{fontSize:26,lineHeight:1}}>{getUserSymbol(displayUser)}</span>
                : displayUser?.avatar || displayUser?.role === 'admin'
                ? <img src={displayUser?.avatar || '/brand/leonardo-profile.jpg'} alt={displayUser?.name || 'Usuario'} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 22%'}}/>
                : (displayUser?.name?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div style={{ overflow: 'hidden', flex:1 }}>
              <p style={{ color: '#173b60', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUser?.name}</p>
              <p style={{ color: '#52708d', fontSize: 11 }}>{displayUser?.role === 'admin' ? 'CEO' : displayUser?.role === 'vendedor' ? 'Closer' : displayUser?.role === 'setter' ? 'Setter' : displayUser?.role}</p>
            </div>
            <UserCircle size={14} color="#6d89a3"/>
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {(effectiveRole === 'setter'
          ? nav.filter(item => ['/prospecting','/contacts','/closer-calendar','/setter-commissions','/chat'].includes(item.to))
          : nav.filter(item => (!item.adminOnly || effectiveRole === 'admin') && (!item.roles || item.roles.includes(effectiveRole)))
        ).map(({ to, icon: Icon, label, mobileLabel, exact }) => (
          <NavLink key={to} to={to} end={exact}
            style={({ isActive }) => navStyle(isActive)}>
            <Icon size={17}/>
            <span className="nav-label-desktop">{label}</span>
            <span className="nav-label-mobile">{mobileLabel}</span>
          </NavLink>
        ))}

        {/* Admin-only links */}
        {!preview && (user?.role === 'admin' || user?.role === 'gerente') && (
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
              Copias de seguridad
            </NavLink>
            <NavLink to="/admin"
              style={({ isActive }) => navStyle(isActive)}>
              <Settings size={17}/>
              Administración
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
