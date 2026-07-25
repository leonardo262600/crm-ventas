import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Building2, MapPin, Tag, Target, CalendarCheck, Download, History, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { fmtCurrency as fmt } from '../utils/format';

export default function ContactDetail({ contactId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!contactId) return;
    api.get(`/contacts/${contactId}`).then(r => setData(r.data)).catch(() => onClose());
  }, [contactId]);

  if (!data) return (
    <div style={{ position:'fixed', right:0, top:0, width:400, height:'100vh', background:'#fff', zIndex:300, boxShadow:'-4px 0 24px rgba(0,0,0,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner"/>
    </div>
  );

  const oppTotal = (data.opportunities||[]).reduce((s,o)=>s+Number(o.amount||0),0);

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:299 }} onClick={onClose}/>
      <div style={{ position:'fixed', right:0, top:0, width:420, height:'100vh', background:'#fff', zIndex:300, boxShadow:'-4px 0 24px rgba(0,0,0,.12)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0f766e,#134e4a)', padding:'24px 20px 20px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>
                {data.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ color:'#fff', fontWeight:700, fontSize:18 }}>{data.name}</h2>
                <p style={{ color:'rgba(255,255,255,.75)', fontSize:13 }}>{data.position || data.company || '—'}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, padding:6, cursor:'pointer', color:'#fff', display:'flex' }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>
          {/* Info */}
          <div className="card" style={{ padding:16 }}>
            <h4 style={{ fontWeight:600, marginBottom:12, fontSize:13, color:'#64748b', textTransform:'uppercase', letterSpacing:.5 }}>Información de contacto</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {data.email && <div style={{ display:'flex', gap:10, alignItems:'center' }}><Mail size={15} color="#0f766e"/><span style={{ fontSize:13 }}>{data.email}</span></div>}
              {data.phone && <div style={{ display:'flex', gap:10, alignItems:'center' }}><Phone size={15} color="#0f766e"/><span style={{ fontSize:13 }}>{data.phone}</span></div>}
              {data.company && <div style={{ display:'flex', gap:10, alignItems:'center' }}><Building2 size={15} color="#0f766e"/><span style={{ fontSize:13 }}>{data.company}</span></div>}
              {data.address && <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}><MapPin size={15} color="#0f766e" style={{ flexShrink:0, marginTop:2 }}/><span style={{ fontSize:13 }}>{data.address}</span></div>}
              {data.tags && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                  {data.tags.split(',').map(t => <span key={t} className="tag"><Tag size={10}/>{t.trim()}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="card" style={{ padding:14, textAlign:'center' }}>
              <Target size={20} color="#0f766e" style={{ margin:'0 auto 6px' }}/>
              <p style={{ fontSize:20, fontWeight:700 }}>{data.opportunities?.length || 0}</p>
              <p style={{ fontSize:11, color:'#64748b' }}>Oportunidades</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#0f766e', marginTop:2 }}>{fmt(oppTotal)}</p>
            </div>
            <div className="card" style={{ padding:14, textAlign:'center' }}>
              <CalendarCheck size={20} color="#F59E0B" style={{ margin:'0 auto 6px' }}/>
              <p style={{ fontSize:20, fontWeight:700 }}>{data.activities?.length || 0}</p>
              <p style={{ fontSize:11, color:'#64748b' }}>Actividades</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#F59E0B', marginTop:2 }}>
                {data.activities?.filter(a=>a.status==='pendiente').length || 0} pendientes
              </p>
            </div>
          </div>

          {/* Historial Unificado 360 */}
          {data.timeline?.length > 0 && (
            <div className="card" style={{ padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <History size={16} color="#64748b"/>
                <h4 style={{ fontWeight:600, fontSize:13, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, margin:0 }}>Historial 360°</h4>
              </div>
              
              <div style={{ position:'relative', paddingLeft:12 }}>
                <div style={{ position:'absolute', left:0, top:8, bottom:8, width:2, background:'#e2e8f0', borderRadius:2 }}></div>
                
                {data.timeline.map((item, idx) => (
                  <div key={`${item.entityType}_${item.id}_${idx}`} style={{ position:'relative', paddingLeft:16, marginBottom:16 }}>
                    <div style={{ 
                      position:'absolute', left:-5, top:4, width:12, height:12, borderRadius:'50%', 
                      background: item.entityType === 'email' ? '#3b82f6' : item.entityType === 'opportunity' ? '#0f766e' : '#f59e0b',
                      border:'2px solid #fff'
                    }}></div>
                    
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>
                          {item.title || item.subject}
                        </p>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                          <span style={{ 
                            fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:10, textTransform:'uppercase',
                            background: item.entityType === 'email' ? '#eff6ff' : item.entityType === 'opportunity' ? '#f0fdfa' : '#fffbeb',
                            color: item.entityType === 'email' ? '#2563eb' : item.entityType === 'opportunity' ? '#0f766e' : '#d97706'
                          }}>
                            {item.entityType === 'email' ? 'Correo' : item.entityType === 'opportunity' ? 'Oportunidad' : 'Actividad'}
                          </span>
                          
                          {item.entityType === 'opportunity' && (
                            <span style={{ fontSize:11, color:'#64748b' }}>{item.stage_name} • {fmt(item.amount)}</span>
                          )}
                          
                          {item.entityType === 'activity' && (
                            <span style={{ fontSize:11, color:'#64748b' }}>{item.type} • {item.status}</span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap', marginLeft:10 }}>
                        {item.date ? format(new Date(item.date), 'dd MMM yyyy, HH:mm', {locale:es}) : 'Sin fecha'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div className="card" style={{ padding:16 }}>
              <h4 style={{ fontWeight:600, marginBottom:8, fontSize:13, color:'#64748b', textTransform:'uppercase', letterSpacing:.5 }}>Notas</h4>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.6 }}>{data.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
