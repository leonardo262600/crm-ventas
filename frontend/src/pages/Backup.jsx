import React, { useEffect, useState } from 'react';
import { DatabaseBackup, Download, RefreshCw, Trash2, HardDrive, FileClock, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtBytes = bytes => {
  if (!bytes) return '0 KB';
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
};

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [label, setLabel] = useState('');

  const loadData = async () => {
    try {
      const [list, systemInfo] = await Promise.all([
        api.get('/backup/list'),
        api.get('/backup/info'),
      ]);
      setBackups(list.data);
      setInfo(systemInfo.data);
    } catch {
      toast.error('No se pudieron cargar las copias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const generate = async event => {
    event.preventDefault();
    setGenerating(true);
    try {
      const { data } = await api.post('/backup/generate', { label });
      toast.success(`Copia creada (${fmtBytes(data.size)})`);
      setLabel('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo generar la copia');
    } finally {
      setGenerating(false);
    }
  };

  const download = async filename => {
    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch(`/api/backup/download/${encodeURIComponent(filename)}`, {
        headers: { Authorization:`Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar la copia');
    }
  };

  const remove = async filename => {
    if (!window.confirm('¿Eliminar esta copia de seguridad?')) return;
    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      toast.success('Copia eliminada');
      loadData();
    } catch {
      toast.error('No se pudo eliminar la copia');
    }
  };

  if (loading && !info) return <div className="spinner"/>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
            <DatabaseBackup size={24} color="#0f766e"/>Copias de seguridad
          </h1>
          <p>Protege la información comercial acumulada en el CRM</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <h3 style={{ display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:16, marginBottom:8 }}>
          <ShieldCheck size={18}/>Crear una copia
        </h3>
        <p style={{ color:'#64748b', fontSize:13, marginBottom:16 }}>
          Genera una copia antes de cambios importantes. Descárgala después para conservarla fuera del servidor.
        </p>
        <form onSubmit={generate} style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
          <div className="input-group" style={{ flex:'1 1 280px' }}>
            <label>Nombre opcional</label>
            <input
              className="input"
              value={label}
              onChange={e=>setLabel(e.target.value)}
              placeholder="Ej.: cierre_julio"
              pattern="[a-zA-Z0-9_-]+"
            />
          </div>
          <button className="btn btn-primary" disabled={generating}>
            <RefreshCw size={15} style={generating ? { animation:'spin 1s linear infinite' } : {}}/>
            {generating ? 'Generando…' : 'Generar copia'}
          </button>
        </form>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap:20, alignItems:'start' }}>
        <div className="card">
          <h3 style={{ display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:16, marginBottom:16 }}>
            <HardDrive size={18}/>Copias disponibles
          </h3>
          {!backups.length ? (
            <div className="empty-state">
              <FileClock size={40}/>
              <p style={{ fontWeight:600, marginTop:10 }}>Todavía no hay copias</p>
              <p style={{ fontSize:13, marginTop:4 }}>La primera aparecerá aquí cuando la generes.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Tamaño</th><th>Fecha</th><th></th></tr></thead>
                <tbody>
                  {backups.map((backup, index)=>(
                    <tr key={backup.filename}>
                      <td>
                        <strong>{backup.label || backup.filename}</strong>
                        {index === 0 && <span className="badge badge-green" style={{ marginLeft:8 }}>Última</span>}
                      </td>
                      <td>{fmtBytes(backup.size)}</td>
                      <td>{format(new Date(backup.created_at), 'dd/MM/yyyy · HH:mm')}</td>
                      <td>
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
                          <button className="btn-icon" title="Descargar" onClick={()=>download(backup.filename)}><Download size={15}/></button>
                          <button className="btn-icon" title="Eliminar" style={{ color:'#dc2626' }} onClick={()=>remove(backup.filename)}><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="card">
          <h3 style={{ fontSize:15, marginBottom:14 }}>Estado</h3>
          <div style={{ display:'grid', gap:12, fontSize:13 }}>
            <div><span style={{ color:'#64748b' }}>Tamaño de datos</span><strong style={{ display:'block', fontSize:18 }}>{fmtBytes(info?.db_size)}</strong></div>
            <div><span style={{ color:'#64748b' }}>Copias disponibles</span><strong style={{ display:'block', fontSize:18 }}>{info?.backup_count || 0}</strong></div>
            <div><span style={{ color:'#64748b' }}>Última copia</span><strong style={{ display:'block' }}>{info?.last_backup ? format(new Date(info.last_backup), 'dd/MM/yyyy · HH:mm') : 'Sin copias'}</strong></div>
          </div>
          <p style={{ marginTop:18, padding:12, borderRadius:10, background:'#eff6ff', color:'#1d4ed8', fontSize:12, lineHeight:1.5 }}>
            Recomendación: descarga una copia periódicamente y guárdala en una ubicación segura.
          </p>
        </aside>
      </div>
    </div>
  );
}
