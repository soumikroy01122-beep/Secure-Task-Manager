const jwt = require('jsonwebtoken');
const { getOne, execute } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_task_manager_jwt_secret_key_987654321_!@#';

/**
 * Middleware to verify JWT token from Authorization header
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in the database and is ACTIVE
    const user = await getOne(
      'SELECT id, username, email, full_name, role, status, title, team_id FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.'
    });
  }
}

/**
 * Middleware to restrict route access to specific roles (RBAC)
 * @param  {...string} allowedRoles e.g. 'ADMIN', 'MANAGER'
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthenticated request.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

/**
 * Audit log helper
 */
async function logAuditEvent(userId, action, details, ip) {
  try {
    await execute(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId || null, action, typeof details === 'object' ? JSON.stringify(details) : details, ip || '127.0.0.1']
    );
  } catch (e) {
    console.error('[AUDIT LOG ERROR]', e.message);
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  logAuditEvent,
  JWT_SECRET
};
