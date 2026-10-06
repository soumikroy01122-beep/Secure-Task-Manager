const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getOne, execute } = require('../db');
const { JWT_SECRET, logAuditEvent } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper to generate token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      team_id: user.team_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// User Registration
async function register(req, res) {
  try {
    const { username, email, password, confirmPassword, full_name, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    // Input sanitization and format checks
    const sanitizedUsername = String(username).trim().toLowerCase();
    const sanitizedEmail = String(email).trim().toLowerCase();
    const sanitizedFullName = full_name ? String(full_name).trim() : sanitizedUsername;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    // Check if username or email is already taken
    const existingUser = await getOne(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [sanitizedUsername, sanitizedEmail]
    );

    if (existingUser) {
      if (existingUser.username === sanitizedUsername) {
        return res.status(409).json({ success: false, error: 'Username is already taken.' });
      }
      return res.status(409).json({ success: false, error: 'Email is already registered.' });
    }

    // Hash password securely with bcrypt salt rounds = 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Default assigned role is USER (unless specified as MANAGER/ADMIN if allowed)
    const assignedRole = (role && ['ADMIN', 'MANAGER', 'USER'].includes(role.toUpperCase())) 
      ? role.toUpperCase() 
      : 'USER';

    // Get default team if exists
    const defaultTeam = await getOne('SELECT id FROM teams LIMIT 1');
    const teamId = defaultTeam ? defaultTeam.id : null;

    const result = await execute(
      'INSERT INTO users (username, email, password_hash, full_name, role, status, title, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sanitizedUsername, sanitizedEmail, passwordHash, sanitizedFullName, assignedRole, 'ACTIVE', 'Team Member', teamId]
    );

    const newUserId = result.insertId;

    const newUser = {
      id: newUserId,
      username: sanitizedUsername,
      email: sanitizedEmail,
      full_name: sanitizedFullName,
      role: assignedRole,
      status: 'ACTIVE',
      title: 'Team Member',
      team_id: teamId
    };

    const token = generateToken(newUser);
    await logAuditEvent(newUserId, 'REGISTER', `User ${sanitizedUsername} registered with role ${assignedRole}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
}

// User Login
async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
    }

    const trimmedIdentifier = String(identifier).trim().toLowerCase();

    // Find user by either username or email
    const user = await getOne(
      'SELECT id, username, email, password_hash, full_name, role, status, title, team_id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
      [trimmedIdentifier, trimmedIdentifier]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your username/email and password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAuditEvent(user.id, 'LOGIN_FAILED', 'Failed login attempt - incorrect password', req.ip);
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your username/email and password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: 'This account has been deactivated. Please contact an admin.' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      title: user.title,
      team_id: user.team_id
    };

    const token = generateToken(safeUser);
    await logAuditEvent(user.id, 'LOGIN_SUCCESS', `User ${user.username} logged in`, req.ip);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

// Get current user profile
async function getMe(req, res) {
  try {
    const user = await getOne(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.title, u.team_id, u.created_at, t.name as team_name 
       FROM users u 
       LEFT JOIN teams t ON u.team_id = t.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('[AUTH GET_ME ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile.' });
  }
}

// Update own profile
async function updateProfile(req, res) {
  try {
    const { full_name, email, current_password, new_password, title } = req.body;
    const userId = req.user.id;

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let updatedFullName = full_name ? String(full_name).trim() : user.full_name;
    let updatedEmail = email ? String(email).trim().toLowerCase() : user.email;
    let updatedTitle = title !== undefined ? String(title).trim() : user.title;
    let updatedPasswordHash = user.password_hash;

    // If changing password, verify current password
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, error: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(current_password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      }
      if (new_password.length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
      }
      updatedPasswordHash = await bcrypt.hash(new_password, 10);
    }

    // Check if new email conflicts with another user
    if (updatedEmail !== user.email) {
      const emailConflict = await getOne('SELECT id FROM users WHERE email = ? AND id != ?', [updatedEmail, userId]);
      if (emailConflict) {
        return res.status(409).json({ success: false, error: 'Email is already in use by another user.' });
      }
    }

    await execute(
      'UPDATE users SET full_name = ?, email = ?, title = ?, password_hash = ? WHERE id = ?',
      [updatedFullName, updatedEmail, updatedTitle, updatedPasswordHash, userId]
    );

    await logAuditEvent(userId, 'PROFILE_UPDATE', 'User updated profile information', req.ip);

    const updatedUser = await getOne(
      'SELECT id, username, email, full_name, role, status, title, team_id FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('[AUTH UPDATE_PROFILE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
