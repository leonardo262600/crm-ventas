const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
const configuredPort = Number(process.env.DB_PORT || 3306);
const hostFallback = configuredPort === 4000
  ? 'gateway01.eu-central-1.prod.aws.tidbcloud.com'
  : 'localhost';
const dbHost = process.env.DB_HOST || hostFallback;

const pool = mysql.createPool({
  host: dbHost,
  port: configuredPort,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ventas_crm',
  ssl: useSsl ? { minVersion: 'TLSv1.2' } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = pool;
