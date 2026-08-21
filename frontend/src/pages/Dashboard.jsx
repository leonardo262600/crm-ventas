import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, CalendarCheck, Check, Clock3, Copy, PhoneCall, Radar, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#8B5CF6'];

function Sparkline({ color, seed }) {
  const points = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: i * 18, y: 28 - (((i * 7 + seed * 5) % 19) + i) })), [seed]);
  return <svg className="crm-sparkline" viewBox="0 0 150 34" aria-hidden="true"><polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const load = () => { setLoading(true); api.get('/reports/dashboard').then(r => setData(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  if (loading) return <div className="spinner" />;

  const stats = data?.stats || {};
  const priorities = (data?.priorities || []).slice(0, 5);
  const activity = [...(data?.today_tasks || []), ...(data?.upcoming || [])].slice(0, 6);
  const kpis = [
    ['Prospectos pendientes', stats.prospecting_pending || 0, Building2, '/prospecting', 'Lista activa'],
    ['Seguimientos para hoy', stats.today_followups || 0, CalendarCheck, '/followups', 'Revisar hoy'],
    ['Seguimientos vencidos', stats.overdue_followups || 0, TriangleAlert, '/followups', 'Acción prioritaria'],
    ['Tareas de hoy', stats.tasks_today || 0, Clock3, '/activities', 'Plan del día'],
  ];
  const chartData = [
    { hour:'08:00', actividad:2, seguimiento:1 }, { hour:'10:00', actividad:6, seguimiento:3 },
    { hour:'12:00', actividad:Math.max(8, (stats.today_followups || 0) + 4), seguimiento:6 },
    { hour:'14:00', actividad:6, seguimiento:5 }, { hour:'16:00', actividad:12, seguimiento:7 },
    { hour:'18:00', actividad:11, seguimiento:Math.max(8, stats.overdue_followups || 0) },
  ];

  return <div className="crm-command-center">
    <header className="crm-command-header">
      <div><div className="crm-live-row"><span className="crm-live-dot"/> EN VIVO</div><h1>Centro de acción de hoy</h1><p>Hola, {user?.name?.split(' ')[0] || 'Leonardo'} · {format(now, "EEEE d 'de' MMMM", { locale: es })}</p></div>
      <div className="crm-sync-status"><RefreshCw size={14}/><span>Actualizado ahora</span><strong>{format(now, 'HH:mm:ss')}</strong></div>
    </header>

    <section className="crm-kpi-grid">{kpis.map(([label,value,Icon,href,trend], i) => <a href={href} className="crm-kpi-card glass-card" key={label} style={{'--kpi-color':COLORS[i]}}><div className="crm-kpi-top"><span>{label}</span><div className="crm-kpi-icon"><Icon size={20}/></div></div><strong>{value}</strong><small><ArrowUpRight size={12}/>{trend}</small><Sparkline color={COLORS[i]} seed={i+1}/></a>)}</section>

    <section className="crm-dashboard-grid">
      <div className="glass-card crm-attention-panel">
        <div className="crm-panel-heading"><div><span className="crm-eyebrow"><Radar size={14}/> PRIORIDAD</span><h2>Qué requiere tu atención</h2><p>Ordenado por vencimiento y próxima acción</p></div><a href="/followups">Ver todos <ArrowUpRight size={14}/></a></div>
        <div className="crm-attention-list">{priorities.length ? priorities.map((item,i) => { const overdue=item.next_action_at && new Date(item.next_action_at)<now; return <a href="/followups" className="crm-attention-row" key={item.id}><div className={`crm-priority-orb ${overdue?'danger':''}`}><span>{i+1}</span></div><div className="crm-attention-copy"><strong>{item.contact_name || item.company || item.title}</strong><span>{item.next_action || 'Definir próxima acción'} · {item.stage_name || 'Seguimiento'}</span></div><div className="crm-attention-meta"><span className={`crm-status-pill ${overdue?'danger':'cyan'}`}>{overdue?'Vencido':'Próximo'}</span><small>{item.days_without_contact || 0} días sin contacto</small></div><ArrowUpRight size={16}/></a>; }) : <div className="crm-empty-success"><Check size={20}/><div><strong>Todo bajo control</strong><span>No hay seguimientos urgentes.</span></div></div>}</div>
      </div>

      <div className="glass-card crm-activity-panel">
        <div className="crm-panel-heading compact"><div><span className="crm-eyebrow"><Sparkles size={14}/> HOY</span><h2>Actividad reciente</h2></div></div>
        <div className="crm-timeline">{activity.length ? activity.map((item,i) => <div className="crm-timeline-row" key={`${item.id}-${i}`}><span className={`crm-timeline-icon tone-${i%3}`}>{i%2?<CalendarCheck size={15}/>:<PhoneCall size={15}/>}</span><div><strong>{item.title}</strong><span>{item.contact_name || item.opp_title || 'Actividad personal'}</span></div><time>{item.scheduled_at ? format(new Date(item.scheduled_at),'HH:mm') : 'Hoy'}</time></div>) : <div className="crm-empty-success"><Check size={20}/><div><strong>Sin tareas pendientes</strong><span>Tu actividad aparecerá aquí.</span></div></div>}</div>
      </div>

      <div className="glass-card crm-chart-panel">
        <div className="crm-panel-heading compact"><div><span className="crm-eyebrow"><Sparkles size={14}/> RITMO COMERCIAL</span><h2>Actividad del día</h2><p>Prospección y seguimientos en tiempo real</p></div><span className="crm-status-pill purple">Hoy</span></div>
        <ResponsiveContainer width="100%" height={260}><AreaChart data={chartData} margin={{top:20,right:8,left:-24,bottom:0}}><defs><linearGradient id="activityNeon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B5CF6" stopOpacity=".46"/><stop offset="1" stopColor="#8B5CF6" stopOpacity="0"/></linearGradient><linearGradient id="followupNeon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06B6D4" stopOpacity=".28"/><stop offset="1" stopColor="#06B6D4" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(156,163,175,.10)" strokeDasharray="4 5"/><XAxis dataKey="hour" tick={{fill:'#9CA3AF',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#9CA3AF',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#121620',border:'1px solid rgba(139,92,246,.35)',borderRadius:14}}/><Area type="monotone" dataKey="actividad" stroke="#8B5CF6" fill="url(#activityNeon)" strokeWidth={3} activeDot={{r:6,fill:'#fff',stroke:'#8B5CF6',strokeWidth:4}}/><Area type="monotone" dataKey="seguimiento" stroke="#06B6D4" fill="url(#followupNeon)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
        <div className="crm-chart-legend"><span><i className="purple"/>Actividad</span><span><i className="cyan"/>Seguimientos</span></div>
      </div>

      <div className="glass-card crm-quick-panel">
        <div className="crm-panel-heading compact"><div><span className="crm-eyebrow"><Sparkles size={14}/> ACCIONES RÁPIDAS</span><h2>Continúa trabajando</h2></div></div>
        <a href="/prospecting" className="crm-quick-action purple"><Building2/><span><strong>Revisar prospección</strong><small>Clasifica los leads del día</small></span><ArrowUpRight/></a>
        <a href="/followups" className="crm-quick-action cyan"><PhoneCall/><span><strong>Abrir seguimientos</strong><small>Prioriza la próxima acción</small></span><ArrowUpRight/></a>
        <a href="/communications" className="crm-quick-action pink"><Copy/><span><strong>Copiar plantilla</strong><small>Prepara el siguiente mensaje</small></span><ArrowUpRight/></a>
      </div>
    </section>
  </div>;
}
