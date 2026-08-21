import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Clock3, Mail, MessageCircle, Phone, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FOLLOWUP_PHASES, NO_SHOW_PHASES, phaseByValue, noShowPhaseByValue } from '../utils/followupPhases';

const FILTERS = [
  ['no_show', 'No Show'],
  ['vencido', 'Vencidos'],
  ['hoy', 'Para hoy'],
  ['proximo', 'Próximos 7 días'],
  ['sin_fecha', 'Sin próxima acción'],
  ['todos', 'Todos'],
];

const channelIcon = {
  llamada: Phone,
  email: Mail,
  whatsapp: MessageCircle,
};

const temperatureClass = {
  caliente: 'badge-red',
  templada: 'badge-yellow',
  fria: 'badge-blue',
};

const QUICK_RESULTS = [
  { code:'no_responde', label:'No responde', outcome:'No responde', contacted:false, days:1, action:'Reintentar contacto', type:'llamada' },
  { code:'interesado', label:'Interesado', outcome:'Interesado; quiere avanzar', contacted:true, days:2, action:'Confirmar el siguiente paso', type:'llamada' },
  { code:'revisandolo', label:'Revisándolo', outcome:'Está revisando la propuesta', contacted:true, days:3, action:'Pedir una decisión', type:'llamada' },
  { code:'socio', label:'Consulta socio', outcome:'Debe consultarlo con su socio o director', contacted:true, days:2, action:'Retomar tras la consulta interna', type:'llamada' },
  { code:'reagendar', label:'Reagendar', outcome:'Solicita reagendar el contacto', contacted:true, days:2, action:'Realizar contacto reagendado', type:'llamada' },
  { code:'no_interesa', label:'No le interesa', outcome:'Indica que no está interesado', contacted:true, days:1, action:'Confirmar cierre o pausar oportunidad', type:'llamada' },
];

const emptyPostDemo = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  const local = date => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return { name:'', company:'', phone:'', email:'', notes:'', demo_date:local(new Date()), temperature:'templada', next_action:'Enviar resumen y propuesta después de la demo', next_action_type:'email', next_action_at:local(next) };
};

export default function FollowUps() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('vencido');
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [reschedule, setReschedule] = useState(null);
  const [postDemo, setPostDemo] = useState(null);

  const load = () => {
    setLoading(true);
    return api.get('/activities/followups')
      .then(response => setItems(response.data))
      .catch(error => toast.error(error.response?.data?.message || 'No se pudieron cargar los seguimientos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/communications/templates')
      .then(response => setTemplates(response.data))
      .catch(() => {});
  }, []);

  const filtered = useMemo(
    () => filter === 'todos' ? items : filter === 'no_show'
      ? items.filter(item => item.demo_status === 'no_show')
      : items.filter(item => item.followup_status === filter && item.demo_status !== 'no_show'),
    [filter, items]
  );

  const counts = useMemo(() => FILTERS.reduce((acc, [key]) => {
    acc[key] = key === 'todos' ? items.length : key === 'no_show'
      ? items.filter(item => item.demo_status === 'no_show').length
      : items.filter(item => item.followup_status === key && item.demo_status !== 'no_show').length;
    return acc;
  }, {}), [items]);

  const saveActivity = async event => {
    event.preventDefault();
    try {
      await api.post('/activities', activity);
      toast.success('Interacción registrada');
      setActivity(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo registrar');
    }
  };

  const savePostDemo = async event => {
    event.preventDefault();
    try {
      const contact = await api.post('/contacts', {
        name:postDemo.name, company:postDemo.company, phone:postDemo.phone,
        email:postDemo.email, notes:postDemo.notes, tags:'post-demo',
      });
      await api.post('/opportunities', {
        title:`Seguimiento: ${postDemo.company || postDemo.name}`,
        contact_id:contact.data.id,
        demo_date:postDemo.demo_date,
        demo_status:'realizada',
        temperature:postDemo.temperature,
        followup_phase:0,
        next_action:postDemo.next_action,
        next_action_type:postDemo.next_action_type,
        next_action_at:postDemo.next_action_at,
        description:postDemo.notes,
      });
      toast.success('Cliente añadido al seguimiento');
      setPostDemo(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo crear el seguimiento');
    }
  };

  const openActivity = (item, type = item.next_action_type || 'llamada') => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setActivity({
      title: `Seguimiento: ${item.title}`,
      type,
      description: '',
      outcome: '',
      contacted: true,
      scheduled_at: local,
      contact_id: item.contact_id || '',
      opportunity_id: item.id,
      assigned_to: '',
      next_action: '',
      next_action_type: '',
      next_action_at: '',
      quick_result: '',
    });
  };

  const applyQuickResult = result => {
    const target = new Date();
    target.setDate(target.getDate() + result.days);
    target.setHours(10, 0, 0, 0);
    const localTarget = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setActivity(current => ({
      ...current,
      quick_result: result.code,
      outcome: result.outcome,
      contacted: result.contacted,
      next_action: result.action,
      next_action_type: result.type,
      next_action_at: localTarget,
    }));
  };

  const changePhase = async (item, value) => {
    try {
      const response = await api.patch(`/opportunities/${item.id}/followup-phase`, { followup_phase: Number(value) });
      await load();
      toast.success(`${phaseByValue(value).label} · próxima acción en ${response.data.days} días`);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo cambiar la fase'); }
  };

  const changeNoShowStep = async (item, value) => {
    try {
      const response = await api.patch(`/opportunities/${item.id}/no-show-step`, { no_show_step: Number(value) });
      await load();
      toast.success(`${noShowPhaseByValue(value).label} · próxima acción en ${response.data.days} días`);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo cambiar el intento'); }
  };

  const prepareWhatsApp = item => {
    const isNoShow = item.demo_status === 'no_show';
    const step = isNoShow ? item.no_show_step : item.followup_phase;
    const template = templates.find(row =>
      row.channel === 'whatsapp' &&
      (row.category || 'post_demo') === (isNoShow ? 'no_show' : 'post_demo') &&
      Number(row.phase || 0) === Number(step || 0)
    );
    if (!template) {
      toast.error(`No hay una plantilla de WhatsApp para este ${isNoShow ? 'intento No Show' : 'fase'}`);
      return;
    }

    const nextDate = item.next_action_at
      ? format(new Date(item.next_action_at), "dd 'de' MMMM 'a las' HH:mm", { locale: es })
      : '';
    const variables = {
      nombre: item.contact_name || '',
      agencia: item.company || item.title || '',
      zona: item.zone || '',
      objetivo: item.main_goal || '',
      problema: item.current_problem || '',
      objecion: item.objection_detail || item.objection_type || '',
      respuesta_objecion: item.objection_response || '',
      propuesta: item.proposal_period || '',
      inversion: item.monthly_amount ? `${Number(item.monthly_amount).toLocaleString('es-ES')} €` : '',
      fecha_proximo_paso: nextDate,
      hora_proximo_paso: item.next_action_at ? format(new Date(item.next_action_at), 'HH:mm') : '',
    };
    const message = template.body
      .replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    let phone = (item.phone || '').replace(/\D/g, '');
    if (phone.length === 9) phone = `34${phone}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const saveReschedule = async event => {
    event.preventDefault();
    try {
      await api.patch(`/opportunities/${reschedule.id}/demo-status`, {
        demo_status: 'reagendada',
        demo_date: reschedule.demo_date,
      });
      toast.success('Demo reagendada');
      setReschedule(null);
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo reagendar'); }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Seguimientos</h1>
          <p>Tu lista de trabajo: qué hacer, con quién y cuándo</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={()=>setPostDemo(emptyPostDemo())}><Plus size={16}/>Añadir demo realizada</button>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={16}/>Actualizar</button>
        </div>
      </div>

      <div className="followup-summary">
        {FILTERS.slice(0, 4).map(([key, label]) => (
          <button key={key} className={`followup-filter ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            <span>{label}</span>
            <strong>{counts[key] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="tabs">
        {FILTERS.map(([key, label]) => (
          <button key={key} className={`tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {!filtered.length ? (
          <div className="empty-state">
            <CheckCircle2 size={36}/>
            <h3>No hay seguimientos en esta categoría</h3>
            <p>Tu lista está al día.</p>
          </div>
        ) : (
          <div className="followup-list">
            {filtered.map(item => {
              const Icon = channelIcon[item.next_action_type] || CalendarClock;
              return (
                <article className={`followup-row ${item.followup_status}`} key={item.id}>
                  <div className="followup-icon"><Icon size={19}/></div>
                  <div className="followup-main">
                    <div className="followup-title">
                      <strong>{item.company || item.title}</strong>
                      <span className={`badge ${temperatureClass[item.temperature] || 'badge-gray'}`}>{item.temperature || 'sin clasificar'}</span>
                      <span className="badge badge-gray">{item.stage_name || 'Sin etapa'}</span>
                      {item.demo_status === 'no_show'
                        ? <span className="badge badge-red">{noShowPhaseByValue(item.no_show_step).label}</span>
                        : <span className="badge badge-blue">{phaseByValue(item.followup_phase).label}</span>}
                    </div>
                    <p>{item.contact_name || 'Sin contacto'}{item.zone ? ` · ${item.zone}` : ''}</p>
                    <p className="followup-action">{item.next_action || 'Falta definir la próxima acción'}</p>
                    <div className="followup-meta">
                      {item.next_action_at ? (
                        <span><Clock3 size={13}/>{format(new Date(item.next_action_at), "dd MMM · HH:mm", { locale: es })}</span>
                      ) : <span><TriangleAlert size={13}/>Sin fecha</span>}
                      <span>{item.days_without_contact} días sin contacto</span>
                      {item.objection_type && <span>Objeción: {item.objection_type}</span>}
                    </div>
                  </div>
                  <div className="followup-actions">
                    {item.demo_status === 'no_show' ? (
                      <select className="input" value={item.no_show_step ?? 0} onChange={e => changeNoShowStep(item, e.target.value)} style={{ minWidth:190, padding:'7px 9px', fontSize:12 }}>
                        {NO_SHOW_PHASES.map(phase => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
                      </select>
                    ) : (
                      <select className="input" value={item.followup_phase ?? 0} onChange={e => changePhase(item, e.target.value)} style={{ minWidth:190, padding:'7px 9px', fontSize:12 }}>
                        {FOLLOWUP_PHASES.map(phase => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
                      </select>
                    )}
                    <Link className="btn btn-secondary btn-sm" to={`/communications?tab=plantillas&category=${item.demo_status === 'no_show' ? 'no_show' : 'post_demo'}&phase=${item.demo_status === 'no_show' ? item.no_show_step ?? 0 : item.followup_phase ?? 0}`}>Ver plantilla</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => openActivity(item)}>
                      Registrar contacto
                    </button>
                    {item.phone && (
                      <button className="btn btn-secondary btn-sm" onClick={() => prepareWhatsApp(item)}>
                        <MessageCircle size={14}/>Preparar WhatsApp
                      </button>
                    )}
                    {item.demo_status === 'no_show' && <button className="btn btn-primary btn-sm" onClick={() => setReschedule({ id:item.id, title:item.company || item.title, demo_date:'' })}>Reagendar</button>}
                    <Link className="btn btn-secondary btn-sm" to={`/opportunities?edit=${item.id}`}>Abrir oportunidad</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {postDemo && (
        <div className="modal-overlay" onClick={event => event.target === event.currentTarget && setPostDemo(null)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <div><h3>Añadir seguimiento después de una demo</h3><p className="text-muted text-sm">Copia aquí los datos esenciales tras realizar la demo en el CRM de empresa.</p></div>
              <button className="btn-icon" onClick={()=>setPostDemo(null)}>×</button>
            </div>
            <form onSubmit={savePostDemo}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Nombre del contacto</label><input className="input" value={postDemo.name} onChange={e=>setPostDemo(v=>({...v,name:e.target.value}))} required/></div>
                  <div className="input-group"><label>Agencia / empresa</label><input className="input" value={postDemo.company} onChange={e=>setPostDemo(v=>({...v,company:e.target.value}))} required/></div>
                  <div className="input-group"><label>Teléfono</label><input className="input" type="tel" value={postDemo.phone} onChange={e=>setPostDemo(v=>({...v,phone:e.target.value}))}/></div>
                  <div className="input-group"><label>Correo</label><input className="input" type="email" value={postDemo.email} onChange={e=>setPostDemo(v=>({...v,email:e.target.value}))}/></div>
                  <div className="input-group"><label>Fecha de la demo</label><input className="input" type="datetime-local" value={postDemo.demo_date} onChange={e=>setPostDemo(v=>({...v,demo_date:e.target.value}))} required/></div>
                  <div className="input-group"><label>Temperatura</label><select className="input" value={postDemo.temperature} onChange={e=>setPostDemo(v=>({...v,temperature:e.target.value}))}><option value="caliente">Caliente</option><option value="templada">Templada</option><option value="fria">Fría</option></select></div>
                  <div className="input-group"><label>Próxima acción</label><input className="input" value={postDemo.next_action} onChange={e=>setPostDemo(v=>({...v,next_action:e.target.value}))} required/></div>
                  <div className="input-group"><label>Canal</label><select className="input" value={postDemo.next_action_type} onChange={e=>setPostDemo(v=>({...v,next_action_type:e.target.value}))}><option value="email">Correo</option><option value="whatsapp">WhatsApp</option><option value="llamada">Llamada</option><option value="reunion">Reunión</option></select></div>
                  <div className="input-group full"><label>¿Cuándo quieres recibir el aviso?</label><input className="input" type="datetime-local" value={postDemo.next_action_at} onChange={e=>setPostDemo(v=>({...v,next_action_at:e.target.value}))} required/><small style={{color:'#64748b',display:'flex',gap:5,alignItems:'center'}}><Bell size={13}/>Se avisará en los dispositivos donde actives las notificaciones.</small></div>
                  <div className="input-group full"><label>Notas de la demo</label><textarea className="input" rows={4} value={postDemo.notes} onChange={e=>setPostDemo(v=>({...v,notes:e.target.value}))} placeholder="Necesidad, objeciones, decisión, próximo paso…"/></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setPostDemo(null)}>Cancelar</button><button className="btn btn-primary" type="submit">Crear seguimiento</button></div>
            </form>
          </div>
        </div>
      )}

      {activity && (
        <div className="modal-overlay" onClick={event => event.target === event.currentTarget && setActivity(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Registrar interacción</h3>
              <button className="btn-icon" onClick={() => setActivity(null)}>×</button>
            </div>
            <form onSubmit={saveActivity}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label>Canal</label>
                    <select className="input" value={activity.type} onChange={e => setActivity(a => ({ ...a, type: e.target.value }))}>
                      <option value="llamada">Llamada</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Correo</option>
                      <option value="reunion">Reunión</option>
                      <option value="videollamada">Videollamada</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Fecha y hora</label>
                    <input className="input" type="datetime-local" value={activity.scheduled_at} onChange={e => setActivity(a => ({ ...a, scheduled_at: e.target.value }))}/>
                  </div>
                </div>
                <div className="input-group">
                  <label>Resultado rápido</label>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    {QUICK_RESULTS.map(result => (
                      <button key={result.code} type="button" className={`btn btn-sm ${activity.quick_result===result.code?'btn-primary':'btn-secondary'}`} onClick={()=>applyQuickResult(result)}>
                        {result.label}
                      </button>
                    ))}
                  </div>
                  <small style={{color:'#64748b'}}>Completa el resultado y propone la próxima acción. Puedes editar todo antes de guardar.</small>
                </div>
                <div className="input-group">
                  <label>Resultado</label>
                  <input className="input" value={activity.outcome} onChange={e => setActivity(a => ({ ...a, outcome: e.target.value }))} placeholder="Ej. Quiere revisarlo con su socio"/>
                </div>
                <div className="input-group">
                  <label>Notas</label>
                  <textarea className="input" rows={3} value={activity.description} onChange={e => setActivity(a => ({ ...a, description: e.target.value }))}/>
                </div>
                <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="checkbox" checked={activity.contacted} onChange={e => setActivity(a => ({ ...a, contacted: e.target.checked }))}/>
                  Se consiguió contactar
                </label>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Próxima acción</label>
                    <input className="input" value={activity.next_action} onChange={e => setActivity(a => ({ ...a, next_action: e.target.value }))} placeholder="Ej. Llamar tras reunión interna"/>
                  </div>
                  <div className="input-group">
                    <label>Canal siguiente</label>
                    <select className="input" value={activity.next_action_type} onChange={e => setActivity(a => ({ ...a, next_action_type: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      <option value="llamada">Llamada</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Correo</option>
                      <option value="reunion">Reunión</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ gridColumn:'1/-1' }}>
                    <label>Fecha de la próxima acción</label>
                    <input className="input" type="datetime-local" value={activity.next_action_at} onChange={e => setActivity(a => ({ ...a, next_action_at: e.target.value }))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActivity(null)}>Cancelar</button>
                <button className="btn btn-primary" type="submit">Guardar interacción</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reschedule && (
        <div className="modal-overlay" onClick={event => event.target === event.currentTarget && setReschedule(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header"><h3>Reagendar demo</h3><button className="btn-icon" onClick={()=>setReschedule(null)}>×</button></div>
            <form onSubmit={saveReschedule}>
              <div className="modal-body">
                <p style={{fontSize:13,color:'#64748b',marginBottom:14}}>{reschedule.title}</p>
                <div className="input-group"><label>Nueva fecha y hora</label><input className="input" type="datetime-local" value={reschedule.demo_date} onChange={e=>setReschedule(r=>({...r,demo_date:e.target.value}))} required/></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setReschedule(null)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar nueva demo</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
