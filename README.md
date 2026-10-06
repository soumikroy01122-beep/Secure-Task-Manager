# 🛡️ Secure Task Manager (JWT + RBAC + MySQL)

A production-grade, highly secure Task Management Web Application built with **Node.js, Express, React, Tailwind CSS**, and a **MySQL Relational Database**.

Designed strictly according to the **Page Flow & RBAC Architecture**:
- 👑 **Admin Flow (Full Access)**: System dashboard, user management (CRUD & role assignments), global task management, organizational reports & metrics.
- 👥 **Manager Flow (Team Access)**: Manager dashboard, team task delegation, team member directory, workload distribution analytics.
- 👤 **User Flow (Own Tasks)**: Individual task board, detailed task drawer, and self status updates (`Pending` ➔ `In Progress` ➔ `Completed`).

---

## 🔒 Security Architecture Highlights

- **JWT Authentication**: High-entropy cryptographically signed JSON Web Tokens (`HMAC-SHA256`) with automatic session verification.
- **Role-Based Access Control (RBAC)**: Enforced both on the client UI and the server middleware. Users cannot escalate privileges or access unauthorized endpoints.
- **Object-Level Authorization**: Non-admin users are strictly isolated to their own tasks; attempts to access or modify other users' tasks are rejected with `403 Forbidden`.
- **Password Protection**: Passwords securely hashed with `bcryptjs` (salt factor 10).
- **SQL Injection Prevention**: 100% prepared and parameterized queries with `mysql2/promise`.
- **Brute-Force Rate Limiting**: Exponential throttling on sensitive authentication routes (`/api/auth/*`).
- **Security Headers**: `Helmet` configured with Content Security Policy, frameguard, and XSS filtering.
- **Audit Logging**: All critical lifecycle events (login, user creation, role changes, task deletions) are recorded with timestamps, user IDs, and client IP addresses in the `audit_logs` table.

---

## 🗄️ Relational Database Schema (MySQL)

```sql
-- 1. Roles
roles (id, name, description)

-- 2. Teams
teams (id, name, created_at)

-- 3. Users
users (id, username, email, password_hash, full_name, role, status, title, team_id, created_at, updated_at)

-- 4. Tasks
tasks (id, title, description, status, priority, due_date, assigned_to, created_by, team_id, created_at, updated_at)

-- 5. Audit Security Logs
audit_logs (id, user_id, action, details, ip_address, created_at)
```

---

## 🚀 Quick Start Guide

### 1. Configure MySQL Database Credentials
Open `backend/.env` and update `DB_PASSWORD` with your local MySQL root password:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD
DB_NAME=secure_task_manager
```

### 2. Initialize Database & Seed Sample Data
Run the database bootstrapping script:
```bash
cd backend
npm run db:init
npm run db:seed
```
*(The server also automatically creates the database, tables, and seed data upon startup!)*

### 3. Start the Servers
You can run both backend and frontend concurrently from the root directory:
```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (Port 5173)
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Pre-Configured Demo Credentials

For quick evaluation, all accounts share the password **`Password123!`**:

| Role | Username / Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@company.com` | `Password123!` | Full System Access, User Management, All Tasks, Reports |
| **👥 Manager** | `manager@company.com` | `Password123!` | Team Oversight, Team Members Directory, Task Delegation |
| **👤 User** | `alex@company.com` | `Password123!` | Personal Dashboard, My Tasks, Status Updates |
| **👤 User (QA)** | `priya@company.com` | `Password123!` | Personal Dashboard, Testing tasks |
| **👤 User (Dev)** | `rahul@company.com` | `Password123!` | Personal Dashboard, Bug fixes & API tasks |

*(You can also use the one-click instant login buttons on the Landing and Login pages!)*

---

## 📡 API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /register`: Register new user (with role selection).
- `POST /login`: Authenticate and receive JWT token.
- `GET /me`: Get current authenticated user profile.
- `PUT /profile`: Update name, email, or change password.

### User Management (`/api/users`)
- `GET /`: List all users *(Admin & Manager)*.
- `GET /team-members`: List active team members with workload metrics *(Admin & Manager)*.
- `GET /:id`: View user by ID.
- `POST /`: Create user *(Admin only)*.
- `PUT /:id`: Update user role, status, or title *(Admin only)*.
- `DELETE /:id`: Delete user *(Admin only)*.

### Tasks (`/api/tasks`)
- `GET /stats`: Retrieve role-specific dashboard metrics.
- `GET /reports`: Visual task reports breakdown *(Admin & Manager)*.
- `GET /`: Fetch tasks scoped by user role.
- `GET /:id`: Get task by ID (access verified).
- `POST /`: Create and assign task *(Admin & Manager)*.
- `PUT /:id`: Update task (Admin/Manager: full; User: status only).
- `DELETE /:id`: Delete task *(Admin & Manager only)*.
