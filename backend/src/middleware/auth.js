const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'projectflow-super-secret-key-change-in-prod';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if user is admin of a project
const requireProjectAdmin = (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const userId = req.user.id;

  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required for this action' });
  }

  req.projectRole = membership.role;
  next();
};

// Check if user is a member of a project (any role)
const requireProjectMember = (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const userId = req.user.id;

  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  req.projectRole = membership.role;
  next();
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { authenticate, requireProjectAdmin, requireProjectMember, generateToken };
