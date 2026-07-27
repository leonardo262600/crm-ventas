import React, { useEffect, useState, useRef } from 'react';
import { Plus, X, Mail, Phone, MessageSquare, FileText, Send, Hash, Circle, Copy } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { FOLLOWUP_PHASES, NO_SHOW_PHASES } from '../utils/followupPhases';

const TABS = ['emails','llamadas','plantillas'];
const TAB_LABELS = { emails:'Emails', llamadas:'Llamadas', plantillas:'Plantillas', chat:'Chat' };

const DEFAULT_ROOMS = ['general','ventas','soporte'];
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/api\/?$/, '');

/* ─── Chat sub-component ──────────────────────────────────── */
function ChatPanel() {
  const { user } = useAuth();
  const [socket, setSocket]     = useState(null);
  const [rooms, setRooms]       = useState([]);
  const [room, setRoom]         = useState('general');
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [typing, setTyping]     = useState([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  /* connect socket once */
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('room_history', msgs => setMessages(msgs));

    s.on('new_message', msg =>
      setMessages(prev => [...prev, msg])
    );

    s.on('user_typing', ({ user_name, isTyping }) =>
      setTyping(prev =>
        isTyping
          ? [...new Set([...prev, user_name])]
          : prev.filter(u => u !== user_name)
      )
    );

    setSocket(s);
    return () => s.disconnect();
  }, []);

  /* load rooms list */
  useEffect(() => {
    api.get('/chat/rooms')
       .then(r => setRooms(r.data))
       .catch(() => setRooms(DEFAULT_ROOMS.map(r => ({ room: r, messages: 0, last_message: null }))));
  }, []);

  /* join room on change */
  useEffect(() => {
    if (!socket) return;
    setMessages([]);
    socket.emit('join_room', { room });
  }, [room, socket]);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = e => {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit('send_message', { room, message: text.trim() });
    setText('');
    // stop typing indicator
    socket.emit('typing', { room, isTyping: false });
    clearTimeout(typingTimer.current);
  };

  const handleTyping = e => {
    setText(e.target.value);
    if (!socket) return;
    socket.emit('typing', { room, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { room, isTyping: false });
    }, 1500);
  };

  const roomIcon = r => {
    if (r === 'ventas') return '💼';
    if (r === 'soporte') return '🛠';
    return '#';
  };

  return (
    <div style={{ display:'flex', height:520, borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0' }}>

      {/* Sidebar rooms */}
      <div style={{ width:200, background:'#1e293b', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'16px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <p style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.8 }}>Canales</p>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 6px' }}>
          {(rooms.length ? rooms : DEFAULT_ROOMS.map(r => ({ room: r }))).map(r => (
            <button
              key={r.room}
              onClick={() => setRoom(r.room)}
              style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer',
                background: room === r.room ? 'rgba(15,118,110,.6)' : 'transparent',
                color: room === r.room ? '#fff' : 'rgba(255,255,255,.55)',
                fontSize:13, fontWeight: room === r.room ? 600 : 400,
                transition:'all .15s', textAlign:'left',
              }}
            >
              <span style={{ fontSize:14 }}>{roomIcon(r.room)}</span>
              {r.room}
              {r.messages > 0 && room !== r.room && (
                <span style={{ marginLeft:'auto', fontSize:10, background:'#0f766e', color:'#fff', borderRadius:10, padding:'1px 6px' }}>
                  {r.messages}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Connection status */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', gap:6 }}>
          <Circle size={8} fill={connected?'#10b981':'#ef4444'} color={connected?'#10b981':'#ef4444'}/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{connected?'Conectado':'Desconectado'}</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#fff' }}>
        {/* Channel header */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
          <Hash size={16} color="#64748b"/>
          <span style={{ fontWeight:700, fontSize:15 }}>{room}</span>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:2 }}>
          {messages.length === 0 && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
              <MessageSquare size={40} strokeWidth={1.5}/>
              <p style={{ marginTop:10, fontSize:14 }}>Sé el primero en escribir en <strong>#{room}</strong></p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.user_id === user?.id || msg.user_name === user?.name;
            const prevMsg = messages[i - 1];
            const sameUser = prevMsg && (prevMsg.user_id === msg.user_id);
            const ts = msg.created_at ? format(new Date(msg.created_at), 'HH:mm', { locale:es }) : '';

            return (
              <div key={msg.id || i} style={{
                display:'flex', gap:10, alignItems:'flex-end',
                flexDirection: isMine ? 'row-reverse' : 'row',
                marginTop: sameUser ? 2 : 10,
              }}>
                {/* Avatar */}
                {!sameUser && (
                  <div style={{
                    width:32, height:32, borderRadius:'50%', flexShrink:0,
                    background: isMine ? '#0f766e' : '#6366f1',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:700, fontSize:13,
                  }}>
                    {(msg.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                {sameUser && <div style={{ width:32, flexShrink:0 }}/>}

                <div style={{ maxWidth:'65%' }}>
                  {!sameUser && (
                    <p style={{ fontSize:11, color:'#94a3b8', marginBottom:3, paddingLeft: isMine ? 0 : 4, textAlign: isMine ? 'right' : 'left' }}>
                      {isMine ? 'Tú' : msg.user_name}
                    </p>
                  )}
                  <div style={{
                    padding:'8px 12px',
                    background: isMine ? '#0f766e' : '#f1f5f9',
                    color: isMine ? '#fff' : '#1e293b',
                    borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    fontSize:13, lineHeight:1.5, wordBreak:'break-word',
                  }}>
                    {msg.message}
                  </div>
                  <p style={{ fontSize:10, color:'#cbd5e1', marginTop:3, textAlign: isMine ? 'right' : 'left', paddingLeft:4, paddingRight:4 }}>
                    {ts}
                  </p>
                </div>
              </div>
            );
          })}
          {/* Typing indicator */}
          {typing.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'#94a3b8', fontSize:12, paddingLeft:42, marginTop:4 }}>
              <div style={{ display:'flex', gap:3 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:6, height:6, borderRadius:'50%', background:'#94a3b8',
                    animation:'bounce .8s infinite', animationDelay:`${i*0.15}s`,
                  }}/>
                ))}
              </div>
              <span>{typing.join(', ')} {typing.length === 1 ? 'está escribiendo' : 'están escribiendo'}...</span>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ padding:'12px 16px', borderTop:'1px solid #f1f5f9', display:'flex', gap:8 }}>
          <input
            className="input"
            value={text}
            onChange={handleTyping}
            placeholder={`Mensaje en #${room}...`}
            style={{ flex:1, margin:0 }}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim()} style={{ padding:'0 16px' }}>
            <Send size={15}/>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Communications page ───────────────────────────── */
export default function Communications() {
  const [searchParams] = useSearchParams();
  const [tab, setTab]           = useState(searchParams.get('tab') || 'emails');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'post_demo');
  const [selectedPhase, setSelectedPhase] = useState(Number(searchParams.get('phase') || 0));
  const [emails, setEmails]     = useState([]);
  const [calls, setCalls]       = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [editId, setEditId]     = useState(null);

  const load = async () => {
    const [e, c, t] = await Promise.all([
      api.get('/communications/emails').catch(() => ({ data:[] })),
      api.get('/communications/calls').catch(() => ({ data:[] })),
      api.get('/communications/templates').catch(() => ({ data:[] })),
    ]);
    setEmails(e.data); setCalls(c.data); setTemplates(t.data);
  };

  useEffect(() => {
    load();
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {});
  }, []);

  const openEmail    = () => { setForm({ contact_id:'', subject:'', body:'', template_id:'' }); setModal('email'); };
  const openCall     = () => { setForm({ contact_id:'', direction:'outbound', duration:'', notes:'', called_at:'' }); setModal('call'); };
  const openTemplate = (t = null) => { setForm(t || { name:'', subject:'', body:'', channel:'email', phase:selectedPhase, summary:'', category:selectedCategory }); setEditId(t?.id||null); setModal('template'); };

  const saveEmail = async e => {
    e.preventDefault();
    try { await api.post('/communications/emails', form); toast.success('Email registrado'); setModal(null); load(); }
    catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const saveCall = async e => {
    e.preventDefault();
    try { await api.post('/communications/calls', form); toast.success('Llamada registrada'); setModal(null); load(); }
    catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const saveTemplate = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/communications/templates/${editId}`, form); toast.success('Plantilla actualizada'); }
      else        { await api.post('/communications/templates', form); toast.success('Plantilla creada'); }
      setModal(null); load();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const delTemplate = async id => {
    if (!confirm('¿Eliminar plantilla?')) return;
    await api.delete(`/communications/templates/${id}`);
    toast.success('Eliminada'); load();
  };

  const applyTemplate = id => {
    const t = templates.find(t => t.id === Number(id));
    if (t) setForm(f => ({ ...f, subject: t.subject, body: t.body }));
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Comunicaciones</h1><p>Emails, llamadas, chat y plantillas</p></div>
        {tab !== 'chat' && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary" onClick={openCall}><Phone size={16}/>Reg. llamada</button>
            <button className="btn btn-primary" onClick={openEmail}><Mail size={16}/>Reg. email</button>
          </div>
        )}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t === 'chat' && <MessageSquare size={14} style={{ marginRight:4 }}/>}
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Emails ── */}
      {tab === 'emails' && (
        <div className="card">
          {emails.length === 0 ? (
            <div className="empty-state"><Mail size={48}/><h3>Sin emails registrados</h3></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {emails.map(e => (
                <div key={e.id} style={{ padding:'14px 16px', background:'#f8fafc', borderRadius:10, borderLeft:'4px solid #3B82F6' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <p style={{ fontWeight:600 }}>{e.subject}</p>
                      <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                        <strong>Para:</strong> {e.contact_name||e.contact_id} · <strong>De:</strong> {e.user_name}
                      </p>
                      {e.body && <p style={{ fontSize:13, marginTop:6, color:'#475569', maxWidth:600 }}>{e.body.slice(0,120)}{e.body.length>120?'...':''}</p>}
                    </div>
                    <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0, marginLeft:16 }}>
                      {e.created_at ? format(new Date(e.created_at),'dd MMM yyyy HH:mm',{locale:es}) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Llamadas ── */}
      {tab === 'llamadas' && (
        <div className="card">
          {calls.length === 0 ? (
            <div className="empty-state"><Phone size={48}/><h3>Sin llamadas registradas</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Contacto</th><th>Dirección</th><th>Duración</th><th>Notas</th><th>Fecha</th><th>Usuario</th></tr></thead>
                <tbody>
                  {calls.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight:500 }}>{c.contact_name||'—'}</td>
                      <td><span className={`badge ${c.direction==='inbound'?'badge-blue':'badge-green'}`}>{c.direction==='inbound'?'Entrante':'Saliente'}</span></td>
                      <td>{c.duration ? `${c.duration} min` : '—'}</td>
                      <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.notes||'—'}</td>
                      <td style={{ fontSize:12, color:'#64748b' }}>{c.called_at?format(new Date(c.called_at),'dd/MM/yyyy HH:mm'):'—'}</td>
                      <td>{c.user_name||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Plantillas ── */}
      {tab === 'plantillas' && (
        <div>
          <div className="card" style={{ marginBottom:16, background:'linear-gradient(135deg,#eff6ff,#f8fafc)' }}>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button className={`btn btn-sm ${selectedCategory==='post_demo'?'btn-primary':'btn-secondary'}`} onClick={()=>{setSelectedCategory('post_demo');setSelectedPhase(0);}}>Después de la demo</button>
              <button className={`btn btn-sm ${selectedCategory==='no_show'?'btn-primary':'btn-secondary'}`} onClick={()=>{setSelectedCategory('no_show');setSelectedPhase(0);}}>No Show</button>
            </div>
            <h3 style={{marginBottom:6}}>{selectedCategory === 'no_show' ? 'Cadencia para reagendar un No Show' : 'Cadencia de seguimiento después de la demo'}</h3>
            <p style={{fontSize:13,color:'#475569'}}>Elige la fase, adapta las variables entre llaves y copia el mensaje. El CRM no envía nada automáticamente.</p>
            <div className="tabs" style={{marginTop:14,marginBottom:0,overflowX:'auto'}}>
              {(selectedCategory === 'no_show' ? NO_SHOW_PHASES : FOLLOWUP_PHASES).map(phase => <button key={phase.value} className={`tab ${selectedPhase===phase.value?'active':''}`} onClick={()=>setSelectedPhase(phase.value)}>{phase.timing} · {selectedCategory === 'no_show' ? 'Intento' : 'Fase'} {phase.value}</button>)}
            </div>
            {(() => {
              const phase = (selectedCategory === 'no_show' ? NO_SHOW_PHASES : FOLLOWUP_PHASES).find(p => p.value === selectedPhase);
              return phase && <p style={{fontSize:13,marginTop:12}}><strong>{phase.label}:</strong> {phase.summary}</p>;
            })()}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary" onClick={() => openTemplate()}><Plus size={16}/>Nueva plantilla</button>
          </div>
          {templates.length === 0 ? (
            <div className="card"><div className="empty-state"><FileText size={48}/><h3>Sin plantillas</h3></div></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {templates.filter(t => (t.category || 'post_demo') === selectedCategory && Number(t.phase || 0) === selectedPhase).map(t => (
                <div key={t.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div><span className={`badge ${t.channel==='whatsapp'?'badge-green':'badge-blue'}`}>{t.channel==='whatsapp'?'WhatsApp':'Correo'}</span><h4 style={{ fontWeight:600, marginTop:7 }}>{t.name}</h4></div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn-icon" onClick={() => openTemplate(t)}>✏</button>
                      <button className="btn-icon" style={{ color:'#ef4444' }} onClick={() => delTemplate(t.id)}><X size={14}/></button>
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:'#64748b', fontWeight:500 }}>{t.subject}</p>
                  {t.summary && <p style={{fontSize:12,color:'#475569',marginTop:7}}><strong>Cómo usarla:</strong> {t.summary}</p>}
                  <p style={{ fontSize:12, color:'#94a3b8', marginTop:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{t.body?.slice(0,180)}...</p>
                  <button className="btn btn-secondary btn-sm" style={{marginTop:12}} onClick={()=>{navigator.clipboard.writeText([t.subject,t.body].filter(Boolean).join('\n\n'));toast.success('Plantilla copiada');}}><Copy size={14}/>Copiar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Chat ── */}
      {tab === 'chat' && <ChatPanel/>}

      {/* Email modal */}
      {modal === 'email' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{ maxWidth:580 }}>
            <div className="modal-header"><h3>Registrar email</h3><button className="btn-icon" onClick={() => setModal(null)}><X size={18}/></button></div>
            <form onSubmit={saveEmail}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Contacto</label>
                    <select className="input" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id:e.target.value }))} required>
                      <option value="">Seleccionar</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Usar plantilla</label>
                    <select className="input" onChange={e => applyTemplate(e.target.value)}>
                      <option value="">Sin plantilla</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="input-group"><label>Asunto *</label><input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject:e.target.value }))} required/></div>
                <div className="input-group"><label>Cuerpo</label><textarea className="input" rows={6} value={form.body} onChange={e => setForm(f => ({ ...f, body:e.target.value }))} style={{ resize:'vertical', fontFamily:'monospace', fontSize:13 }}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Send size={14}/>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call modal */}
      {modal === 'call' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header"><h3>Registrar llamada</h3><button className="btn-icon" onClick={() => setModal(null)}><X size={18}/></button></div>
            <form onSubmit={saveCall}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Contacto *</label>
                    <select className="input" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id:e.target.value }))} required>
                      <option value="">Seleccionar</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Dirección</label>
                    <select className="input" value={form.direction} onChange={e => setForm(f => ({ ...f, direction:e.target.value }))}>
                      <option value="outbound">Saliente</option>
                      <option value="inbound">Entrante</option>
                    </select>
                  </div>
                  <div className="input-group"><label>Duración (min)</label><input className="input" type="number" min="0" value={form.duration} onChange={e => setForm(f => ({ ...f, duration:e.target.value }))}/></div>
                  <div className="input-group"><label>Fecha y hora</label><input className="input" type="datetime-local" value={form.called_at} onChange={e => setForm(f => ({ ...f, called_at:e.target.value }))}/></div>
                </div>
                <div className="input-group"><label>Notas</label><textarea className="input" rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))} style={{ resize:'vertical' }}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template modal */}
      {modal === 'template' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{ maxWidth:580 }}>
            <div className="modal-header"><h3>{editId?'Editar plantilla':'Nueva plantilla'}</h3><button className="btn-icon" onClick={() => setModal(null)}><X size={18}/></button></div>
            <form onSubmit={saveTemplate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Tipo de seguimiento</label><select className="input" value={form.category || 'post_demo'} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option value="post_demo">Después de la demo</option><option value="no_show">No Show</option></select></div>
                  <div className="input-group"><label>Fase</label><select className="input" value={form.phase ?? 0} onChange={e=>setForm(f=>({...f,phase:Number(e.target.value)}))}>{(form.category==='no_show'?NO_SHOW_PHASES:FOLLOWUP_PHASES).map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                  <div className="input-group"><label>Canal</label><select className="input" value={form.channel || 'email'} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}><option value="email">Correo</option><option value="whatsapp">WhatsApp</option></select></div>
                </div>
                <div className="input-group"><label>Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} required/></div>
                <div className="input-group"><label>Resumen de uso</label><input className="input" value={form.summary || ''} onChange={e => setForm(f => ({ ...f, summary:e.target.value }))}/></div>
                <div className="input-group"><label>Asunto</label><input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject:e.target.value }))}/></div>
                <div className="input-group"><label>Cuerpo</label><textarea className="input" rows={8} value={form.body} onChange={e => setForm(f => ({ ...f, body:e.target.value }))} style={{ resize:'vertical', fontFamily:'monospace', fontSize:13 }} placeholder="Usa {{nombre}}, {{empresa}} como variables"/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
