import React, { useEffect, useState } from 'react';
import { Plus, X, Zap, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TRIGGERS = [
  { value: 'opportunity_created',      label: 'Oportunidad creada' },
  { value: 'opportunity_stage_changed',label: 'Etapa de oportunidad cambiada' },
  { value: 'contact_created',          label: 'Contacto creado' },
  { value: 'activity_due',             label: 'Actividad vencida' },
  { value: 'quote_approved',           label: 'Cotización aprobada' },
];

const ACTIONS = [
  { value: 'create_activity', label: 'Crear actividad' },
  { value: 'send_email',      label: 'Enviar email' },
  { value: 'assign_user',     label: 'Asignar usuario' },
  { value: 'change_stage',    label: 'Cambiar etapa' },
];

const empty = { name: '', trigger_type: 'opportunity_created', trigger_config: {}, action_type: 'create_activity', action_config: {} };

export default function Automations() {
  const [automations, setAutomations] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);

  const load = () => api.get('/automations').then(r => setAutomations(r.data));

  useEffect(() => {
    load();
    api.get('/opportunities/stages').then(r => setStages(r.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const openNew  = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = a => { setForm({ ...a, trigger_config: a.trigger_config||{}, action_config: a.action_config||{} }); setEditId(a.id); setModal(true); };

  const save = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/automations/${editId}`, form); toast.success('Actualizado'); }
      else        { await api.post('/automations', form); toast.success('Automatización creada'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const toggle = async id => {
    await api.patch(`/automations/${id}/toggle`);
    toast.success('Estado cambiado'); load();
  };

  const del = async id => {
    if (!confirm('¿Eliminar automatización?')) return;
    await api.delete(`/automations/${id}`); toast.success('Eliminada'); load();
  };

  const setAC = (key, val) => setForm(f => ({ ...f, action_config: { ...f.action_config, [key]: val } }));
  const setTC = (key, val) => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, [key]: val } }));

  const trigLabel  = v => TRIGGERS.find(t => t.value === v)?.label || v;
  const actionLabel = v => ACTIONS.find(a => a.value === v)?.label || v;

  return (
    <div>
      <div className="page-header">
        <div><h1>Automatizaciones</h1><p>Workflows automáticos por eventos</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16}/>Nueva automatización</button>
      </div>

      {automations.length === 0 ? (
        <div className="card"><div className="empty-state"><Zap size={48}/><h3>Sin automatizaciones</h3><p>Crea flujos automáticos para tu equipo</p></div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {automations.map(a => (
            <div key={a.id} className="card" style={{ display:'flex', alignItems:'center', gap:16, opacity: a.active ? 1 : 0.55 }}>
              <div style={{ background: a.active ? '#d1fae5' : '#f1f5f9', borderRadius:10, padding:10, flexShrink:0 }}>
                <Zap size={20} color={a.active ? '#10b981' : '#94a3b8'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:15 }}>{a.name}</span>
                  <span className={`badge ${a.active ? 'badge-green' : 'badge-gray'}`}>{a.active ? 'Activa' : 'Inactiva'}</span>
                </div>
                <p style={{ fontSize:12, color:'#64748b' }}>
                  <strong>Trigger:</strong> {trigLabel(a.trigger_type)} &nbsp;→&nbsp;
                  <strong>Acción:</strong> {actionLabel(a.action_type)}
                </p>
                {a.created_by_name && <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Creada por {a.created_by_name}</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-icon" onClick={() => toggle(a.id)} title={a.active ? 'Desactivar' : 'Activar'}>
                  {a.active ? <ToggleRight size={20} color="#10b981"/> : <ToggleLeft size={20} color="#94a3b8"/>}
                </button>
                <button className="btn-icon" onClick={() => openEdit(a)}>✏</button>
                <button className="btn-icon" style={{ color:'#ef4444' }} onClick={() => del(a.id)}><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:600 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar automatización' : 'Nueva automatización'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="input-group"><label>Nombre *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                </div>

                {/* Trigger */}
                <div style={{ padding:'14px 16px', background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                  <p style={{ fontWeight:600, fontSize:13, color:'#065f46', marginBottom:10 }}>⚡ Cuando ocurra...</p>
                  <div className="input-group">
                    <label>Evento disparador</label>
                    <select className="input" value={form.trigger_type} onChange={e => setForm(f => ({...f, trigger_type: e.target.value}))}>
                      {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {form.trigger_type === 'opportunity_stage_changed' && (
                    <div className="input-group" style={{ marginTop:10 }}>
                      <label>A la etapa</label>
                      <select className="input" value={form.trigger_config?.to_stage||''} onChange={e => setTC('to_stage', e.target.value)}>
                        <option value="">Cualquier etapa</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div style={{ padding:'14px 16px', background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe' }}>
                  <p style={{ fontWeight:600, fontSize:13, color:'#1e40af', marginBottom:10 }}>🎯 Ejecutar acción...</p>
                  <div className="input-group">
                    <label>Tipo de acción</label>
                    <select className="input" value={form.action_type} onChange={e => setForm(f => ({...f, action_type: e.target.value}))}>
                      {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  {form.action_type === 'create_activity' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
                      <div className="input-group"><label>Título de la actividad</label>
                        <input className="input" value={form.action_config?.title||''} onChange={e => setAC('title', e.target.value)} />
                      </div>
                      <div className="input-group"><label>Tipo</label>
                        <select className="input" value={form.action_config?.type||'tarea'} onChange={e => setAC('type', e.target.value)}>
                          {['tarea','reunion','llamada','email','recordatorio'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  {form.action_type === 'assign_user' && (
                    <div className="input-group" style={{ marginTop:10 }}>
                      <label>Asignar a</label>
                      <select className="input" value={form.action_config?.user_id||''} onChange={e => setAC('user_id', e.target.value)}>
                        <option value="">Seleccionar usuario</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  )}
                  {form.action_type === 'change_stage' && (
                    <div className="input-group" style={{ marginTop:10 }}>
                      <label>Mover a etapa</label>
                      <select className="input" value={form.action_config?.stage_id||''} onChange={e => setAC('stage_id', e.target.value)}>
                        <option value="">Seleccionar etapa</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  {form.action_type === 'send_email' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
                      <div className="input-group"><label>Asunto</label>
                        <input className="input" value={form.action_config?.subject||''} onChange={e => setAC('subject', e.target.value)} />
                      </div>
                      <div className="input-group"><label>Cuerpo</label>
                        <textarea className="input" rows={3} value={form.action_config?.body||''} onChange={e => setAC('body', e.target.value)} style={{resize:'vertical'}} />
                      </div>
                    </div>
                  )}
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
