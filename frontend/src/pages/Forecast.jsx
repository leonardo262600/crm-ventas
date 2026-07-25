import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Target, Calendar, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { fmtCurrency as fmt } from '../utils/format';

const MONTH_NAMES = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };
const labelMonth = ym => {
  const [, m] = ym.split('-');
  return MONTH_NAMES[m] || ym;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
      <p style={{ fontWeight:700, marginBottom:6, color:'#1e293b' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color }}>{p.name}: <strong>{fmt(p.value)}</strong></p>
      ))}
    </div>
  );
};

export default function Forecast() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/opportunities/forecast')
       .then(r => setData(r.data))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop:80 }}/>;
  if (!data)   return <div className="card"><div className="empty-state"><AlertCircle size={40}/><h3>No se pudo cargar el pronóstico</h3></div></div>;

  const { byMonth = [], byStage = [], totals = {}, closing_soon = [] } = data;

  const monthChartData = byMonth.map(m => ({
    month: labelMonth(m.month),
    'Total pipeline': Number(m.total_amount),
    'Ponderado':      Number(m.weighted_amount),
  }));

  const stageChartData = byStage.filter(s => s.count > 0).map(s => ({
    name:  s.stage,
    value: Number(s.total),
    color: s.color || '#0f766e',
  }));

  const KPI = ({ icon: Icon, label, value, sub, color = '#0f766e' }) => (
    <div className="card" style={{ display:'flex', gap:14, alignItems:'center', padding:'20px 22px' }}>
      <div style={{ background:`${color}15`, borderRadius:12, padding:12, flexShrink:0 }}>
        <Icon size={22} color={color}/>
      </div>
      <div>
        <p style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>{label}</p>
        <p style={{ fontSize:22, fontWeight:700, color:'#1e293b' }}>{value}</p>
        {sub && <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Pronóstico de Ingresos</h1><p>Pipeline ponderado y oportunidades activas</p></div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, marginBottom:24 }}>
        <KPI icon={Target}      label="Oportunidades abiertas"  value={totals.total_open || 0}          color="#0f766e"/>
        <KPI icon={DollarSign}  label="Total pipeline"          value={fmt(totals.pipeline_total)}      color="#3B82F6"/>
        <KPI icon={TrendingUp}  label="Pipeline ponderado"      value={fmt(totals.weighted_total)}      color="#8B5CF6"
             sub={`Prob. promedio: ${Math.round(totals.avg_probability || 0)}%`}/>
        <KPI icon={Calendar}    label="Cierran en 30 días"       value={closing_soon.length}             color="#F59E0B"/>
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:24 }}>
        {/* Bar chart by month */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Pipeline por mes (próximos 6 meses)</h3>
          {monthChartData.length === 0 ? (
            <div className="empty-state" style={{ minHeight:200 }}><TrendingUp size={36}/><p>Sin datos de cierre próximos</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize:12, fill:'#64748b' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                       tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomBarTooltip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Bar dataKey="Total pipeline" fill="#3B82F6" radius={[4,4,0,0]}/>
                <Bar dataKey="Ponderado"      fill="#0f766e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart by stage */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Distribución por etapa</h3>
          {stageChartData.length === 0 ? (
            <div className="empty-state" style={{ minHeight:200 }}><Target size={36}/><p>Sin oportunidades abiertas</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stageChartData} dataKey="value" nameKey="name"
                     cx="50%" cy="45%" outerRadius={90} innerRadius={45}
                     paddingAngle={3} label={false}>
                  {stageChartData.map((s, i) => <Cell key={i} fill={s.color}/>)}
                </Pie>
                <Tooltip formatter={v => fmt(v)}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stage breakdown table */}
      <div className="card" style={{ marginBottom:24 }}>
        <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Desglose por etapa</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Etapa</th>
                <th style={{ textAlign:'center' }}>Oport.</th>
                <th style={{ textAlign:'right' }}>Total</th>
                <th style={{ textAlign:'right' }}>Ponderado</th>
                <th style={{ textAlign:'center' }}>Prob. prom.</th>
              </tr>
            </thead>
            <tbody>
              {byStage.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background: s.color || '#64748b', flexShrink:0 }}/>
                      <span style={{ fontWeight:500 }}>{s.stage}</span>
                    </div>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span className="badge badge-gray">{s.count}</span>
                  </td>
                  <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(s.total)}</td>
                  <td style={{ textAlign:'right', color:'#0f766e', fontWeight:600 }}>{fmt(s.weighted)}</td>
                  <td style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <div style={{ width:60, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${Math.round(s.avg_prob||0)}%`, height:'100%', background: s.color||'#0f766e', borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:11, color:'#64748b' }}>{Math.round(s.avg_prob||0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closing soon */}
      {closing_soon.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <Calendar size={16} color="#F59E0B"/>
            Cierran en los próximos 30 días
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Oportunidad</th><th>Contacto</th><th>Etapa</th><th style={{ textAlign:'right' }}>Monto</th><th style={{ textAlign:'center' }}>Prob.</th><th>Fecha cierre</th><th>Asignado</th></tr>
              </thead>
              <tbody>
                {closing_soon.map(o => {
                  const daysLeft = Math.ceil((new Date(o.close_date) - new Date()) / 86400000);
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight:600 }}>{o.title}</td>
                      <td style={{ color:'#64748b' }}>{o.contact_name || '—'}</td>
                      <td>{o.stage_name || '—'}</td>
                      <td style={{ textAlign:'right', fontWeight:600, color:'#0f766e' }}>{fmt(o.amount)}</td>
                      <td style={{ textAlign:'center' }}>
                        <span className={`badge ${o.probability>=70?'badge-green':o.probability>=40?'badge-yellow':'badge-red'}`}>
                          {o.probability}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          <span style={{ fontSize:12 }}>{format(new Date(o.close_date),'dd MMM yyyy',{locale:es})}</span>
                          <span style={{ fontSize:10, color: daysLeft<=7?'#ef4444':daysLeft<=14?'#f59e0b':'#10b981', fontWeight:600 }}>
                            {daysLeft <= 0 ? 'Vencido' : `${daysLeft} días`}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:'#64748b' }}>{o.assigned_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
