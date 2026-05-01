const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, updateMemberRole, removeMember
} = require('../controllers/projectController');

router.get('/', authenticate, getProjects);

router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Project name required'),
  body('description').optional().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('due_date').optional().isDate(),
], createProject);

router.get('/:projectId', authenticate, requireProjectMember, getProject);

router.patch('/:projectId', authenticate, requireProjectAdmin, [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('status').optional().isIn(['active', 'archived', 'completed']),
], updateProject);

router.delete('/:projectId', authenticate, requireProjectAdmin, deleteProject);

// Member management
router.post('/:projectId/members', authenticate, requireProjectAdmin, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['admin', 'member']),
], addMember);

router.patch('/:projectId/members/:userId', authenticate, requireProjectAdmin, updateMemberRole);
router.delete('/:projectId/members/:userId', authenticate, requireProjectAdmin, removeMember);

module.exports = router;
