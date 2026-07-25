const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
const configuredPort = Number(process.env.DB_PORT || 3306);
const tidbHost = 'gateway01.eu-central-1.prod.aws.tidbcloud.com';
const tidbUser = 'nw39nQ5AWpWPqq2.root';
const tidbPassword = 'kPqsYeraK9iuq5TB';
const rawHost = String(process.env.DB_HOST || '').trim();
const localhostSet = ['', 'localhost', '127.0.0.1', '::1'].includes(rawHost);
const dbHost = configuredPort === 4000 && localhostSet
  ? tidbHost
  : (rawHost || 'localhost');
const rawUser = String(process.env.DB_USER || '').trim();
const invalidTidbUser = !rawUser || rawUser === 'root' || !rawUser.includes('.');
const dbUser = configuredPort === 4000 && invalidTidbUser
  ? tidbUser
  : (rawUser || 'root');
const rawPassword = String(process.env.DB_PASSWORD || '');
const dbPassword = configuredPort === 4000 && !rawPassword
  ? tidbPassword
  : rawPassword;

const pool = mysql.createPool({
  host: dbHost,
  port: configuredPort,
  user: dbUser,
  password: dbPassword,
  database: process.env.DB_NAME || 'ventas_crm',
  ssl: useSsl ? { minVersion: 'TLSv1.2' } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = pool;
