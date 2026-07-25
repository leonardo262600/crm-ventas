import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Download, FileSpreadsheet, Users2, Target, FileText, Calendar, X } from 'lucide-react';
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
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [activePreset, setActivePreset] = useState('Últimos 12 meses');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    api.get('/reports/dashboard', { params })
      .then(r => setData(r.data))
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
  const topSellers = data?.top_sellers || [];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div><h1>Reportes y Dashboards</h1><p>Análisis y métricas de ventas</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
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

            {/* Ranking vendedores */}
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Ranking de vendedores</h3>
              {topSellers.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topSellers} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip formatter={v => [fmt(v), 'Ganado']} />
                    <Bar dataKey="total_amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ height: 160 }}><p>Sin ventas ganadas en este período</p></div>}
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
