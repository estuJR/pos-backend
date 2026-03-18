const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado. Token requerido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

const requireSupervisor = (req, res, next) => {
  if (req.user?.role !== 'supervisor') {
    return res.status(403).json({ success: false, message: 'Acceso restringido a supervisores.' });
  }
  next();
};

module.exports = { protect, requireSupervisor };
