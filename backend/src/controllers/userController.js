const bcrypt = require('bcryptjs');
const { query, getOne, execute } = require('../db');
const { logAuditEvent } = require('../middleware/auth');

// Get all users (Admin gets all, Manager gets team users)
async function getAllUsers(req, res) {
  try {
    const userRole = req.user.role;
    let sql = '';
    let params = [];

    if (userRole === 'ADMIN') {
      sql = `
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.title, u.team_id, u.created_at,
               t.name as team_name,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id) as total_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'COMPLETED') as completed_tasks
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        ORDER BY u.created_at DESC
      `;
    } else if (userRole === 'MANAGER') {
      // Manager sees members of their team or all non-admin users
      sql = `
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.title, u.team_id, u.created_at,
               t.name as team_name,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id) as total_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'COMPLETED') as completed_tasks
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.role = 'USER' OR u.id = ?
        ORDER BY u.full_name ASC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions to list all users.' });
    }

    const users = await query(sql, params);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('[USER GET_ALL ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
  }
}

// Get team members (Manager view)
async function getTeamMembers(req, res) {
  try {
    const sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.title, u.team_id,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id) as task_count,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'COMPLETED') as completed_count,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'COMPLETED') as active_count
      FROM users u
      WHERE u.role = 'USER' AND u.status = 'ACTIVE'
      ORDER BY u.full_name ASC
    `;
    const members = await query(sql);
    return res.json({ success: true, count: members.length, members });
  } catch (err) {
    console.error('[USER GET_TEAM_MEMBERS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve team members.' });
  }
}

// Get single user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    // RBAC: Admin can view any user, others can view only themselves
    if (req.user.role !== 'ADMIN' && Number(req.user.id) !== Number(id)) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own user profile.' });
    }

    const user = await getOne(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.title, u.team_id, u.created_at, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('[USER GET_BY_ID ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
}

// Create new user (Admin only)
async function createUser(req, res) {
  try {
    const { username, email, password, full_name, role, status, title } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Username, email, password, and full name are required.' });
    }

    const sanitizedUsername = String(username).trim().toLowerCase();
    const sanitizedEmail = String(email).trim().toLowerCase();
    const assignedRole = role && ['ADMIN', 'MANAGER', 'USER'].includes(role.toUpperCase()) ? role.toUpperCase() : 'USER';
    const assignedStatus = status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase()) ? status.toUpperCase() : 'ACTIVE';

    const existing = await getOne('SELECT id FROM users WHERE username = ? OR email = ?', [sanitizedUsername, sanitizedEmail]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A user with this username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultTeam = await getOne('SELECT id FROM teams LIMIT 1');
    const teamId = defaultTeam ? defaultTeam.id : null;

    const result = await execute(
      'INSERT INTO users (username, email, password_hash, full_name, role, status, title, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sanitizedUsername, sanitizedEmail, passwordHash, full_name.trim(), assignedRole, assignedStatus, title || 'Member', teamId]
    );

    const createdId = result.insertId;
    await logAuditEvent(req.user.id, 'USER_CREATE', `Created user ${sanitizedUsername} (${assignedRole})`, req.ip);

    const createdUser = await getOne(
      'SELECT id, username, email, full_name, role, status, title, team_id, created_at FROM users WHERE id = ?',
      [createdId]
    );

    return res.status(201).json({ success: true, message: 'User created successfully', user: createdUser });
  } catch (err) {
    console.error('[USER CREATE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to create user.' });
  }
}

// Update user (Admin only)
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, role, status, title, password } = req.body;

    const user = await getOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let updatedFullName = full_name ? String(full_name).trim() : user.full_name;
    let updatedEmail = email ? String(email).trim().toLowerCase() : user.email;
    let updatedRole = role && ['ADMIN', 'MANAGER', 'USER'].includes(role.toUpperCase()) ? role.toUpperCase() : user.role;
    let updatedStatus = status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase()) ? status.toUpperCase() : user.status;
    let updatedTitle = title !== undefined ? String(title).trim() : user.title;
    let updatedPasswordHash = user.password_hash;

    if (password && password.length >= 8) {
      updatedPasswordHash = await bcrypt.hash(password, 10);
    }

    if (updatedEmail !== user.email) {
      const emailConflict = await getOne('SELECT id FROM users WHERE email = ? AND id != ?', [updatedEmail, id]);
      if (emailConflict) {
        return res.status(409).json({ success: false, error: 'Email already used by another user.' });
      }
    }

    await execute(
      'UPDATE users SET full_name = ?, email = ?, role = ?, status = ?, title = ?, password_hash = ? WHERE id = ?',
      [updatedFullName, updatedEmail, updatedRole, updatedStatus, updatedTitle, updatedPasswordHash, id]
    );

    await logAuditEvent(req.user.id, 'USER_UPDATE', `Updated user ID ${id} (${user.username})`, req.ip);

    const updatedUser = await getOne(
      'SELECT id, username, email, full_name, role, status, title, team_id FROM users WHERE id = ?',
      [id]
    );

    return res.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('[USER UPDATE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update user.' });
  }
}

// Delete user (Admin only)
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own admin account.' });
    }

    const user = await getOne('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    await execute('DELETE FROM users WHERE id = ?', [id]);
    await logAuditEvent(req.user.id, 'USER_DELETE', `Deleted user ID ${id} (${user.username})`, req.ip);

    return res.json({ success: true, message: `User ${user.username} deleted successfully.` });
  } catch (err) {
    console.error('[USER DELETE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
}

module.exports = {
  getAllUsers,
  getTeamMembers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
