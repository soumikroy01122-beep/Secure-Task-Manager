const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All user routes require authentication
router.use(authenticateToken);

// Admin & Manager can list users
router.get('/', authorizeRoles('ADMIN', 'MANAGER'), userController.getAllUsers);
router.get('/team-members', authorizeRoles('ADMIN', 'MANAGER'), userController.getTeamMembers);

// Single user view (Admin or self)
router.get('/:id', userController.getUserById);

// Admin-only management endpoints
router.post('/', authorizeRoles('ADMIN'), userController.createUser);
router.put('/:id', authorizeRoles('ADMIN'), userController.updateUser);
router.delete('/:id', authorizeRoles('ADMIN'), userController.deleteUser);

module.exports = router;
