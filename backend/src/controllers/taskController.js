const { query, getOne, execute } = require('../db');
const { logAuditEvent } = require('../middleware/auth');

// Get all tasks according to RBAC rules
async function getAllTasks(req, res) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { status, priority, search } = req.query;

    let baseSql = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
             t.assigned_to, t.created_by, t.team_id, t.created_at, t.updated_at,
             u_assignee.full_name as assignee_name,
             u_assignee.username as assignee_username,
             u_assignee.title as assignee_title,
             u_creator.full_name as creator_name
      FROM tasks t
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC Task Scope
    if (userRole === 'ADMIN') {
      // Admin sees all tasks
    } else if (userRole === 'MANAGER') {
      // Manager sees tasks assigned to team members, created by manager, or assigned to manager
      baseSql += ` AND (t.created_by = ? OR t.assigned_to = ? OR t.assigned_to IN (SELECT id FROM users WHERE role = 'USER'))`;
      params.push(userId, userId);
    } else {
      // Regular User sees ONLY their own assigned tasks
      baseSql += ` AND t.assigned_to = ?`;
      params.push(userId);
    }

    // Filters
    if (status && status !== 'ALL') {
      baseSql += ` AND t.status = ?`;
      params.push(status.toUpperCase());
    }

    if (priority && priority !== 'ALL') {
      baseSql += ` AND t.priority = ?`;
      params.push(priority.toUpperCase());
    }

    if (search) {
      baseSql += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    baseSql += ` ORDER BY t.created_at DESC`;

    const tasks = await query(baseSql, params);
    return res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('[TASK GET_ALL ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tasks.' });
  }
}

// Get single task by ID with authorization check
async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    const task = await getOne(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
              t.assigned_to, t.created_by, t.team_id, t.created_at, t.updated_at,
              u_assignee.full_name as assignee_name,
              u_assignee.username as assignee_username,
              u_assignee.email as assignee_email,
              u_creator.full_name as creator_name
       FROM tasks t
       LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
       LEFT JOIN users u_creator ON t.created_by = u_creator.id
       WHERE t.id = ?`,
      [id]
    );

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    // RBAC Access Control
    if (req.user.role === 'USER' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot access tasks assigned to others.' });
    }

    return res.json({ success: true, task });
  } catch (err) {
    console.error('[TASK GET_BY_ID ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve task.' });
  }
}

// Create new task (Admin & Manager)
async function createTask(req, res) {
  try {
    const { title, description, status, priority, due_date, assigned_to } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required.' });
    }

    // Users are not permitted to create global/team tasks directly
    if (req.user.role === 'USER') {
      return res.status(403).json({ success: false, error: 'Forbidden: Users cannot create team tasks.' });
    }

    const assignedStatus = status && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].includes(status.toUpperCase())
      ? status.toUpperCase()
      : 'PENDING';

    const assignedPriority = priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase())
      ? priority.toUpperCase()
      : 'MEDIUM';

    let assigneeId = assigned_to ? Number(assigned_to) : null;
    if (assigneeId) {
      const assignee = await getOne('SELECT id, role FROM users WHERE id = ?', [assigneeId]);
      if (!assignee) {
        return res.status(400).json({ success: false, error: 'Assigned user does not exist.' });
      }
    }

    const result = await execute(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by, team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description ? description.trim() : '',
        assignedStatus,
        assignedPriority,
        due_date || null,
        assigneeId,
        req.user.id,
        req.user.team_id || null
      ]
    );

    const newTaskId = result.insertId;
    await logAuditEvent(req.user.id, 'TASK_CREATE', `Created task '${title}' assigned to user ID ${assigneeId}`, req.ip);

    const createdTask = await getOne(
      `SELECT t.*, u.full_name as assignee_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [newTaskId]
    );

    return res.status(201).json({ success: true, message: 'Task created successfully', task: createdTask });
  } catch (err) {
    console.error('[TASK CREATE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to create task.' });
  }
}

// Update task
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const task = await getOne('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // RBAC: USER can ONLY update the status of their assigned tasks
    if (userRole === 'USER') {
      if (task.assigned_to !== userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only update tasks assigned to you.' });
      }

      const { status } = req.body;
      if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status.toUpperCase())) {
        return res.status(400).json({ success: false, error: 'Invalid status provided.' });
      }

      await execute('UPDATE tasks SET status = ? WHERE id = ?', [status.toUpperCase(), id]);
      await logAuditEvent(userId, 'TASK_STATUS_UPDATE', `User updated task ${id} status to ${status}`, req.ip);

      const updated = await getOne('SELECT * FROM tasks WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Task status updated successfully', task: updated });
    }

    // ADMIN & MANAGER: Full updates
    const { title, description, status, priority, due_date, assigned_to } = req.body;

    const newTitle = title !== undefined ? title.trim() : task.title;
    const newDescription = description !== undefined ? description.trim() : task.description;
    const newStatus = status ? status.toUpperCase() : task.status;
    const newPriority = priority ? priority.toUpperCase() : task.priority;
    const newDueDate = due_date !== undefined ? due_date : task.due_date;
    const newAssignedTo = assigned_to !== undefined ? (assigned_to ? Number(assigned_to) : null) : task.assigned_to;

    await execute(
      `UPDATE tasks 
       SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, assigned_to = ?
       WHERE id = ?`,
      [newTitle, newDescription, newStatus, newPriority, newDueDate, newAssignedTo, id]
    );

    await logAuditEvent(userId, 'TASK_UPDATE', `Updated task ${id} (${newTitle})`, req.ip);

    const updatedTask = await getOne(
      `SELECT t.*, u.full_name as assignee_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = ?`,
      [id]
    );

    return res.json({ success: true, message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error('[TASK UPDATE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update task.' });
  }
}

// Delete task (Admin and Manager only)
async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    if (req.user.role === 'USER') {
      return res.status(403).json({ success: false, error: 'Forbidden: Regular users cannot delete tasks.' });
    }

    const task = await getOne('SELECT id, title FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    await execute('DELETE FROM tasks WHERE id = ?', [id]);
    await logAuditEvent(req.user.id, 'TASK_DELETE', `Deleted task ${id} (${task.title})`, req.ip);

    return res.json({ success: true, message: `Task '${task.title}' deleted successfully.` });
  } catch (err) {
    console.error('[TASK DELETE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to delete task.' });
  }
}

// Role-tailored Dashboard Metrics matching the screenshot
async function getDashboardStats(req, res) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'ADMIN') {
      // 1. Total Users
      const usersCountRow = await getOne('SELECT COUNT(*) as count FROM users');
      // 2. Tasks stats
      const totalTasksRow = await getOne('SELECT COUNT(*) as count FROM tasks');
      const completedTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'");
      const pendingTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'");
      const inProgressTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'IN_PROGRESS'");
      const overdueTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'OVERDUE'");

      // Recent tasks
      const recentTasks = await query(
        `SELECT t.id, t.title, t.status, t.due_date, t.priority, u.full_name as assigned_to
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         ORDER BY t.created_at DESC
         LIMIT 6`
      );

      return res.json({
        success: true,
        stats: {
          totalUsers: usersCountRow.count,
          totalTasks: totalTasksRow.count,
          completed: completedTasksRow.count,
          pending: pendingTasksRow.count,
          inProgress: inProgressTasksRow.count,
          overdue: overdueTasksRow.count
        },
        recentTasks
      });
    } else if (userRole === 'MANAGER') {
      // My Team count
      const teamCountRow = await getOne("SELECT COUNT(*) as count FROM users WHERE role = 'USER' AND status = 'ACTIVE'");
      // Team tasks stats
      const totalTasksRow = await getOne('SELECT COUNT(*) as count FROM tasks');
      const completedTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'");
      const pendingTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'");
      const inProgressTasksRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'IN_PROGRESS'");

      const recentTasks = await query(
        `SELECT t.id, t.title, t.status, t.due_date, t.priority, u.full_name as assigned_to
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.assigned_to IN (SELECT id FROM users WHERE role = 'USER') OR t.created_by = ?
         ORDER BY t.created_at DESC
         LIMIT 6`,
        [userId]
      );

      return res.json({
        success: true,
        stats: {
          myTeam: teamCountRow.count,
          totalTasks: totalTasksRow.count,
          completed: completedTasksRow.count,
          pending: pendingTasksRow.count,
          inProgress: inProgressTasksRow.count
        },
        recentTasks
      });
    } else {
      // User Flow
      const pendingRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'PENDING'", [userId]);
      const inProgressRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'IN_PROGRESS'", [userId]);
      const completedRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'COMPLETED'", [userId]);

      const recentTasks = await query(
        `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date
         FROM tasks t
         WHERE t.assigned_to = ?
         ORDER BY t.created_at DESC
         LIMIT 6`,
        [userId]
      );

      return res.json({
        success: true,
        stats: {
          pending: pendingRow.count,
          inProgress: inProgressRow.count,
          completed: completedRow.count
        },
        recentTasks
      });
    }
  } catch (err) {
    console.error('[TASK DASHBOARD_STATS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard metrics.' });
  }
}

// Task Reports chart data
async function getReportsData(req, res) {
  try {
    // 1. Status breakdown
    const pendingRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'");
    const inProgressRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'IN_PROGRESS'");
    const completedRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'");
    const overdueRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'OVERDUE'");

    // 2. Priority breakdown
    const lowRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE priority = 'LOW'");
    const mediumRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE priority = 'MEDIUM'");
    const highRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE priority = 'HIGH'");
    const urgentRow = await getOne("SELECT COUNT(*) as count FROM tasks WHERE priority = 'URGENT'");

    // 3. Team Member completion ranking
    const memberRankings = await query(`
      SELECT u.id, u.full_name, u.title,
             COUNT(t.id) as total_tasks,
             SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks,
             SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) as pending_tasks,
             SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.role = 'USER'
      GROUP BY u.id, u.full_name, u.title
      ORDER BY completed_tasks DESC
    `);

    return res.json({
      success: true,
      statusBreakdown: {
        pending: pendingRow.count,
        inProgress: inProgressRow.count,
        completed: completedRow.count,
        overdue: overdueRow.count
      },
      priorityBreakdown: {
        low: lowRow.count,
        medium: mediumRow.count,
        high: highRow.count,
        urgent: urgentRow.count
      },
      memberRankings
    });
  } catch (err) {
    console.error('[TASK REPORTS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to generate task reports.' });
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getDashboardStats,
  getReportsData
};
