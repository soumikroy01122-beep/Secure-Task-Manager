const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All task routes require authentication
router.use(authenticateToken);

// Role-tailored Dashboard Statistics
router.get('/stats', taskController.getDashboardStats);

// Reports breakdown (Admin & Manager)
router.get('/reports', authorizeRoles('ADMIN', 'MANAGER'), taskController.getReportsData);

// Task CRUD
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);

// Creation allowed for Admin and Manager
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), taskController.createTask);

// Update allowed (Admin, Manager, or User updating status)
router.put('/:id', taskController.updateTask);

// Delete allowed for Admin and Manager only
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), taskController.deleteTask);

module.exports = router;
