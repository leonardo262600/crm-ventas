import React, { useEffect, useState } from 'react';
import { Target, CalendarCheck, DollarSign, TrendingUp, Clock, TriangleAlert, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fmtCurrency, fmtShortCurrency } from '../utils/format';

const fmt = fmtCurrency;

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const stats = data?.stats || {};
  
  // Rellenar últimos 6 meses para que el gráfico de área tenga forma de tendencia
  const monthNames = { '01':'Ene', '02':'Feb', '03':'Mar', '04':'Abr', '05':'May', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Sep', '10':'Oct', '11':'Nov', '12':'Dic' };
  const last6Months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const d2 = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const mm = String(d2.getMonth() + 1).padStart(2, '0');
    const yyyy = d2.getFullYear();
    last6Months.push({ monthStr: `${yyyy}-${mm}`, name: monthNames[mm] });
  }

  const monthly = last6Months.map(m => {
    const found = (data?.monthly || []).find(x => x.month === m.monthStr);
    return {
      name: m.name,
      oportunidades: found ? found.count : 0,
      monto: found ? Number(found.amount) : 0
    };
  });

  const pipeline = data?.pipeline || [];
  const topSellers = data?.top_sellers || [];
  const upcoming = data?.upcoming || [];
  const todayTasks = data?.today_tasks || [];
  const priorities = data?.priorities || [];

  const COLORS = ['#6B7280','#3B82F6','#F59E0B','#8B5CF6','#10B981','#EF4444'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Prioridades comerciales</h1>
          <p>Bienvenido de vuelta, {user?.name} · {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div style={{marginBottom:14}}>
          <h3 style={{fontWeight:700}}>Mi plan de hoy</h3>
          <p className="text-muted text-sm">Empieza por la izquierda y deja cada elemento con una próxima acción</p>
        </div>
        <div className="daily-plan-grid">
          {[
            { label:'Demos de hoy', value:stats.demos_today || 0, href:'/opportunities', color:'#3454d1' },
            { label:'Resultados de demo', value:stats.demo_results_pending || 0, href:'/opportunities', color:'#b45309' },
            { label:'Seguimientos vencidos', value:stats.overdue_followups || 0, href:'/followups', color:'#dc2626' },
            { label:'Tareas de hoy', value:stats.tasks_today || 0, href:'/activities', color:'#d97706' },
            { label:'No Shows pendientes', value:stats.no_shows_pending || 0, href:'/followups', color:'#7c3aed' },
            { label:'Prospectos pendientes', value:stats.prospecting_pending || 0, href:'/prospecting', color:'#0f766e' },
          ].map(item => (
            <a key={item.label} href={item.href} className="daily-plan-item" style={{borderTop:`3px solid ${item.color}`}}>
              <strong style={{color:item.color}}>{item.value}</strong>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Seguimientos vencidos', value: stats.overdue_followups || 0, icon: TriangleAlert, bg: 'linear-gradient(135deg, #EF4444, #B91C1C)' },
          { label: 'Seguimientos para hoy', value: stats.today_followups || 0, icon: CalendarCheck, bg: 'linear-gradient(135deg, #F59E0B, #B45309)' },
          { label: 'Sin próxima acción', value: stats.without_next_action || 0, icon: CalendarDays, bg: 'linear-gradient(135deg, #64748B, #334155)' },
          { label: 'Demos últimos 7 días', value: stats.demos_week || 0, icon: Target, bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
          { label: 'Cash collected del mes', value: fmt(stats.cash_collected_month || 0), icon: DollarSign, currency: true, bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
          { label: 'Mi comisión del mes', value: fmt(stats.commission_month || 0), icon: TrendingUp, currency: true, bg: 'linear-gradient(135deg, #14B8A6, #0F766E)' },
        ].map(({ label, value, icon: Icon, bg, currency }) => (
          <div className="stat-card stat-card-colored" key={label} style={{ background: bg }}>
            {!currency && <div className="stat-icon">
              <Icon size={24} color="#ffffff" />
            </div>}
            <div className={currency ? 'stat-content stat-content-currency' : 'stat-content'}>
              <div className={`stat-value ${currency ? 'stat-value-currency' : ''}`}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
            {/* Decal de fondo para que el diseño se vea más premium */}
            <Icon size={100} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.15, transform: 'rotate(-15deg)', pointerEvents: 'none' }} color="#ffffff" />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div><h3 style={{fontWeight:600}}>Qué requiere tu atención</h3><p className="text-muted text-sm">Ordenado por vencimiento y temperatura</p></div>
          <a className="btn btn-secondary btn-sm" href="/followups">Ver todos</a>
        </div>
        {priorities.length ? priorities.map(item => (
          <div key={item.id} style={{display:'flex',gap:12,alignItems:'center',padding:'11px 0',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:item.next_action_at && new Date(item.next_action_at)<new Date()?'#ef4444':'#f59e0b'}}/>
            <div style={{flex:1}}>
              <p style={{fontWeight:600,fontSize:13}}>{item.contact_name || item.company || item.title}</p>
              <p className="text-muted text-sm">{item.next_action || 'Definir próxima acción'} · {item.stage_name || 'Sin etapa'}</p>
            </div>
            <span className={`badge ${item.temperature==='caliente'?'badge-red':item.temperature==='fria'?'badge-blue':'badge-yellow'}`}>{item.temperature || 'sin clasificar'}</span>
            <span className="text-muted text-sm">{item.days_without_contact} días sin contacto</span>
          </div>
        )) : <div className="empty-state" style={{padding:30}}><p>No hay prioridades pendientes</p></div>}
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div><h3 style={{fontWeight:600}}>Tareas de hoy</h3><p className="text-muted text-sm">Incluye las tareas vencidas que todavía no has completado</p></div>
          <a className="btn btn-primary btn-sm" href="/activities">Añadir tarea</a>
        </div>
        {todayTasks.length ? todayTasks.map(task => (
          <div key={task.id} style={{display:'flex',gap:12,alignItems:'center',padding:'11px 0',borderBottom:'1px solid #f1f5f9'}}>
            <Clock size={17} color={task.scheduled_at && new Date(task.scheduled_at)<new Date()?'#ef4444':'#3454d1'}/>
            <div style={{flex:1}}>
              <p style={{fontWeight:600,fontSize:13}}>{task.title}</p>
              <p className="text-muted text-sm">{task.contact_name || task.opp_title || 'Tarea personal'}</p>
            </div>
            <span className="badge badge-blue">{task.type}</span>
            <span className="text-muted text-sm">{task.scheduled_at ? format(new Date(task.scheduled_at),'HH:mm') : 'Sin hora'}</span>
          </div>
        )) : <div className="empty-state" style={{padding:30}}><p>No tienes tareas pendientes para hoy</p></div>}
      </div>

      {/* Charts row */}
      <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Area chart */}
        <div className="card monthly-chart">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 600 }}>Oportunidades mensuales</h3>
              <p className="text-muted text-sm">Últimos 12 meses</p>
            </div>
          </div>
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(v, n) => [n === 'monto' ? fmt(v) : v, n === 'monto' ? 'Monto' : 'Oportunidades']} 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="oportunidades" stroke="#0f766e" fill="url(#grad)" strokeWidth={3} activeDot={{ r: 6, fill: '#0f766e', stroke: '#ccfbf1', strokeWidth: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>Sin datos aún</p></div>}
        </div>

        {/* Pipeline donut */}
        <div className="card pipeline-chart">
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Pipeline por etapa</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Oportunidades abiertas</p>
          {pipeline.length ? (
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={pipeline} dataKey="count" nameKey="name" cx="50%" cy="42%" innerRadius={54} outerRadius={76} paddingAngle={4} stroke="none">
                  {pipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Oportunidades']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, lineHeight:1.65, paddingTop:12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>Sin datos</p></div>}
        </div>
      </div>

      {/* Row 2 of charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 600 }}>Valor del Pipeline por Etapa</h3>
              <p className="text-muted text-sm">Distribución monetaria del embudo de ventas</p>
            </div>
          </div>
          {pipeline.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => fmtShortCurrency(v)} />
                <Tooltip 
                  formatter={(v) => [fmt(v), 'Valor Estimado']} 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {pipeline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>Sin datos</p></div>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="dashboard-bottom-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top sellers */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Top vendedores</h3>
          {topSellers.length ? topSellers.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#134e4a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</p>
                <div style={{ background: '#e2e8f0', borderRadius: 4, height: 4, marginTop: 4 }}>
                  <div style={{ background: '#0f766e', height: 4, borderRadius: 4, width: `${Math.min(100, (s.total_amount / (topSellers[0]?.total_amount || 1)) * 100)}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e' }}>{fmt(s.total_amount)}</span>
            </div>
          )) : <div className="empty-state"><p>Sin datos</p></div>}
        </div>

        {/* Upcoming activities */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Próximas actividades</h3>
          {upcoming.length ? upcoming.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                <Clock size={16} color="#10B981" />
              </div>
              <div>
                <p style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {a.contact_name && `${a.contact_name} · `}
                  {a.scheduled_at ? format(new Date(a.scheduled_at), 'dd MMM HH:mm', { locale: es }) : '—'}
                </p>
              </div>
              <span className="badge badge-blue" style={{ marginLeft: 'auto', flexShrink: 0 }}>{a.type}</span>
            </div>
          )) : <div className="empty-state"><p>No hay actividades próximas</p></div>}
        </div>
      </div>
    </div>
  );
}
