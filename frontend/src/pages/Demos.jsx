import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MessageCircle, TriangleAlert, X, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const formatDate = value => new Date(value).toLocaleString('es-ES', {
  weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',
});

export default function Demos() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reschedule, setReschedule] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/opportunities')
      .then(response => setOpportunities(response.data.filter(item => item.demo_date)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      result: opportunities.filter(item =>
        item.status === 'open'
        && ['programada', 'reagendada'].includes(item.demo_status)
        && new Date(item.demo_date) < now
      ),
      today: opportunities.filter(item => {
        const date = new Date(item.demo_date);
        return item.status === 'open'
          && ['programada', 'reagendada'].includes(item.demo_status)
          && date >= now && date < tomorrow;
      }),
      upcoming: opportunities.filter(item =>
        item.status === 'open'
        && ['programada', 'reagendada'].includes(item.demo_status)
        && new Date(item.demo_date) >= tomorrow
      ),
      completed: opportunities.filter(item =>
        ['realizada', 'no_show', 'cancelada'].includes(item.demo_status)
      ).slice(0, 12),
    };
  }, [opportunities]);

  const setResult = async (item, demo_status) => {
    try {
      await api.patch(`/opportunities/${item.id}/demo-status`, { demo_status });
      toast.success(demo_status === 'realizada' ? 'Demo realizada y seguimiento programado' : demo_status === 'no_show' ? 'No Show registrado' : 'Demo cancelada');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar el resultado');
    }
  };

  const prepareWhatsApp = item => {
    const phone = String(item.phone || '').replace(/\D/g, '');
    if (!phone) return toast.error('El contacto no tiene teléfono');
    const date = formatDate(item.demo_date);
    const name = item.contact_name?.split(' ')[0] || 'Hola';
    const message = `${name}, te confirmo nuestra demo de RealAdvisor para el ${date}. Si necesitas ajustar la hora, avísame por aquí.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const saveReschedule = async event => {
    event.preventDefault();
    try {
      await api.patch(`/opportunities/${reschedule.id}/demo-status`, {
        demo_status:'reagendada',
        demo_date:reschedule.demo_date,
      });
      toast.success('Demo reagendada y tareas actualizadas');
      setReschedule(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo reagendar');
    }
  };

  const DemoCard = ({ item, needsResult = false }) => (
    <div className="card" style={{ padding:16, borderLeft:`4px solid ${needsResult ? '#ef4444' : '#3454d1'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 220px' }}>
          <h3 style={{ fontSize:15, fontWeight:700 }}>{item.contact_name || item.title}</h3>
          <p style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{item.company || item.title}</p>
          <p style={{ fontSize:12, marginTop:8, display:'flex', alignItems:'center', gap:5, color:needsResult ? '#dc2626' : '#3454d1' }}>
            <CalendarClock size={14}/>{formatDate(item.demo_date)}
          </p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:9 }}>
            <span className={`badge ${item.temperature === 'caliente' ? 'badge-red' : item.temperature === 'fria' ? 'badge-blue' : 'badge-yellow'}`}>
              {item.temperature || 'sin clasificar'}
            </span>
            <span className="badge badge-gray">{item.demo_status}</span>
            {!item.phone && <span className="badge badge-red">Sin teléfono</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => prepareWhatsApp(item)}><MessageCircle size={14}/>Confirmar</button>
          <button className="btn btn-primary btn-sm" onClick={() => setResult(item, 'realizada')}><CheckCircle2 size={14}/>Realizada</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setResult(item, 'no_show')}>No Show</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setReschedule({ id:item.id, title:item.contact_name || item.title, demo_date:'' })}>Reagendar</button>
          <Link className="btn btn-secondary btn-sm" to={`/opportunities?edit=${item.id}`}>Ver oportunidad</Link>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="spinner"/>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Centro de demos</h1><p>Prepara, confirma y registra el resultado de cada reunión</p></div>
      </div>

      <div className="followup-summary">
        {[
          ['Resultado pendiente', groups.result.length, '#dc2626'],
          ['Demos de hoy', groups.today.length, '#3454d1'],
          ['Próximas demos', groups.upcoming.length, '#0f766e'],
          ['Historial reciente', groups.completed.length, '#64748b'],
        ].map(([label, value, color]) => (
          <div className="followup-filter" key={label} style={{ borderTop:`3px solid ${color}` }}>
            <span>{label}</span><strong style={{ color }}>{value}</strong>
          </div>
        ))}
      </div>

      {groups.result.length > 0 && (
        <section style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:17, marginBottom:10, display:'flex', alignItems:'center', gap:7, color:'#b91c1c' }}><TriangleAlert size={18}/>Resultado pendiente</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{groups.result.map(item => <DemoCard key={item.id} item={item} needsResult/>)}</div>
        </section>
      )}

      <section style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:17, marginBottom:10, display:'flex', alignItems:'center', gap:7 }}><Clock3 size={18}/>Hoy</h2>
        {groups.today.length
          ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{groups.today.map(item => <DemoCard key={item.id} item={item}/>)}</div>
          : <div className="card empty-state" style={{ padding:28 }}><p>No tienes más demos para hoy</p></div>}
      </section>

      <section style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:17, marginBottom:10 }}>Próximas demos</h2>
        {groups.upcoming.length
          ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{groups.upcoming.map(item => <DemoCard key={item.id} item={item}/>)}</div>
          : <div className="card empty-state" style={{ padding:28 }}><p>No hay demos próximas</p></div>}
      </section>

      <section>
        <h2 style={{ fontSize:17, marginBottom:10 }}>Historial reciente</h2>
        <div className="card" style={{ padding:0 }}>
          {groups.completed.length ? groups.completed.map(item => (
            <div key={item.id} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'12px 16px', borderBottom:'1px solid #f1f5f9' }}>
              <div><strong style={{ fontSize:13 }}>{item.contact_name || item.title}</strong><p style={{ fontSize:11, color:'#64748b' }}>{formatDate(item.demo_date)}</p></div>
              <span className={`badge ${item.demo_status === 'realizada' ? 'badge-green' : item.demo_status === 'no_show' ? 'badge-yellow' : 'badge-gray'}`}>{item.demo_status}</span>
            </div>
          )) : <div className="empty-state" style={{ padding:28 }}><p>Sin historial de demos</p></div>}
        </div>
      </section>

      {reschedule && (
        <div className="modal-overlay" onClick={event => event.target === event.currentTarget && setReschedule(null)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header"><h3>Reagendar demo</h3><button className="btn-icon" onClick={() => setReschedule(null)}><X size={18}/></button></div>
            <form onSubmit={saveReschedule}>
              <div className="modal-body">
                <p style={{ fontSize:13, color:'#64748b', marginBottom:14 }}>{reschedule.title}</p>
                <div className="input-group"><label>Nueva fecha y hora</label><input className="input" type="datetime-local" value={reschedule.demo_date} onChange={event => setReschedule(current => ({ ...current, demo_date:event.target.value }))} required/></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setReschedule(null)}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
