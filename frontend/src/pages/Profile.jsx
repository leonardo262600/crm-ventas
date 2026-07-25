import React, { useEffect, useState } from 'react';
import { User, Lock, Target, CheckCircle, DollarSign, Users2, Save, Eye, EyeOff, ShieldCheck, Bell } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { fmtCurrency as fmt } from '../utils/format';

export default function Profile() {
  const { user, login } = useAuth();

  const [profile, setProfile]   = useState({ name:'', email:'' });
  const [stats, setStats]       = useState(null);
  const [tab, setTab]           = useState('info');
  const [saving, setSaving]     = useState(false);
  const [pushStatus, setPushStatus] = useState('default');

  const [pwForm, setPwForm]     = useState({ current_password:'', new_password:'', confirm:'' });
  const [showPw, setShowPw]     = useState({ current:false, new:false, confirm:false });
  const [pwSaving, setPwSaving] = useState(false);

  // 2FA state
  const [tfaSetup, setTfaSetup] = useState(null);
  const [tfaCode, setTfaCode]   = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  useEffect(() => {
    api.get('/profile').then(r => setProfile({ 
      name: r.data.name, 
      email: r.data.email, 
      role: r.data.role, 
      created_at: r.data.created_at,
      tfa_enabled: r.data.tfa_enabled 
    })).catch(() => {});
    api.get('/profile/stats').then(r => setStats(r.data)).catch(() => {});
    
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Tu navegador no soporta notificaciones push');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const vapidPublicKey = 'BGZdqac2qhkNacgilEQHQWmLjX6DF7J4iPjqHCgv39Oa5UwrvP3oVBD267G4JHdG59dOWD9SvYJfWbgd9yBW6Fk';
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        await api.post('/notifications/subscribe', subscription);
        toast.success('Notificaciones activadas con éxito');
      } else {
        toast.error('Permiso de notificaciones denegado');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al suscribir notificaciones');
    }
  };

  const testPush = async () => {
    try {
      await api.post('/notifications/test');
      toast('Notificación enviada, revisa tu sistema', { icon: '🔔' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar notificación');
    }
  };

  const saveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', { name: profile.name, email: profile.email });
      toast.success('Perfil actualizado');
    } catch(err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const savePassword = async e => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error('Las contraseñas no coinciden'); return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return;
    }
    setPwSaving(true);
    try {
      await api.put('/profile/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success('Contraseña actualizada');
      setPwForm({ current_password:'', new_password:'', confirm:'' });
    } catch(err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally { setPwSaving(false); }
  };

  const setup2FA = async () => {
    setTfaLoading(true);
    try {
      const { data } = await api.get('/auth/2fa/setup');
      setTfaSetup(data);
      setTfaCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Error al configurar 2FA'); }
    finally { setTfaLoading(false); }
  };

  const enable2FA = async () => {
    if (tfaCode.length !== 6) return;
    setTfaLoading(true);
    try {
      await api.post('/auth/2fa/enable', { secret: tfaSetup.secret, token: tfaCode });
      toast.success('2FA activado correctamente');
      setProfile(p => ({ ...p, tfa_enabled: 1 }));
      setTfaSetup(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Código inválido'); }
    finally { setTfaLoading(false); }
  };

  const disable2FA = async () => {
    if (!confirm('¿Seguro que deseas desactivar la autenticación de dos factores? Tu cuenta será menos segura.')) return;
    setTfaLoading(true);
    try {
      await api.post('/auth/2fa/disable');
      toast.success('2FA desactivado');
      setProfile(p => ({ ...p, tfa_enabled: 0 }));
    } catch (err) { toast.error('Error al desactivar 2FA'); }
    finally { setTfaLoading(false); }
  };

  const ROLE_LABEL = { admin:'Administrador', gerente:'Gerente', vendedor:'Vendedor' };
  const ROLE_COLOR = { admin:'#ef4444', gerente:'#8B5CF6', vendedor:'#3B82F6' };
  const roleColor  = ROLE_COLOR[profile.role] || '#64748b';

  const PwInput = ({ field, label, placeholder }) => (
    <div className="input-group">
      <label>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          className="input"
          type={showPw[field] ? 'text' : 'password'}
          value={pwForm[field]}
          onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          required
          style={{ paddingRight:40 }}
        />
        <button type="button"
          onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}>
          {showPw[field] ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <div className="page-header">
        <div><h1>Mi perfil</h1><p>Configuración de cuenta y estadísticas personales</p></div>
      </div>

      {/* Avatar card */}
      <div className="card" style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24, padding:'22px 28px' }}>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background:'linear-gradient(135deg,#0f766e,#14b8a6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:800, fontSize:28, flexShrink:0,
        }}>
          {(profile.name || user?.name || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <h2 style={{ fontWeight:700, fontSize:20, marginBottom:4 }}>{profile.name || user?.name}</h2>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:`${roleColor}18`, color:roleColor }}>
              {ROLE_LABEL[profile.role] || profile.role}
            </span>
            <span style={{ fontSize:12, color:'#94a3b8' }}>{profile.email}</span>
          </div>
          {profile.created_at && (
            <p style={{ fontSize:11, color:'#cbd5e1', marginTop:6 }}>
              Miembro desde {format(new Date(profile.created_at),'MMMM yyyy',{locale:es})}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
          {[
            { icon: Target,      label:'Opor. abiertas',  value: stats.open_opps,    color:'#3B82F6' },
            { icon: CheckCircle, label:'Opor. ganadas',   value: stats.won_opps,     color:'#10b981' },
            { icon: DollarSign,  label:'Ingresos',        value: fmt(stats.revenue), color:'#0f766e' },
            { icon: Users2,      label:'Contactos',       value: stats.contacts,     color:'#8B5CF6' },
            { icon: Target,      label:'Act. pendientes', value: stats.pending_acts, color:'#F59E0B' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ padding:'16px 18px', display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ background:`${color}15`, borderRadius:10, padding:10, flexShrink:0 }}>
                <Icon size={18} color={color}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:'#64748b' }}>{label}</p>
                <p style={{ fontSize:20, fontWeight:700, color:'#1e293b' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:0 }}>
        <button className={`tab ${tab==='info'?'active':''}`} onClick={() => setTab('info')}>
          <User size={14} style={{ marginRight:6 }}/>Información
        </button>
        <button className={`tab ${tab==='password'?'active':''}`} onClick={() => setTab('password')}>
          <Lock size={14} style={{ marginRight:6 }}/>Contraseña
        </button>
        <button className={`tab ${tab==='2fa'?'active':''}`} onClick={() => setTab('2fa')}>
          <ShieldCheck size={14} style={{ marginRight:6 }}/>Seguridad 2FA
        </button>
        <button className={`tab ${tab==='notifications'?'active':''}`} onClick={() => setTab('notifications')}>
          <Bell size={14} style={{ marginRight:6 }}/>Notificaciones
        </button>
      </div>

      {/* Info form */}
      {tab === 'info' && (
        <div className="card" style={{ borderTopLeftRadius:0 }}>
          <form onSubmit={saveProfile}>
            <div className="form-grid" style={{ marginBottom:20 }}>
              <div className="input-group">
                <label>Nombre completo *</label>
                <input className="input" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name:e.target.value }))} required/>
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input" type="email" value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email:e.target.value }))} required/>
              </div>
              <div className="input-group">
                <label>Rol</label>
                <input className="input" value={ROLE_LABEL[profile.role] || profile.role || '—'} disabled
                  style={{ background:'#f8fafc', color:'#94a3b8', cursor:'not-allowed' }}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={15}/>{saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password form */}
      {tab === 'password' && (
        <div className="card" style={{ borderTopLeftRadius:0 }}>
          <form onSubmit={savePassword}>
            <div style={{ maxWidth:420, display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
              <PwInput field="current" label="Contraseña actual" placeholder="Tu contraseña actual"/>
              <PwInput field="new"     label="Nueva contraseña"  placeholder="Mínimo 6 caracteres"/>
              <PwInput field="confirm" label="Confirmar contraseña" placeholder="Repite la nueva contraseña"/>

              {/* Password strength bar */}
              {pwForm.new_password && (() => {
                const len   = pwForm.new_password.length;
                const hasUp = /[A-Z]/.test(pwForm.new_password);
                const hasNum= /[0-9]/.test(pwForm.new_password);
                const hasSp = /[^a-zA-Z0-9]/.test(pwForm.new_password);
                const score = (len>=8?1:0)+(len>=12?1:0)+hasUp+hasNum+hasSp;
                const label = score<=1?'Muy débil':score<=2?'Débil':score===3?'Regular':score===4?'Buena':'Muy fuerte';
                const color = score<=1?'#ef4444':score<=2?'#f59e0b':score===3?'#eab308':score===4?'#10b981':'#0f766e';
                return (
                  <div style={{ marginTop:6 }}>
                    <div style={{ height:4, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${(score/5)*100}%`, height:'100%', background:color, borderRadius:4, transition:'width .3s' }}/>
                    </div>
                    <p style={{ fontSize:11, color, marginTop:4, fontWeight:600 }}>{label}</p>
                  </div>
                );
              })()}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                <Lock size={15}/>{pwSaving ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2FA Form */}
      {tab === '2fa' && (
        <div className="card" style={{ borderTopLeftRadius:0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={20} color="#0f766e" /> Autenticación de Dos Factores (2FA)
          </h3>
          {profile.tfa_enabled ? (
            <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
              <p style={{ color: '#166534', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={18} /> ¡2FA está activado!
              </p>
              <p style={{ fontSize: 13, color: '#15803d', marginBottom: 16 }}>
                Tu cuenta está protegida con una capa adicional de seguridad. Se te pedirá un código de tu aplicación autenticadora (como Google Authenticator) al iniciar sesión.
              </p>
              <button className="btn btn-danger" onClick={disable2FA} disabled={tfaLoading}>
                {tfaLoading ? 'Desactivando...' : 'Desactivar 2FA'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Protege tu cuenta con la autenticación de dos factores. Una vez activada, necesitarás ingresar un código de 6 dígitos generado por una aplicación como Google Authenticator o Authy cada vez que inicies sesión.
              </p>
              
              {!tfaSetup ? (
                <button className="btn btn-primary" onClick={setup2FA} disabled={tfaLoading}>
                  {tfaLoading ? 'Generando...' : 'Configurar 2FA'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 20, alignItems: 'center' }}>
                    <img src={tfaSetup.qr_code} alt="QR Code 2FA" style={{ width: 150, height: 150, background: 'white', padding: 8, borderRadius: 8 }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>1. Escanea este código QR</p>
                      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Usa una aplicación como Google Authenticator, Authy o Microsoft Authenticator.</p>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>2. Ingresa el código de 6 dígitos</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          value={tfaCode}
                          onChange={e => setTfaCode(e.target.value.replace(/\D/g, ''))}
                          style={{ width: 120, fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                        />
                        <button className="btn btn-primary" onClick={enable2FA} disabled={tfaCode.length !== 6 || tfaLoading}>
                          {tfaLoading ? 'Verificando...' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setTfaSetup(null)}>Cancelar</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notifications form */}
      {tab === 'notifications' && (
        <div className="card" style={{ borderTopLeftRadius:0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bell size={20} color="#0f766e" /> Notificaciones de Escritorio
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Habilita las notificaciones web para recibir alertas nativas en tu computadora cada vez que haya actualizaciones importantes en tus oportunidades, cotizaciones o actividades.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-primary" 
              onClick={subscribeToPush}
              disabled={pushStatus === 'granted' || pushStatus === 'denied'}
            >
              {pushStatus === 'granted' ? 'Activadas' : pushStatus === 'denied' ? 'Bloqueadas por el navegador' : 'Activar Notificaciones'}
            </button>

            {pushStatus === 'granted' && (
              <button className="btn btn-secondary" onClick={testPush}>
                Probar Notificación
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
