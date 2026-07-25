import React, { useEffect, useState } from 'react';
import { Plus, X, FileText, Trash2, Download, Pencil, Link2, FileCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const downloadPDF = async (id, number) => {
  try {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`/api/exports/quotes/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cotizacion-${number}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch { toast.error('Error al generar PDF'); }
};

import { fmtCurrency as fmt } from '../utils/format';
import ExportButtons from '../components/ExportButtons';
const STATUS_BADGE  = { borrador: 'badge-gray', enviada: 'badge-blue', aprobada: 'badge-green', rechazada: 'badge-red', convertida: 'badge-purple' };
const STATUS_LABEL  = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada', convertida: 'Convertida' };
const EDITABLE_STATUSES = ['borrador', 'enviada', 'rechazada']; // no se puede editar aprobada/convertida

const EMPTY_FORM = { contact_id: '', opportunity_id: '', notes: '', valid_until: '', discount: 0, tax: 0, items: [] };

export default function Quotes() {
  const [quotes, setQuotes]           = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [products, setProducts]       = useState([]);
  const [opps, setOpps]               = useState([]);
  const [modal, setModal]             = useState(false);    // true = crear, 'edit' = editar
  const [editingId, setEditingId]     = useState(null);
  const [viewModal, setViewModal]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm]               = useState(EMPTY_FORM);

  const load = () => api.get('/quotes', { params: filterStatus ? { status: filterStatus } : {} }).then(r => setQuotes(r.data));
  useEffect(() => { load(); }, [filterStatus]);
  useEffect(() => {
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {});
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
    api.get('/opportunities').then(r => setOpps(r.data)).catch(() => {});
  }, []);

  /* ── Items helpers ── */
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', description: '', quantity: 1, unit_price: 0, discount_pct: 0 }] }));
  const removeItem = i  => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items };
  });

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0) * (1 - (Number(i.discount_pct) || 0) / 100), 0);
  const total    = subtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0);

  /* ── Abrir modal crear ── */
  const openNew = () => { setForm(EMPTY_FORM); setEditingId(null); setModal(true); };

  /* ── Abrir modal editar ── */
  const openEdit = async (id) => {
    try {
      const r = await api.get(`/quotes/${id}`);
      const q = r.data;
      setForm({
        contact_id:     String(q.contact_id || ''),
        opportunity_id: String(q.opportunity_id || ''),
        notes:          q.notes || '',
        valid_until:    q.valid_until ? q.valid_until.split('T')[0] : '',
        discount:       q.discount || 0,
        tax:            q.tax || 0,
        items: (q.items || []).map(it => ({
          product_id:   String(it.product_id || ''),
          description:  it.description || it.product_name || '',
          quantity:     it.quantity,
          unit_price:   it.unit_price,
          discount_pct: it.discount_pct || 0,
        })),
      });
      setEditingId(id);
      setViewModal(null);
      setModal('edit');
    } catch { toast.error('Error al cargar cotización'); }
  };

  /* ── Guardar (crear o editar) ── */
  const save = async e => {
    e.preventDefault();
    if (!form.items.length) return toast.error('Agrega al menos un ítem');
    try {
      if (modal === 'edit') {
        await api.put(`/quotes/${editingId}`, form);
        toast.success('Cotización actualizada');
      } else {
        await api.post('/quotes', form);
        toast.success('Cotización creada');
      }
      setModal(false);
      setEditingId(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/quotes/${id}/status`, { status });
    toast.success('Estado actualizado');
    load();
    setViewModal(v => v ? { ...v, status } : null);
  };

  const openView = async id => {
    const r = await api.get(`/quotes/${id}`);
    setViewModal(r.data);
  };

  const convertToInvoice = async (quoteId) => {
    try {
      const res = await api.post('/invoices/from-quote', { quote_id: quoteId });
      toast.success(`Factura ${res.data.number} generada`);
      changeStatus(quoteId, 'convertida');
      setViewModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar factura');
    }
  };

  const onProductSelect = (i, product_id) => {
    const p = products.find(p => String(p.id) === String(product_id));
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], product_id, unit_price: p ? p.price : items[i].unit_price, description: p ? p.name : items[i].description };
      return { ...f, items };
    });
  };

  /* ── Render ── */
  return (
    <div>
      <div className="page-header">
        <div><h1>Cotizaciones</h1><p>Genera y gestiona cotizaciones profesionales</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <ExportButtons 
            data={quotes} 
            filename="cotizaciones" 
            title="Listado de Cotizaciones"
            columns={[
              { header: 'Número', accessor: 'number' },
              { header: 'Cliente', accessor: 'contact_name' },
              { header: 'Total', accessor: q => fmt(q.total) },
              { header: 'Estado', accessor: q => STATUS_LABEL[q.status] },
              { header: 'Fecha', accessor: q => q.created_at ? format(new Date(q.created_at), 'dd/MM/yyyy') : '—' },
              { header: 'Vencimiento', accessor: q => q.valid_until ? format(new Date(q.valid_until), 'dd/MM/yyyy') : '—' },
            ]}
          />
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} />Nueva cotización</button>
        </div>
      </div>

      <div className="tabs">
        {[['', 'Todas'], ['borrador', 'Borrador'], ['enviada', 'Enviadas'], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas']].map(([v, l]) => (
          <button key={v} className={`tab ${filterStatus === v ? 'active' : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {quotes.length === 0 ? (
          <div className="empty-state"><FileText size={48} /><h3>Sin cotizaciones</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Número</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Vence</th><th /></tr></thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{q.number}</span></td>
                    <td>{q.contact_name || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#0f766e' }}>{fmt(q.total)}</td>
                    <td><span className={`badge ${STATUS_BADGE[q.status]}`}>{STATUS_LABEL[q.status]}</span></td>
                    <td>{q.created_at ? format(new Date(q.created_at), 'dd/MM/yyyy') : '—'}</td>
                    <td>{q.valid_until ? format(new Date(q.valid_until), 'dd/MM/yyyy') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openView(q.id)}>Ver</button>
                        {EDITABLE_STATUSES.includes(q.status) && (
                          <button className="btn-icon" title="Editar" onClick={() => openEdit(q.id)}><Pencil size={14} /></button>
                        )}
                        <button className="btn-icon" title="Descargar PDF" onClick={() => downloadPDF(q.id, q.number)}><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Ver detalle ── */}
      {viewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <h3>{viewModal.number}</h3>
                <span className={`badge ${STATUS_BADGE[viewModal.status]}`}>{STATUS_LABEL[viewModal.status]}</span>
              </div>
              <button className="btn-icon" onClick={() => setViewModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><p className="text-muted text-sm">Cliente</p><p style={{ fontWeight: 500 }}>{viewModal.contact_name || '—'}</p></div>
                <div><p className="text-muted text-sm">Empresa</p><p style={{ fontWeight: 500 }}>{viewModal.contact_company || '—'}</p></div>
                <div><p className="text-muted text-sm">Válida hasta</p><p>{viewModal.valid_until ? format(new Date(viewModal.valid_until), 'dd/MM/yyyy') : '—'}</p></div>
              </div>
              <table style={{ width: '100%' }}>
                <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Desc%</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(viewModal.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.description || item.product_name || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{fmt(item.unit_price)}</td>
                      <td>{item.discount_pct}%</td>
                      <td style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <p>Subtotal: <strong>{fmt(viewModal.subtotal)}</strong></p>
                <p>Descuento: <strong>{fmt(viewModal.discount)}</strong></p>
                <p>Impuesto: <strong>{fmt(viewModal.tax)}</strong></p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#0f766e', marginTop: 8 }}>Total: {fmt(viewModal.total)}</p>
              </div>
              {viewModal.notes && <p style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>{viewModal.notes}</p>}
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
              {/* Botón Editar (solo si el estado lo permite) */}
              {EDITABLE_STATUSES.includes(viewModal.status) && (
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(viewModal.id)}>
                  <Pencil size={14} /> Editar
                </button>
              )}
              {/* Enlace de aceptación para cliente */}
              {EDITABLE_STATUSES.includes(viewModal.status) && viewModal.accept_token && (
                <button
                  className="btn btn-secondary btn-sm"
                  title="Copiar enlace de aceptación para el cliente"
                  onClick={() => {
                    const url = `${window.location.origin}/quote/${viewModal.accept_token}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Enlace copiado al portapapeles');
                  }}
                >
                  <Link2 size={14} /> Copiar enlace cliente
                </button>
              )}
              {/* Cambio de estado */}
              {['enviada', 'aprobada', 'rechazada'].map(s => (
                viewModal.status !== s && (
                  <button key={s} className="btn btn-secondary btn-sm" onClick={() => changeStatus(viewModal.id, s)}>
                    {STATUS_LABEL[s]}
                  </button>
                )
              ))}
              
              {/* Botón Facturar */}
              {(viewModal.status === 'aprobada' || viewModal.status === 'convertida') && (
                <button 
                  className="btn btn-sm" 
                  style={{ background: '#10b981', color: 'white', border: 'none' }}
                  onClick={() => convertToInvoice(viewModal.id)}
                  disabled={viewModal.status === 'convertida'}
                >
                  <FileCheck size={14} style={{ marginRight: 6 }}/> 
                  {viewModal.status === 'convertida' ? 'Facturada' : 'Generar Factura'}
                </button>
              )}

              <button className="btn btn-primary btn-sm" onClick={() => downloadPDF(viewModal.id, viewModal.number)}>
                <Download size={14} /> Descargar PDF
              </button>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear / Editar ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{modal === 'edit' ? 'Editar cotización' : 'Nueva cotización'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>Cliente</label>
                    <select className="input" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
                      <option value="">Sin cliente</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Válida hasta</label>
                    <input className="input" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 500 }}>Ítems</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={14} />Agregar ítem</button>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <select className="input" value={item.product_id} onChange={e => onProductSelect(i, e.target.value)}>
                        <option value="">Seleccionar producto</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input className="input" type="number" min="1" placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      <input className="input" type="number" min="0" step="0.01" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                      <input className="input" type="number" min="0" max="100" placeholder="Desc%" value={item.discount_pct} onChange={e => updateItem(i, 'discount_pct', e.target.value)} />
                      <button type="button" className="btn-icon" style={{ color: '#ef4444' }} onClick={() => removeItem(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group"><label>Descuento global (PEN)</label><input className="input" type="number" min="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
                  <div className="input-group"><label>Impuesto (PEN)</label><input className="input" type="number" min="0" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
                </div>
                <div style={{ textAlign: 'right', padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Subtotal: {fmt(subtotal)}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0f766e' }}>Total: {fmt(total)}</p>
                </div>
                <div className="input-group"><label>Notas</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modal === 'edit' ? 'Guardar cambios' : 'Crear cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
