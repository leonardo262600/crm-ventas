import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Gets company configuration from localStorage
const getCompanyConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('crm_settings')) || {};
  } catch {
    return {};
  }
};

/**
 * Format data based on column accessors
 */
const prepareData = (data, columns) => {
  return data.map(row => {
    const formattedRow = {};
    columns.forEach(col => {
      let val = '';
      if (typeof col.accessor === 'function') {
        val = col.accessor(row);
      } else if (col.accessor) {
        val = row[col.accessor];
      }
      formattedRow[col.header] = val ?? '—';
    });
    return formattedRow;
  });
};

/**
 * Export data to Excel
 */
export const exportToExcel = (data, columns, filename = 'exportacion') => {
  if (!data || !data.length) return;
  const formattedData = prepareData(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data to PDF
 */
export const exportToPDF = (data, columns, title = 'Reporte', filename = 'reporte') => {
  if (!data || !data.length) return;
  
  const cfg = getCompanyConfig();
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Encabezado principal
  doc.setFillColor(15, 118, 110); // Color principal #0f766e
  doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 22);

  // Fecha y empresa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleString('es-PE');
  doc.text(`${cfg.company_name || 'CRM Ventas'} - Generado: ${dateStr}`, doc.internal.pageSize.width - 14, 22, { align: 'right' });

  // Cabeceras y filas de la tabla
  const tableCols = columns.map(col => col.header);
  const tableRows = prepareData(data, columns).map(row => columns.map(c => row[c.header]));

  doc.autoTable({
    head: [tableCols],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 45 }
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Print data
 */
export const printTable = (data, columns, title = 'Reporte') => {
  if (!data || !data.length) return;
  
  const cfg = getCompanyConfig();
  const tableCols = columns.map(col => col.header);
  const tableRows = prepareData(data, columns).map(row => columns.map(c => row[c.header]));
  
  const printWindow = window.open('', '_blank');
  const dateStr = new Date().toLocaleString('es-PE');
  
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #0f766e; }
          .header p { margin: 5px 0 0; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background-color: #f1f5f9; color: #475569; text-align: left; padding: 10px; border: 1px solid #e2e8f0; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background-color: #fafafa; }
          @media print {
            body { margin: 0; padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${title}</h1>
            <p>${cfg.company_name || 'CRM Ventas'} — Documento de uso interno</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Fecha de impresión:</strong></p>
            <p>${dateStr}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>${tableCols.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${tableRows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};
