import React, { useEffect, useState, useRef } from 'react';
import {
  Building2, Image, DollarSign, Mail, Sliders,
  Save, Upload, Trash2, CheckCircle2, Globe, Phone,
  MapPin, Briefcase, Hash, FileText, Percent, Settings as SettingsIcon,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { code:'PEN', symbol:'S/',   name:'Sol Peruano' },
  { code:'USD', symbol:'$',    name:'Dólar Americano' },
  { code:'EUR', symbol:'€',    name:'Euro' },
  { code:'MXN', symbol:'$',    name:'Peso Mexicano' },
  { code:'COP', symbol:'$',    name:'Peso Colombiano' },
  { code:'ARS', symbol:'$',    name:'Peso Argentino' },
  { code:'CLP', symbol:'$',    name:'Peso Chileno' },
  { code:'BRL', symbol:'R$',   name:'Real Brasileño' },
  { code:'BOB', symbol:'Bs.',  name:'Boliviano' },
  { code:'GTQ', symbol:'Q',    name:'Quetzal Guatemalteco' },
];

const INDUSTRIES = [
  'Tecnología','Salud','Educación','Retail / Comercio','Manufactura',
  'Servicios Financieros','Consultoría','Construcción','Agricultura',
  'Transporte y Logística','Hotelería y Turismo','Alimentos y Bebidas','Otro',
];

const TABS = [
  { id:'empresa',  label:'Empresa',         Icon: Building2  },
  { id:'logo',     label:'Logo',            Icon: Image      },
  { id:'moneda',   label:'Moneda e Impuesto', Icon: DollarSign },
  { id:'smtp',     label:'Correo SMTP',     Icon: Mail       },
  { id:'sistema',  label:'Sistema',         Icon: Sliders    },
];

export default function Settings() {
  const [tab, setTab]         = useState('empresa');
  const [cfg, setCfg]         = useState({});
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get('/settings').then(r => {
      setCfg(r.data);
      if (r.data.logo_url) setPreview(r.data.logo_url);
    }).catch(() => toast.error('Error al cargar configuración'));
  }, []);

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', cfg);
      localStorage.setItem('crm_settings', JSON.stringify(cfg));
      window.dispatchEvent(new Event('crm_settings_updated'));
      toast.success('✅ Configuración guardada');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  /* ── Logo upload ── */
  const handleFile = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const r = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(r.data.logo_url);
      setCfg(p => ({ ...p, logo_url: r.data.logo_url }));
      toast.success('Logo actualizado');
    } catch (err) { toast.error(err.response?.data?.message || 'Error al subir logo'); }
    finally { setUploading(false); }
  };

  const removeLogo = async () => {
    if (!confirm('¿Eliminar el logo actual?')) return;
    try {
      await api.delete('/settings/logo');
      setPreview(null); setCfg(p => ({ ...p, logo_url: '' }));
      toast.success('Logo eliminado');
    } catch { toast.error('Error al eliminar logo'); }
  };

  /* ── Helpers UI ── */
  const Field = ({ label, icon: Icon, children, full }) => (
    <div className="input-group" style={full ? { gridColumn:'1/-1' } : {}}>
      <label style={{ display:'flex', alignItems:'center', gap:5 }}>
        {Icon && <Icon size={13} color="#0f766e"/>} {label}
      </label>
      {children}
    </div>
  );

  const Section = ({ title, icon: Icon, children }) => (
    <div className="card" style={{ marginBottom:20 }}>
      <h3 style={{ fontWeight:700, marginBottom:18, display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:15 }}>
        {Icon && <Icon size={18}/>} {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
            <SettingsIcon size={24} color="#0f766e"/> Configuración
          </h1>
          <p>Personaliza los datos de tu empresa, moneda, impuestos y más</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ gap:8 }}>
          <Save size={16}/> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>
            <Icon size={14} style={{ marginRight:5, verticalAlign:'middle' }}/>{label}
          </button>
        ))}
      </div>

      <form onSubmit={save}>

        {/* ══ EMPRESA ══ */}
        {tab === 'empresa' && (
          <>
            <Section title="Datos de la Empresa" icon={Building2}>
              <div className="form-grid">
                <Field label="Nombre de la empresa" icon={Building2}>
                  <input className="input" value={cfg.company_name||''} onChange={e=>set('company_name',e.target.value)} placeholder="Mi Empresa S.A.C." />
                </Field>
                <Field label="RUC / NIT / NIF" icon={Hash}>
                  <input className="input" value={cfg.company_ruc||''} onChange={e=>set('company_ruc',e.target.value)} placeholder="20123456789" />
                </Field>
                <Field label="Email corporativo" icon={Mail}>
                  <input className="input" type="email" value={cfg.company_email||''} onChange={e=>set('company_email',e.target.value)} placeholder="info@miempresa.com" />
                </Field>
                <Field label="Teléfono" icon={Phone}>
                  <input className="input" value={cfg.company_phone||''} onChange={e=>set('company_phone',e.target.value)} placeholder="+51 999 888 777" />
                </Field>
                <Field label="Sitio web" icon={Globe}>
                  <input className="input" type="url" value={cfg.company_website||''} onChange={e=>set('company_website',e.target.value)} placeholder="https://miempresa.com" />
                </Field>
                <Field label="Industria / Sector" icon={Briefcase}>
                  <select className="input" value={cfg.company_industry||''} onChange={e=>set('company_industry',e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="País" icon={MapPin}>
                  <input className="input" value={cfg.company_country||''} onChange={e=>set('company_country',e.target.value)} placeholder="Perú" />
                </Field>
                <Field label="Ciudad" icon={MapPin}>
                  <input className="input" value={cfg.company_city||''} onChange={e=>set('company_city',e.target.value)} placeholder="Lima" />
                </Field>
                <Field label="Dirección" icon={MapPin} full>
                  <input className="input" value={cfg.company_address||''} onChange={e=>set('company_address',e.target.value)} placeholder="Av. Principal 123, Piso 4" />
                </Field>
              </div>
            </Section>

            <Section title="Documentos y Cotizaciones" icon={FileText}>
              <div className="form-grid">
                <Field label="Prefijo de cotizaciones">
                  <input className="input" value={cfg.quote_prefix||'COT-'} onChange={e=>set('quote_prefix',e.target.value)} placeholder="COT-" />
                </Field>
                <Field label="Prefijo de facturas">
                  <input className="input" value={cfg.invoice_prefix||'FAC-'} onChange={e=>set('invoice_prefix',e.target.value)} placeholder="FAC-" />
                </Field>
                <Field label="Validez de cotización (días)">
                  <input className="input" type="number" min="1" value={cfg.quote_validity_days||30} onChange={e=>set('quote_validity_days',e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop:14 }}>
                <Field label="Pie de página en cotizaciones" icon={FileText} full>
                  <textarea className="input" rows={2} value={cfg.quote_footer||''} onChange={e=>set('quote_footer',e.target.value)}
                    style={{ resize:'vertical' }} placeholder="Texto que aparece al final de cada cotización PDF..." />
                </Field>
              </div>
              <div style={{ marginTop:12 }}>
                <Field label="Notas predeterminadas" full>
                  <textarea className="input" rows={2} value={cfg.quote_notes||''} onChange={e=>set('quote_notes',e.target.value)}
                    style={{ resize:'vertical' }} placeholder="Condiciones de pago, garantías u otras notas..." />
                </Field>
              </div>
            </Section>
          </>
        )}

        {/* ══ LOGO ══ */}
        {tab === 'logo' && (
          <Section title="Logo de la Empresa" icon={Image}>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
              El logo aparecerá en cotizaciones PDF, facturas y en el encabezado del sistema.<br/>
              Formatos: PNG, JPG, WebP, SVG. Tamaño máximo: 5 MB. Recomendado: 300×100 px mínimo.
            </p>

            {/* Preview */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
              <div style={{
                width:'100%', maxWidth:500, minHeight:160,
                border:'2px dashed #cbd5e1', borderRadius:16,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'#f8fafc', overflow:'hidden', position:'relative',
              }}>
                {preview ? (
                  <img src={preview.startsWith('http') ? preview : `/api${preview}`}
                    alt="Logo empresa"
                    style={{ maxHeight:140, maxWidth:'90%', objectFit:'contain' }}
                    onError={() => setPreview(null)}
                  />
                ) : (
                  <div style={{ textAlign:'center', color:'#94a3b8', padding:30 }}>
                    <Image size={48} style={{ marginBottom:12, opacity:.4 }}/>
                    <p style={{ fontWeight:600, fontSize:15 }}>Sin logo configurado</p>
                    <p style={{ fontSize:12, marginTop:4 }}>Sube un archivo para visualizarlo aquí</p>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
                <button type="button" className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}>
                  <Upload size={16}/> {uploading ? 'Subiendo...' : 'Subir logo'}
                </button>
                {preview && (
                  <button type="button" className="btn btn-danger" onClick={removeLogo}>
                    <Trash2 size={16}/> Eliminar logo
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />

              {/* URL manual alternativa */}
              <div style={{ width:'100%', maxWidth:500 }}>
                <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>
                  O ingresa una URL de imagen externa
                </label>
                <input className="input" type="url" value={cfg.logo_url||''} placeholder="https://miempresa.com/logo.png"
                  onChange={e => { set('logo_url',e.target.value); setPreview(e.target.value||null); }} />
              </div>
            </div>
          </Section>
        )}

        {/* ══ MONEDA E IMPUESTO ══ */}
        {tab === 'moneda' && (
          <>
            <Section title="Moneda" icon={DollarSign}>
              <div className="form-grid">
                <Field label="Moneda principal">
                  <select className="input" value={cfg.currency||'PEN'} onChange={e => {
                    const c = CURRENCIES.find(x => x.code === e.target.value);
                    set('currency', e.target.value);
                    if (c) set('currency_symbol', c.symbol);
                  }}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Símbolo de moneda">
                  <input className="input" value={cfg.currency_symbol||'S/'} onChange={e=>set('currency_symbol',e.target.value)} placeholder="S/" />
                </Field>
                <Field label="Posición del símbolo">
                  <select className="input" value={cfg.currency_position||'before'} onChange={e=>set('currency_position',e.target.value)}>
                    <option value="before">Antes del monto (S/ 100)</option>
                    <option value="after">Después del monto (100 S/)</option>
                  </select>
                </Field>
                <Field label="Separador decimal">
                  <select className="input" value={cfg.decimal_separator||'.'} onChange={e=>set('decimal_separator',e.target.value)}>
                    <option value=".">Punto — 1,234.56</option>
                    <option value=",">Coma — 1.234,56</option>
                  </select>
                </Field>
              </div>

              {/* Vista previa */}
              <div style={{ marginTop:16, padding:'14px 20px', background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                <p style={{ fontSize:12, color:'#166534', fontWeight:600, marginBottom:6 }}>Vista previa de formato:</p>
                <p style={{ fontSize:22, fontWeight:700, color:'#0f766e' }}>
                  {cfg.currency_position === 'after'
                    ? `1${cfg.decimal_separator==='.'?',':'.'}234${cfg.decimal_separator||'.'}50 ${cfg.currency_symbol||'S/'}`
                    : `${cfg.currency_symbol||'S/'} 1${cfg.decimal_separator==='.'?',':'.'}234${cfg.decimal_separator||'.'}50`
                  }
                </p>
              </div>
            </Section>

            <Section title="Impuesto" icon={Percent}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 14px', background: cfg.tax_enabled ? '#f0fdf4' : '#f8fafc', borderRadius:10, border:`1px solid ${cfg.tax_enabled ? '#bbf7d0' : '#e2e8f0'}`, transition:'all .2s' }}>
                  <input type="checkbox" checked={!!cfg.tax_enabled} onChange={e=>set('tax_enabled',e.target.checked)}
                    style={{ width:18, height:18, accentColor:'#0f766e' }} />
                  <div>
                    <span style={{ fontWeight:600, fontSize:14 }}>Habilitar impuesto en cotizaciones y facturas</span>
                    <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>El impuesto se calculará automáticamente sobre los montos</p>
                  </div>
                </label>
              </div>

              {cfg.tax_enabled && (
                <div className="form-grid">
                  <Field label="Nombre del impuesto" icon={Hash}>
                    <input className="input" value={cfg.tax_name||'IGV'} onChange={e=>set('tax_name',e.target.value)} placeholder="IGV, IVA, VAT, GST..." />
                  </Field>
                  <Field label="Porcentaje (%)" icon={Percent}>
                    <div style={{ position:'relative' }}>
                      <input className="input" type="number" step="0.01" min="0" max="100"
                        value={cfg.tax_rate||18} onChange={e=>set('tax_rate',e.target.value)}
                        style={{ paddingRight:40 }} />
                      <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#64748b', fontWeight:600 }}>%</span>
                    </div>
                  </Field>
                </div>
              )}

              {cfg.tax_enabled && (
                <div style={{ marginTop:14, padding:'14px 20px', background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                  <p style={{ fontSize:12, color:'#166534', fontWeight:600, marginBottom:8 }}>Ejemplo de cálculo:</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight:600 }}>{cfg.currency_symbol||'S/'} 1,000.00</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'#64748b' }}>
                      <span>{cfg.tax_name||'IGV'} ({cfg.tax_rate||18}%):</span>
                      <span>{cfg.currency_symbol||'S/'} {(1000 * (parseFloat(cfg.tax_rate)||18) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:16, borderTop:'1px solid #bbf7d0', paddingTop:8, marginTop:4 }}>
                      <span>Total:</span>
                      <span style={{ color:'#0f766e' }}>{cfg.currency_symbol||'S/'} {(1000 * (1 + (parseFloat(cfg.tax_rate)||18)/100)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ══ SMTP ══ */}
        {tab === 'smtp' && (
          <Section title="Configuración de Correo Electrónico (SMTP)" icon={Mail}>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:18 }}>
              Configura el servidor de correo para envío real de emails, cotizaciones y notificaciones desde el CRM.
            </p>
            <div className="form-grid">
              <Field label="Servidor SMTP">
                <input className="input" value={cfg.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="Puerto">
                <input className="input" type="number" value={cfg.smtp_port||'587'} onChange={e=>set('smtp_port',e.target.value)} />
              </Field>
              <Field label="Usuario / Email SMTP">
                <input className="input" value={cfg.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="usuario@miempresa.com" />
              </Field>
              <Field label={<>Contraseña {cfg.smtp_pass_set && <span style={{ color:'#10b981', fontSize:11, fontWeight:600, marginLeft:4 }}>✓ configurada</span>}</>}>
                <input className="input" type="password" placeholder={cfg.smtp_pass_set ? '••••••••' : 'Nueva contraseña'}
                  onChange={e=>set('smtp_pass',e.target.value)} />
              </Field>
              <Field label="Nombre/email del remitente" full>
                <input className="input" value={cfg.smtp_from||''} onChange={e=>set('smtp_from',e.target.value)} placeholder={`${cfg.company_name||'Mi Empresa'} <noreply@miempresa.com>`} />
              </Field>
              <div className="input-group" style={{ display:'flex', alignItems:'center', paddingTop:22 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!cfg.smtp_secure} onChange={e=>set('smtp_secure',e.target.checked)}
                    style={{ width:16, height:16, accentColor:'#0f766e' }} />
                  <span>Usar SSL/TLS (puerto 465)</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop:20, padding:'14px 18px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a', display:'flex', gap:10 }}>
              <CheckCircle2 size={18} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
              <div style={{ fontSize:13, color:'#92400e' }}>
                <strong>Para Gmail:</strong> usa <code>smtp.gmail.com</code>, puerto <strong>587</strong> y genera una <em>Contraseña de aplicación</em> desde tu cuenta Google (no tu contraseña normal).
              </div>
            </div>
          </Section>
        )}

        {/* ══ SISTEMA ══ */}
        {tab === 'sistema' && (
          <Section title="Preferencias del Sistema" icon={Sliders}>
            <div className="form-grid">
              <Field label="Formato de fecha">
                <select className="input" value={cfg.date_format||'DD/MM/YYYY'} onChange={e=>set('date_format',e.target.value)}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2025)</option>
                </select>
              </Field>
              <Field label="Separador de miles">
                <select className="input" value={cfg.thousands_separator||','} onChange={e=>set('thousands_separator',e.target.value)}>
                  <option value=",">Coma (1,000,000)</option>
                  <option value=".">Punto (1.000.000)</option>
                  <option value=" ">Espacio (1 000 000)</option>
                </select>
              </Field>
            </div>

            <div style={{ marginTop:20, padding:'16px 20px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' }}>
              <h4 style={{ fontWeight:600, marginBottom:12, fontSize:14 }}>Resumen de configuración actual</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Empresa',   value: cfg.company_name || '—' },
                  { label:'RUC/NIF',   value: cfg.company_ruc  || '—' },
                  { label:'Moneda',    value: `${cfg.currency||'PEN'} (${cfg.currency_symbol||'S/'})` },
                  { label:'Impuesto',  value: cfg.tax_enabled ? `${cfg.tax_name||'IGV'} ${cfg.tax_rate||18}%` : 'Desactivado' },
                  { label:'SMTP',      value: cfg.smtp_host    || 'No configurado' },
                  { label:'Formato fecha', value: cfg.date_format || 'DD/MM/YYYY' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding:'10px 14px', background:'#fff', borderRadius:8, border:'1px solid #e2e8f0' }}>
                    <p style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
                    <p style={{ fontWeight:600, fontSize:13, marginTop:3, color:'#1e293b' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Botón guardar inferior */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding:'10px 28px', fontSize:15 }}>
            <Save size={17}/> {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
