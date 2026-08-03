import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clipboard, Clock3, Download, RefreshCw, Users2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const isoDay = date => date.toISOString().slice(0, 10);
const mondayOf = value => {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
};
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const time = value => String(value || '').slice(11, 16);
const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });

const bookingText = booking => [
  `Demo: ${booking.contact_name || booking.title}`,
  `Empresa: ${booking.company || 'Sin empresa'}`,
  `Fecha: ${new Date(booking.start_at).toLocaleString('es-ES')}`,
  `Closer: ${booking.closer_name}`,
  booking.setter_name ? `Setter: ${booking.setter_name}` : '',
  booking.phone ? `Teléfono: ${booking.phone}` : '',
  booking.email ? `Email: ${booking.email}` : '',
  booking.address ? `Dirección: ${booking.address}${booking.postal_code ? ` · CP ${booking.postal_code}` : ''}` : '',
].filter(Boolean).join('\n');

const downloadIcs = booking => {
  const compact = value => String(value).replace(/[-: ]/g, '').replace('T', '').slice(0, 15);
  const content = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CRM Leonardo//Demos//ES','BEGIN:VEVENT',
    `UID:demo-${booking.id}@crm-leonardo`, `DTSTART:${compact(booking.start_at)}`, `DTEND:${compact(booking.end_at)}`,
    `SUMMARY:Demo RealAdvisor · ${booking.contact_name || booking.title}`, `DESCRIPTION:${bookingText(booking).replace(/\n/g, '\\n')}`,
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type:'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href=url; link.download=`demo-${booking.contact_name || booking.id}.ics`; link.click(); URL.revokeObjectURL(url);
};

export default function CloserCalendar() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(isoDay(new Date()));
  const [bookings, setBookings] = useState([]);
  const [closers, setClosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const monday = useMemo(() => mondayOf(selected), [selected]);
  const days = useMemo(() => Array.from({ length:5 }, (_, index) => isoDay(addDays(monday, index))), [monday]);

  const load = async () => {
    setLoading(true);
    try {
      const [bookingResponse, closerResponse] = await Promise.all([
        api.get('/closer-calendar/bookings', { params:{ from:days[0], to:days[4] } }),
        api.get('/closer-calendar/closers'),
      ]);
      setBookings(bookingResponse.data); setClosers(closerResponse.data);
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo cargar el calendario'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days[0], days[4]]);

  const markCorporate = async booking => {
    try {
      await api.patch(`/closer-calendar/bookings/${booking.id}/corporate-status`, { status:booking.corporate_status === 'registrada' ? 'pendiente' : 'registrada' });
      toast.success(booking.corporate_status === 'registrada' ? 'Devuelta a pendientes' : 'Marcada como añadida a RealAdvisor'); load();
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo actualizar'); }
  };
  const copy = async booking => { await navigator.clipboard.writeText(bookingText(booking)); toast.success('Datos copiados'); };
  const pending = bookings.filter(item => item.corporate_status === 'pendiente');

  return <div className="closer-calendar-page">
    <div className="page-header">
      <div><h1>Calendario de demos</h1><p>Una misma hora puede ocuparse una vez por cada closer disponible.</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}><input className="input" type="date" value={selected} onChange={event=>setSelected(event.target.value)}/><button className="btn btn-secondary" onClick={load}><RefreshCw size={15}/>Actualizar</button></div>
    </div>

    <div className="closer-calendar-summary">
      <div className="closer-calendar-stat"><CalendarDays/><span>Reuniones esta semana</span><strong>{bookings.length}</strong></div>
      <div className="closer-calendar-stat pending"><Clipboard/><span>Pendientes de pasar</span><strong>{pending.length}</strong></div>
      <div className="closer-calendar-stat"><Users2/><span>Closers activos</span><strong>{closers.length}</strong></div>
    </div>

    {pending.length > 0 && user?.role !== 'setter' && <section className="card closer-pending-panel">
      <h2><Clipboard size={18}/>Pendientes de pasar a RealAdvisor</h2>
      <p>Copia los datos, crea la cita en el sistema corporativo y márcala como registrada.</p>
      <div className="closer-pending-list">{pending.map(item => <div key={item.id} className="closer-pending-item">
        <div><strong>{item.contact_name || item.title}</strong><span>{time(item.start_at)} · {item.closer_name}</span></div>
        <div className="closer-calendar-actions"><button className="btn btn-secondary btn-sm" onClick={()=>copy(item)}><Clipboard size={14}/>Copiar</button><button className="btn btn-secondary btn-sm" onClick={()=>downloadIcs(item)}><Download size={14}/>.ics</button><button className="btn btn-primary btn-sm" onClick={()=>markCorporate(item)}><Check size={14}/>Ya registrada</button></div>
      </div>)}</div>
    </section>}

    {loading ? <div className="spinner"/> : <div className="closer-week-grid">{days.map(day => {
      const items = bookings.filter(item => String(item.start_at).slice(0,10) === day);
      return <section className="card closer-day" key={day}><h3>{longDate(day)}</h3>{items.length ? items.map(item => <article className="closer-booking" key={item.id}>
        <div className="closer-booking-time"><Clock3 size={14}/>{time(item.start_at)}</div>
        <strong>{item.contact_name || item.title}</strong><span>{item.company || 'Sin empresa'}</span>
        <span className="closer-booking-owner">{item.closer_name}</span>
        {item.setter_name && <small>Agendada por {item.setter_name}</small>}
        <span className={`badge ${item.corporate_status === 'registrada' ? 'badge-green' : 'badge-yellow'}`}>{item.corporate_status === 'registrada' ? 'En RealAdvisor' : 'Pendiente de pasar'}</span>
      </article>) : <div className="closer-day-empty">Sin demos</div>}</section>;
    })}</div>}
  </div>;
}
