import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Mail, MessageCircle, Phone, RefreshCw, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const FILTERS = [
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

export default function FollowUps() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('vencido');
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);

  const load = () => {
    setLoading(true);
    return api.get('/activities/followups')
      .then(response => setItems(response.data))
      .catch(error => toast.error(error.response?.data?.message || 'No se pudieron cargar los seguimientos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'todos' ? items : items.filter(item => item.followup_status === filter),
    [filter, items]
  );

  const counts = useMemo(() => FILTERS.reduce((acc, [key]) => {
    acc[key] = key === 'todos' ? items.length : items.filter(item => item.followup_status === key).length;
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
    });
  };

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Seguimientos</h1>
          <p>Tu lista de trabajo: qué hacer, con quién y cuándo</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16}/>Actualizar</button>
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
                    <button className="btn btn-primary btn-sm" onClick={() => openActivity(item)}>
                      Registrar contacto
                    </button>
                    {item.phone && (
                      <a className="btn btn-secondary btn-sm" href={`https://wa.me/${item.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                        <MessageCircle size={14}/>WhatsApp
                      </a>
                    )}
                    <Link className="btn btn-secondary btn-sm" to={`/opportunities?edit=${item.id}`}>Abrir oportunidad</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
