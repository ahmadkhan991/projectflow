const express = require('express');
const { body } = require('express-validator');
const router = express.Router({ mergeParams: true });
const { authenticate, requireProjectMember } = require('../middleware/auth');
const { getTasks, getTask, createTask, updateTask, deleteTask, addComment, deleteComment } = require('../controllers/taskController');

router.use(authenticate, requireProjectMember);

router.get('/', getTasks);
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Task title required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('estimated_hours').optional().isFloat({ min: 0 }),
  body('due_date').optional().isDate(),
], createTask);

router.get('/:taskId', getTask);
router.patch('/:taskId', [
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], updateTask);
router.delete('/:taskId', deleteTask);

// Comments
router.post('/:taskId/comments', addComment);
router.delete('/:taskId/comments/:commentId', deleteComment);

module.exports = router;
