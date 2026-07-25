import React, { useEffect, useState } from 'react';
import { Users2, Target, CalendarCheck, DollarSign, TrendingUp, Clock } from 'lucide-react';
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

  const COLORS = ['#6B7280','#3B82F6','#F59E0B','#8B5CF6','#10B981','#EF4444'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido de vuelta, {user?.name} · {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Contactos', value: stats.total_contacts || 0, icon: Users2, bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
          { label: 'Oportunidades abiertas', value: stats.total_opportunities || 0, icon: Target, bg: 'linear-gradient(135deg, #10B981, #047857)' },
          { label: 'Actividades pendientes', value: stats.total_activities || 0, icon: CalendarCheck, bg: 'linear-gradient(135deg, #F59E0B, #B45309)' },
          { label: 'Pipeline activo', value: fmt(stats.pipeline_value || 0), icon: DollarSign, bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
          { label: 'Ingresos ganados', value: fmt(stats.revenue_won || 0), icon: TrendingUp, bg: 'linear-gradient(135deg, #14B8A6, #0F766E)' },
          { label: 'Usuarios activos', value: stats.total_users || 0, icon: Users2, bg: 'linear-gradient(135deg, #EC4899, #BE185D)' },
        ].map(({ label, value, icon: Icon, bg }) => (
          <div className="stat-card stat-card-colored" key={label} style={{ background: bg }}>
            <div className="stat-icon">
              <Icon size={24} color="#ffffff" />
            </div>
            <div style={{ flex: 1, zIndex: 1 }}>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
            {/* Decal de fondo para que el diseño se vea más premium */}
            <Icon size={100} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.15, transform: 'rotate(-15deg)', pointerEvents: 'none' }} color="#ffffff" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Area chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 600 }}>Oportunidades mensuales</h3>
              <p className="text-muted text-sm">Últimos 12 meses</p>
            </div>
          </div>
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={220}>
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
                <Area type="monotone" dataKey="oportunidades" stroke="#0f766e" fill="url(#grad)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: '#0f766e', stroke: '#ccfbf1', strokeWidth: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>Sin datos aún</p></div>}
        </div>

        {/* Pipeline donut */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Pipeline por etapa</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Oportunidades abiertas</p>
          {pipeline.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pipeline} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} stroke="none">
                  {pipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Oportunidades']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
