const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
const configuredPort = Number(process.env.DB_PORT || 3306);
const rawHost = String(process.env.DB_HOST || '').trim();
const rawUser = String(process.env.DB_USER || '').trim();
const rawPassword = String(process.env.DB_PASSWORD || '');

if (process.env.NODE_ENV === 'production' && (!rawHost || !rawUser || !rawPassword)) {
  throw new Error('Faltan las variables privadas DB_HOST, DB_USER o DB_PASSWORD');
}

const pool = mysql.createPool({
  host: rawHost || 'localhost',
  port: configuredPort,
  user: rawUser || 'root',
  password: rawPassword,
  database: process.env.DB_NAME || 'ventas_crm',
  ssl: useSsl ? { minVersion: 'TLSv1.2' } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = pool;
