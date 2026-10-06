const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isConnected = false;
let activeDbType = 'mysql';

// Fallback in-memory store for instant zero-downtime evaluation if MySQL password is pending
const memStore = {
  roles: [],
  teams: [],
  users: [],
  tasks: [],
  audit_logs: [],
  nextId: { roles: 1, teams: 1, users: 1, tasks: 1, audit_logs: 1 }
};

async function initDbConnection() {
  if (pool && isConnected) return 'mysql';

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'secure_task_manager';

  console.log(`[DB] Attempting connection to MySQL server at ${host}:${port} as '${user}'...`);

  try {
    // Connect to MySQL server
    const tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 3000
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // Create pool for the database
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      dateStrings: true
    });

    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    isConnected = true;
    activeDbType = 'mysql';
    console.log(`[DB] ✅ Connected to MySQL 8.0 database: ${dbName}`);
    return 'mysql';
  } catch (err) {
    activeDbType = 'memory_fallback';
    console.warn(`\n=================================================================`);
    console.warn(`[DB NOTICE] MySQL connection notice: ${err.message}`);
    console.warn(`[DB ACTION] To connect to your local MySQL80 service:`);
    console.warn(`            1. Open backend/.env`);
    console.warn(`            2. Set: DB_PASSWORD=your_mysql_password`);
    console.warn(`            3. Run: npm run db:init`);
    console.warn(`[DB READY]  In-memory store activated so the app and UI run immediately!`);
    console.warn(`=================================================================\n`);
    return 'memory_fallback';
  }
}

// Memory Query Handler (Fallback if MySQL password pending)
function handleMemoryQuery(sql, params) {
  const cleanSql = sql.trim();

  // 1. Roles table
  if (/^INSERT INTO roles/i.test(cleanSql)) {
    const id = memStore.nextId.roles++;
    memStore.roles.push({ id, name: params[0], description: params[1] });
    return { insertId: id, affectedRows: 1 };
  }
  if (/^SELECT id FROM roles WHERE name =/i.test(cleanSql)) {
    return memStore.roles.filter(r => r.name === params[0]);
  }

  // 2. Teams table
  if (/^INSERT INTO teams/i.test(cleanSql)) {
    const id = memStore.nextId.teams++;
    memStore.teams.push({ id, name: params[0], created_at: new Date().toISOString() });
    return { insertId: id, affectedRows: 1 };
  }
  if (/^SELECT id FROM teams WHERE name =/i.test(cleanSql)) {
    return memStore.teams.filter(t => t.name === params[0]);
  }
  if (/^SELECT id FROM teams LIMIT/i.test(cleanSql)) {
    return memStore.teams.slice(0, 1);
  }

  // 3. Users table
  if (/^INSERT INTO users/i.test(cleanSql)) {
    const id = memStore.nextId.users++;
    const [username, email, password_hash, full_name, role, status, title, team_id] = params;
    const newUser = {
      id,
      username,
      email,
      password_hash,
      full_name,
      role: role || 'USER',
      status: status || 'ACTIVE',
      title: title || 'Team Member',
      team_id: team_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memStore.users.push(newUser);
    return { insertId: id, affectedRows: 1 };
  }
  if (/^SELECT id, username, email FROM users WHERE username = \? OR email = \?/i.test(cleanSql)) {
    return memStore.users.filter(u => u.username === params[0] || u.email === params[1]);
  }
  if (/^SELECT id FROM users WHERE username = \? OR email = \?/i.test(cleanSql)) {
    return memStore.users.filter(u => u.username === params[0] || u.email === params[1]);
  }
  if (/^SELECT id FROM users WHERE email = \? AND id != \?/i.test(cleanSql)) {
    return memStore.users.filter(u => u.email === params[0] && u.id !== Number(params[1]));
  }
  if (/WHERE LOWER\(username\) = \? OR LOWER\(email\) = \?/i.test(cleanSql)) {
    return memStore.users.filter(u => u.username.toLowerCase() === params[0] || u.email.toLowerCase() === params[1]);
  }
  if (/FROM users/i.test(cleanSql) && /WHERE (u\.)?id = \?/i.test(cleanSql)) {
    const user = memStore.users.find(u => u.id === Number(params[0]));
    return user ? [user] : [];
  }
  if (/^SELECT id, username FROM users$/i.test(cleanSql)) {
    return memStore.users.map(u => ({ id: u.id, username: u.username }));
  }
  if (/COUNT\(\*\) as count FROM users WHERE role = 'USER'/i.test(cleanSql)) {
    return [{ count: memStore.users.filter(u => u.role === 'USER' && u.status === 'ACTIVE').length }];
  }
  if (/COUNT\(\*\) as count FROM users/i.test(cleanSql)) {
    return [{ count: memStore.users.length }];
  }
  if (/SELECT u\.id, u\.username, u\.email.*FROM users u/is.test(cleanSql)) {
    return memStore.users.map(u => ({
      ...u,
      team_name: 'Core Engineering',
      task_count: memStore.tasks.filter(t => t.assigned_to === u.id).length,
      completed_count: memStore.tasks.filter(t => t.assigned_to === u.id && t.status === 'COMPLETED').length,
      active_count: memStore.tasks.filter(t => t.assigned_to === u.id && t.status !== 'COMPLETED').length
    }));
  }
  if (/^UPDATE users SET full_name = \?, email = \?, role = \?, status = \?, title = \?, password_hash = \? WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[6]);
    const u = memStore.users.find(x => x.id === id);
    if (u) {
      u.full_name = params[0];
      u.email = params[1];
      u.role = params[2];
      u.status = params[3];
      u.title = params[4];
      u.password_hash = params[5];
      u.updated_at = new Date().toISOString();
    }
    return { affectedRows: u ? 1 : 0 };
  }
  if (/^UPDATE users SET full_name = \?, email = \?, title = \?, password_hash = \? WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[4]);
    const u = memStore.users.find(x => x.id === id);
    if (u) {
      u.full_name = params[0];
      u.email = params[1];
      u.title = params[2];
      u.password_hash = params[3];
      u.updated_at = new Date().toISOString();
    }
    return { affectedRows: u ? 1 : 0 };
  }
  if (/^DELETE FROM users WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[0]);
    const idx = memStore.users.findIndex(x => x.id === id);
    if (idx !== -1) memStore.users.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  // 4. Tasks table
  if (/^INSERT INTO tasks/i.test(cleanSql)) {
    const id = memStore.nextId.tasks++;
    const [title, description, status, priority, due_date, assigned_to, created_by, team_id] = params;
    const newTask = {
      id,
      title,
      description,
      status: status || 'PENDING',
      priority: priority || 'MEDIUM',
      due_date: due_date || null,
      assigned_to: assigned_to ? Number(assigned_to) : null,
      created_by: Number(created_by),
      team_id: team_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memStore.tasks.push(newTask);
    return { insertId: id, affectedRows: 1 };
  }
  if (/SELECT id FROM tasks WHERE title = \?/i.test(cleanSql)) {
    return memStore.tasks.filter(t => t.title === params[0]);
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE status = 'COMPLETED'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.status === 'COMPLETED').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE status = 'PENDING'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.status === 'PENDING').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE status = 'IN_PROGRESS'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.status === 'IN_PROGRESS').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE status = 'OVERDUE'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.status === 'OVERDUE').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE assigned_to = \? AND status = 'PENDING'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.assigned_to === Number(params[0]) && t.status === 'PENDING').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE assigned_to = \? AND status = 'IN_PROGRESS'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.assigned_to === Number(params[0]) && t.status === 'IN_PROGRESS').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE assigned_to = \? AND status = 'COMPLETED'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.assigned_to === Number(params[0]) && t.status === 'COMPLETED').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE priority = 'LOW'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.priority === 'LOW').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE priority = 'MEDIUM'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.priority === 'MEDIUM').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE priority = 'HIGH'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.priority === 'HIGH').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks WHERE priority = 'URGENT'/i.test(cleanSql)) {
    return [{ count: memStore.tasks.filter(t => t.priority === 'URGENT').length }];
  }
  if (/COUNT\(\*\) as count FROM tasks/i.test(cleanSql)) {
    return [{ count: memStore.tasks.length }];
  }
  if (/FROM tasks t .* WHERE t\.id = \?/is.test(cleanSql) || /^SELECT \* FROM tasks WHERE id = \?/i.test(cleanSql)) {
    const task = memStore.tasks.find(t => t.id === Number(params[0]));
    if (!task) return [];
    const assignee = memStore.users.find(u => u.id === task.assigned_to);
    return [{
      ...task,
      assignee_name: assignee ? assignee.full_name : null,
      assignee_username: assignee ? assignee.username : null
    }];
  }
  if (/SELECT t\.\*.*FROM tasks t/is.test(cleanSql) || /SELECT t\.id, t\.title.*FROM tasks t/is.test(cleanSql)) {
    let result = memStore.tasks.map(t => {
      const assignee = memStore.users.find(u => u.id === t.assigned_to);
      return {
        ...t,
        assignee_name: assignee ? assignee.full_name : null,
        assigned_to_name: assignee ? assignee.full_name : null
      };
    });

    // Check if filtered by assigned_to
    if (params.length > 0 && /t\.assigned_to = \?/.test(cleanSql)) {
      result = result.filter(t => t.assigned_to === Number(params[0]));
    }
    return result;
  }
  if (/^UPDATE tasks SET status = \? WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[1]);
    const t = memStore.tasks.find(x => x.id === id);
    if (t) {
      t.status = params[0];
      t.updated_at = new Date().toISOString();
    }
    return { affectedRows: t ? 1 : 0 };
  }
  if (/^UPDATE tasks SET title = \?, description = \?, status = \?, priority = \?, due_date = \?, assigned_to = \? WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[6]);
    const t = memStore.tasks.find(x => x.id === id);
    if (t) {
      t.title = params[0];
      t.description = params[1];
      t.status = params[2];
      t.priority = params[3];
      t.due_date = params[4];
      t.assigned_to = params[5] ? Number(params[5]) : null;
      t.updated_at = new Date().toISOString();
    }
    return { affectedRows: t ? 1 : 0 };
  }
  if (/^DELETE FROM tasks WHERE id = \?/i.test(cleanSql)) {
    const id = Number(params[0]);
    const idx = memStore.tasks.findIndex(x => x.id === id);
    if (idx !== -1) memStore.tasks.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  // 5. Audit logs
  if (/^INSERT INTO audit_logs/i.test(cleanSql)) {
    const id = memStore.nextId.audit_logs++;
    memStore.audit_logs.push({
      id,
      user_id: params[0],
      action: params[1],
      details: params[2],
      ip_address: params[3],
      created_at: new Date().toISOString()
    });
    return { insertId: id, affectedRows: 1 };
  }
  if (/SELECT id FROM audit_logs/i.test(cleanSql)) {
    return memStore.audit_logs.slice(0, 1);
  }

  // Fallback
  return [];
}

async function query(sql, params = []) {
  if (!isConnected && activeDbType === 'mysql') {
    await initDbConnection();
  }

  if (activeDbType === 'mysql' && pool) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else {
    return handleMemoryQuery(sql, params);
  }
}

async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

async function execute(sql, params = []) {
  return query(sql, params);
}

function getActiveDbType() {
  return isConnected ? 'mysql' : 'memory_fallback';
}

module.exports = {
  initDbConnection,
  query,
  getOne,
  execute,
  getActiveDbType
};
