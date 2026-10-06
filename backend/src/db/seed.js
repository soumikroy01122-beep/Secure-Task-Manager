const bcrypt = require('bcryptjs');
const { query, getOne, execute, initDbConnection } = require('./index');
const { initializeSchema } = require('./init');

async function seedDatabase() {
  await initDbConnection();
  await initializeSchema();
  console.log('[SEED] Seeding database with roles, teams, users, and tasks...');

  // 1. Roles
  const roles = [
    { name: 'ADMIN', description: 'Full system access and user management' },
    { name: 'MANAGER', description: 'Team access, task delegation, and team reports' },
    { name: 'USER', description: 'Individual access to view and update own tasks' }
  ];

  for (const role of roles) {
    const existing = await getOne('SELECT id FROM roles WHERE name = ?', [role.name]);
    if (!existing) {
      await execute('INSERT INTO roles (name, description) VALUES (?, ?)', [role.name, role.description]);
    }
  }

  // 2. Teams
  let team = await getOne('SELECT id FROM teams WHERE name = ?', ['Core Engineering']);
  if (!team) {
    const result = await execute('INSERT INTO teams (name) VALUES (?)', ['Core Engineering']);
    team = { id: result.insertId || 1 };
  }

  // 3. Demo Users
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const users = [
    {
      username: 'admin',
      email: 'admin@company.com',
      full_name: 'John Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      title: 'System Administrator',
      team_id: team.id
    },
    {
      username: 'manager',
      email: 'manager@company.com',
      full_name: 'Sarah Jenkins',
      role: 'MANAGER',
      status: 'ACTIVE',
      title: 'Engineering Manager',
      team_id: team.id
    },
    {
      username: 'alex',
      email: 'alex@company.com',
      full_name: 'Alex Rivera',
      role: 'USER',
      status: 'ACTIVE',
      title: 'Developer',
      team_id: team.id
    },
    {
      username: 'priya',
      email: 'priya@company.com',
      full_name: 'Priya Sharma',
      role: 'USER',
      status: 'ACTIVE',
      title: 'QA Tester',
      team_id: team.id
    },
    {
      username: 'rahul',
      email: 'rahul@company.com',
      full_name: 'Rahul Verma',
      role: 'USER',
      status: 'ACTIVE',
      title: 'Developer',
      team_id: team.id
    },
    {
      username: 'mike',
      email: 'mike@company.com',
      full_name: 'Mike Ross',
      role: 'USER',
      status: 'ACTIVE',
      title: 'Backend Engineer',
      team_id: team.id
    },
    {
      username: 'anna',
      email: 'anna@company.com',
      full_name: 'Anna Taylor',
      role: 'USER',
      status: 'ACTIVE',
      title: 'UI/UX Designer',
      team_id: team.id
    }
  ];

  for (const u of users) {
    const existing = await getOne('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
    if (!existing) {
      await execute(
        'INSERT INTO users (username, email, password_hash, full_name, role, status, title, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [u.username, u.email, passwordHash, u.full_name, u.role, u.status, u.title, u.team_id]
      );
    }
  }

  // Retrieve user map
  const userRows = await query('SELECT id, username FROM users');
  const userMap = {};
  userRows.forEach(u => { userMap[u.username] = u.id; });

  const adminId = userMap['admin'];
  const managerId = userMap['manager'];
  const alexId = userMap['alex'];
  const priyaId = userMap['priya'];
  const rahulId = userMap['rahul'];
  const mikeId = userMap['mike'];
  const annaId = userMap['anna'];

  // 4. Tasks (aligned with screenshot flow)
  const tasks = [
    {
      title: 'Design UI',
      description: 'Create responsive high-fidelity dashboard layouts with Tailwind CSS and role-based views.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      due_date: '2026-10-05',
      assigned_to: alexId,
      created_by: adminId,
      team_id: team.id
    },
    {
      title: 'API Development',
      description: 'Implement JWT authentication, RBAC middleware, and MySQL parameterized queries.',
      status: 'PENDING',
      priority: 'HIGH',
      due_date: '2026-10-10',
      assigned_to: rahulId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Testing',
      description: 'Execute unit and end-to-end integration tests for role permissions and token verification.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      due_date: '2026-10-01',
      assigned_to: priyaId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Documentation',
      description: 'Write comprehensive API documentation and setup guides for the Secure Task Manager.',
      status: 'PENDING',
      priority: 'LOW',
      due_date: '2026-10-12',
      assigned_to: annaId,
      created_by: adminId,
      team_id: team.id
    },
    {
      title: 'Fix Bugs',
      description: 'Resolve the reported issues in token expiration handling and responsive sidebar states.',
      status: 'PENDING',
      priority: 'HIGH',
      due_date: '2026-10-08',
      assigned_to: alexId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Prepare Presentation',
      description: 'Prepare executive architecture slide deck covering JWT & RBAC workflows.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      due_date: '2026-10-01',
      assigned_to: priyaId,
      created_by: adminId,
      team_id: team.id
    },
    {
      title: 'UI Testing',
      description: 'Cross-browser validation and accessibility testing on all dashboards.',
      status: 'PENDING',
      priority: 'HIGH',
      due_date: '2026-10-08',
      assigned_to: priyaId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Bug Fixes',
      description: 'Patch query indexing for faster task listing and resolve edge-case foreign key constraints.',
      status: 'COMPLETED',
      priority: 'URGENT',
      due_date: '2026-10-01',
      assigned_to: rahulId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Update Documentation',
      description: 'Update setup instructions with MySQL database connection details and environment options.',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      due_date: '2026-10-05',
      assigned_to: alexId,
      created_by: managerId,
      team_id: team.id
    },
    {
      title: 'Security Audit & Penetration Testing',
      description: 'Audit RBAC routes against privilege escalation and test rate limiting.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      due_date: '2026-10-14',
      assigned_to: mikeId,
      created_by: adminId,
      team_id: team.id
    }
  ];

  for (const t of tasks) {
    const existing = await getOne('SELECT id FROM tasks WHERE title = ?', [t.title]);
    if (!existing) {
      await execute(
        'INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [t.title, t.description, t.status, t.priority, t.due_date, t.assigned_to, t.created_by, t.team_id]
      );
    }
  }

  // 5. Audit Log sample
  const existingAudit = await getOne('SELECT id FROM audit_logs LIMIT 1');
  if (!existingAudit) {
    await execute(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [adminId, 'SYSTEM_INIT', 'Database schema and initial seed data established', '127.0.0.1']
    );
  }

  console.log('[SEED] Database seeded successfully!');
  console.log('---------------------------------------------------------');
  console.log('Demo Credentials (All passwords: Password123!):');
  console.log('  Admin:    admin@company.com   / Password123!');
  console.log('  Manager:  manager@company.com / Password123!');
  console.log('  User:     alex@company.com    / Password123!');
  console.log('---------------------------------------------------------');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
