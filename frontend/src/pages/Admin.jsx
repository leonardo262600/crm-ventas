import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, X, Settings, Shield, Database, Layers,
  Building2, Mail, Server, Download, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS_PRESET = ['#6B7280','#3B82F6','#F59E0B','#8B5CF6','#10B981','#EF4444','#EC4899','#0EA5E9'];
const fmtBytes = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

export default function Admin() {
  const [tab, setTab] = useState('etapas');

  // ── Pipeline stages ──
  const [stages, setStages]   = useState([]);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ name:'', color:'#3B82F6', order_index:0 });
  const [editId, setEditId]   = useState(null);

  // ── Audit ──
  const [audit, setAudit]     = useState([]);

  // ── Stats ──
  const [stats, setStats]     = useState({});

  // ── Settings ──
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Backups ──
  const [backups, setBackups]     = useState([]);
  const [runningBackup, setRunningBackup] = useState(false);

  const loadStages  = () => api.get('/admin/pipeline-stages').then(r => setStages(r.data));
  const loadAudit   = () => api.get('/admin/audit').then(r => setAudit(r.data)).catch(() => {});
  const loadStats   = () => api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  const loadSettings = () => api.get('/admin/settings').then(r => setSettings(r.data)).catch(() => {});
  const loadBackups  = () => api.get('/admin/backups').then(r => setBackups(r.data)).catch(() => {});

  useEffect(() => {
    loadStages(); loadStats();
    if (tab === 'auditoria') loadAudit();
    if (tab === 'configuracion') loadSettings();
    if (tab === 'backup') loadBackups();
  }, [tab]);

  // ── Stage CRUD ──
  const openNew  = () => { setForm({ name:'', color:'#3B82F6', order_index: stages.length + 1 }); setEditId(null); setModal(true); };
  const openEdit = s  => { setForm(s); setEditId(s.id); setModal(true); };

  const saveStage = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/admin/pipeline-stages/${editId}`, form); toast.success('Etapa actualizada'); }
      else        { await api.post('/admin/pipeline-stages', form); toast.success('Etapa creada'); }
      setModal(false); loadStages();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const delStage = async id => {
    if (!confirm('¿Eliminar esta etapa? Las oportunidades asociadas quedarán sin etapa.')) return;
    await api.delete(`/admin/pipeline-stages/${id}`); toast.success('Eliminada'); loadStages();
  };

  // ── Settings save ──
  const saveSettings = async e => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post('/admin/settings', settings);
      toast.success('Configuración guardada');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSavingSettings(false); }
  };

  const setSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  // ── Backup ──
  const doBackup = async () => {
    setRunningBackup(true);
    try {
      const r = await api.post('/admin/backup');
      toast.success(`Backup creado: ${r.data.filename} (${fmtBytes(r.data.size)})`);
      loadBackups();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al generar backup'); }
    finally { setRunningBackup(false); }
  };

  const downloadBackup = async filename => {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`/api/admin/backups/${filename}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    URL.revokeObjectURL(link.href);
  };

  const TABS = [
    ['etapas', 'Pipeline / Etapas', Layers],
    ['configuracion', 'Configuración', Settings],
    ['backup', 'Backup BD', Database],
    ['auditoria', 'Auditoría', Shield],
    ['resumen', 'Resumen', Building2],
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1>Administración</h1><p>Configuración del sistema y auditoría</p></div>
      </div>

      <div className="tabs">
        {TABS.map(([v, l, Icon]) => (
          <button key={v} className={`tab ${tab===v?'active':''}`} onClick={() => setTab(v)}>
            <Icon size={14} style={{ marginRight: 5 }} />{l}
          </button>
        ))}
      </div>

      {/* ── ETAPAS ── */}
      {tab === 'etapas' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary" onClick={openNew}><Plus size={16}/>Nueva etapa</button>
          </div>
          <div className="card">
            <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
              Personaliza las etapas del pipeline de ventas. El orden define la secuencia en el Kanban.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stages.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'#f8fafc', borderRadius:10, borderLeft:`4px solid ${s.color}` }}>
                  <div style={{ width:18, height:18, borderRadius:4, background:s.color, flexShrink:0 }} />
                  <span style={{ fontWeight:600, flex:1 }}>{s.name}</span>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>Orden: {s.order_index}</span>
                  {s.is_default ? <span className="badge badge-green">Predeterminada</span> : null}
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn-icon" onClick={() => openEdit(s)}>✏</button>
                    {!s.is_default && <button className="btn-icon" style={{ color:'#ef4444' }} onClick={() => delStage(s.id)}><X size={14}/></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURACIÓN ── */}
      {tab === 'configuracion' && (
        <form onSubmit={saveSettings}>
          {/* Datos de la empresa */}
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Building2 size={18} color="#0f766e"/> Datos de la empresa
            </h3>
            <div className="form-grid">
              <div className="input-group"><label>Nombre de la empresa</label><input className="input" value={settings.company_name||''} onChange={e=>setSetting('company_name',e.target.value)} /></div>
              <div className="input-group"><label>RUC / NIF</label><input className="input" value={settings.company_ruc||''} onChange={e=>setSetting('company_ruc',e.target.value)} /></div>
              <div className="input-group"><label>Email corporativo</label><input className="input" type="email" value={settings.company_email||''} onChange={e=>setSetting('company_email',e.target.value)} /></div>
              <div className="input-group"><label>Teléfono</label><input className="input" value={settings.company_phone||''} onChange={e=>setSetting('company_phone',e.target.value)} /></div>
              <div className="input-group"><label>Sitio web</label><input className="input" type="url" value={settings.company_website||''} onChange={e=>setSetting('company_website',e.target.value)} placeholder="https://..." /></div>
              <div className="input-group"><label>Moneda</label>
                <select className="input" value={settings.currency||'PEN'} onChange={e=>setSetting('currency',e.target.value)}>
                  <option value="PEN">PEN — Sol Peruano (S/)</option>
                  <option value="USD">USD — Dólar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="MXN">MXN — Peso Mexicano ($)</option>
                  <option value="COP">COP — Peso Colombiano ($)</option>
                </select>
              </div>
              <div className="input-group" style={{ gridColumn:'1/-1' }}><label>Dirección</label><input className="input" value={settings.company_address||''} onChange={e=>setSetting('company_address',e.target.value)} /></div>
              <div className="input-group" style={{ gridColumn:'1/-1' }}><label>Pie de página en cotizaciones</label><textarea className="input" rows={2} value={settings.quote_footer||''} onChange={e=>setSetting('quote_footer',e.target.value)} style={{resize:'vertical'}} placeholder="Texto que aparecerá al final de cada cotización PDF..." /></div>
            </div>
          </div>

          {/* SMTP */}
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
              <Mail size={18} color="#0f766e"/> Configuración de Email (SMTP)
            </h3>
            <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>
              Configura el servidor de correo para envío real de emails desde el CRM.
            </p>
            <div className="form-grid">
              <div className="input-group"><label>Servidor SMTP</label><input className="input" value={settings.smtp_host||''} onChange={e=>setSetting('smtp_host',e.target.value)} placeholder="smtp.gmail.com" /></div>
              <div className="input-group"><label>Puerto</label><input className="input" type="number" value={settings.smtp_port||'587'} onChange={e=>setSetting('smtp_port',e.target.value)} /></div>
              <div className="input-group"><label>Usuario / Email</label><input className="input" value={settings.smtp_user||''} onChange={e=>setSetting('smtp_user',e.target.value)} /></div>
              <div className="input-group">
                <label>Contraseña {settings.smtp_pass_set && <span style={{color:'#10b981',fontSize:11}}>✓ ya configurada</span>}</label>
                <input className="input" type="password" placeholder={settings.smtp_pass_set ? '••••••••' : 'Nueva contraseña'} onChange={e=>setSetting('smtp_pass',e.target.value)} />
              </div>
              <div className="input-group"><label>Nombre/email remitente</label><input className="input" value={settings.smtp_from||''} onChange={e=>setSetting('smtp_from',e.target.value)} placeholder="CRM Ventas &lt;noreply@miempresa.com&gt;" /></div>
              <div className="input-group" style={{ display:'flex', alignItems:'center', paddingTop:24 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!settings.smtp_secure} onChange={e=>setSetting('smtp_secure',e.target.checked)} />
                  <span>Usar SSL/TLS (puerto 465)</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      )}

      {/* ── BACKUP ── */}
      {tab === 'backup' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h3 style={{ fontWeight:700, display:'flex', alignItems:'center', gap:8 }}><Database size={18} color="#0f766e"/>Backup de Base de Datos</h3>
                <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>Genera un dump SQL completo de la base de datos. Los backups se guardan en <code>backend/backups/</code> (últimos 14).</p>
              </div>
              <button className="btn btn-primary" onClick={doBackup} disabled={runningBackup}>
                <RefreshCw size={15} style={{ animation: runningBackup ? 'spin 1s linear infinite' : 'none' }} />
                {runningBackup ? 'Generando...' : 'Generar backup ahora'}
              </button>
            </div>

            {/* Lista de backups */}
            {backups.length === 0 ? (
              <div className="empty-state"><Database size={36}/><p>Sin backups generados</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={b.filename}>
                        <td style={{ fontFamily:'monospace', fontSize:12 }}>
                          {i === 0 && <span className="badge badge-green" style={{marginRight:6}}>Último</span>}
                          {b.filename}
                        </td>
                        <td>{fmtBytes(b.size)}</td>
                        <td style={{ fontSize:12, color:'#64748b' }}>{format(new Date(b.created_at), 'dd/MM/yyyy HH:mm')}</td>
                        <td>
                          <button className="btn-icon" title="Descargar" onClick={() => downloadBackup(b.filename)}>
                            <Download size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
            <h4 style={{ fontWeight:600, color:'#166534', display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle2 size={16}/> Recomendaciones
            </h4>
            <ul style={{ fontSize:13, color:'#15803d', marginTop:8, paddingLeft:20, lineHeight:1.8 }}>
              <li>Genera backups diarios antes de actualizaciones importantes</li>
              <li>Descarga y guarda los backups en un almacenamiento externo (Drive, S3, etc.)</li>
              <li>Verifica regularmente que los archivos .sql sean válidos</li>
              <li>Para producción, configura un cron: <code>0 2 * * * curl -X POST /api/admin/backup -H "Authorization: Bearer TOKEN"</code></li>
            </ul>
          </div>
        </div>
      )}

      {/* ── AUDITORÍA ── */}
      {tab === 'auditoria' && (
        <div className="card">
          <h3 style={{ fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={18} color="#0f766e"/>Log de auditoría
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Acción</th><th>Tabla</th><th>ID registro</th><th>IP</th><th>Fecha</th></tr></thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight:500 }}>{a.user_name || '—'}</td>
                    <td><span className="badge badge-blue">{a.action}</span></td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{a.table_name || '—'}</td>
                    <td>{a.record_id || '—'}</td>
                    <td style={{ fontSize:12, color:'#94a3b8' }}>{a.ip || '—'}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{a.created_at ? format(new Date(a.created_at), 'dd/MM/yy HH:mm') : '—'}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'#94a3b8', padding:24 }}>Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <div>
          <div className="stats-grid">
            {[
              { label:'Usuarios activos',    value: stats.users || 0,         color:'#3B82F6', bg:'#dbeafe' },
              { label:'Contactos',           value: stats.contacts || 0,      color:'#10B981', bg:'#d1fae5' },
              { label:'Oportunidades',       value: stats.opportunities || 0, color:'#F59E0B', bg:'#fef3c7' },
              { label:'Productos activos',   value: stats.products || 0,      color:'#8B5CF6', bg:'#ede9fe' },
              { label:'Cotizaciones',        value: stats.quotes || 0,        color:'#0f766e', bg:'#ccfbf1' },
              { label:'Actividades',         value: stats.activities || 0,    color:'#EC4899', bg:'#fce7f3' },
            ].map(({ label, value, color, bg }) => (
              <div className="stat-card" key={label}>
                <div className="stat-icon" style={{ background:bg }}>
                  <Database size={22} color={color}/>
                </div>
                <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop:20 }}>
            <h3 style={{ fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Server size={18} color="#0f766e"/>Información del sistema
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                { label:'Base de datos', value:'MySQL (ventas_crm)' },
                { label:'Backend',       value:'Node.js + Express v4' },
                { label:'Frontend',      value:'React 18 + Vite 5' },
                { label:'Autenticación', value:'JWT + bcrypt' },
                { label:'API',           value:'REST + CORS habilitado' },
                { label:'Versión CRM',   value:'1.1.0' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:8 }}>
                  <p style={{ fontSize:11, color:'#94a3b8', fontWeight:500, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</p>
                  <p style={{ fontWeight:600, fontSize:14, marginTop:4 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Stage ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar etapa' : 'Nueva etapa del pipeline'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={saveStage}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Nombre *</label>
                    <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                  </div>
                  <div className="input-group"><label>Orden</label>
                    <input className="input" type="number" min="1" value={form.order_index} onChange={e => setForm(f => ({...f, order_index: e.target.value}))} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Color</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                    {COLORS_PRESET.map(c => (
                      <div key={c} onClick={() => setForm(f => ({...f, color:c}))}
                        style={{ width:28, height:28, borderRadius:6, background:c, cursor:'pointer', border: form.color===c ? '3px solid #1e293b' : '3px solid transparent' }}
                      />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))}
                      style={{ width:28, height:28, padding:0, border:'none', borderRadius:6, cursor:'pointer' }} />
                  </div>
                </div>
                <div style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:8 }}>
                  <p style={{ fontSize:13, color:'#64748b', marginBottom:6 }}>Vista previa:</p>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, border:`2px solid ${form.color}`, color: form.color }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:form.color }} />
                    <span style={{ fontWeight:600 }}>{form.name || 'Nombre de etapa'}</span>
                  </div>
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
