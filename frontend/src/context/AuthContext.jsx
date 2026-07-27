import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const cachedUser = (() => {
    try { return JSON.parse(localStorage.getItem('crm_user')); } catch { return null; }
  })();
  const [user, setUser] = useState(cachedUser);
  // Si ya existe una sesión válida guardada, mostramos el CRM inmediatamente
  // mientras la confirmación con el servidor se realiza en segundo plano.
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      const validateSession = async () => {
        try {
          const r = await api.get('/auth/me', { timeout: 12000 });
          setUser(r.data);
          localStorage.setItem('crm_user', JSON.stringify(r.data));
          // Cargar configuración de la empresa para formateo global
          api.get('/settings').then(sr => {
            localStorage.setItem('crm_settings', JSON.stringify(sr.data));
            // Disparar evento para que los componentes se enteren
            window.dispatchEvent(new Event('crm_settings_updated'));
          }).catch(()=>{});
        } catch (err) {
          if (err.response?.status === 401) {
            localStorage.removeItem('crm_token');
            localStorage.removeItem('crm_user');
            setUser(null);
          } else if (!cachedUser) {
            // Render puede tardar en despertar. Un fallo temporal no invalida el token.
            await new Promise(resolve => setTimeout(resolve, 1200));
            try {
              const retry = await api.get('/auth/me', { timeout: 12000 });
              setUser(retry.data);
              localStorage.setItem('crm_user', JSON.stringify(retry.data));
            } catch (retryErr) {
              if (retryErr.response?.status === 401) {
                localStorage.removeItem('crm_token');
                localStorage.removeItem('crm_user');
              }
            }
          }
        } finally {
          setLoading(false);
        }
      };
      validateSession();
    } else {
      localStorage.removeItem('crm_user');
      setLoading(false);
    }
  }, []);

  const login = async (email, password, tfa_token) => {
    const { data, status } = await api.post('/auth/login', { email, password, tfa_token });
    if (status === 206 || data.require_2fa) {
      return { require_2fa: true };
    }
    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
