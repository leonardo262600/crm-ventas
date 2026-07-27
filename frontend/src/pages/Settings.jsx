import React, { useEffect, useRef, useState } from 'react';
import {
  Building2, Image, Save, Upload, Trash2, Settings as SettingsIcon,
  Euro, Phone, BellRing, Palette,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TONES = [
  { value:'soft', label:'Suave' },
  { value:'classic', label:'Clásico' },
  { value:'bright', label:'Destacado' },
];

export default function Settings() {
  const [cfg, setCfg] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [workLine, setWorkLine] = useState(() => localStorage.getItem('crm_work_line') || '');
  const [tone, setTone] = useState(() => localStorage.getItem('crm_chat_tone') || 'soft');
  const fileRef = useRef();
  const set = (key, value) => setCfg(current => ({ ...current, [key]: value }));

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setCfg(data);
      if (data.logo_url) setPreview(data.logo_url);
    }).catch(() => toast.error('No se pudo cargar la configuración'));
  }, []);

  const save = async event => {
    event?.preventDefault();
    setSaving(true);
    try {
      const normalizedLine = workLine.replace(/\s+/g, ' ').trim();
      await api.put('/settings', {
        company_name: cfg.company_name || 'RealAdvisor',
        logo_url: cfg.logo_url || '',
        currency: 'EUR',
        currency_symbol: '€',
        currency_position: cfg.currency_position || 'after',
        decimal_separator: cfg.decimal_separator || ',',
        thousands_separator: cfg.thousands_separator || '.',
        date_format: cfg.date_format || 'DD/MM/YYYY',
      });
      localStorage.setItem('crm_work_line', normalizedLine);
      localStorage.setItem('crm_chat_tone', tone);
      const saved = {
        ...cfg,
        company_name: cfg.company_name || 'RealAdvisor',
        currency: 'EUR',
        currency_symbol: '€',
      };
      localStorage.setItem('crm_settings', JSON.stringify(saved));
      window.dispatchEvent(new Event('crm_settings_updated'));
      setWorkLine(normalizedLine);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('El archivo no puede superar 5 MB');
    setUploading(true);
    const body = new FormData();
    body.append('logo', file);
    try {
      const { data } = await api.post('/settings/logo', body, {
        headers: { 'Content-Type':'multipart/form-data' },
      });
      setPreview(data.logo_url);
      set('logo_url', data.logo_url);
      toast.success('Logo actualizado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!window.confirm('¿Quieres quitar el logo actual?')) return;
    try {
      await api.delete('/settings/logo');
      setPreview(null);
      set('logo_url', '');
      toast.success('Logo eliminado');
    } catch {
      toast.error('No se pudo eliminar el logo');
    }
  };

  const Section = ({ icon: Icon, title, description, children }) => (
    <section className="card" style={{ marginBottom:20 }}>
      <div style={{ marginBottom:18 }}>
        <h3 style={{ display:'flex', alignItems:'center', gap:8, color:'#0f766e', fontSize:16 }}>
          <Icon size={18}/>{title}
        </h3>
        {description && <p style={{ color:'#64748b', fontSize:13, marginTop:5 }}>{description}</p>}
      </div>
      {children}
    </section>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
            <SettingsIcon size={24} color="#0f766e"/>Configuración
          </h1>
          <p>Solo los ajustes que necesitas para trabajar en el CRM</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={16}/>{saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <form onSubmit={save}>
        <Section icon={Building2} title="Identidad del CRM" description="Nombre y logo que aparecen dentro del sistema.">
          <div className="form-grid">
            <div className="input-group">
              <label>Nombre</label>
              <input className="input" value={cfg.company_name || ''} onChange={e=>set('company_name',e.target.value)} placeholder="RealAdvisor"/>
            </div>
            <div className="input-group">
              <label>Logo</label>
              <div style={{ display:'flex', alignItems:'center', gap:12, minHeight:44 }}>
                {preview ? (
                  <img
                    src={preview.startsWith('http') ? preview : `/api${preview}`}
                    alt="Logo"
                    style={{ width:150, height:42, objectFit:'contain', objectPosition:'left center', background:'#fff', borderRadius:8, padding:4 }}
                  />
                ) : <span style={{ color:'#94a3b8' }}>Sin logo</span>}
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                  <Upload size={14}/>{uploading ? 'Subiendo…' : 'Cambiar'}
                </button>
                {preview && <button type="button" className="btn-icon" onClick={removeLogo} title="Quitar logo"><Trash2 size={15}/></button>}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile}/>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Euro} title="Formato de importes" description="El CRM trabaja en euros y muestra el símbolo al final.">
          <div className="form-grid">
            <div className="input-group">
              <label>Moneda</label>
              <input className="input" value="Euro (EUR)" disabled/>
            </div>
            <div className="input-group">
              <label>Vista previa</label>
              <div className="input" style={{ display:'flex', alignItems:'center', fontWeight:700 }}>1.234,50 €</div>
            </div>
          </div>
        </Section>

        <Section icon={Phone} title="Línea de trabajo" description="Referencia visual de la línea profesional configurada en este dispositivo. El iPhone decide finalmente qué SIM utiliza al llamar.">
          <div className="input-group" style={{ maxWidth:520 }}>
            <label>Número profesional</label>
            <input className="input" value={workLine} onChange={e=>setWorkLine(e.target.value)} placeholder="+34 642 812 049"/>
          </div>
        </Section>

        <Section icon={BellRing} title="Preferencias" description="Ajustes personales guardados en este dispositivo.">
          <div className="form-grid">
            <div className="input-group">
              <label>Sonido del chat</label>
              <select className="input" value={tone} onChange={e=>setTone(e.target.value)}>
                {TONES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label style={{ display:'flex', alignItems:'center', gap:6 }}><Palette size={14}/>Tema visual</label>
              <div className="input" style={{ display:'flex', alignItems:'center', color:'#64748b' }}>
                Se cambia desde el icono junto a la campana
              </div>
            </div>
          </div>
        </Section>
      </form>
    </div>
  );
}
