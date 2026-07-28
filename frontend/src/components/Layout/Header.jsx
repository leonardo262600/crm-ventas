import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Moon, Sun, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getUserSymbol } from '../../utils/userAvatar';

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('crm_theme') === 'dark' ? 'dark' : 'light');
  const ref = useRef();
  const notificationRef = useRef();
  const isSetter = user?.role === 'setter';

  useEffect(() => {
    if (isSetter) return undefined;
    const loadNotifications = () => Promise.all([
      api.get('/activities', { params: { status: 'pendiente' } }),
      api.get('/activities/followups'),
    ]).then(([a, f]) => {
      setUpcoming(a.data);
      setOverdue(f.data.filter(item => item.followup_status === 'vencido'));
    }).catch(() => {});
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [isSetter]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const [c, o] = await Promise.all([
          api.get('/contacts', { params: { search: query } }),
          api.get('/opportunities'),
        ]);
        const opps = o.data.filter(op => op.title.toLowerCase().includes(query.toLowerCase()));
        setResults({ contacts: c.data.slice(0, 4), opportunities: opps.slice(0, 4) });
        setOpen(true);
      } catch { setResults(null); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path) => { navigate(path); setQuery(''); setOpen(false); };
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('crm_theme', next);
    document.documentElement.dataset.theme = next;
  };
  const removeTask = async (event, activity) => {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el aviso "${activity.title}"?`)) return;
    try {
      await api.delete(`/activities/${activity.id}`);
      setUpcoming(current => current.filter(item => item.id !== activity.id));
      toast.success('Aviso eliminado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar el aviso');
    }
  };

  return (
    <header className="app-header" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--header-bg)', borderBottom: '1px solid var(--border)',
      padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {/* Search */}
      {!isSetter && <div className="header-search" ref={ref} style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input
            className="input"
            placeholder="Buscar contactos, oportunidades..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results && setOpen(true)}
            style={{ paddingLeft: 38, paddingRight: query ? 36 : 12 }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
              <X size={14}/>
            </button>
          )}
        </div>

        {open && results && (
          <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,.12)', zIndex:200, overflow:'hidden' }}>
            {results.contacts.length > 0 && (
              <div>
                <p style={{ padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>Contactos</p>
                {results.contacts.map(c => (
                  <div key={c.id} onClick={() => go('/contacts')} style={{ padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0f766e,#134e4a)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight:500, fontSize:13 }}>{c.name}</p>
                      <p style={{ fontSize:11, color:'#94a3b8' }}>{c.company || c.email || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {results.opportunities.length > 0 && (
              <div>
                <p style={{ padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, background:'#f8fafc', borderBottom:'1px solid #f1f5f9', borderTop:'1px solid #f1f5f9' }}>Oportunidades</p>
                {results.opportunities.map(o => (
                  <div key={o.id} onClick={() => go('/opportunities')} style={{ padding:'10px 14px', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <p style={{ fontWeight:500, fontSize:13 }}>{o.title}</p>
                    <p style={{ fontSize:11, color:'#94a3b8' }}>{o.stage_name} · {o.contact_name || '—'}</p>
                  </div>
                ))}
              </div>
            )}
            {results.contacts.length === 0 && results.opportunities.length === 0 && (
              <p style={{ padding:'16px 14px', fontSize:13, color:'#94a3b8', textAlign:'center' }}>Sin resultados para "{query}"</p>
            )}
          </div>
        )}
      </div>}

      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        <button
          className="btn-icon theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
        >
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        {/* Notifications */}
        {!isSetter && <div style={{ position:'relative' }} ref={notificationRef}>
          <button className="btn-icon" onClick={() => { setShowNotif(v => !v); setOpen(false); }} style={{ position:'relative' }}>
            <Bell size={18}/>
            {(upcoming.length + overdue.length) > 0 && (
              <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {Math.min(upcoming.length + overdue.length, 99)}
              </span>
            )}
          </button>
          {showNotif && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:300, maxHeight:'70vh', overflowY:'auto', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,.12)', zIndex:200 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontWeight:600, fontSize:14 }}>Avisos del CRM</p>
                <span className="badge badge-red">{upcoming.length + overdue.length}</span>
              </div>
              {overdue.length > 0 && <p style={{padding:'8px 16px',fontSize:11,fontWeight:700,color:'#dc2626',background:'#fef2f2'}}>SEGUIMIENTOS ATRASADOS ({overdue.length})</p>}
              {overdue.slice(0,5).map(item => <div key={`fu-${item.id}`} style={{padding:'10px 16px',borderBottom:'1px solid #fee2e2',cursor:'pointer'}} onClick={()=>{go('/followups');setShowNotif(false);}}><p style={{fontWeight:600,fontSize:13,color:'#b91c1c'}}>{item.company || item.title}</p><p style={{fontSize:11,color:'#64748b',marginTop:2}}>Fase {item.followup_phase ?? 0} · {item.next_action || 'Seguimiento pendiente'}</p></div>)}
              {upcoming.length > 0 && <p style={{padding:'8px 16px',fontSize:11,fontWeight:700,color:'#64748b',background:'#f8fafc'}}>TAREAS PENDIENTES</p>}
              {upcoming.map(a => (
                <div key={a.id} style={{ padding:'10px 12px 10px 16px', borderBottom:'1px solid #f8fafc', cursor:'pointer', display:'flex', gap:8, alignItems:'center' }}
                  onClick={() => { go('/activities'); setShowNotif(false); }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:500, fontSize:13 }}>{a.title}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{a.type} · {a.contact_name || 'Sin contacto'}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    title="Eliminar aviso"
                    onClick={event => removeTask(event, a)}
                    style={{ color:'#ef4444', flexShrink:0 }}
                  >
                    <X size={14}/>
                  </button>
                </div>
              ))}
              {!upcoming.length && !overdue.length && <p style={{ padding:16, fontSize:13, color:'#94a3b8', textAlign:'center' }}>Todo al día</p>}
            </div>
          )}
        </div>}

        {/* User avatar */}
        <div className="header-user" style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:10, background:'#f8fafc' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', background:'#e3e9f7', display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#173b60' }}>
            {user?.role === 'setter'
              ? <span style={{fontSize:22,lineHeight:1}}>{getUserSymbol(user)}</span>
              : user?.avatar || user?.role === 'admin'
              ? <img src={user?.avatar || '/brand/leonardo-profile.jpg'} alt={user?.name || 'Usuario'} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 22%'}}/>
              : (user?.name?.charAt(0).toUpperCase() || 'U')}
          </div>
          <div>
            <p style={{ fontWeight:600, fontSize:13, lineHeight:1.2 }}>{user?.name}</p>
            <p style={{ fontSize:10, color:'#64748b' }}>{user?.role === 'admin' ? 'Asesor' : user?.role === 'vendedor' ? 'Vendedor' : user?.role === 'setter' ? 'Setter' : user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
