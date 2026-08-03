import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users2, Target, CalendarCheck, CalendarClock,
  BarChart2, Users, LogOut,
  MessageSquare, Settings, UserCircle, SlidersHorizontal, DatabaseBackup, Building2,
  Milestone, FileText, PhoneCall, BadgeEuro, CalendarDays
} from 'lucide-react';
import api from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { playChatSound } from '../../utils/pushNotifications';
import { getUserSymbol } from '../../utils/userAvatar';
import { clearAdminPreview, useAdminPreview } from '../../utils/adminPreview';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/api\/?$/, '');

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
  { to: '/contacts',       icon: Users2,          label: 'Contactos',          mobileLabel: 'Contactos' },
  { to: '/opportunities',  icon: Target,          label: 'Oportunidades',      mobileLabel: 'Oportun.' },
  { to: '/demos',          icon: CalendarClock,   label: 'Centro de demos',    mobileLabel: 'Demos' },
  { to: '/followups',      icon: Milestone,       label: 'Seguimientos',       mobileLabel: 'Seguim.' },
  { to: '/activities',     icon: CalendarCheck,   label: 'Tareas diarias',     mobileLabel: 'T. diarias' },
  { to: '/prospecting',    icon: Building2,       label: 'Prospección diaria', mobileLabel: 'P. diaria' },
  { to: '/my-calls',       icon: PhoneCall,       label: 'Mis llamadas',       mobileLabel: 'Mis llamadas', adminOnly: true },
  { to: '/closer-calendar', icon: CalendarDays,   label: 'Calendario de demos', mobileLabel: 'Calendario' },
  { to: '/setter-commissions', icon: BadgeEuro,    label: 'Comisiones Setter',  mobileLabel: 'Comisiones', roles:['admin','gerente','setter'] },
  { to: '/chat',           icon: MessageSquare,   label: 'Chat',               mobileLabel: 'Chat' },
  { to: '/communications', icon: FileText,        label: 'Plantillas',         mobileLabel: 'Plantillas' },
  { to: '/reports',        icon: BarChart2,       label: 'KPI',                mobileLabel: 'KPI' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const preview = useAdminPreview(user?.role === 'admin');
  const displayUser = preview || user;
  const effectiveRole = preview?.role || user?.role;
  const [chatUnread, setChatUnread] = useState(0);
  const handleLogout = () => { clearAdminPreview(); logout(); navigate('/login'); };
  useEffect(() => {
    const refresh = () => api.get('/chat/unread-count').then(({data})=>setChatUnread(data.unread || 0)).catch(()=>{});
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth:{ token:localStorage.getItem('crm_token') },
      transports:['polling','websocket'],
    });
    socket.on('chat_notification', message => {
      if (Number(message.user_id) === Number(user?.id)) return;
      setChatUnread(current => current + 1);
      if (window.location.pathname !== '/chat' && document.visibilityState === 'visible') {
        playChatSound();
        toast(`${message.user_name}: ${message.message}`, { icon:'💬', duration:5000 });
      }
    });
    return () => socket.disconnect();
  }, [user?.id]);

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
      <NavLink className="sidebar-profile" to={preview ? `/team-workspaces/${preview.id}` : '/profile'} style={{ textDecoration:'none' }}>
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
              {displayUser?.role === 'setter'
                ? <span style={{fontSize:26,lineHeight:1}}>{getUserSymbol(displayUser)}</span>
                : displayUser?.avatar || displayUser?.role === 'admin'
                ? <img src={displayUser?.avatar || '/brand/leonardo-profile.jpg'} alt={displayUser?.name || 'Usuario'} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 22%'}}/>
                : (displayUser?.name?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div style={{ overflow: 'hidden', flex:1 }}>
              <p style={{ color: '#173b60', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUser?.name}</p>
              <p style={{ color: '#52708d', fontSize: 11 }}>{displayUser?.role === 'admin' ? 'Asesor' : displayUser?.role === 'vendedor' ? 'Closer' : displayUser?.role === 'setter' ? 'Setter' : displayUser?.role}</p>
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
            {to==='/chat' && chatUnread>0 && <span className="sidebar-chat-badge">{chatUnread>99?'99+':chatUnread}</span>}
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
