import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const ref = useRef();

  useEffect(() => {
    api.get('/activities', { params: { status: 'pendiente' } })
      .then(r => setUpcoming(r.data.slice(0, 5)))
      .catch(() => {});
  }, []);

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
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowNotif(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path) => { navigate(path); setQuery(''); setOpen(false); };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#fff', borderBottom: '1px solid #e2e8f0',
      padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {/* Search */}
      <div ref={ref} style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
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
      </div>

      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        {/* Notifications */}
        <div style={{ position:'relative' }} ref={null}>
          <button className="btn-icon" onClick={() => { setShowNotif(v => !v); setOpen(false); }} style={{ position:'relative' }}>
            <Bell size={18}/>
            {upcoming.length > 0 && (
              <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {upcoming.length}
              </span>
            )}
          </button>
          {showNotif && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:300, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,.12)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontWeight:600, fontSize:14 }}>Actividades pendientes</p>
                <span className="badge badge-red">{upcoming.length}</span>
              </div>
              {upcoming.map(a => (
                <div key={a.id} style={{ padding:'10px 16px', borderBottom:'1px solid #f8fafc', cursor:'pointer' }}
                  onClick={() => { go('/activities'); setShowNotif(false); }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <p style={{ fontWeight:500, fontSize:13 }}>{a.title}</p>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{a.type} · {a.contact_name || 'Sin contacto'}</p>
                </div>
              ))}
              {!upcoming.length && <p style={{ padding:16, fontSize:13, color:'#94a3b8', textAlign:'center' }}>Sin actividades pendientes</p>}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:10, background:'#f8fafc' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0f766e,#134e4a)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight:600, fontSize:13, lineHeight:1.2 }}>{user?.name}</p>
            <p style={{ fontSize:10, color:'#64748b', textTransform:'capitalize' }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
