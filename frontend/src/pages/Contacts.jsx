import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, User, Phone, Mail, Building2, X, Upload, Eye, Download } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ContactDetail from '../components/ContactDetail';
import ExportButtons from '../components/ExportButtons';

const empty = { name:'', email:'', phone:'', company:'', position:'', address:'', tags:'', notes:'', assigned_to:'' };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [users, setUsers] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importing, setImporting] = useState(false);
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

  useEffect(() => { load(); }, [search, tagFilter]);
  useEffect(() => { api.get('/users').then(r => setUsers(r.data)).catch(() => {}); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = (c) => { setForm({ ...c, assigned_to: c.assigned_to || '' }); setEditId(c.id); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/contacts/${editId}`, form);
        toast.success('Contacto actualizado');
      } else {
        await api.post('/contacts', form);
        toast.success('Contacto creado');
      }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
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

  const del = async (id) => {
    if (!confirm('¿Eliminar contacto?')) return;
    try { await api.delete(`/contacts/${id}`); toast.success('Eliminado'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Contactos</h1><p>Gestiona tus clientes y prospectos</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <ExportButtons 
            data={contacts} 
            filename="contactos" 
            title="Directorio de Contactos"
            columns={[
              { header: 'Nombre', accessor: 'name' },
              { header: 'Empresa', accessor: 'company' },
              { header: 'Email', accessor: 'email' },
              { header: 'Teléfono', accessor: 'phone' },
              { header: 'Etiquetas', accessor: 'tags' },
              { header: 'Asignado a', accessor: 'assigned_name' },
            ]}
          />
          <button className="btn btn-secondary" onClick={() => setImportModal(true)}><Upload size={16}/>Importar CSV</button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} />Nuevo contacto</button>
        </div>
      </div>

      <div className="card">
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
                <tr><th>Nombre</th><th>Empresa</th><th>Email</th><th>Teléfono</th><th>Etiquetas</th><th>Asignado a</th><th></th></tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#134e4a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} color="#94a3b8" />{c.company || '—'}</div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} color="#94a3b8" />{c.email || '—'}</div></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} color="#94a3b8" />{c.phone || '—'}</div></td>
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
                        <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => del(c.id)}><Trash2 size={14} /></button>
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
                <div className="input-group"><label>Dirección</label><input className="input" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
                <div className="input-group"><label>Notas</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{ resize: 'vertical' }} /></div>
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
