import React, { useEffect, useMemo, useState } from 'react';
import { BadgeEuro, CalendarCheck2, ChevronLeft, ChevronRight, Target, Trophy, Users } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const money = value => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(Number(value || 0));
const monthLabel = value => new Intl.DateTimeFormat('es-ES', { month:'long', year:'numeric' }).format(new Date(`${value}-01T12:00:00`));
const shiftMonth = (month, offset) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
};

export default function SetterCommissions() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({ setters:[], demo_tiers:[] });
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/setter-commissions', { params:{ month } })
      .then(({ data: response }) => {
        setData(response);
        setSelectedId(current => response.setters.some(item => Number(item.id) === Number(current)) ? current : response.setters[0]?.id || null);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const selected = useMemo(
    () => data.setters.find(item => Number(item.id) === Number(selectedId)) || data.setters[0],
    [data.setters, selectedId]
  );
  const currentTierStart = [...(data.demo_tiers || [])].reverse().find(item => Number(selected?.completed_demos || 0) >= item.min)?.min || 0;
  const progressTarget = selected?.next_demo_target || 80;
  const progress = Math.min(100, Math.max(0, ((Number(selected?.completed_demos || 0) - currentTierStart) / Math.max(1, progressTarget - currentTierStart)) * 100));

  return (
    <div>
      <div className="page-header" style={{alignItems:'center'}}>
        <div><h1>Comisiones Setter</h1><p>Solo cuentan las demos realizadas: las agendadas y los No Show no suman.</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={() => setMonth(value => shiftMonth(value, -1))}><ChevronLeft size={16}/></button>
          <strong style={{minWidth:145,textAlign:'center',textTransform:'capitalize'}}>{monthLabel(month)}</strong>
          <button className="btn btn-secondary btn-sm" onClick={() => setMonth(value => shiftMonth(value, 1))}><ChevronRight size={16}/></button>
        </div>
      </div>

      {user?.role !== 'setter' && data.setters.length > 0 && (
        <div className="card" style={{padding:10,display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {data.setters.map(item => <button key={item.id} className={`btn btn-sm ${Number(selectedId)===Number(item.id)?'btn-primary':'btn-secondary'}`} onClick={() => setSelectedId(item.id)}>{item.name} · {item.completed_demos} demos</button>)}
        </div>
      )}

      {loading ? <div className="spinner"/> : !selected ? (
        <div className="card empty-state" style={{padding:40}}><p>No hay setters activos.</p></div>
      ) : <>
        <div className="setter-commission-kpis">
          {[
            {label:'Demos realizadas',value:selected.completed_demos,icon:CalendarCheck2,color:'#2563eb'},
            {label:'Fijo alcanzado',value:money(selected.fixed),icon:Trophy,color:'#7c3aed'},
            {label:'Clientes vendidos',value:selected.clients,icon:Users,color:'#059669'},
            {label:'Comisión total',value:money(selected.total_commission),icon:BadgeEuro,color:'#db2777'},
          ].map(({label,value,icon:Icon,color}) => <div className="card" key={label} style={{padding:18,borderTop:`4px solid ${color}`}}><Icon size={20} color={color}/><strong style={{display:'block',fontSize:25,marginTop:8}}>{value}</strong><span style={{color:'var(--text-muted)',fontSize:12}}>{label}</span></div>)}
        </div>

        <div className="setter-commission-layout">
          <section className="card" style={{padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start'}}>
              <div><h2 style={{fontSize:18}}>{selected.name}</h2><p style={{fontSize:12,color:'var(--text-muted)'}}>Progreso de demos realizadas en {monthLabel(month)}</p></div>
              <span className="badge badge-green">{selected.completed_demos} realizadas</span>
            </div>
            <div className="setter-progress"><div style={{width:`${progress}%`}}/></div>
            <p style={{fontSize:13}}>{selected.next_demo_target ? `Faltan ${selected.demos_to_next_target} demos realizadas para llegar al siguiente tramo de ${selected.next_demo_target}.` : 'Objetivo máximo de fijo alcanzado.'}</p>
            <div className="setter-tier-grid">
              {(data.demo_tiers || []).map(tier => {
                const reached = selected.completed_demos >= tier.min;
                return <div key={tier.min} className={reached ? 'reached' : ''}><strong>{tier.min}{tier.max ? `–${tier.max}` : '+'}</strong><p>{money(tier.amount)}</p></div>;
              })}
            </div>
          </section>

          <section className="card" style={{padding:20}}>
            <h2 style={{fontSize:18,display:'flex',alignItems:'center',gap:8}}><Target size={18}/>Desglose</h2>
            <div style={{display:'grid',gap:12,marginTop:18}}>
              <div className="followup-filter"><span>Fijo por demos</span><strong>{money(selected.fixed)}</strong></div>
              <div className="followup-filter"><span>Tramo por cliente</span><strong>{money(selected.client_rate)}</strong></div>
              <div className="followup-filter"><span>Comisión por ventas</span><strong>{money(selected.sales_commission)}</strong></div>
              <div className="followup-filter" style={{borderColor:'#db2777'}}><span>Total del mes</span><strong style={{color:'#db2777',fontSize:20}}>{money(selected.total_commission)}</strong></div>
            </div>
            <p style={{fontSize:11,color:'var(--text-muted)',marginTop:14}}>El tramo se aplica a cada cliente vendido del mes: 1–4 = 50 €, 5–7 = 80 €, 8 o más = 100 €.</p>
          </section>
        </div>

        <section className="card setter-commission-rules">
          <div className="setter-rules-heading">
            <div><h2>Tabla de objetivos y comisiones</h2><p>Referencia mensual para todo el equipo.</p></div>
            <Trophy size={24} color="#7c3aed"/>
          </div>
          <div className="setter-rules-grid">
            <div>
              <h3>Fijo por demos realizadas</h3>
              <p className="setter-rule-note">La demo cuenta únicamente cuando el cliente asiste y el asesor la marca como realizada.</p>
              <div className="table-container">
                <table>
                  <thead><tr><th>Demos realizadas</th><th>Fijo mensual</th></tr></thead>
                  <tbody>{(data.demo_tiers || []).map(tier => <tr key={tier.min}><td>{tier.min}{tier.max ? `–${tier.max}` : '+'}</td><td><strong>{money(tier.amount)}</strong></td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div>
              <h3>Comisión por clientes vendidos</h3>
              <p className="setter-rule-note">El tramo alcanzado determina la comisión que se aplica a cada cliente vendido durante el mes.</p>
              <div className="table-container">
                <table>
                  <thead><tr><th>Clientes vendidos</th><th>Por cliente</th></tr></thead>
                  <tbody>
                    <tr><td>1–4</td><td><strong>{money(50)}</strong></td></tr>
                    <tr><td>5–7</td><td><strong>{money(80)}</strong></td></tr>
                    <tr><td>8 o más</td><td><strong>{money(100)}</strong></td></tr>
                  </tbody>
                </table>
              </div>
              <div className="setter-motivation"><BadgeEuro size={20}/><div><strong>Fijo + comisión por ventas</strong><p>Ambos importes se suman automáticamente en la comisión total del mes.</p></div></div>
            </div>
          </div>
        </section>
      </>}
    </div>
  );
}
