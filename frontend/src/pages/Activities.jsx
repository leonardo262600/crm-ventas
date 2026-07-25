import React, { useEffect, useState } from 'react';
import { Plus, X, CheckCircle, Clock, Phone, Mail, Calendar, Users2, List, CalendarDays } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ActivityCalendar from '../components/ActivityCalendar';

const TYPES = ['tarea','reunion','llamada','email','recordatorio'];
const TYPE_ICON = { tarea: Clock, reunion: Users2, llamada: Phone, email: Mail, recordatorio: Calendar };
const TYPE_COLOR = { tarea:'#3B82F6', reunion:'#8B5CF6', llamada:'#10B981', email:'#F59E0B', recordatorio:'#EF4444' };
const empty = { title:'', type:'tarea', description:'', scheduled_at:'', due_at:'', contact_id:'', opportunity_id:'', assigned_to:'' };

export default function Activities() {
  const [acts, setActs]       = useState([]);
  const [contacts, setContacts] = useState([]);
  const [opps, setOpps]       = useState([]);
  const [users, setUsers]     = useState([]);
  const [filter, setFilter]   = useState('pendiente');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(empty);
  const [editId, setEditId]   = useState(null);

  // All activities (for calendar; no status filter)
  const [allActs, setAllActs] = useState([]);

  const load = () =>
    api.get('/activities', { params: filter !== 'all' ? { status: filter } : {} })
       .then(r => setActs(r.data));

  const loadAll = () =>
    api.get('/activities').then(r => setAllActs(r.data)).catch(() => {});

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    loadAll();
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {});
    api.get('/opportunities').then(r => setOpps(r.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  // Pre-fill scheduled_at when clicking a calendar day
  const openNew = (defaultDate = null) => {
    const dateStr = defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : '';
    setForm({ ...empty, scheduled_at: dateStr });
    setEditId(null);
    setModal(true);
  };

  const openEdit = a => {
    setForm({
      ...a,
      contact_id: a.contact_id || '',
      opportunity_id: a.opportunity_id || '',
      assigned_to: a.assigned_to || '',
      scheduled_at: a.scheduled_at ? a.scheduled_at.slice(0, 16) : '',
      due_at: a.due_at ? a.due_at.slice(0, 16) : '',
    });
    setEditId(a.id);
    setModal(true);
  };

  const save = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/activities/${editId}`, form); toast.success('Actualizado'); }
      else        { await api.post('/activities', form); toast.success('Actividad creada'); }
      setModal(false);
      load();
      loadAll();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const complete = async id => {
    await api.patch(`/activities/${id}/complete`);
    toast.success('Completada');
    load(); loadAll();
  };

  const del = async id => {
    if (!confirm('¿Eliminar actividad?')) return;
    await api.delete(`/activities/${id}`);
    toast.success('Eliminada');
    load(); loadAll();
  };

  const statusBadge = s =>
    s === 'completada' ? 'badge-green' : s === 'cancelada' ? 'badge-red' : 'badge-yellow';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Actividades</h1>
          <p>Tareas, reuniones y seguimiento</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* View toggle */}
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:2 }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: viewMode==='list' ? '#fff' : 'transparent',
                color: viewMode==='list' ? '#0f766e' : '#64748b',
                boxShadow: viewMode==='list' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition:'all .15s',
              }}
            >
              <List size={15}/> Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: viewMode==='calendar' ? '#fff' : 'transparent',
                color: viewMode==='calendar' ? '#0f766e' : '#64748b',
                boxShadow: viewMode==='calendar' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition:'all .15s',
              }}
            >
              <CalendarDays size={15}/> Calendario
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => openNew()}>
            <Plus size={16}/>Nueva actividad
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <>
          <div className="tabs">
            {[['pendiente','Pendientes'],['completada','Completadas'],['all','Todas']].map(([v,l]) => (
              <button key={v} className={`tab ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>

          <div className="card">
            {acts.length === 0 ? (
              <div className="empty-state"><Clock size={48}/><h3>Sin actividades</h3></div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {acts.map(a => {
                  const Icon  = TYPE_ICON[a.type] || Clock;
                  const color = TYPE_COLOR[a.type] || '#3B82F6';
                  return (
                    <div key={a.id} style={{
                      display:'flex', gap:14, padding:'14px 16px',
                      background:'#f8fafc', borderRadius:10, alignItems:'flex-start',
                      borderLeft:`4px solid ${color}`,
                    }}>
                      <div style={{ background:`${color}18`, borderRadius:8, padding:8, flexShrink:0 }}>
                        <Icon size={18} color={color}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:600, fontSize:14 }}>{a.title}</span>
                          <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                          <span className="badge badge-gray">{a.type}</span>
                        </div>
                        <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>
                          {a.contact_name && `Cliente: ${a.contact_name} · `}
                          {a.opp_title    && `Oport: ${a.opp_title} · `}
                          {a.assigned_name && `Asignado: ${a.assigned_name}`}
                        </p>
                        {a.scheduled_at && (
                          <p style={{ fontSize:12, color:'#94a3b8', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                            <Calendar size={12}/>
                            {format(new Date(a.scheduled_at), "dd MMM yyyy HH:mm", { locale:es })}
                          </p>
                        )}
                        {a.description && (
                          <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{a.description}</p>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        {a.status === 'pendiente' && (
                          <button className="btn-icon" style={{ color:'#10b981' }}
                            onClick={() => complete(a.id)} title="Completar">
                            <CheckCircle size={16}/>
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => openEdit(a)} title="Editar">✏</button>
                        <button className="btn-icon" style={{ color:'#ef4444' }}
                          onClick={() => del(a.id)} title="Eliminar"><X size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="card">
          <ActivityCalendar
            activities={allActs}
            onDayClick={day => openNew(day)}
            onEventClick={a => openEdit(a)}
          />
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar actividad' : 'Nueva actividad'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group" style={{ gridColumn:'1/-1' }}>
                    <label>Título *</label>
                    <input className="input" value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required/>
                  </div>
                  <div className="input-group">
                    <label>Tipo</label>
                    <select className="input" value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Fecha programada</label>
                    <input className="input" type="datetime-local" value={form.scheduled_at}
                      onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}/>
                  </div>
                  <div className="input-group">
                    <label>Contacto</label>
                    <select className="input" value={form.contact_id}
                      onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
                      <option value="">Sin contacto</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Oportunidad</label>
                    <select className="input" value={form.opportunity_id}
                      onChange={e => setForm(f => ({ ...f, opportunity_id: e.target.value }))}>
                      <option value="">Sin oportunidad</option>
                      {opps.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Asignar a</label>
                    <select className="input" value={form.assigned_to}
                      onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  {editId && (
                    <div className="input-group">
                      <label>Estado</label>
                      <select className="input" value={form.status || 'pendiente'}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="pendiente">Pendiente</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>Descripción</label>
                  <textarea className="input" rows={3} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize:'vertical' }}/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
