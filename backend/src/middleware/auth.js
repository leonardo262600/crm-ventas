const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, tenant_id, name, email, role, active FROM users WHERE id=? AND tenant_id=? AND active=1 LIMIT 1',
      [decoded.id, decoded.tenant_id]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'La cuenta está inactiva o ya no existe' });
    }
    req.user = rows[0];
    if (req.user.role === 'setter') {
      const url = req.originalUrl || '';
      const basicAllowed = [
        '/api/prospecting',
        '/api/profile',
        '/api/auth/me',
        '/api/auth/password',
        '/api/chat',
        '/api/notifications',
      ].some(prefix => url.startsWith(prefix));
      const contactsAllowed = url.startsWith('/api/contacts')
        && ['GET','POST','PUT'].includes(req.method);
      const opportunityAllowed = (
        (url.startsWith('/api/opportunities/stages') && req.method === 'GET')
        || (url === '/api/opportunities' && req.method === 'POST')
      );
      if (!basicAllowed && !contactsAllowed && !opportunityAllowed) {
        return res.status(403).json({ message: 'Esta sección no está disponible para el rol Setter' });
      }
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Permisos insuficientes' });
  }
  next();
};

const safeSecretMatch = (provided, expected) => {
  const left = Buffer.from(String(provided || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
};

// Credencial técnica limitada a las rutas de carga de prospección.
const prospectingAutomationAuth = async (req, res, next) => {
  const expected = process.env.PROSPECTING_AUTOMATION_KEY;
  const provided = req.headers['x-prospecting-key'];
  if (!expected || !safeSecretMatch(provided, expected)) {
    return res.status(401).json({ message: 'Credencial de prospección no válida' });
  }
  try {
    const tenantId = Number(process.env.PROSPECTING_TENANT_ID || 1);
    const [rows] = await db.query(
      `SELECT id,tenant_id,name,email,role,active
         FROM users
        WHERE tenant_id=? AND role='admin' AND active=1 AND deleted_at IS NULL
        ORDER BY id LIMIT 1`,
      [tenantId]
    );
    if (!rows.length) return res.status(503).json({ message: 'No existe un administrador activo para la prospección' });
    req.user = rows[0];
    req.prospectingAutomation = true;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { auth, requireRole, prospectingAutomationAuth };
