import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Copy, ExternalLink, Mail, Phone, RefreshCw, Search, UserPlus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUSES = [
  ['pendiente', 'Pendiente'],
  ['contactada', 'Contactada'],
  ['volver_contactar', 'Volver a contactar'],
  ['ya_realadvisor', 'Ya está en RealAdvisor'],
  ['no_interesa', 'No interesa'],
  ['no_localizable', 'No localizable'],
];

const statusLabel = Object.fromEntries(STATUSES);

const spanishPhone = value => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('0034')) digits = digits.slice(4);
  if (digits.startsWith('34') && digits.length === 11) digits = digits.slice(2);
  return digits.length === 9 ? `+34 ${digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}` : value;
};

export default function DailyProspecting() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState('');
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  const load = async (requestedDate = date) => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.get('/prospecting', { params: { date: requestedDate || undefined, status: filter, search } }),
        api.get('/prospecting/summary'),
      ]);
      setItems(list.data.items);
      setDate(list.data.date ? String(list.data.date).slice(0, 10) : '');
      setSummary(stats.data);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo cargar la prospección'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const counts = useMemo(() => {
    const result = { todos: items.length };
    items.forEach(item => { result[item.status] = (result[item.status] || 0) + 1; });
    return result;
  }, [items]);

  const copy = async (value, key) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success('Copiado');
    setTimeout(() => setCopied(''), 1200);
  };

  const patch = async (item, changes, silent = false) => {
    const previous = items;
    setItems(current => current.map(row => row.id === item.id ? { ...row, ...changes } : row));
    try {
      await api.patch(`/prospecting/${item.id}`, {
        status: changes.status ?? item.status,
        notes: changes.notes ?? item.notes,
        follow_up_at: changes.follow_up_at ?? item.follow_up_at,
      });
      if (!silent) toast.success('Actualizado');
    } catch (error) {
      setItems(previous);
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    }
  };

  const convert = async item => {
    try {
      await api.post(`/prospecting/${item.id}/convert`);
      toast.success('Agencia convertida en contacto y oportunidad');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo convertir'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Prospección diaria</h1><p>20 agencias nuevas al día, organizadas para contactar sin duplicados</p></div>
        <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={16}/>Actualizar</button>
      </div>

      <div className="followup-summary">
        <div className="followup-filter active"><span>Lista del día</span><strong>{items.length}</strong></div>
        <div className="followup-filter"><span>Pendientes</span><strong>{items.filter(i=>i.status==='pendiente').length}</strong></div>
        <div className="followup-filter"><span>Contactadas</span><strong>{items.filter(i=>i.status==='contactada').length}</strong></div>
        <div className="followup-filter"><span>Histórico total</span><strong>{summary?.history || 0}</strong></div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
          <div className="input-group" style={{margin:0,minWidth:170}}><label>Fecha de lista</label><input className="input" type="date" value={date} onChange={e=>{setDate(e.target.value);load(e.target.value);}}/></div>
          <div className="input-group" style={{margin:0,flex:1,minWidth:220}}><label>Buscar</label><div style={{position:'relative'}}><Search size={15} style={{position:'absolute',left:11,top:12,color:'#94a3b8'}}/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Agencia, ciudad, teléfono o correo" style={{paddingLeft:34}}/></div></div>
          <button className="btn btn-primary" onClick={()=>load()}>Buscar</button>
        </div>
        <div className="tabs" style={{marginTop:14,marginBottom:0,overflowX:'auto'}}>
          <button className={`tab ${filter==='todos'?'active':''}`} onClick={()=>setFilter('todos')}>Todos</button>
          {STATUSES.map(([value,label])=><button key={value} className={`tab ${filter===value?'active':''}`} onClick={()=>setFilter(value)}>{label}</button>)}
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? <div className="spinner"/> : !items.length ? (
          <div className="empty-state"><Building2 size={40}/><h3>No hay agencias para esta selección</h3><p>La primera lista aparecerá aquí cuando termine la carga diaria.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agencia</th><th>Contacto público</th><th>Estado</th><th>Comentarios</th><th>Volver a contactar</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{minWidth:190}}>
                      <p style={{fontWeight:700,color:'#173b60'}}>{item.agency_name}</p>
                      <p style={{fontSize:11,color:'#64748b',marginTop:3}}>{[item.city,item.province].filter(Boolean).join(' · ') || item.zone || 'España'}</p>
                      {item.website && <a href={item.website} target="_blank" rel="noreferrer" style={{fontSize:11,display:'inline-flex',gap:4,alignItems:'center',marginTop:5}}>Abrir web <ExternalLink size={11}/></a>}
                    </td>
                    <td style={{minWidth:190}}>
                      {item.phone && <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}><Phone size={13}/><span>{spanishPhone(item.phone)}</span><button className="btn-icon" onClick={()=>copy(spanishPhone(item.phone),`p${item.id}`)}>{copied===`p${item.id}`?<Check size={13}/>:<Copy size={13}/>}</button></div>}
                      {item.email && <div style={{display:'flex',alignItems:'center',gap:5}}><Mail size={13}/><span style={{maxWidth:170,overflow:'hidden',textOverflow:'ellipsis'}}>{item.email}</span><button className="btn-icon" onClick={()=>copy(item.email,`e${item.id}`)}>{copied===`e${item.id}`?<Check size={13}/>:<Copy size={13}/>}</button></div>}
                      {!item.phone && !item.email && <span className="text-muted text-sm">Ver web</span>}
                    </td>
                    <td><select className="input" value={item.status} onChange={e=>patch(item,{status:e.target.value})} style={{minWidth:165,padding:'7px 8px'}}>{STATUSES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td>
                    <td><textarea className="input" rows={2} value={item.notes || ''} onChange={e=>setItems(current=>current.map(row=>row.id===item.id?{...row,notes:e.target.value}:row))} onBlur={()=>patch(item,{notes:item.notes || ''},true)} placeholder="Resultado, persona, objeción…" style={{minWidth:210,resize:'vertical'}}/></td>
                    <td><input className="input" type="datetime-local" value={item.follow_up_at?.slice(0,16) || ''} onChange={e=>patch(item,{follow_up_at:e.target.value,status:e.target.value?'volver_contactar':item.status})} style={{minWidth:175,padding:'7px 8px'}}/></td>
                    <td>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {item.phone && <a className="btn btn-secondary btn-sm" href={`tel:${spanishPhone(item.phone).replace(/\s/g,'')}`}><Phone size={13}/>Llamar</a>}
                        {!item.converted_contact_id ? <button className="btn btn-primary btn-sm" onClick={()=>convert(item)}><UserPlus size={13}/>Convertir</button> : <span className="badge badge-green">Convertida</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {summary?.date && <p style={{fontSize:11,color:'#94a3b8',marginTop:10}}>Última lista cargada: {String(summary.date).slice(0,10)} · Los datos proceden de fuentes comerciales públicas y conviene verificarlos antes de contactar.</p>}
    </div>
  );
}
