const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const db = require('../db');

const PROJECT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'];

const getProjects = (req, res) => {
  const userId = req.user.id;
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name, u.email as owner_email, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_tasks
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC
  `).all(userId);
  return res.json({ projects });
};

const getProject = (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND due_date < date('now') AND status != 'done') as overdue_count
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(userId, projectId);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at ASC
  `).all(projectId);

  return res.json({ project, members });
};

const createProject = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, due_date, color } = req.body;
  const projectId = uuidv4();
  const memberId = uuidv4();
  const finalColor = color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

  const insertProject = db.transaction(() => {
    db.prepare('INSERT INTO projects (id, name, description, color, owner_id, due_date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(projectId, name.trim(), description || null, finalColor, req.user.id, due_date || null);
    db.prepare("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'admin')")
      .run(memberId, projectId, req.user.id);
    db.prepare("INSERT INTO activity_logs (id, user_id, project_id, action, details) VALUES (?, ?, ?, 'project_created', ?)")
      .run(uuidv4(), req.user.id, projectId, JSON.stringify({ name }));
  });

  insertProject();

  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role, 1 as member_count, 0 as task_count, 0 as completed_tasks
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.user.id, projectId);

  return res.status(201).json({ project });
};

const updateProject = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { name, description, status, color, due_date } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  db.prepare("UPDATE projects SET name = ?, description = ?, status = ?, color = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name || existing.name, description !== undefined ? description : existing.description,
      status || existing.status, color || existing.color, due_date !== undefined ? due_date : existing.due_date, projectId);

  const updated = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_tasks
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.user.id, projectId);

  return res.json({ project: updated });
};

const deleteProject = (req, res) => {
  const { projectId } = req.params;
  // Delete in order due to foreign keys
  db.prepare('DELETE FROM activity_logs WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(projectId);
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  return res.json({ message: 'Project deleted successfully' });
};

const addMember = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { email, role = 'member' } = req.body;

  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found with this email' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  const memberId = uuidv4();
  db.prepare('INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, ?)').run(memberId, projectId, user.id, role);

  const member = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ? AND pm.user_id = ?
  `).get(projectId, user.id);

  return res.status(201).json({ member });
};

const updateMemberRole = (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Role must be admin or member' });

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
  if (project.owner_id === userId && role !== 'admin') return res.status(400).json({ error: 'Cannot demote the project owner' });

  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, projectId, userId);
  return res.json({ message: 'Role updated' });
};

const removeMember = (req, res) => {
  const { projectId, userId } = req.params;
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
  if (project.owner_id === userId) return res.status(400).json({ error: 'Cannot remove the project owner' });

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  return res.json({ message: 'Member removed' });
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, updateMemberRole, removeMember };
