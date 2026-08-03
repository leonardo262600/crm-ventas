import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, PhoneCall, Target, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';

const dateTime = value => value ? new Date(value).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Sin fecha';

export default function TeamWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{ api.get(`/team-workspaces/${id}`).then(response=>setData(response.data)).catch(error=>toast.error(error.response?.data?.message||'No se pudo abrir la hoja')).finally(()=>setLoading(false)); },[id]);
  if (loading) return <div className="spinner"/>;
  if (!data) return null;
  const { member,prospecting,sales,setter_results,demos,tasks }=data;
  const isSetter=member.role==='setter';
  return <div>
    <div className="page-header"><div><button className="btn btn-secondary btn-sm" onClick={()=>navigate('/users')} style={{marginBottom:10}}><ArrowLeft size={14}/>Usuarios</button><h1>Hoja de trabajo · {member.name}</h1><p>{isSetter?'Setter':'Closer'} · {member.email}</p></div><span className={`badge ${member.active?'badge-green':'badge-red'}`}>{member.active?'Activo':'Inactivo'}</span></div>
    <div className="team-workspace-stats">
      <div className="team-workspace-stat"><PhoneCall/><span>Llamadas pendientes</span><strong>{Number(prospecting.pending_calls||0)}</strong></div>
      <div className="team-workspace-stat"><CalendarClock/><span>{isSetter?'Demos realizadas':'Próximas demos'}</span><strong>{isSetter?Number(setter_results.completed_demos||0):demos.length}</strong></div>
      <div className="team-workspace-stat"><Target/><span>Oportunidades del mes</span><strong>{Number(sales.opportunities||0)}</strong></div>
      <div className="team-workspace-stat"><CheckCircle2/><span>Ventas del mes</span><strong>{Number(isSetter?setter_results.sourced_sales:sales.sales)||0}</strong></div>
    </div>
    <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}><Link className="btn btn-primary" to={`/prospecting?assigned_to=${member.id}`}><PhoneCall size={15}/>Ver llamadas asignadas</Link><Link className="btn btn-secondary" to="/closer-calendar"><CalendarClock size={15}/>Abrir calendario</Link></div>
    <div className="team-workspace-columns">
      <section className="card team-workspace-section"><h2><CalendarClock size={17}/>Próximas demos</h2>{demos.length?demos.map(item=><div className="team-workspace-row" key={item.id}><div><strong>{item.contact_name||item.title}</strong><span>{item.company||item.title}</span></div><span>{dateTime(item.demo_date)}</span></div>):<p className="team-workspace-empty">No tiene demos próximas</p>}</section>
      <section className="card team-workspace-section"><h2><UserRound size={17}/>Tareas pendientes</h2>{tasks.length?tasks.map(item=><div className="team-workspace-row" key={item.id}><div><strong>{item.title}</strong><span>{item.type}</span></div><span>{dateTime(item.due_at||item.scheduled_at)}</span></div>):<p className="team-workspace-empty">No tiene tareas pendientes</p>}</section>
    </div>
    {!isSetter&&<div className="card" style={{padding:18,marginTop:16}}><strong>Facturación atribuida este mes: {fmtCurrency(sales.cash_collected||0)}</strong></div>}
  </div>;
}
