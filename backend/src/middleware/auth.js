const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (decoded.role === 'setter') {
      const url = req.originalUrl || '';
      const allowed = [
        '/api/prospecting',
        '/api/profile',
        '/api/auth/me',
        '/api/auth/password',
      ].some(prefix => url.startsWith(prefix));
      if (!allowed) return res.status(403).json({ message: 'Esta sección no está disponible para el rol Setter' });
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

module.exports = { auth, requireRole };
