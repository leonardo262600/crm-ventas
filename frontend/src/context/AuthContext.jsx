import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      api.get('/auth/me')
        .then(r => {
          setUser(r.data);
          // Cargar configuración de la empresa para formateo global
          api.get('/settings').then(sr => {
            localStorage.setItem('crm_settings', JSON.stringify(sr.data));
            // Disparar evento para que los componentes se enteren
            window.dispatchEvent(new Event('crm_settings_updated'));
          }).catch(()=>{});
        })
        .catch(() => localStorage.removeItem('crm_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, tfa_token) => {
    const { data, status } = await api.post('/auth/login', { email, password, tfa_token });
    if (status === 206 || data.require_2fa) {
      return { require_2fa: true };
    }
    localStorage.setItem('crm_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
