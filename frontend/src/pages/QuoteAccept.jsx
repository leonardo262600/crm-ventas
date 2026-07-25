import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, Building2, User, Calendar, AlertCircle } from 'lucide-react';

import { fmtCurrency as fmt } from '../utils/format';

export default function QuoteAccept() {
  const { token } = useParams();
  const [quote, setQuote]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [step, setStep]       = useState('view');   // 'view' | 'sign' | 'reject' | 'done'
  const [signerName, setSignerName] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    fetch(`/api/public/quotes/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.number) setError(data.message);
        else setQuote(data);
      })
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    if (!signerName.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/public/quotes/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer_name: signerName }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setResult({ type: 'accepted', message: data.message, signed_at: data.signed_at });
      setStep('done');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/public/quotes/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setResult({ type: 'rejected', message: data.message });
      setStep('done');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.spinner} />
    </div>
  );

  if (error && !quote) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <AlertCircle size={48} color="#ef4444" style={{ margin:'0 auto 16px', display:'block' }} />
        <h2 style={{ textAlign:'center', color:'#1e293b' }}>Enlace no válido</h2>
        <p style={{ textAlign:'center', color:'#64748b', marginTop:8 }}>{error}</p>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div style={styles.page}>
      <div style={styles.card}>
        {result?.type === 'accepted' ? (
          <>
            <CheckCircle size={56} color="#10b981" style={{ margin:'0 auto 16px', display:'block' }} />
            <h2 style={{ textAlign:'center', color:'#065f46' }}>¡Cotización aceptada!</h2>
            <p style={{ textAlign:'center', color:'#047857', marginTop:8 }}>
              Has aceptado la cotización <strong>{quote?.number}</strong> como <strong>{signerName}</strong>.
            </p>
            <p style={{ textAlign:'center', color:'#64748b', fontSize:12, marginTop:12 }}>
              El equipo de ventas recibirá una notificación y se pondrá en contacto contigo pronto.
            </p>
          </>
        ) : (
          <>
            <XCircle size={56} color="#ef4444" style={{ margin:'0 auto 16px', display:'block' }} />
            <h2 style={{ textAlign:'center', color:'#7f1d1d' }}>Cotización rechazada</h2>
            <p style={{ textAlign:'center', color:'#64748b', marginTop:8 }}>
              Hemos registrado tu decisión. El equipo revisará tu feedback.
            </p>
          </>
        )}
      </div>
    </div>
  );

  const isEditable = quote && ['borrador','enviada'].includes(quote.status);

  return (
    <div style={styles.page}>
      {/* Header brand */}
      <div style={styles.header}>
        <FileText size={24} color="white" />
        <span style={{ color:'white', fontWeight:700, fontSize:18, marginLeft:8 }}>CRM Ventas</span>
      </div>

      <div style={styles.card}>
        {/* Quote header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#0f766e', margin:0 }}>{quote?.number}</h1>
              <p style={{ color:'#64748b', fontSize:14, marginTop:4 }}>Cotización profesional de servicios/productos</p>
            </div>
            <span style={{
              padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
              background: quote?.status === 'aprobada' ? '#d1fae5' : quote?.status === 'rechazada' ? '#fee2e2' : '#dbeafe',
              color: quote?.status === 'aprobada' ? '#065f46' : quote?.status === 'rechazada' ? '#7f1d1d' : '#1e40af',
            }}>
              {quote?.status?.toUpperCase()}
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:20 }}>
            {quote?.contact_name && (
              <div style={styles.infoBox}>
                <User size={14} color="#0f766e" />
                <div><p style={styles.infoLabel}>Cliente</p><p style={styles.infoValue}>{quote.contact_name}</p></div>
              </div>
            )}
            {quote?.contact_company && (
              <div style={styles.infoBox}>
                <Building2 size={14} color="#0f766e" />
                <div><p style={styles.infoLabel}>Empresa</p><p style={styles.infoValue}>{quote.contact_company}</p></div>
              </div>
            )}
            {quote?.valid_until && (
              <div style={styles.infoBox}>
                <Calendar size={14} color="#0f766e" />
                <div><p style={styles.infoLabel}>Válida hasta</p><p style={styles.infoValue}>{new Date(quote.valid_until).toLocaleDateString('es-PE')}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div style={{ overflowX:'auto', marginBottom:20 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0f766e' }}>
                {['Descripción','Cant.','Precio unit.','Desc.','Subtotal'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', color:'white', textAlign:'left', fontSize:12, fontWeight:700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(quote?.items || []).map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                  <td style={styles.td}>{item.description || item.product_name || '—'}</td>
                  <td style={styles.td}>{item.quantity}</td>
                  <td style={styles.td}>{fmt(item.unit_price)}</td>
                  <td style={styles.td}>{item.discount_pct}%</td>
                  <td style={{ ...styles.td, fontWeight:700, color:'#0f766e' }}>{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ minWidth:220 }}>
            {[['Subtotal', quote?.subtotal],['Descuento', quote?.discount],['Impuesto', quote?.tax]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', color:'#64748b', fontSize:13 }}>
                <span>{l}</span><span>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', borderTop:'2px solid #0f766e', fontWeight:800, fontSize:18, color:'#0f766e' }}>
              <span>TOTAL</span><span>{fmt(quote?.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote?.notes && (
          <div style={{ marginTop:20, padding:'12px 16px', background:'#f8fafc', borderRadius:8, fontSize:13, color:'#475569' }}>
            <strong>Notas:</strong> {quote.notes}
          </div>
        )}

        {/* Firma digital */}
        {isEditable && step === 'view' && (
          <div style={{ marginTop:32, padding:20, background:'#f0fdf4', borderRadius:12, border:'1px solid #bbf7d0' }}>
            <h3 style={{ fontWeight:700, color:'#065f46', marginBottom:4 }}>Responder a esta cotización</h3>
            <p style={{ fontSize:13, color:'#047857', marginBottom:16 }}>
              Al aceptar, quedará registrada tu firma digital con nombre, fecha y hora.
            </p>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setStep('sign')} style={{ ...styles.btnPrimary, flex:1 }}>
                <CheckCircle size={16}/> Aceptar cotización
              </button>
              <button onClick={() => setStep('reject')} style={{ ...styles.btnDanger }}>
                <XCircle size={16}/> Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Ya firmada */}
        {quote?.status === 'aprobada' && quote?.signer_name && (
          <div style={{ marginTop:24, padding:16, background:'#d1fae5', borderRadius:10, border:'1px solid #6ee7b7' }}>
            <p style={{ fontWeight:700, color:'#065f46', display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle size={16}/> Cotización aceptada
            </p>
            <p style={{ fontSize:12, color:'#047857', marginTop:4 }}>
              Firmada por: <strong>{quote.signer_name}</strong> el {new Date(quote.signed_at).toLocaleString('es-PE')}
            </p>
          </div>
        )}

        {/* Panel firma */}
        {step === 'sign' && (
          <div style={{ marginTop:24, padding:20, background:'#fffbeb', borderRadius:12, border:'1px solid #fcd34d' }}>
            <h3 style={{ fontWeight:700, color:'#92400e', marginBottom:12 }}>Confirmar aceptación</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Tu nombre completo *</label>
              <input
                className="input"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Nombre y apellido del responsable"
                style={{ width:'100%' }}
              />
            </div>
            <p style={{ fontSize:11, color:'#92400e', marginBottom:12 }}>
              Al hacer clic en "Confirmar" aceptas los términos de esta cotización y quedará registrada tu firma digital con tu IP y la fecha actual.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={accept} disabled={!signerName.trim() || submitting} style={styles.btnPrimary}>
                {submitting ? 'Procesando...' : '✓ Confirmar aceptación'}
              </button>
              <button onClick={() => setStep('view')} style={styles.btnSecondary}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Panel rechazo */}
        {step === 'reject' && (
          <div style={{ marginTop:24, padding:20, background:'#fff1f2', borderRadius:12, border:'1px solid #fecdd3' }}>
            <h3 style={{ fontWeight:700, color:'#881337', marginBottom:12 }}>Motivo del rechazo (opcional)</h3>
            <textarea
              className="input"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="¿Por qué rechazas esta cotización? Tu feedback ayuda al equipo."
              style={{ width:'100%', resize:'vertical' }}
            />
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={reject} disabled={submitting} style={styles.btnDanger}>
                {submitting ? 'Procesando...' : '✗ Confirmar rechazo'}
              </button>
              <button onClick={() => setStep('view')} style={styles.btnSecondary}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <p style={{ textAlign:'center', color:'#94a3b8', fontSize:11, marginTop:16 }}>
        Documento generado por CRM Ventas — Confidencial
      </p>
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', background:'#f1f5f9', padding:'24px 16px', fontFamily:"'Inter',sans-serif" },
  header: { background:'#0f766e', padding:'14px 24px', borderRadius:12, display:'flex', alignItems:'center', maxWidth:720, margin:'0 auto 20px' },
  card:   { background:'white', borderRadius:16, padding:'28px 32px', maxWidth:720, margin:'0 auto', boxShadow:'0 4px 24px rgba(0,0,0,.08)' },
  infoBox:{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:'#f8fafc', borderRadius:8 },
  infoLabel: { fontSize:11, color:'#94a3b8', fontWeight:500, margin:0 },
  infoValue: { fontSize:14, fontWeight:600, color:'#1e293b', margin:0 },
  td:     { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f1f5f9' },
  btnPrimary:   { display:'flex', alignItems:'center', gap:6, padding:'10px 20px', background:'#0f766e', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:14 },
  btnDanger:    { display:'flex', alignItems:'center', gap:6, padding:'10px 16px', background:'#ef4444', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:14 },
  btnSecondary: { padding:'10px 16px', background:'white', border:'1.5px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:500, fontSize:14 },
  spinner:      { width:40, height:40, border:'4px solid #e2e8f0', borderTop:'4px solid #0f766e', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'120px auto' },
};
