import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, User, Phone, Mail, Building2, X, Upload, Eye, Copy, MoreHorizontal, MessageCircle, CalendarPlus, Target } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ContactDetail from '../components/ContactDetail';
import ExportButtons from '../components/ExportButtons';
import { useAuth } from '../context/AuthContext';

const empty = { name:'', email:'', phone:'', company:'', position:'', address:'', postal_code:'', tags:'', notes:'', assigned_to:'' };
const emptyOpportunity = { enabled:false, title:'', stage_id:'', amount:'', demo_date:'' };

export default function Contacts() {
  const { user } = useAuth();
  const isSetter = user?.role === 'setter';
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);
  const [detailId, setDetailId] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [actionContactId, setActionContactId] = useState(null);
  const [quickTask, setQuickTask] = useState(null);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    const params = {};
    if (search)    params.search = search;
    if (tagFilter) params.tag    = tagFilter;
    api.get('/contacts', { params }).then(r => setContacts(r.data)).finally(() => setLoading(false));
  };

  // Etiquetas únicas de todos los contactos para el selector
  const allTags = [...new Set(
    contacts.flatMap(c => (c.tags || '').split(',').map(t => t.trim()).filter(Boolean))
  )].sort();

  useEffect(() => {
    setSelectedIds([]);
    load();
  }, [search, tagFilter]);
  useEffect(() => {
    if (!isSetter) api.get('/users').then(r => setUsers(r.data)).catch(() => {});
    api.get('/opportunities/stages').then(r => setStages(r.data)).catch(() => {});
  }, [isSetter]);

  const openNew = () => {
    setForm(empty);
    setOpportunityForm({
      ...emptyOpportunity,
      enabled:isSetter,
      stage_id:stages.find(stage => stage.name?.toLowerCase().includes('demo agendada'))?.id || stages[0]?.id || '',
    });
    setEditId(null);
    setModal(true);
  };
  const openEdit = (c) => {
    setForm({ ...c, assigned_to: c.assigned_to || '' });
    setOpportunityForm({ ...emptyOpportunity, title:c.company || c.name, stage_id:stages[0]?.id || '' });
    setEditId(c.id);
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const persist = payload => editId
      ? api.put(`/contacts/${editId}`, payload)
      : api.post('/contacts', payload);
    const persistAll = async payload => {
      const response = await persist(payload);
      if (opportunityForm.enabled) {
        try {
          await api.post('/opportunities', {
            title: opportunityForm.title,
            contact_id: editId || response.data.id,
            stage_id: opportunityForm.stage_id || null,
            amount: opportunityForm.amount || 0,
            demo_date: opportunityForm.demo_date,
            demo_status: 'programada',
            assigned_to: form.assigned_to || null,
            probability: 50,
            temperature: 'templada',
            followup_phase: 0,
          });
        } catch (opportunityError) {
          toast.error(`El contacto se guardó, pero la oportunidad no: ${opportunityError.response?.data?.message || 'error inesperado'}`);
          setModal(false);
          load();
          return;
        }
      }
      toast.success(
        opportunityForm.enabled
          ? `${editId ? 'Contacto actualizado' : 'Contacto creado'} y oportunidad creada`
          : editId ? 'Contacto actualizado' : 'Contacto creado'
      );
      setModal(false);
      load();
    };
    try {
      await persistAll(form);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.code === 'DUPLICATE_CONTACT') {
        const matches = data.duplicates
          .map(item => `${item.name}${item.company ? ` · ${item.company}` : ''}`)
          .join('\n');
        const accepted = confirm(
          `Parece que este contacto ya existe:\n\n${matches}\n\n¿Quieres guardarlo igualmente?`
        );
        if (!accepted) return;
        try {
          await persistAll({ ...form, allow_duplicate:true });
        } catch (retryError) {
          toast.error(retryError.response?.data?.message || 'Error');
        }
        return;
      }
      toast.error(data?.message || 'Error');
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return { name: obj.name||obj.nombre||obj['nombre completo']||'', email: obj.email||obj['correo']||'', phone: obj.phone||obj.telefono||obj['teléfono']||'', company: obj.company||obj.empresa||'', position: obj.position||obj.cargo||'', tags: obj.tags||obj.etiquetas||'' };
    }).filter(r => r.name);
  };

  const onFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvPreview(parseCSV(ev.target.result));
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!csvPreview.length) return toast.error('Sin datos para importar');
    setImporting(true);
    try {
      const { data } = await api.post('/import/contacts', { rows: csvPreview });
      toast.success(`Importados: ${data.inserted} | Omitidos: ${data.skipped}`);
      setImportModal(false); setCsvPreview([]); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setImporting(false); }
  };

  const del = async (contact) => {
    const accepted = confirm(
      `¿Eliminar definitivamente a ${contact.name}?\n\n` +
      'También se eliminarán todas sus oportunidades, tareas, seguimientos, comunicaciones, presupuestos y facturas.\n\n' +
      'Esta acción no se puede deshacer.'
    );
    if (!accepted) return;
    try {
      const { data } = await api.delete(`/contacts/${contact.id}`);
      toast.success(data.message || 'Contacto y datos asociados eliminados');
      load();
    }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const toggleSelected = id => {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  };

  const copyPostalCode = async postalCode => {
    if (!postalCode) return;
    try {
      await navigator.clipboard.writeText(postalCode);
      toast.success(`Código postal ${postalCode} copiado`);
    } catch {
      toast.error('No se pudo copiar el código postal');
    }
  };

  const copyValue = async (value, label) => {
    if (!value) return toast.error(`El contacto no tiene ${label.toLowerCase()}`);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
      setActionContactId(null);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}`);
    }
  };

  const openWhatsApp = contact => {
    const phone = String(contact.phone || '').replace(/\D/g, '');
    if (!phone) return toast.error('El contacto no tiene teléfono');
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
    setActionContactId(null);
  };

  const openOpportunityFor = contact => {
    openEdit(contact);
    setOpportunityForm({
      enabled:true,
      title:contact.company || contact.name,
      stage_id:stages[0]?.id || '',
      amount:'',
      demo_date:'',
    });
    setActionContactId(null);
  };

  const saveQuickTask = async event => {
    event.preventDefault();
    try {
      await api.post('/activities', {
        title:quickTask.title,
        type:quickTask.type,
        scheduled_at:quickTask.scheduled_at,
        due_at:quickTask.scheduled_at,
        contact_id:quickTask.contact.id,
        assigned_to:quickTask.contact.assigned_to || '',
      });
      toast.success('Tarea creada');
      setQuickTask(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo crear la tarea');
    }
  };

  const missingFields = contact => [
    !contact.phone && 'teléfono',
    !contact.email && 'correo',
    !contact.company && 'empresa',
    !contact.postal_code && 'código postal',
  ].filter(Boolean);

  const toggleAllVisible = () => {
    const visibleIds = contacts.map(contact => contact.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    const names = contacts
      .filter(contact => selectedIds.includes(contact.id))
      .slice(0, 5)
      .map(contact => `• ${contact.name}`)
      .join('\n');
    const remaining = selectedIds.length > 5 ? `\n• y ${selectedIds.length - 5} más` : '';
    const accepted = confirm(
      `¿Eliminar definitivamente ${selectedIds.length} contacto${selectedIds.length === 1 ? '' : 's'}?\n\n` +
      `${names}${remaining}\n\n` +
      'También se eliminarán todas sus oportunidades, tareas, seguimientos, comunicaciones, presupuestos y facturas.\n\n' +
      'Esta acción no se puede deshacer.'
    );
    if (!accepted) return;

    setBulkDeleting(true);
    try {
      const { data } = await api.post('/contacts/bulk-delete', { ids:selectedIds });
      toast.success(data.message);
      setSelectedIds([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudieron eliminar los contactos');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>{isSetter ? 'Mis contactos y demos' : 'Contactos'}</h1><p>{isSetter ? 'Añade una agencia prospectada por tu cuenta y agenda su reunión' : 'Gestiona tus clientes y prospectos'}</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {!isSetter && <ExportButtons
            data={contacts} 
            filename="contactos" 
            title="Directorio de Contactos"
            columns={[
              { header: 'Nombre', accessor: 'name' },
              { header: 'Empresa', accessor: 'company' },
              { header: 'Email', accessor: 'email' },
              { header: 'Teléfono', accessor: 'phone' },
              { header: 'Código postal', accessor: 'postal_code' },
              { header: 'Etiquetas', accessor: 'tags' },
              { header: 'Asignado a', accessor: 'assigned_name' },
            ]}
          />}
          {!isSetter && <button className="btn btn-secondary" onClick={() => setImportModal(true)}><Upload size={16}/>Importar CSV</button>}
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} />{isSetter ? 'Nuevo contacto y demo' : 'Nuevo contacto'}</button>
        </div>
      </div>

      <div className="card">
        {!isSetter && selectedIds.length > 0 && (
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
            padding:'10px 12px', marginBottom:12, borderRadius:9,
            background:'#fef2f2', border:'1px solid #fecaca', flexWrap:'wrap'
          }}>
            <strong style={{ fontSize:13, color:'#991b1b' }}>
              {selectedIds.length} contacto{selectedIds.length === 1 ? '' : 's'} seleccionado{selectedIds.length === 1 ? '' : 's'}
            </strong>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>Cancelar selección</button>
              <button className="btn btn-danger btn-sm" disabled={bulkDeleting} onClick={bulkDelete}>
                <Trash2 size={14}/>
                {bulkDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}
              </button>
            </div>
          </div>
        )}
        <div className="search-bar">
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <Search size={16} />
            <input className="input" placeholder="Buscar por nombre, email o empresa..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Selector de etiqueta */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: 150 }}
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          >
            <option value="">Todas las etiquetas</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {tagFilter && (
            <button className="btn-icon" title="Limpiar filtro" onClick={() => setTagFilter('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {loading ? <div className="spinner" /> : contacts.length === 0 ? (
          <div className="empty-state"><User size={48} /><h3>Sin contactos</h3><p>Crea tu primer contacto</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {!isSetter && <th style={{ width:38 }}>
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los contactos visibles"
                      checked={contacts.length > 0 && contacts.every(contact => selectedIds.includes(contact.id))}
                      onChange={toggleAllVisible}
                    />
                  </th>}
                  <th>Nombre</th><th>Empresa</th><th>Email</th><th>Teléfono</th><th>C. postal</th><th>Etiquetas</th><th>Asignado a</th><th></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} style={{ background:selectedIds.includes(c.id) ? '#eff6ff' : undefined }}>
                    {!isSetter && <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${c.name}`}
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelected(c.id)}
                      />
                    </td>}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#134e4a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        {missingFields(c).length > 0 && (
                          <span className="badge badge-yellow" title={`Falta: ${missingFields(c).join(', ')}`}>
                            Faltan {missingFields(c).length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} color="#94a3b8" />{c.company || '—'}</div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} color="#94a3b8" />{c.email || '—'}</div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} color="#94a3b8" />{c.phone || '—'}</div></td>
                    <td>
                      {c.postal_code ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title={`Copiar ${c.postal_code}`}
                          onClick={() => copyPostalCode(c.postal_code)}
                          style={{ whiteSpace:'nowrap' }}
                        >
                          {c.postal_code}<Copy size={12}/>
                        </button>
                      ) : '—'}
                    </td>
                    <td>
                      {c.tags
                        ? c.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                            <span
                              key={t}
                              className="tag"
                              style={{ marginRight: 4, cursor: 'pointer', opacity: tagFilter === t ? 1 : 0.75 }}
                              title={`Filtrar por "${t}"`}
                              onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                            >{t}</span>
                          ))
                        : '—'}
                    </td>
                    <td>{c.assigned_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Ver ficha 360°" onClick={() => setDetailId(c.id)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                        {isSetter ? (
                          <button className="btn-icon" title="Crear demo" onClick={() => openOpportunityFor(c)}><Target size={14}/></button>
                        ) : <div style={{ position:'relative' }}>
                          <button className="btn-icon" title="Acciones rápidas" onClick={() => setActionContactId(current => current === c.id ? null : c.id)}><MoreHorizontal size={15}/></button>
                          {actionContactId === c.id && (
                            <div style={{ position:'absolute', right:0, top:'calc(100% + 5px)', width:190, background:'#fff', border:'1px solid #e2e8f0', borderRadius:9, boxShadow:'0 8px 24px rgba(0,0,0,.14)', padding:5, zIndex:40 }}>
                              <button className="quick-action-menu-item" onClick={() => copyValue(c.phone, 'Teléfono')}><Phone size={14}/>Copiar teléfono</button>
                              <button className="quick-action-menu-item" onClick={() => copyValue(c.email, 'Correo')}><Mail size={14}/>Copiar correo</button>
                              <button className="quick-action-menu-item" onClick={() => openWhatsApp(c)}><MessageCircle size={14}/>Abrir WhatsApp</button>
                              <button className="quick-action-menu-item" onClick={() => { setQuickTask({ contact:c, title:`Contactar con ${c.name}`, type:'llamada', scheduled_at:'' }); setActionContactId(null); }}><CalendarPlus size={14}/>Crear tarea</button>
                              <button className="quick-action-menu-item" onClick={() => openOpportunityFor(c)}><Target size={14}/>Crear oportunidad</button>
                            </div>
                          )}
                        </div>}
                        {!isSetter && <button
                          className="btn-icon"
                          title="Eliminar contacto y todos sus datos"
                          style={{ color: '#ef4444' }}
                          onClick={() => del(c)}
                        >
                          <Trash2 size={14} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar contacto' : 'Nuevo contacto'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
                  <div className="input-group"><label>Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div className="input-group"><label>Teléfono</label><input className="input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div className="input-group"><label>Empresa</label><input className="input" value={form.company} onChange={e => setForm(f=>({...f,company:e.target.value}))} /></div>
                  <div className="input-group"><label>Cargo</label><input className="input" value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))} /></div>
                  <div className="input-group"><label>Asignar a</label>
                    <select className="input" value={form.assigned_to} onChange={e => setForm(f=>({...f,assigned_to:e.target.value}))}>
                      <option value="">Sin asignar</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="input-group"><label>Etiquetas (separadas por comas)</label><input className="input" value={form.tags} placeholder="prospecto, cliente, vip" onChange={e => setForm(f=>({...f,tags:e.target.value}))} /></div>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Dirección</label>
                    <input className="input" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} />
                  </div>
                  <div className="input-group">
                    <label>Código postal</label>
                    <div style={{ display:'flex', gap:6 }}>
                      <input
                        className="input"
                        value={form.postal_code || ''}
                        inputMode="numeric"
                        maxLength={12}
                        placeholder="Ej. 03003"
                        onChange={e => setForm(f=>({...f,postal_code:e.target.value.replace(/[^0-9A-Za-z -]/g,'')}))}
                      />
                      {form.postal_code && (
                        <button type="button" className="btn-icon" title="Copiar código postal" onClick={() => copyPostalCode(form.postal_code)}>
                          <Copy size={15}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="input-group"><label>Notas</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{ resize: 'vertical' }} /></div>
                <div style={{ marginTop:16, padding:14, border:'1px solid #bfdbfe', background:'#eff6ff', borderRadius:10 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', fontWeight:700, color:'#1e3a8a' }}>
                      <input
                        type="checkbox"
                        checked={opportunityForm.enabled}
                        onChange={e => setOpportunityForm(current => ({
                          ...current,
                          enabled:e.target.checked,
                          title:current.title || form.company || form.name,
                          stage_id:current.stage_id || stages[0]?.id || '',
                        }))}
                      />
                      {editId ? 'Crear una oportunidad para este contacto' : 'Crear también una oportunidad'}
                    </label>
                    <p style={{ fontSize:12, color:'#64748b', margin:'5px 0 0 25px' }}>
                      Quedará vinculada al contacto y, si indicas una demo, se crearán sus tareas automáticamente.
                    </p>
                    {opportunityForm.enabled && (
                      <div className="form-grid" style={{ marginTop:14 }}>
                        <div className="input-group" style={{ gridColumn:'1/-1' }}>
                          <label>Título de la oportunidad *</label>
                          <input className="input" value={opportunityForm.title} onChange={e => setOpportunityForm(current => ({ ...current, title:e.target.value }))} required />
                        </div>
                        <div className="input-group">
                          <label>Etapa</label>
                          <select className="input" value={opportunityForm.stage_id} onChange={e => setOpportunityForm(current => ({ ...current, stage_id:e.target.value }))}>
                            <option value="">Sin etapa</option>
                            {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Importe estimado (€)</label>
                          <input className="input" type="number" min="0" step="0.01" value={opportunityForm.amount} onChange={e => setOpportunityForm(current => ({ ...current, amount:e.target.value }))} />
                        </div>
                        <div className="input-group" style={{ gridColumn:'1/-1' }}>
                          <label>Fecha y hora de la demo *</label>
                          <input className="input" type="datetime-local" value={opportunityForm.demo_date} onChange={e => setOpportunityForm(current => ({ ...current, demo_date:e.target.value }))} required />
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

      {detailId && <ContactDetail contactId={detailId} onClose={() => setDetailId(null)} />}

      {quickTask && (
        <div className="modal-overlay" onClick={event => event.target === event.currentTarget && setQuickTask(null)}>
          <div className="modal" style={{ maxWidth:430 }}>
            <div className="modal-header"><h3>Crear tarea para {quickTask.contact.name}</h3><button className="btn-icon" onClick={() => setQuickTask(null)}><X size={18}/></button></div>
            <form onSubmit={saveQuickTask}>
              <div className="modal-body">
                <div className="input-group"><label>Tarea *</label><input className="input" value={quickTask.title} onChange={event => setQuickTask(current => ({ ...current, title:event.target.value }))} required/></div>
                <div className="form-grid">
                  <div className="input-group"><label>Tipo</label><select className="input" value={quickTask.type} onChange={event => setQuickTask(current => ({ ...current, type:event.target.value }))}><option value="llamada">Llamada</option><option value="tarea">Tarea</option><option value="recordatorio">Recordatorio</option><option value="reunion">Reunión</option></select></div>
                  <div className="input-group"><label>Fecha y hora *</label><input className="input" type="datetime-local" value={quickTask.scheduled_at} onChange={event => setQuickTask(current => ({ ...current, scheduled_at:event.target.value }))} required/></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setQuickTask(null)}>Cancelar</button><button className="btn btn-primary">Crear tarea</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {importModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <h3>Importar contactos desde CSV</h3>
              <button className="btn-icon" onClick={() => { setImportModal(false); setCsvPreview([]); }}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{ background:'#f8fafc', borderRadius:10, padding:16, border:'2px dashed #e2e8f0', textAlign:'center', marginBottom:16 }}>
                <Upload size={32} color="#94a3b8" style={{ margin:'0 auto 10px' }} />
                <p style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>
                  El CSV debe tener columnas: <code>name, email, phone, company, position, tags</code>
                </p>
                <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={onFileChange} />
                <button className="btn btn-secondary" onClick={() => fileRef.current.click()}>
                  <Upload size={14}/> Seleccionar archivo CSV
                </button>
              </div>

              {csvPreview.length > 0 && (
                <div>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>
                    Vista previa — {csvPreview.length} contacto(s) encontrados
                  </p>
                  <div className="table-wrap" style={{ maxHeight:240, overflowY:'auto' }}>
                    <table>
                      <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Empresa</th><th>Etiquetas</th></tr></thead>
                      <tbody>
                        {csvPreview.slice(0,20).map((r,i) => (
                          <tr key={i}>
                            <td style={{ fontWeight:500 }}>{r.name}</td>
                            <td>{r.email||'—'}</td>
                            <td>{r.phone||'—'}</td>
                            <td>{r.company||'—'}</td>
                            <td>{r.tags||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 20 && <p style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>... y {csvPreview.length - 20} más</p>}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setImportModal(false); setCsvPreview([]); }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!csvPreview.length || importing} onClick={runImport}>
                {importing ? 'Importando...' : `Importar ${csvPreview.length} contactos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
