import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getUserSymbol } from '../utils/userAvatar';

const empty = { name:'', email:'', password:'', role:'vendedor', active:1 };
const ROLE_BADGE = { admin:'badge-red', gerente:'badge-purple', vendedor:'badge-blue', setter:'badge-green' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get('/users').then(r=>setUsers(r.data));
  useEffect(()=>{ load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = u => { setForm({ ...u, password:'' }); setEditId(u.id); setModal(true); };

  const save = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/users/${editId}`, form); toast.success('Usuario actualizado'); }
      else { await api.post('/users', form); toast.success('Usuario creado'); }
      setModal(false); load();
    } catch(err) { toast.error(err.response?.data?.message||'Error'); }
  };

  const toggle = async u => {
    await api.put(`/users/${u.id}`, { ...u, active: u.active?0:1 });
    toast.success(u.active?'Usuario desactivado':'Usuario activado'); load();
  };

  const openDelete = u => {
    setDeleteTarget(u);
    setDeleteConfirmation('');
  };

  const permanentlyDelete = async () => {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/users/${deleteTarget.id}`, {
        data: { confirmation: deleteConfirmation },
      });
      toast.success(data.message || 'Usuario eliminado');
      setDeleteTarget(null);
      setDeleteConfirmation('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar el usuario');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Usuarios</h1><p>Gestión de accesos y roles</p></div>
        {me?.role==='admin' && <button className="btn btn-primary" onClick={openNew}><Plus size={16}/>Nuevo usuario</button>}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#0f766e,#134e4a)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0 }}>
                        {getUserSymbol(u)}
                      </div>
                      <span style={{ fontWeight:500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.active?'badge-green':'badge-red'}`}>{u.active?'Activo':'Inactivo'}</span></td>
                  <td style={{ fontSize:12, color:'#64748b' }}>{u.created_at?.slice(0,10)}</td>
                  <td>
                    {me?.role==='admin' && u.id!==me.id && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-icon" onClick={()=>openEdit(u)}>✏</button>
                        <button className="btn-icon" style={{ color:u.active?'#ef4444':'#10b981' }} onClick={()=>toggle(u)}>
                          {u.active?'🚫':'✓'}
                        </button>
                        {!u.active && !['admin','gerente'].includes(u.role) && (
                          <button
                            className="btn-icon"
                            style={{ color:'#dc2626' }}
                            onClick={()=>openDelete(u)}
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId?'Editar usuario':'Nuevo usuario'}</h3>
              <button className="btn-icon" onClick={()=>setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Nombre *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></div>
                  <div className="input-group"><label>Email *</label><input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
                  <div className="input-group"><label>{editId?'Nueva contraseña (dejar vacío para no cambiar)':'Contraseña *'}</label>
                    <input className="input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required={!editId} />
                  </div>
                  <div className="input-group"><label>Rol</label>
                    <select className="input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                      <option value="vendedor">Vendedor</option>
                      <option value="setter">Setter</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
                <AlertTriangle size={20} color="#dc2626"/>Eliminar usuario
              </h3>
              <button className="btn-icon" onClick={()=>setDeleteTarget(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <p>
                Vas a eliminar el acceso de <strong>{deleteTarget.name}</strong>. Sus contactos,
                oportunidades y tareas se reasignarán a ti. El nombre se conservará únicamente
                en el histórico de ventas.
              </p>
              <p style={{ marginTop:14, color:'#dc2626' }}>
                Esta acción no se puede deshacer.
              </p>
              <div className="input-group" style={{ marginTop:16 }}>
                <label>Escribe <strong>{deleteTarget.name}</strong> para confirmar</label>
                <input
                  className="input"
                  value={deleteConfirmation}
                  onChange={e=>setDeleteConfirmation(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDeleteTarget(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ background:'#dc2626', color:'#fff' }}
                disabled={deleting || deleteConfirmation !== deleteTarget.name}
                onClick={permanentlyDelete}
              >
                <Trash2 size={16}/>{deleting?'Eliminando…':'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
