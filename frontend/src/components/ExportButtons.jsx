import React, { useState } from 'react';
import { Download, FileText, Printer, ChevronDown } from 'lucide-react';
import { exportToExcel, exportToPDF, printTable } from '../utils/exportUtils';

export default function ExportButtons({ data, columns, title = 'Reporte', filename = 'exportacion' }) {
  const [open, setOpen] = useState(false);

  if (!data || data.length === 0) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Download size={16} />
        Exportar
        <ChevronDown size={14} style={{ marginLeft: 4 }} />
      </button>

      {open && (
        <div 
          style={{ 
            position: 'absolute', top: '100%', right: 0, marginTop: 4, 
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50,
            minWidth: 150, overflow: 'hidden'
          }}
        >
          <div 
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
            onClick={() => { setOpen(false); exportToExcel(data, columns, filename); }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Download size={14} color="#059669" /> <span style={{ fontSize: 13, fontWeight: 500 }}>Excel (.xlsx)</span>
          </div>
          
          <div 
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
            onClick={() => { setOpen(false); exportToPDF(data, columns, title, filename); }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileText size={14} color="#dc2626" /> <span style={{ fontSize: 13, fontWeight: 500 }}>PDF Document</span>
          </div>

          <div 
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => { setOpen(false); printTable(data, columns, title); }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Printer size={14} color="#475569" /> <span style={{ fontSize: 13, fontWeight: 500 }}>Imprimir</span>
          </div>
        </div>
      )}

      {open && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
          onClick={() => setOpen(false)} 
        />
      )}
    </div>
  );
}
