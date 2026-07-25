import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Power, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadWorkflows(); }, []);

  const loadWorkflows = async () => {
    try {
      const { data } = await api.get('/workflows');
      setWorkflows(data);
    } catch (err) {
      toast.error('Error al cargar workflows');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/workflows/${id}/toggle`);
      setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, active: !w.active } : w));
      toast.success('Estado actualizado');
    } catch (err) { toast.error('Error al cambiar estado'); }
  };

  const remove = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este workflow?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows(wfs => wfs.filter(w => w.id !== id));
      toast.success('Workflow eliminado');
    } catch (err) { toast.error('Error al eliminar'); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Network size={24} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle', color: '#0f766e' }}/> Workflows</h1>
          <p>Secuencias de automatización multi-paso visuales</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
          <Plus size={16}/> Crear Workflow
        </button>
      </div>

      <div className="card">
        {loading ? <p>Cargando workflows...</p> : workflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Network size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p>No tienes workflows creados todavía.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Trigger Principal</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(wf => (
                <tr key={wf.id}>
                  <td style={{ fontWeight: 600 }}>{wf.name}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' }}>
                      {wf.trigger_type}
                    </span>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${wf.active ? 'btn-secondary' : ''}`}
                      onClick={() => toggleStatus(wf.id)}
                      style={{ background: wf.active ? '#ecfdf5' : '#fef2f2', color: wf.active ? '#059669' : '#dc2626', borderColor: wf.active ? '#a7f3d0' : '#fecaca' }}>
                      <Power size={12} style={{ marginRight: 4 }}/> {wf.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} onClick={() => navigate(`/workflows/${wf.id}`)}>
                        <Edit size={14} color="#64748b"/>
                      </button>
                      <button className="btn btn-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca' }} onClick={() => remove(wf.id)}>
                        <Trash2 size={14} color="#ef4444"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
