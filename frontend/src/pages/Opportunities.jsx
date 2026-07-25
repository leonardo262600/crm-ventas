import React, { useEffect, useState } from 'react';
import { Plus, X, DollarSign, Calendar, User, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const empty = { title:'', contact_id:'', stage_id:'', amount:'', probability:50, close_date:'', assigned_to:'', description:'', status:'open' };

import { fmtCurrency as fmt } from '../utils/format';
import ExportButtons from '../components/ExportButtons';

export default function Opportunities() {
  const [opps, setOpps] = useState([]);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [wonModal, setWonModal] = useState(null);
  const [lostModal, setLostModal] = useState(null);

  const load = () => Promise.all([
    api.get('/opportunities'),
    api.get('/opportunities/stages'),
  ]).then(([o, s]) => { setOpps(o.data); setStages(s.data); });

  useEffect(() => {
    load();
    api.get('/contacts').then(r => setContacts(r.data)).catch(()=>{});
    api.get('/users').then(r => setUsers(r.data)).catch(()=>{});
  }, []);

  const openNew = (stage_id='') => { setForm({...empty, stage_id}); setEditId(null); setModal(true); };
  const openEdit = (o) => { setForm({...o, contact_id:o.contact_id||'', stage_id:o.stage_id||'', assigned_to:o.assigned_to||'', close_date:o.close_date?.slice(0,10)||''}); setEditId(o.id); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/opportunities/${editId}`, form); toast.success('Actualizado'); }
      else { await api.post('/opportunities', form); toast.success('Creado'); }
      setModal(false); load();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar?')) return;
    await api.delete(`/opportunities/${id}`); toast.success('Eliminado'); load();
  };

  const onDrop = async (stageId) => {
    if (!dragging || dragging.stage_id === stageId) return;
    try {
      await api.patch(`/opportunities/${dragging.id}/stage`, { stage_id: stageId });
      load();
    } catch { toast.error('Error al mover'); }
    setDragging(null);
  };

  const changeStatus = async (id, status, data={}) => {
    try {
      await api.patch(`/opportunities/${id}/status`, { status, ...data });
      toast.success(status === 'won' ? '¡Oportunidad Ganada!' : 'Oportunidad Perdida');
      setWonModal(null); setLostModal(null);
      load();
    } catch { toast.error('Error al cambiar estado'); }
  };

  const badgeClass = (status) => status==='won'?'badge-green':status==='lost'?'badge-red':'badge-blue';

  return (
    <div>
      <div className="page-header">
        <div><h1>Oportunidades</h1><p>Pipeline de ventas Kanban</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <ExportButtons 
            data={opps} 
            filename="oportunidades" 
            title="Listado de Oportunidades"
            columns={[
              { header: 'Título', accessor: 'title' },
              { header: 'Contacto', accessor: 'contact_name' },
              { header: 'Monto', accessor: o => fmt(o.amount) },
              { header: 'Probabilidad', accessor: o => `${o.probability}%` },
              { header: 'Estado', accessor: o => o.status === 'open' ? 'Abierta' : o.status === 'won' ? 'Ganada' : 'Perdida' },
              { header: 'Cierre', accessor: o => o.close_date ? o.close_date.slice(0,10) : '—' },
              { header: 'Asignado', accessor: 'assigned_name' },
            ]}
          />
          <button className="btn btn-primary" onClick={() => openNew()}><Plus size={16} />Nueva oportunidad</button>
        </div>
      </div>

      <div className="kanban-board">
        {stages.map(stage => {
          const cards = opps.filter(o => o.stage_id === stage.id && o.status === 'open');
          const total = cards.reduce((s,o) => s + Number(o.amount||0), 0);
          return (
            <div key={stage.id} className="kanban-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(stage.id)}
            >
              <div className="kanban-col-header">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: stage.color }} />
                  <span className="kanban-col-title">{stage.name}</span>
                </div>
                <span className="kanban-count">{cards.length}</span>
              </div>
              <p style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>{fmt(total)}</p>

              {cards.map(opp => (
                <div key={opp.id} className="kanban-card"
                  style={{ borderLeftColor: stage.color }}
                  draggable
                  onDragStart={() => setDragging(opp)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => openEdit(opp)}
                >
                  <h4>{opp.title}</h4>
                  <p style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>{opp.contact_name || '—'}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span className="amount">{fmt(opp.amount)}</span>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>{opp.probability}%</span>
                  </div>
                  {opp.close_date && (
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
                      <Calendar size={11} />{opp.close_date?.slice(0,10)}
                    </p>
                  )}
                  {opp.assigned_name && (
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                      <User size={11} />{opp.assigned_name}
                    </p>
                  )}
                  
                  {/* Acciones Rápidas */}
                  <div style={{ display:'flex', gap:6, marginTop:12, paddingTop:12, borderTop:'1px dashed #e2e8f0' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm" style={{ flex:1, background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0' }} onClick={() => setWonModal({ ...opp, final_amount: opp.amount, close_date: new Date().toISOString().split('T')[0] })}>
                      <CheckCircle2 size={14}/> Ganada
                    </button>
                    <button className="btn btn-sm" style={{ flex:1, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }} onClick={() => setLostModal({ ...opp, lost_reason: '' })}>
                      <XCircle size={14}/> Perdida
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:4 }} onClick={() => openNew(stage.id)}>
                <Plus size={14} /> Agregar
              </button>
            </div>
          );
        })}
      </div>

      {/* Won/Lost */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
        {['won','lost'].map(status => {
          const list = opps.filter(o => o.status === status);
          const total = list.reduce((s,o) => s+Number(o.amount||0),0);
          return (
            <div className="card" key={status}>
              <h3 style={{ fontWeight:600, marginBottom:12, color: status==='won'?'#10b981':'#ef4444' }}>
                {status==='won'?'✓ Ganadas':'✗ Perdidas'} ({list.length}) — {fmt(total)}
              </h3>
              {list.slice(0,5).map(o => (
                <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <span style={{ fontSize:13 }}>{o.title}</span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{fmt(o.amount)}</span>
                </div>
              ))}
              {!list.length && <p className="text-muted text-sm">Sin registros</p>}
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId?'Editar oportunidad':'Nueva oportunidad'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group" style={{ gridColumn:'1/-1' }}><label>Título *</label><input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></div>
                  <div className="input-group"><label>Contacto</label>
                    <select className="input" value={form.contact_id} onChange={e=>setForm(f=>({...f,contact_id:e.target.value}))}>
                      <option value="">Sin contacto</option>
                      {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Etapa</label>
                    <select className="input" value={form.stage_id} onChange={e=>setForm(f=>({...f,stage_id:e.target.value}))}>
                      <option value="">Sin etapa</option>
                      {stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Monto</label><input className="input" type="number" min="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
                  <div className="input-group"><label>Probabilidad ({form.probability}%)</label><input className="input" type="range" min="0" max="100" value={form.probability} onChange={e=>setForm(f=>({...f,probability:e.target.value}))} /></div>
                  <div className="input-group"><label>Fecha de cierre</label><input className="input" type="date" value={form.close_date} onChange={e=>setForm(f=>({...f,close_date:e.target.value}))} /></div>
                  <div className="input-group"><label>Asignar a</label>
                    <select className="input" value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))}>
                      <option value="">Sin asignar</option>
                      {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="input-group"><label>Descripción</label><textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}} /></div>
              </div>
              <div className="modal-footer">
                {editId && <button type="button" className="btn btn-danger" onClick={()=>{del(editId);setModal(false);}}>Eliminar</button>}
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Won Modal */}
      {wonModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setWonModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3><CheckCircle2 size={18} color="#059669" style={{ display:'inline', verticalAlign:'middle', marginRight:6 }}/> Marcar como Ganada</h3>
              <button className="btn-icon" onClick={() => setWonModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); changeStatus(wonModal.id, 'won', { amount: wonModal.final_amount, close_date: wonModal.close_date }); }}>
              <div className="modal-body">
                <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>Confirma el monto final y la fecha de cierre de la venta.</p>
                <div className="input-group">
                  <label>Monto de Venta Real</label>
                  <input className="input" type="number" step="0.01" value={wonModal.final_amount} onChange={e => setWonModal(w => ({...w, final_amount: e.target.value}))} required />
                </div>
                <div className="input-group">
                  <label>Fecha de Cierre</label>
                  <input className="input" type="date" value={wonModal.close_date} onChange={e => setWonModal(w => ({...w, close_date: e.target.value}))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setWonModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background:'#059669', borderColor:'#059669' }}>Confirmar Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lost Modal */}
      {lostModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setLostModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3><XCircle size={18} color="#dc2626" style={{ display:'inline', verticalAlign:'middle', marginRight:6 }}/> Marcar como Perdida</h3>
              <button className="btn-icon" onClick={() => setLostModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); changeStatus(lostModal.id, 'lost', { lost_reason: lostModal.lost_reason }); }}>
              <div className="modal-body">
                <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>Registra el motivo por el cual no se concretó la venta.</p>
                <div className="input-group">
                  <label>Motivo de Pérdida</label>
                  <textarea className="input" rows={3} value={lostModal.lost_reason} onChange={e => setLostModal(w => ({...w, lost_reason: e.target.value}))} required placeholder="Ej: Precio alto, eligió a la competencia..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLostModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background:'#dc2626', borderColor:'#dc2626' }}>Confirmar Pérdida</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
