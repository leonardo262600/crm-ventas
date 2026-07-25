import React, { useEffect, useState } from 'react';
import { FileCheck, FileText, Download } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const downloadPDF = async (id, number) => {
  try {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`/api/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `factura-${number}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch { toast.error('Error al generar PDF de factura'); }
};

import { fmtCurrency as fmt } from '../utils/format';
import ExportButtons from '../components/ExportButtons';
const STATUS_BADGE  = { borrador: 'badge-gray', emitida: 'badge-blue', pagada: 'badge-green', cancelada: 'badge-red' };
const STATUS_LABEL  = { borrador: 'Borrador', emitida: 'Emitida', pagada: 'Pagada', cancelada: 'Cancelada' };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);

  const load = () => api.get('/invoices').then(r => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status });
      toast.success('Estado actualizado');
      load();
    } catch (err) { toast.error('Error al actualizar estado'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCheck size={28} color="#0f766e" /> Facturación
          </h1>
          <p>Consulta las facturas emitidas y gestiona su estado de pago.</p>
        </div>
        <div>
          <ExportButtons 
            data={invoices} 
            filename="facturas" 
            title="Listado de Facturas"
            columns={[
              { header: 'Número', accessor: 'number' },
              { header: 'Cliente', accessor: i => i.contact_company || i.contact_name || '—' },
              { header: 'Emisión', accessor: i => i.issue_date ? format(new Date(i.issue_date), 'dd/MM/yyyy') : '—' },
              { header: 'Vencimiento', accessor: i => i.due_date ? format(new Date(i.due_date), 'dd/MM/yyyy') : '—' },
              { header: 'Total', accessor: i => fmt(i.total) },
              { header: 'Estado', accessor: i => STATUS_LABEL[i.status] },
            ]}
          />
        </div>
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div className="empty-state"><FileText size={48} /><h3>Sin facturas</h3><p>Convierte una cotización aprobada para generar tu primera factura.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Número</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th><th>Total</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{inv.number}</span></td>
                    <td>{inv.contact_company || inv.contact_name || '—'}</td>
                    <td>{inv.issue_date ? format(new Date(inv.issue_date), 'dd/MM/yyyy') : '—'}</td>
                    <td>{inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#0f766e' }}>{fmt(inv.total)}</td>
                    <td>
                      <select 
                        className={`badge ${STATUS_BADGE[inv.status]}`} 
                        style={{ border: 'none', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                        value={inv.status}
                        onChange={(e) => changeStatus(inv.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" title="Descargar PDF Fiscal" onClick={() => downloadPDF(inv.id, inv.number)}>
                        <Download size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
