import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, CalendarPlus, Check, ClipboardPaste, Link2, Mail, Pencil, Phone, RefreshCw, Search, Settings, UserPlus, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency as fmt } from '../utils/format';

const STATUSES = [
  ['pendiente', 'Pendiente'],
  ['llamar', 'Llamar'],
  ['contactada', 'Contactada'],
  ['volver_contactar', 'Volver a contactar'],
  ['agendada', 'Agendada'],
  ['ya_realadvisor', 'Ya está en RealAdvisor'],
  ['no_interesa', 'No interesa'],
  ['no_localizable', 'No localizable'],
];

const statusLabel = Object.fromEntries(STATUSES);
const CRM_CHECKS = [
  ['pendiente', 'Sin revisar'],
  ['si', 'Sí'],
  ['no', 'No'],
];

const spanishPhone = value => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('0034')) digits = digits.slice(4);
  if (digits.startsWith('34') && digits.length === 11) digits = digits.slice(2);
  return digits.length === 9 ? `+34 ${digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}` : value;
};

const websiteName = value => {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, '');
  } catch { return value; }
};

const websiteUrl = value => /^https?:\/\//i.test(value) ? value : `https://${value}`;

const prospectPostalCode = item => item.postal_code || String(item.address || '').match(/\b\d{5}\b/)?.[0] || '';
const hasExtraDetails = item => Boolean(String(item.extra_info || '').trim());
const qualificationClass = level => `prospect-priority prospect-priority-${String(level || 'c').toLowerCase()}`;

export default function DailyProspecting({ personalMode = false }) {
  const { user } = useAuth();
  const isSetter = user?.role === 'setter';
  const isAdmin = user?.role === 'admin';
  const isPersonalCalls = personalMode && isAdmin;
  const operatorView = isSetter || isPersonalCalls;
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState('');
  const [filter, setFilter] = useState(() => operatorView ? 'llamar' : 'pendiente');
  const [crmCheckFilter, setCrmCheckFilter] = useState('todos');
  const [assigneeFilter, setAssigneeFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [editing, setEditing] = useState(null);
  const [workLine, setWorkLine] = useState(() => localStorage.getItem('crm_work_line') || '');
  const [showLineSettings, setShowLineSettings] = useState(false);
  const [followUp, setFollowUp] = useState(null);
  const [booking, setBooking] = useState(null);

  const load = async (requestedDate = date) => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.get('/prospecting', { params: {
          date: requestedDate || undefined,
          status: filter,
          search,
          crm_check: isAdmin && !isPersonalCalls && crmCheckFilter !== 'todos' ? crmCheckFilter : undefined,
          assigned_to: isAdmin && !isPersonalCalls && assigneeFilter !== 'todos' ? assigneeFilter : undefined,
          limit:100,
          mine: isPersonalCalls ? 1 : undefined,
        } }),
        api.get('/prospecting/summary', { params: {
          mine: isPersonalCalls ? 1 : undefined,
          date: requestedDate || undefined,
        } }),
      ]);
      setItems(list.data.items);
      setDate(list.data.date ? String(list.data.date).slice(0, 10) : '');
      setSummary(stats.data);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo cargar la prospección'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, crmCheckFilter, assigneeFilter]);

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
    setItems(current => current
      .map(row => row.id === item.id ? { ...row, ...changes } : row)
      .filter(row => (filter === 'todos' || row.status === filter)
        && (crmCheckFilter === 'todos' || row.realadvisor_crm_check === crmCheckFilter)
        && (assigneeFilter === 'todos'
          || (assigneeFilter === 'unassigned' ? !row.assigned_to : Number(row.assigned_to) === Number(assigneeFilter)))));
    try {
      await api.patch(`/prospecting/${item.id}`, changes);
      if (!silent) toast.success('Actualizado');
    } catch (error) {
      setItems(previous);
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    }
  };

  const assignProspect = (item, value) => {
    const assignedTo = value ? Number(value) : null;
    patch(item, {
      assigned_to: assignedTo,
      assigned_name: summary?.assignments?.find(person => Number(person.id) === assignedTo)?.name || null,
      ...(assignedTo && item.status === 'pendiente' ? { status:'llamar' } : {}),
    });
  };

  const saveDetails = async () => {
    try {
      await api.patch(`/prospecting/${editing.id}`, editing);
      setItems(current => current.map(row => row.id === editing.id ? editing : row));
      setEditing(null);
      toast.success('Información guardada');
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo guardar'); }
  };

  const saveWorkLine = () => {
    const normalized = spanishPhone(workLine);
    setWorkLine(normalized);
    localStorage.setItem('crm_work_line', normalized);
    setShowLineSettings(false);
    toast.success('Línea de trabajo guardada');
  };

  const call = item => {
    if (workLine) {
      const ok = window.confirm(`Vas a llamar a ${spanishPhone(item.phone)}.\n\nComprueba que el iPhone use tu línea de trabajo: ${workLine}`);
      if (!ok) return;
    }
    window.location.href = `tel:${spanishPhone(item.phone).replace(/\s/g,'')}`;
  };

  const openFollowUp = item => {
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
    next.setHours(10, 0, 0, 0);
    const localDefault = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    setFollowUp({ item, scheduled_at: item.follow_up_at?.slice(0,16) || localDefault });
  };

  const saveFollowUp = async () => {
    try {
      await api.post(`/prospecting/${followUp.item.id}/follow-up`, { scheduled_at: followUp.scheduled_at });
      setItems(current => current.map(row => row.id === followUp.item.id
        ? {...row,status:'volver_contactar',follow_up_at:followUp.scheduled_at}
        : row));
      setFollowUp(null);
      toast.success('Tarea de llamada creada');
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo crear la tarea'); }
  };

  const CopyButton = ({value, copyKey, title}) => (
    <button className="prospect-copy" title={title || 'Copiar'} onClick={()=>copy(value,copyKey)}>
      {copied===copyKey?<Check size={11}/>:<ClipboardPaste size={11}/>}
    </button>
  );

  const convert = async item => {
    try {
      await api.post(`/prospecting/${item.id}/convert`);
      toast.success('Agencia convertida en contacto y oportunidad');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo convertir'); }
  };

  const openBooking = item => {
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
    next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
    const localDefault = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    setBooking({ item, demo_date: localDefault });
  };

  const saveBooking = async () => {
    if (!booking?.demo_date) return toast.error('Selecciona fecha y hora');
    try {
      const { data } = await api.post(`/prospecting/${booking.item.id}/schedule-demo`, { demo_date: booking.demo_date });
      setItems(current => current
        .map(row => row.id === booking.item.id ? {...row,status:'agendada',follow_up_at:booking.demo_date,converted_contact_id:data.contact_id} : row)
        .filter(row => filter === 'todos' || row.status === filter));
      setBooking(null);
      toast.success(`Demo agendada y asignada a ${data.assigned_to}`);
      const stats = await api.get('/prospecting/summary', { params: { mine: isPersonalCalls ? 1 : undefined } });
      setSummary(stats.data);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo agendar la demo'); }
  };

  const summaryCount = status => Number(summary?.statuses?.find(row => row.status === status)?.total || 0);
  const visibleStatuses = operatorView ? STATUSES.filter(([value]) => value !== 'pendiente') : STATUSES;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isPersonalCalls ? 'Mis llamadas' : isSetter ? 'Panel de llamadas' : 'Prospección diaria'}</h1>
          <p>{operatorView ? 'Agencias asignadas exclusivamente a ti para llamar y convertir en reuniones' : '100 agencias cualificadas al día, ordenadas por potencial comercial y sin duplicados'}</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={()=>setShowLineSettings(true)}><Settings size={15}/>{workLine ? `Línea: ${workLine}` : 'Configurar línea'}</button>
          <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={16}/>Actualizar</button>
        </div>
      </div>

      <div className="followup-summary prospect-summary" style={operatorView ? {gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12} : undefined}>
        <div className="followup-filter prospect-stat prospect-stat-day active"><span className="notranslate" translate="no">{operatorView ? 'Para llamar' : 'Lista del día'}</span><strong>{operatorView ? summaryCount('llamar') : Number(summary?.day_total || 0)}</strong></div>
        <div className="followup-filter prospect-stat prospect-stat-pending"><span className="notranslate" translate="no">{operatorView ? 'Agendadas' : 'Pendientes'}</span><strong>{summaryCount(operatorView ? 'agendada' : 'pendiente')}</strong></div>
        <div className="followup-filter prospect-stat prospect-stat-call"><span className="notranslate" translate="no">{operatorView ? 'Contactadas' : 'Para llamar'}</span><strong>{summaryCount(operatorView ? 'contactada' : 'llamar')}</strong></div>
        <div className="followup-filter prospect-stat prospect-stat-contacted"><span className="notranslate" translate="no">{operatorView ? 'Volver a llamar' : 'Contactadas'}</span><strong>{summaryCount(operatorView ? 'volver_contactar' : 'contactada')}</strong></div>
        {operatorView && <div className="followup-filter" style={{borderTop:'4px solid #16a34a',padding:'12px 16px'}}><span>Ventas del mes</span><strong>{summary?.performance?.sales || 0}</strong></div>}
        {operatorView && <div className="followup-filter" style={{borderTop:'4px solid #db2777',padding:'12px 16px'}}><span>Mi comisión</span><strong style={{fontSize:20}}>{fmt(summary?.performance?.commission || 0)}</strong></div>}
        {!operatorView && <div className="followup-filter prospect-stat prospect-stat-history"><span className="notranslate" translate="no">Histórico total</span><strong>{summary?.history || 0}</strong></div>}
      </div>

      {isAdmin && !isPersonalCalls && summary?.assignments?.length > 0 && (
        <div className="prospect-assignment-summary">
          <span className="prospect-assignment-title">Llamadas pendientes por responsable</span>
          {summary.assignments.map(person => (
            <div key={person.id} className="prospect-assignment-counter">
              <span>{Number(person.id) === Number(user?.id) ? 'Yo' : person.name}</span>
              <strong>{Number(person.pending_calls || 0)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
          <div className="input-group" style={{margin:0,minWidth:170}}><label>Filtrar por fecha (opcional)</label><input className="input" type="date" value={date} onChange={e=>{setDate(e.target.value);load(e.target.value);}}/></div>
          {isAdmin && !isPersonalCalls && (
            <div className="input-group" style={{margin:0,minWidth:180}}>
              <label>CRM RealAdvisor</label>
              <select className="input" value={crmCheckFilter} onChange={e=>setCrmCheckFilter(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
                <option value="pendiente">Sin revisar</option>
              </select>
            </div>
          )}
          {isAdmin && !isPersonalCalls && (
            <div className="input-group" style={{margin:0,minWidth:180}}>
              <label>Setter</label>
              <select className="input" value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}>
                <option value="todos">Todos</option>
                {(summary?.assignments || []).map(person => (
                  <option key={person.id} value={person.id}>
                    {Number(person.id) === Number(user?.id) ? 'Leonardo' : person.name}
                  </option>
                ))}
                <option value="unassigned">Sin asignar</option>
              </select>
            </div>
          )}
          <div className="input-group" style={{margin:0,flex:1,minWidth:220}}><label>Buscar</label><div style={{position:'relative'}}><Search size={15} style={{position:'absolute',left:11,top:12,color:'#94a3b8'}}/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Agencia, ciudad, teléfono o correo" style={{paddingLeft:34}}/></div></div>
          <button className="btn btn-primary" onClick={()=>load()}>Buscar</button>
        </div>
        <div className="tabs" style={{marginTop:14,marginBottom:0,overflowX:'auto'}}>
          {visibleStatuses.map(([value,label])=><button key={value} className={`tab ${filter===value?'active':''}`} onClick={()=>setFilter(value)}>{label}</button>)}
          <button className={`tab ${filter==='todos'?'active':''}`} onClick={()=>setFilter('todos')}>Todos</button>
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? <div className="spinner"/> : !items.length ? (
          <div className="empty-state"><Building2 size={40}/><h3>No hay agencias para esta selección</h3><p>La primera lista aparecerá aquí cuando termine la carga diaria.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agencia</th><th>Contacto público</th><th>Estado</th><th>Comentarios</th><th style={{textAlign:'center'}}>Recordatorio</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{minWidth:190}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <p style={{fontWeight:700,color:'#173b60'}}>{item.agency_name}</p>
                        <CopyButton value={item.agency_name} copyKey={`n${item.id}`} title="Copiar nombre"/>
                      </div>
                      {item.qualification_score != null && (
                        <div className="prospect-qualification">
                          <span
                            className={qualificationClass(item.qualification_level)}
                            title={'¿Cómo se cualifica?\nEl puntaje se basa en señales comerciales públicas y verificables: teléfono, correo, web propia, dirección, código postal y presencia digital disponible.\nA: 75–100 · B: 50–74 · C: 0–49.'}
                          >
                            Prioridad {item.qualification_level || 'C'}
                          </span>
                          <strong
                            className="prospect-score"
                            title={[
                              item.qualification_reason,
                              item.call_angle ? `Enfoque: ${item.call_angle}` : null,
                            ].filter(Boolean).join('\n\n')}
                          >
                            {item.qualification_score}/100
                          </strong>
                        </div>
                      )}
                      <p style={{fontSize:11,color:'#64748b',marginTop:3}}>{[item.city,item.province].filter(Boolean).join(' · ') || item.zone || 'España'}</p>
                      {item.address && <div style={{display:'flex',alignItems:'center',gap:5,marginTop:5,maxWidth:250}}>
                        <p style={{fontSize:11,color:'#64748b',maxWidth:220,lineHeight:1.35}}>{item.address}</p>
                        <CopyButton value={item.address} copyKey={`a${item.id}`} title="Copiar dirección"/>
                      </div>}
                      {prospectPostalCode(item) && <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}>
                        <span style={{fontSize:11,color:'#475569'}}>CP {prospectPostalCode(item)}</span>
                        <CopyButton value={prospectPostalCode(item)} copyKey={`cp${item.id}`} title="Copiar código postal"/>
                      </div>}
                      {item.website && <div style={{display:'flex',gap:5,alignItems:'center',marginTop:5}}>
                        <span style={{fontSize:11,color:'#64748b',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{websiteName(item.website)}</span>
                        <a href={websiteUrl(item.website)} target="_blank" rel="noreferrer" title={`Abrir ${websiteName(item.website)} en una pestaña nueva`} className="prospect-web-link"><Link2 size={11}/></a>
                      </div>}
                    </td>
                    <td style={{minWidth:190}}>
                      {item.phone && <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4,fontSize:12,color:'#475569'}}><Phone size={12}/><span>{spanishPhone(item.phone)}</span><CopyButton value={spanishPhone(item.phone)} copyKey={`p${item.id}`}/></div>}
                      {item.secondary_phone && <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4,fontSize:12,color:'#475569'}}><Phone size={12}/><span>{spanishPhone(item.secondary_phone)}</span><CopyButton value={spanishPhone(item.secondary_phone)} copyKey={`p2${item.id}`}/></div>}
                      {item.email && <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4,fontSize:12,color:'#475569'}}><Mail size={12}/><span style={{maxWidth:155,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.email}</span><CopyButton value={item.email} copyKey={`e${item.id}`}/></div>}
                      {item.secondary_email && <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#475569'}}><Mail size={12}/><span style={{maxWidth:155,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.secondary_email}</span><CopyButton value={item.secondary_email} copyKey={`e2${item.id}`}/></div>}
                      {!item.phone && !item.secondary_phone && !item.email && !item.secondary_email && <span className="text-muted text-sm">Ver web</span>}
                    </td>
                    <td>
                      {isAdmin && !isPersonalCalls && (
                        <div className="prospect-admin-controls">
                          <div className="prospect-ra-check prospect-ra-check-status">
                            <span>CRM RealAdvisor</span>
                            <select
                              value={item.realadvisor_crm_check || 'pendiente'}
                              onChange={event => patch(item, { realadvisor_crm_check: event.target.value })}
                              className={`prospect-ra-select ra-${item.realadvisor_crm_check || 'pendiente'}`}
                              aria-label={`Existe en CRM RealAdvisor: ${item.agency_name}`}
                            >
                              {CRM_CHECKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>
                          <div className="prospect-assignee-control">
                            <span>Setter</span>
                            <select
                              className="prospect-assignee-select"
                              value={item.assigned_to || ''}
                              onChange={event => assignProspect(item, event.target.value)}
                              aria-label={`Responsable de ${item.agency_name}`}
                            >
                              <option value="">Sin asignar</option>
                              {(summary?.assignments || []).map(person => (
                                <option key={person.id} value={person.id}>
                                  {Number(person.id) === Number(user?.id) ? `Yo · ${person.name}` : person.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      <select className="input" value={item.status} onChange={e=>patch(item,{status:e.target.value})} style={{minWidth:165,padding:'7px 8px'}}>{visibleStatuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
                    </td>
                    <td><textarea className="input" rows={3} value={item.notes || ''} onChange={e=>setItems(current=>current.map(row=>row.id===item.id?{...row,notes:e.target.value}:row))} onBlur={()=>patch(item,{notes:item.notes || ''},true)} aria-label={`Comentarios de ${item.agency_name}`} style={{minWidth:210,minHeight:76,resize:'vertical',fontFamily:'inherit',fontSize:12,fontWeight:400,lineHeight:1.45}}/></td>
                    <td style={{textAlign:'center',minWidth:82}}>
                      <button className={`prospect-reminder ${item.follow_up_at?'scheduled':''}`} onClick={()=>openFollowUp(item)} title={item.follow_up_at ? `Tarea: ${new Date(item.follow_up_at).toLocaleString('es-ES')}` : 'Programar tarea de llamada'}><CalendarClock size={16}/></button>
                    </td>
                    <td style={{minWidth:285}}>
                      <div style={{display:'flex',gap:6,flexWrap:'nowrap',alignItems:'center'}}>
                        {item.phone && <button className="btn btn-sm btn-call-ready" onClick={()=>call(item)}><Phone size={13}/>Llamar</button>}
                        {operatorView && item.status !== 'agendada' && <button className="btn btn-primary btn-sm" onClick={()=>openBooking(item)}><CalendarPlus size={13}/>Agendar</button>}
                        <button
                          className={`btn btn-secondary btn-sm prospect-more-info ${hasExtraDetails(item)?'has-details':''}`}
                          onClick={()=>setEditing({...item})}
                          title={hasExtraDetails(item) ? 'Hay información adicional: revísala antes de llamar' : 'Añadir más información'}
                        >
                          <Pencil size={13}/>Más info
                          {hasExtraDetails(item) && <span className="prospect-info-alert" aria-label="Hay información adicional"/>}
                        </button>
                        {!operatorView && (!item.converted_contact_id ? <button className="btn btn-primary btn-sm" onClick={()=>convert(item)}><UserPlus size={13}/>Convertir</button> : <span className="badge badge-green">Convertida</span>)}
                        {item.status === 'agendada' && <span className="badge badge-green">Agendada</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header"><div><h3>Información de la agencia</h3><p className="text-muted text-sm">Completa aquí los datos públicos que encuentres en Google.</p></div><button className="btn-icon" onClick={()=>setEditing(null)}><X size={18}/></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group full"><label>Nombre</label><input className="input" value={editing.agency_name||''} onChange={e=>setEditing({...editing,agency_name:e.target.value})}/></div>
                <div className="input-group"><label>Persona de contacto</label><input className="input" value={editing.contact_person||''} onChange={e=>setEditing({...editing,contact_person:e.target.value})}/></div>
                <div className="input-group"><label>Teléfono principal</label><input className="input" value={editing.phone||''} onChange={e=>setEditing({...editing,phone:e.target.value})}/></div>
                <div className="input-group"><label>Teléfono adicional</label><input className="input" value={editing.secondary_phone||''} onChange={e=>setEditing({...editing,secondary_phone:e.target.value})}/></div>
                <div className="input-group"><label>Correo principal</label><input className="input" value={editing.email||''} onChange={e=>setEditing({...editing,email:e.target.value})}/></div>
                <div className="input-group"><label>Correo adicional</label><input className="input" value={editing.secondary_email||''} onChange={e=>setEditing({...editing,secondary_email:e.target.value})}/></div>
                <div className="input-group"><label>Web</label><input className="input" value={editing.website||''} onChange={e=>setEditing({...editing,website:e.target.value})}/></div>
                <div className="input-group"><label>Enlace de Google Maps</label><input className="input" value={editing.google_maps_url||''} onChange={e=>setEditing({...editing,google_maps_url:e.target.value})}/></div>
                <div className="input-group full"><label>Dirección</label><input className="input" value={editing.address||''} onChange={e=>setEditing({...editing,address:e.target.value})}/></div>
                <div className="input-group"><label>Código postal</label><input className="input" inputMode="numeric" maxLength={5} value={editing.postal_code||''} onChange={e=>setEditing({...editing,postal_code:e.target.value.replace(/\D/g,'').slice(0,5)})} placeholder="00000"/></div>
                <div className="input-group full"><label>Información adicional</label><textarea className="input" rows={3} value={editing.extra_info||''} onChange={e=>setEditing({...editing,extra_info:e.target.value})} style={{fontFamily:'inherit'}} placeholder="Horario, especialidad, datos encontrados, observaciones…"/></div>
                <div className="input-group"><label>Puntuación comercial</label><input className="input" type="number" min="0" max="100" value={editing.qualification_score??''} onChange={e=>setEditing({...editing,qualification_score:e.target.value})} placeholder="0–100"/></div>
                <div className="input-group"><label>Prioridad</label><select className="input" value={editing.qualification_level||''} onChange={e=>setEditing({...editing,qualification_level:e.target.value})}><option value="">Sin clasificar</option><option value="A">A · Alta</option><option value="B">B · Media</option><option value="C">C · Baja</option></select></div>
                <div className="input-group full"><label>Motivo de cualificación</label><textarea className="input" rows={2} value={editing.qualification_reason||''} onChange={e=>setEditing({...editing,qualification_reason:e.target.value})} style={{fontFamily:'inherit'}} placeholder="Señales públicas que justifican la prioridad…"/></div>
                <div className="input-group full"><label>Enfoque recomendado para la llamada</label><textarea className="input" rows={2} value={editing.call_angle||''} onChange={e=>setEditing({...editing,call_angle:e.target.value})} style={{fontFamily:'inherit'}} placeholder="Argumento principal para iniciar la conversación…"/></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveDetails}>Guardar</button></div>
          </div>
        </div>
      )}
      {showLineSettings && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowLineSettings(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header"><h3>Mi línea de trabajo</h3><button className="btn-icon" onClick={()=>setShowLineSettings(false)}><X size={18}/></button></div>
            <div className="modal-body">
              <p className="text-muted text-sm" style={{marginBottom:14}}>Se mostrará antes de cada llamada como recordatorio. Por seguridad, iPhone decide qué SIM utiliza y una web no puede forzarla.</p>
              <div className="input-group"><label>Número de trabajo</label><input className="input" type="tel" value={workLine} onChange={e=>setWorkLine(e.target.value)} placeholder="+34 600 000 000"/></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowLineSettings(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveWorkLine}>Guardar</button></div>
          </div>
        </div>
      )}
      {followUp && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setFollowUp(null)}>
          <div className="modal" style={{maxWidth:430}}>
            <div className="modal-header"><div><h3>Programar llamada</h3><p className="text-muted text-sm">{followUp.item.agency_name}</p></div><button className="btn-icon" onClick={()=>setFollowUp(null)}><X size={18}/></button></div>
            <div className="modal-body">
              <div className="input-group"><label>Fecha y hora</label><input className="input" type="datetime-local" value={followUp.scheduled_at} onChange={e=>setFollowUp({...followUp,scheduled_at:e.target.value})}/></div>
              <p className="text-muted text-sm">Se creará una tarea pendiente de llamada. Si ya existe una para esta agencia, se actualizará su fecha para evitar duplicados.</p>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setFollowUp(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveFollowUp}>Crear tarea</button></div>
          </div>
        </div>
      )}
      {booking && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setBooking(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header"><div><h3>Agendar reunión</h3><p className="text-muted text-sm">{booking.item.agency_name}</p></div><button className="btn-icon" onClick={()=>setBooking(null)}><X size={18}/></button></div>
            <div className="modal-body">
              <div className="input-group"><label>Fecha y hora de la demo</label><input className="input" type="datetime-local" value={booking.demo_date} onChange={e=>setBooking({...booking,demo_date:e.target.value})}/></div>
              <p className="text-muted text-sm">Al guardar, la agencia quedará como Agendada, se crearán el contacto y la oportunidad, y Leonardo recibirá un aviso en su CRM.</p>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setBooking(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveBooking}><CalendarPlus size={15}/>Guardar reunión</button></div>
          </div>
        </div>
      )}
      {summary?.date && <p style={{fontSize:11,color:'#94a3b8',marginTop:10}}>Última lista cargada: {String(summary.date).slice(0,10)} · Los datos proceden de fuentes comerciales públicas y conviene verificarlos antes de contactar.</p>}
    </div>
  );
}
