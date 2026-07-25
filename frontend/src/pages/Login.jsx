import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TrendingUp, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@crm.com', password: 'admin123', tfa_token: '' });
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(form.email, form.password, form.tfa_token);
      if (result && result.require_2fa) {
        setRequires2FA(true);
        toast('Código 2FA requerido', { icon: '🛡️' });
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '40px', display: 'none' }} className="login-left">
        <TrendingUp size={64} style={{ marginBottom: 24, opacity: .9 }} />
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>CRM Ventas</h1>
        <p style={{ opacity: .8, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
          Gestiona tus contactos, oportunidades y equipo de ventas desde un solo lugar.
        </p>
      </div>

      {/* Right panel / form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ background: 'linear-gradient(135deg,#0f766e,#134e4a)', borderRadius: 12, padding: 10, display: 'flex' }}>
              <TrendingUp size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>CRM Ventas</h2>
              <p style={{ fontSize: 12, color: '#64748b' }}>Inicia sesión en tu cuenta</p>
            </div>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!requires2FA ? (
              <>
                <div className="input-group">
                  <label>Correo electrónico</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="input" style={{ paddingLeft: 38 }} type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="input" style={{ paddingLeft: 38 }} type="password" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  </div>
                </div>
              </>
            ) : (
              <div className="input-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ShieldCheck size={20} color="#0f766e" />
                  <label style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Código de Autenticación 2FA</label>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  Ingresa el código de 6 dígitos generado por tu aplicación autenticadora.
                </p>
                <input className="input" type="text" placeholder="000000" maxLength={6} value={form.tfa_token || ''}
                  onChange={e => setForm(f => ({ ...f, tfa_token: e.target.value.replace(/\D/g, '') }))} required
                  style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', padding: '12px 0' }} />
              </div>
            )}
            
            <button className="btn btn-primary w-full" style={{ marginTop: 8, justifyContent: 'center', height: 44 }} disabled={loading || (requires2FA && form.tfa_token?.length !== 6)}>
              {loading ? 'Ingresando...' : requires2FA ? 'Verificar y Entrar' : 'Iniciar sesión'}
            </button>
            
            {requires2FA && (
              <button type="button" className="btn btn-secondary w-full" style={{ justifyContent: 'center', height: 44 }} disabled={loading} onClick={() => { setRequires2FA(false); setForm(f => ({ ...f, tfa_token: '' })); }}>
                Volver
              </button>
            )}
          </form>

          {!requires2FA && (
            <p style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Demo: admin@crm.com / admin123
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
