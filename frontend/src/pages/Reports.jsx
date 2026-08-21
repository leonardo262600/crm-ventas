import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileSpreadsheet, Users2, Target, FileText, Calendar, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const downloadFile = async (url, filename) => {
  try {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al descargar');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch { toast.error('Error al descargar el archivo'); }
};

import { fmtCurrency as fmt } from '../utils/format';
const COLORS = ['#6B7280', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];

// Periodos rápidos
const TODAY      = new Date();
const fmtDate    = d => d.toISOString().split('T')[0];
const PRESETS    = [
  { label: 'Este mes',       from: fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)),    to: fmtDate(TODAY) },
  { label: 'Mes pasado',     from: fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)), to: fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 0)) },
  { label: 'Último trimestre', from: fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth() - 3, 1)), to: fmtDate(TODAY) },
  { label: 'Este año',       from: fmtDate(new Date(TODAY.getFullYear(), 0, 1)),                   to: fmtDate(TODAY) },
  { label: 'Últimos 12 meses', from: null, to: null }, // sin filtro = default del backend
];

export default function Reports() {
  const [data, setData]         = useState(null);
  const [commercial, setCommercial] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [activePreset, setActivePreset] = useState('Últimos 12 meses');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    Promise.all([
      api.get('/reports/dashboard', { params }),
      api.get('/reports/commercial-analytics', { params }),
    ])
      .then(([dashboard, analytics]) => {
        setData(dashboard.data);
        setCommercial(analytics.data);
      })
      .catch(error => toast.error(error.response?.data?.message || 'No se pudo cargar la analítica'))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setFrom(preset.from || '');
    setTo(preset.to || '');
  };

  const clearDates = () => { setFrom(''); setTo(''); setActivePreset('Últimos 12 meses'); };

  // Construir URL con parámetros de fecha para descargas
  const buildExportUrl = (base) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    return `${base}${params.toString() ? '?' + params.toString() : ''}`;
  };

  const stats      = data?.stats || {};
  const monthly    = (data?.monthly || []).map(m => ({ name: m.month?.slice(5), oportunidades: m.count, monto: Number(m.amount) }));
  const pipeline   = data?.pipeline || [];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div><h1>KPI comerciales</h1><p>Embudo personal, seguimiento y calidad de la prospección</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={15}/>Actualizar</button>
          <button className="btn btn-secondary" onClick={() => downloadFile(buildExportUrl('/api/exports/contacts/excel'), 'contactos.xlsx')}>
            <Users2 size={15} /> Contactos XLS
          </button>
          <button className="btn btn-secondary" onClick={() => downloadFile(buildExportUrl('/api/exports/opportunities/excel'), 'oportunidades.xlsx')}>
            <Target size={15} /> Oportunidades XLS
          </button>
          <button className="btn btn-secondary" onClick={() => downloadFile(buildExportUrl('/api/exports/report/excel'), 'reporte-crm.xlsx')}>
            <FileSpreadsheet size={15} /> Reporte XLS
          </button>
          <button className="btn btn-primary" onClick={() => downloadFile(buildExportUrl('/api/exports/report/pdf'), `reporte-${from || 'general'}.pdf`)}>
            <FileText size={15} /> Reporte PDF
          </button>
        </div>
      </div>

      {/* ── Filtro de fechas ── */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
            <Calendar size={15} /><span style={{ fontWeight: 600 }}>Período:</span>
          </div>

          {/* Presets rápidos */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: '1.5px solid', cursor: 'pointer', transition: 'all .15s',
                  background: activePreset === p.label ? '#0f766e' : 'transparent',
                  borderColor: activePreset === p.label ? '#0f766e' : '#e2e8f0',
                  color: activePreset === p.label ? 'white' : '#475569',
                }}
              >{p.label}</button>
            ))}
          </div>

          {/* Selector manual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Personalizado:</span>
            <input
              type="date" className="input" style={{ width: 145 }}
              value={from}
              onChange={e => { setFrom(e.target.value); setActivePreset(''); }}
            />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
            <input
              type="date" className="input" style={{ width: 145 }}
              value={to}
              onChange={e => { setTo(e.target.value); setActivePreset(''); }}
            />
            {(from || to) && (
              <button className="btn-icon" title="Limpiar fechas" onClick={clearDates}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Indicador de periodo activo */}
        {(from || to) && (
          <p style={{ fontSize: 11, color: '#0f766e', marginTop: 8, fontWeight: 500 }}>
            Mostrando datos del {from || '…'} al {to || '…'}
          </p>
        )}
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <div className="card" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:16,flexWrap:'wrap'}}>
              <div>
                <h3 style={{fontWeight:700}}>Rendimiento del embudo comercial</h3>
                <p className="text-muted text-sm">Se actualiza al abrir esta página. “Trabajados” significa que el lead ya salió de Pendiente.</p>
              </div>
              {commercial?.generated_at && <span className="text-muted" style={{fontSize:11}}>Actualizado: {new Date(commercial.generated_at).toLocaleString('es-ES')}</span>}
            </div>
            <div className="stats-grid" style={{marginBottom:20}}>
              {[
                ['Leads', commercial?.kpis?.leads || 0, '#3b82f6'],
                ['Trabajados', commercial?.kpis?.worked || 0, '#0f766e'],
                ['Contactados', commercial?.kpis?.contacted || 0, '#8b5cf6'],
                ['Demos agendadas', commercial?.kpis?.scheduled || 0, '#f59e0b'],
                ['Demos realizadas', commercial?.kpis?.demos_completed || 0, '#06b6d4'],
                ['Ventas', commercial?.kpis?.sales || 0, '#16a34a'],
              ].map(([label,value,color])=>(
                <div key={label} style={{padding:'14px 16px',background:'var(--card)',border:'1px solid var(--border)',borderTop:`4px solid ${color}`,borderRadius:12}}>
                  <strong style={{display:'block',fontSize:25,color}}>{value}</strong>
                  <span className="text-muted text-sm">{label}</span>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
              {[
                ['Tasa trabajada', commercial?.kpis?.work_rate],
                ['Tasa de contacto', commercial?.kpis?.contact_rate],
                ['Tasa de agendamiento', commercial?.kpis?.booking_rate],
                ['Tasa de asistencia', commercial?.kpis?.attendance_rate],
                ['Cierre sobre demos', commercial?.kpis?.sales_rate],
              ].map(([label,value])=>(
                <div key={label} style={{padding:12,border:'1px solid var(--border)',borderRadius:10,background:'var(--bg)',textAlign:'center'}}>
                  <strong style={{fontSize:20}}>{value || 0}%</strong>
                  <span className="text-muted" style={{display:'block',fontSize:11,marginTop:3}}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:20,marginBottom:20}}>
            <div className="card">
              <h3 style={{fontWeight:600,marginBottom:16}}>Embudo de prospección a venta</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={commercial?.funnel || []} layout="vertical">
                  <XAxis type="number" allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" width={115} tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Bar dataKey="value" fill="#3b5bdb" radius={[0,5,5,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{fontWeight:600,marginBottom:16}}>Calidad de los leads</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={commercial?.qualification || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={({name,value})=>`${name}: ${value}`}>
                    {(commercial?.qualification || []).map((_,i)=><Cell key={i} fill={['#16a34a','#f59e0b','#ef4444','#94a3b8'][i%4]}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{marginBottom:20}}>
            <h3 style={{fontWeight:600,marginBottom:16}}>Zonas con mayor actividad</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Provincia / zona</th><th>Leads</th><th>Contactados</th><th>Demos</th><th>Tasa de contacto</th></tr></thead>
                <tbody>
                  {(commercial?.zones || []).map(zone=>{
                    const rate = Number(zone.leads) ? ((Number(zone.contacted)/Number(zone.leads))*100).toFixed(1) : '0.0';
                    return <tr key={zone.name}><td><strong>{zone.name}</strong></td><td>{zone.leads}</td><td>{zone.contacted}</td><td>{zone.scheduled}</td><td>{rate}%</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Pipeline activo',        value: fmt(stats.pipeline_value),    color: '#3B82F6' },
              { label: 'Ingresos ganados',        value: fmt(stats.revenue_won),       color: '#10B981' },
              { label: 'Contactos totales',       value: stats.total_contacts,         color: '#F59E0B' },
              { label: 'Oportunidades abiertas',  value: stats.total_opportunities,    color: '#8B5CF6' },
            ].map(k => (
              <div className="card" key={k.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{k.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Monto por mes */}
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Monto de oportunidades por mes</h3>
              {monthly.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthly}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [fmt(v), 'Monto']} />
                    <Bar dataKey="monto" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ height: 200 }}><p>Sin datos en este período</p></div>}
            </div>

            {/* Pipeline donut */}
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Embudo de ventas (oportunidades)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pipeline} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3}
                    label={({ name, count }) => `${name}: ${count}`}>
                    {pipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tendencia */}
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Tendencia de oportunidades</h3>
              {monthly.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthly}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="oportunidades" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ height: 160 }}><p>Sin datos en este período</p></div>}
            </div>

          </div>

          {/* Pipeline por etapa — tabla */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Detalle del pipeline por etapa</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Etapa</th><th>Oportunidades</th><th>Monto total</th><th>% del pipeline</th></tr></thead>
                <tbody>
                  {pipeline.map((p, i) => {
                    const totalPipeline = pipeline.reduce((s, x) => s + Number(x.amount), 0);
                    const pct = totalPipeline ? ((Number(p.amount) / totalPipeline) * 100).toFixed(1) : 0;
                    return (
                      <tr key={i}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />{p.name}
                        </div></td>
                        <td>{p.count}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(p.amount)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, flex: 1 }}>
                              <div style={{ background: COLORS[i % COLORS.length], height: 6, borderRadius: 4, width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
