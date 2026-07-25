/**
 * Shared formatting utilities for CRM Ventas
 */

/** Currency formatter — reads tenant config from localStorage if set */
export const fmtCurrency = (n, fallbackCurrency = 'PEN') => {
  let cfg = null;
  try {
    cfg = JSON.parse(localStorage.getItem('crm_settings'));
  } catch(e) {}

  const val = Number(n) || 0;
  
  if (!cfg) {
    // Fallback if settings not loaded yet
    const cur = fallbackCurrency;
    const locale = cur === 'PEN' ? 'es-PE' : cur === 'USD' ? 'en-US' : cur === 'EUR' ? 'es-ES' : 'es-MX';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(val);
  }

  // Use custom settings
  const symbol = cfg.currency_symbol || 'S/';
  const dec = cfg.decimal_separator || '.';
  const thou = cfg.thousands_separator || ',';
  const pos = cfg.currency_position || 'before';

  // Format number
  let parts = val.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thou);
  const formattedNumber = parts.join(dec);

  if (pos === 'after') {
    return `${formattedNumber} ${symbol}`;
  }
  return `${symbol} ${formattedNumber}`;
};

export const fmt = fmtCurrency; // alias

/** Formatter for charts (e.g. 15k instead of 15,000) */
export const fmtShortCurrency = (n) => {
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('crm_settings')); } catch(e) {}
  
  const val = Number(n) || 0;
  const shortVal = val >= 1000 ? (val/1000).toFixed(0) + 'k' : val;
  const symbol = cfg?.currency_symbol || 'S/';
  const pos = cfg?.currency_position || 'before';
  
  if (pos === 'after') return `${shortVal} ${symbol}`;
  return `${symbol} ${shortVal}`;
};

/** Date short format */
export const fmtDate = (d, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('es-MX');
  } catch { return '—'; }
};

/** Percent */
export const fmtPct = (n, decimals = 1) =>
  `${(Number(n) || 0).toFixed(decimals)}%`;
