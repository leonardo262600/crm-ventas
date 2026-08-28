import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarClock, Check, ChevronRight, ExternalLink, Inbox, Link2, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EMPTY = { inbox: [], kanban: { por_hacer: [], hoy: [], en_proceso: [], esperando: [], hecho: [] }, agenda: [], resources: [] };
const COLUMNS = [
  ['por_hacer', '#PorHacer', 'Prioridades de la semana'],
  ['hoy', '#Hoy', 'Máximo 3 tareas críticas'],
  ['en_proceso', '#EnProceso', 'En ejecución ahora'],
  ['esperando', '#Esperando', 'Depende de un tercero'],
  ['hecho', '#Hecho', 'Completadas'],
];
const toInputDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function Composer({ type, onCreate }) {
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);
  const placeholders = { inbox: 'Captura una idea, nota o pendiente…', task: 'Nueva tarea…', agenda: 'Nuevo bloque de tiempo…', resource: 'Nombre del recurso…' };
  const submit = async (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    const payload = { section: type, title: value.trim() };
    if (type === 'task') payload.status = 'por_hacer';
    if (type === 'agenda') payload.scheduled_start = extra || toInputDate(new Date());
    if (type === 'resource') payload.url = extra.trim();
    try { await onCreate(payload); setValue(''); setExtra(''); } finally { setSaving(false); }
  };
  return <form className={`hub-composer hub-composer-${type}`} onSubmit={submit}>
    <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholders[type]} aria-label={placeholders[type]}/>
    {type === 'agenda' && <input type="datetime-local" value={extra} onChange={(e) => setExtra(e.target.value)} aria-label="Fecha y hora"/>}
    {type === 'resource' && <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="https:// o ruta local" aria-label="URL o ruta" required/>}
    <button type="submit" disabled={saving || !value.trim()}>{saving ? <Loader2 className="spin" size={16}/> : <Plus size={16}/>}<span>Añadir</span></button>
  </form>;
}

function ItemActions({ item, onDelete, children }) {
  return <div className="hub-item-actions">{children}<button onClick={() => onDelete(item.id)} aria-label={`Eliminar ${item.title}`}><Trash2 size={14}/></button></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [hub, setHub] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try { const { data } = await api.get('/personal-hub'); setHub(data); }
    catch (error) { toast.error(error.response?.data?.message || 'No se pudo cargar el centro personal'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const create = async (payload) => { try { await api.post('/personal-hub', payload); await load(); } catch (error) { toast.error(error.response?.data?.message || 'No se pudo crear'); throw error; } };
  const update = async (item, patch) => { try { await api.put(`/personal-hub/${item.id}`, { ...item, ...patch }); await load(); } catch (error) { toast.error(error.response?.data?.message || 'No se pudo actualizar'); } };
  const remove = async (id) => { try { await api.delete(`/personal-hub/${id}`); await load(); } catch (error) { toast.error(error.response?.data?.message || 'No se pudo eliminar'); } };
  const todayCount = hub.kanban?.hoy?.length || 0;
  const nextAgenda = useMemo(() => [...(hub.agenda || [])].sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start)), [hub.agenda]);
  if (loading) return <div className="spinner"/>;

  return <div className="personal-hub">
    <header className="hub-hero"><div><span className="hub-system"><Sparkles size={14}/> CEREBRO CENTRAL · PUCHI READY</span><h1>Buenos días, {user?.name?.split(' ')[0] || 'Leonardo'}</h1><p>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · Todo lo importante, en un solo lugar.</p></div><div className="hub-schema-badge"><span>API</span><strong>schema 1.0</strong><small>Sincronización estructurada</small></div></header>

    <section className="hub-section hub-inbox-section">
      <div className="hub-section-heading"><div className="hub-heading-icon cyan"><Inbox size={20}/></div><div><span>CAPTURA RÁPIDA</span><h2>Inbox / Bandeja de entrada</h2><p>Sin clasificar · tú, PUCHI o Hermes podéis capturar aquí.</p></div><strong>{hub.inbox?.length || 0}</strong></div>
      <Composer type="inbox" onCreate={create}/>
      <div className="hub-inbox-list">{hub.inbox?.map((item) => <article className="hub-inbox-item" key={item.id}><span className={`hub-source ${item.source}`}>{item.source}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<small>{format(new Date(item.created_at), 'dd/MM · HH:mm')}</small></div><ItemActions item={item} onDelete={remove}><button onClick={() => update(item, { section: 'task', status: 'por_hacer' })} title="Convertir en tarea"><ChevronRight size={15}/></button></ItemActions></article>)}</div>
    </section>

    <section className="hub-section">
      <div className="hub-section-heading"><div className="hub-heading-icon purple"><Archive size={20}/></div><div><span>FLUJO DE EJECUCIÓN</span><h2>Tablero de estados</h2><p>#Hoy: {todayCount}/3 tareas críticas seleccionadas.</p></div></div>
      <Composer type="task" onCreate={create}/>
      <div className="hub-kanban">{COLUMNS.map(([status, label, description], columnIndex) => <div className={`hub-kanban-column status-${status}`} key={status}><header><div><strong>{label}</strong><small>{description}</small></div><span>{hub.kanban?.[status]?.length || 0}</span></header><div className="hub-task-list">{hub.kanban?.[status]?.map((item) => <article className="hub-task" key={item.id}><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}{item.completed_at && <small>Cerrada {format(new Date(item.completed_at), 'dd/MM/yyyy')}</small>}<ItemActions item={item} onDelete={remove}><select value={item.status} onChange={(e) => update(item, { status: e.target.value })} aria-label={`Estado de ${item.title}`}>{COLUMNS.map(([value, optionLabel]) => <option value={value} key={value}>{optionLabel}</option>)}</select>{columnIndex < COLUMNS.length - 1 && <button onClick={() => update(item, { status: COLUMNS[columnIndex + 1][0] })} aria-label="Avanzar"><ChevronRight size={15}/></button>}</ItemActions></article>)}</div></div>)}</div>
    </section>

    <div className="hub-lower-grid">
      <section className="hub-section hub-agenda"><div className="hub-section-heading"><div className="hub-heading-icon blue"><CalendarClock size={20}/></div><div><span>TIME-BLOCKING</span><h2>Agenda</h2><p>Bloques de tiempo y recordatorios.</p></div></div><Composer type="agenda" onCreate={create}/><div className="hub-agenda-list">{nextAgenda.map((item) => <article key={item.id}><time><strong>{format(new Date(item.scheduled_start), 'HH:mm')}</strong><span>{format(new Date(item.scheduled_start), 'dd MMM', { locale: es })}</span></time><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}</div><ItemActions item={item} onDelete={remove}/></article>)}</div></section>
      <section className="hub-section hub-resources"><div className="hub-section-heading"><div className="hub-heading-icon cyan"><Link2 size={20}/></div><div><span>ACCESOS DIRECTOS</span><h2>Recursos y enlaces</h2><p>Documentos, carpetas y webs frecuentes.</p></div></div><Composer type="resource" onCreate={create}/><div className="hub-resource-list">{hub.resources?.map((item) => <article key={item.id}><div className="hub-resource-icon"><Link2 size={17}/></div><div><strong>{item.title}</strong><span>{item.url}</span></div><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title}`}><ExternalLink size={16}/></a><ItemActions item={item} onDelete={remove}/></article>)}</div></section>
    </div>
    {!hub.inbox?.length && !Object.values(hub.kanban || {}).flat().length && !hub.agenda?.length && !hub.resources?.length && <div className="hub-first-run"><Check size={18}/><span>Tu cerebro central está limpio y listo para empezar.</span></div>}
  </div>;
}
