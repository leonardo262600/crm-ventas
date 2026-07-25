import React, { useEffect, useState, useRef } from 'react';
import {
  Database, DatabaseBackup, Download, RefreshCw, Upload, Trash2, AlertTriangle, ShieldAlert,
  Server, HardDrive, FileClock, CheckCircle2, CopyPlus
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtBytes = b => {
  if (!b) return '0 KB';
  return b > 1048576 ? `${(b/1048576).toFixed(2)} MB` : `${(b/1024).toFixed(0)} KB`;
};

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [label, setLabel] = useState('');
  
  // Modals
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [keepUsers, setKeepUsers] = useState(true);

  const fileInputRef = useRef();

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, infoRes] = await Promise.all([
        api.get('/backup/list'),
        api.get('/backup/info')
      ]);
      setBackups(listRes.data);
      setInfo(infoRes.data);
    } catch (err) {
      toast.error('Error al cargar datos del servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- Generar ---
  const handleGenerate = async (e) => {
    e?.preventDefault();
    setGenerating(true);
    try {
      const r = await api.post('/backup/generate', { label });
      toast.success(`Copia creada exitosamente (${fmtBytes(r.data.size)})`);
      setLabel('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar la copia');
    } finally {
      setGenerating(false);
    }
  };

  // --- Descargar ---
  const handleDownload = async (filename) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`/api/backup/download/${filename}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      toast.error('Error al descargar el archivo');
    }
  };

  // --- Eliminar ---
  const handleDelete = async (filename) => {
    if (!confirm('¿Seguro que deseas eliminar esta copia de seguridad de forma permanente?')) return;
    try {
      await api.delete(`/backup/${filename}`);
      toast.success('Copia eliminada');
      loadData();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  // --- Restaurar desde la lista ---
  const confirmRestore = async (filename) => {
    if (!confirm(`¡ADVERTENCIA!\n\nEsto sobrescribirá toda la base de datos actual con el contenido de la copia de seguridad "${filename}".\nTodos los datos actuales se perderán.\n\n¿Estás completamente seguro de continuar?`)) return;
    setRestoring(true);
    try {
      await api.post(`/backup/restore/${filename}`);
      toast.success('Base de datos restaurada correctamente');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error crítico al restaurar');
    } finally {
      setRestoring(false);
    }
  };

  // --- Restaurar desde archivo externo ---
  const handleUploadRestore = async (e) => {
    e.preventDefault();
    if (!restoreFile) return toast.error('Selecciona un archivo SQL');
    if (!confirm(`¡ADVERTENCIA!\n\nSe restaurará el archivo ${restoreFile.name}. Esto sobrescribirá todos los datos actuales.\n¿Continuar?`)) return;
    
    setRestoring(true);
    const fd = new FormData();
    fd.append('sqlfile', restoreFile);
    try {
      await api.post('/backup/restore/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Base de datos restaurada correctamente');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error crítico al restaurar');
    } finally {
      setRestoring(false);
      setShowRestoreModal(false);
      setRestoreFile(null);
    }
  };

  // --- Resetear Sistema ---
  const handleReset = async (e) => {
    e.preventDefault();
    if (resetConfirm !== 'RESETEAR SISTEMA') {
      return toast.error('Debes escribir "RESETEAR SISTEMA" exactamente para confirmar.');
    }
    setResetting(true);
    try {
      const res = await api.post('/backup/reset', { confirm_text: resetConfirm, keep_users: keepUsers });
      toast.success(res.data.message);
      if (res.data.backup_filename) {
        toast('Se guardó una copia de seguridad automática antes de limpiar los datos.', { icon: '🛡️' });
      }
      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al resetear el sistema');
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  if (loading && !info) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Database size={24} color="#0f766e"/> Gestión de Datos y Copias de Seguridad
          </h1>
          <p>Genera backups, restaura la información o prepara el sistema para una empresa nueva</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        
        {/* COLUMNA PRINCIPAL */}
        <div>
          {/* Card de Generación */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:15 }}>
              <CopyPlus size={18}/> Crear Copia de Seguridad
            </h3>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
              La copia de seguridad incluirá todas las tablas, vistas, funciones y configuraciones del sistema. El proceso puede demorar dependiendo del tamaño de la base de datos.
            </p>
            <form onSubmit={handleGenerate} style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
              <div className="input-group" style={{ flex:1 }}>
                <label>Etiqueta / Nombre (opcional)</label>
                <input 
                  className="input" 
                  value={label} 
                  onChange={e=>setLabel(e.target.value)} 
                  placeholder="Ej: antes_de_importacion_masiva" 
                  pattern="[a-zA-Z0-9_\-]+"
                  title="Solo letras, números, guiones y guiones bajos"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={generating} style={{ padding: '9px 24px' }}>
                <RefreshCw size={16} className={generating ? 'spinner-icon' : ''} style={generating ? { animation: 'spin 1s linear infinite' } : {}} /> 
                {generating ? 'Generando...' : 'Generar Copia'}
              </button>
            </form>
          </div>

          {/* Lista de Backups */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:15 }}>
                <DatabaseBackup size={18}/> Historial de Copias
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRestoreModal(true)}>
                <Upload size={14}/> Subir SQL externo
              </button>
            </div>
            
            {backups.length === 0 ? (
              <div className="empty-state">
                <FileClock size={40}/>
                <p style={{ marginTop: 12, fontWeight: 600 }}>No hay copias de seguridad generadas</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Las copias que generes aparecerán aquí.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Archivo / Etiqueta</th>
                      <th>Tamaño</th>
                      <th>Fecha de creación</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={b.filename}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HardDrive size={16} color="#64748b"/>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                {b.label || b.filename}
                              </p>
                              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                                {b.filename}
                              </p>
                            </div>
                            {i === 0 && <span className="badge badge-green" style={{ marginLeft: 8 }}>Última</span>}
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{fmtBytes(b.size)}</td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>
                          {format(new Date(b.created_at), "dd/MM/yyyy • HH:mm'hs'")}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn-icon" title="Descargar" onClick={() => handleDownload(b.filename)}>
                              <Download size={15}/>
                            </button>
                            <button className="btn-icon" title="Restaurar esta copia" style={{ color: '#0f766e', borderColor: '#ccfbf1', background: '#f0fdf4' }} onClick={() => confirmRestore(b.filename)} disabled={restoring}>
                              <RefreshCw size={15}/>
                            </button>
                            <button className="btn-icon" title="Eliminar" style={{ color: '#ef4444' }} onClick={() => handleDelete(b.filename)}>
                              <Trash2 size={15}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR DERECHO */}
        <div>
          {/* Card Resumen Sistema */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:15 }}>
              <Server size={18}/> Estado del Sistema
            </h3>
            
            {info && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Tamaño Base de Datos:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{fmtBytes(info.db_size)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Total de copias (Espacio):</span>
                  <span style={{ fontWeight: 600 }}>{info.backup_count} ({fmtBytes(info.total_backup_size)})</span>
                </div>
                
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Registros Actuales</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="stat-sm"><span className="val">{info.record_counts?.contacts || 0}</span><span className="lbl">Contactos</span></div>
                    <div className="stat-sm"><span className="val">{info.record_counts?.opportunities || 0}</span><span className="lbl">Oport.</span></div>
                    <div className="stat-sm"><span className="val">{info.record_counts?.quotes || 0}</span><span className="lbl">Cotiz.</span></div>
                    <div className="stat-sm"><span className="val">{info.record_counts?.invoices || 0}</span><span className="lbl">Facturas</span></div>
                    <div className="stat-sm"><span className="val">{info.record_counts?.products || 0}</span><span className="lbl">Productos</span></div>
                    <div className="stat-sm"><span className="val">{info.record_counts?.users || 0}</span><span className="lbl">Usuarios</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Zona de Peligro / Reset */}
          <div className="card" style={{ border: '2px solid #fee2e2', background: '#fffcfc' }}>
            <h3 style={{ fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', gap:8, color:'#b91c1c', fontSize:15 }}>
              <ShieldAlert size={18}/> Zona de Peligro
            </h3>
            <p style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5, marginBottom: 16 }}>
              ¿Vas a iniciar con una <strong>empresa nueva</strong>? Esta herramienta borrará todos los contactos, cotizaciones, productos y ventas actuales, dejando el sistema en blanco.
            </p>
            <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResetModal(true)}>
              <AlertTriangle size={16}/> Limpiar sistema
            </button>
          </div>
        </div>

      </div>

      {/* --- MODAL RESTAURAR DESDE ARCHIVO --- */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRestoreModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Restaurar desde archivo externo</h3>
              <button className="btn-icon" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUploadRestore}>
              <div className="modal-body">
                <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, color: '#92400e', fontSize: 13, marginBottom: 16 }}>
                  <strong>Cuidado:</strong> Importar un archivo SQL reemplazará todos los datos existentes. Asegúrate de que el archivo sea un volcado válido de este sistema CRM.
                </div>
                <div className="input-group">
                  <label>Seleccionar archivo SQL</label>
                  <input 
                    type="file" 
                    accept=".sql" 
                    className="input" 
                    ref={fileInputRef}
                    onChange={(e) => setRestoreFile(e.target.files[0])}
                    required
                  />
                  {restoreFile && (
                    <p style={{ fontSize: 12, color: '#10b981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14}/> Archivo listo ({fmtBytes(restoreFile.size)})
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestoreModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={restoring || !restoreFile}>
                  <Upload size={16}/> {restoring ? 'Restaurando...' : 'Restaurar Sistema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RESETEAR SISTEMA --- */}
      {showResetModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResetModal(false)}>
          <div className="modal" style={{ maxWidth: 500, border: '2px solid #ef4444' }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20}/> Limpieza Total del Sistema
              </h3>
            </div>
            <form onSubmit={handleReset}>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: '#1e293b', marginBottom: 12, lineHeight: 1.6 }}>
                  Esta acción eliminará <strong>permanentemente</strong> toda la información de ventas, contactos, cotizaciones, productos y configuraciones operativas.
                </p>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  Se guardará una copia de seguridad automática antes de proceder por si cometes un error. La configuración principal (Nombre de empresa, Logo, SMTP) <strong>no se borrará</strong>.
                </p>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={keepUsers} 
                      onChange={(e) => setKeepUsers(e.target.checked)}
                      style={{ marginTop: 3, accentColor: '#0f766e', width: 16, height: 16 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Conservar usuarios creados</span>
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Si desmarcas esto, se borrarán todos los usuarios excepto los administradores.</p>
                    </div>
                  </label>
                </div>

                <div className="input-group">
                  <label style={{ color: '#b91c1c', fontWeight: 600 }}>
                    Para confirmar, escribe "RESETEAR SISTEMA" a continuación:
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    style={{ borderColor: resetConfirm === 'RESETEAR SISTEMA' ? '#10b981' : '#ef4444', borderWidth: 2 }}
                    placeholder="RESETEAR SISTEMA"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ background: '#fef2f2', borderTop: '1px solid #fee2e2' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn btn-danger" 
                  disabled={resetting || resetConfirm !== 'RESETEAR SISTEMA'}
                >
                  <Trash2 size={16}/> {resetting ? 'Borrando...' : '¡Sí, borrar todos los datos!'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ESTILOS INLINE PARA STATS (Se pueden mover al CSS global) --- */}
      <style>{`
        .stat-sm {
          background: #f1f5f9;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .stat-sm .val { font-size: 16px; font-weight: 700; color: #0f766e; }
        .stat-sm .lbl { font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; margin-top: 2px; }
      `}</style>
    </div>
  );
}
