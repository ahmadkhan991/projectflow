const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const db = require('../db');

const getTasks = (req, res) => {
  const { projectId } = req.params;
  const { status, assignee_id, priority, search } = req.query;

  let query = `
    SELECT t.*,
      u1.name as assignee_name, u1.email as assignee_email, u1.avatar_color as assignee_color,
      u2.name as reporter_name, u2.email as reporter_email,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comment_count
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.project_id = ?
  `;
  const params = [projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (assignee_id) { query += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (search) { query += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ` ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, t.created_at DESC`;

  const tasks = db.prepare(query).all(...params);
  const parsed = tasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') }));
  return res.json({ tasks: parsed });
};

const getTask = (req, res) => {
  const { projectId, taskId } = req.params;

  const task = db.prepare(`
    SELECT t.*,
      u1.name as assignee_name, u1.email as assignee_email, u1.avatar_color as assignee_color,
      u2.name as reporter_name, u2.email as reporter_email
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(taskId, projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(taskId);

  return res.json({ task: { ...task, tags: JSON.parse(task.tags || '[]') }, comments });
};

const createTask = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { title, description, status = 'todo', priority = 'medium', assignee_id, due_date, estimated_hours, tags = [] } = req.body;

  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const taskId = uuidv4();
  db.prepare('INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, reporter_id, due_date, estimated_hours, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(taskId, title.trim(), description || null, status, priority, projectId, assignee_id || null, req.user.id, due_date || null, estimated_hours || null, JSON.stringify(tags));

  db.prepare("INSERT INTO activity_logs (id, user_id, project_id, task_id, action, details) VALUES (?, ?, ?, ?, 'task_created', ?)")
    .run(uuidv4(), req.user.id, projectId, taskId, JSON.stringify({ title }));

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar_color as assignee_color, u2.name as reporter_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.id = ?
  `).get(taskId);

  return res.status(201).json({ task: { ...task, tags: JSON.parse(task.tags || '[]') } });
};

const updateTask = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId, taskId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.projectRole !== 'admin' && task.reporter_id !== req.user.id && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only update tasks you created or are assigned to' });
  }

  const { title, description, status, priority, assignee_id, due_date, estimated_hours, tags } = req.body;

  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const newTitle = title || task.title;
  const newDesc = description !== undefined ? description : task.description;
  const newStatus = status || task.status;
  const newPriority = priority || task.priority;
  const newAssignee = assignee_id !== undefined ? (assignee_id || null) : task.assignee_id;
  const newDue = due_date !== undefined ? (due_date || null) : task.due_date;
  const newHours = estimated_hours !== undefined ? (estimated_hours || null) : task.estimated_hours;
  const newTags = tags !== undefined ? JSON.stringify(tags) : task.tags;

  db.prepare("UPDATE tasks SET title=?, description=?, status=?, priority=?, assignee_id=?, due_date=?, estimated_hours=?, tags=?, updated_at=datetime('now') WHERE id=?")
    .run(newTitle, newDesc, newStatus, newPriority, newAssignee, newDue, newHours, newTags, taskId);

  if (status && status !== task.status) {
    db.prepare("INSERT INTO activity_logs (id, user_id, project_id, task_id, action, details) VALUES (?, ?, ?, ?, 'task_status_changed', ?)")
      .run(uuidv4(), req.user.id, projectId, taskId, JSON.stringify({ from: task.status, to: status }));
  }

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar_color as assignee_color, u2.name as reporter_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.id = ?
  `).get(taskId);

  return res.json({ task: { ...updated, tags: JSON.parse(updated.tags || '[]') } });
};

const deleteTask = (req, res) => {
  const { projectId, taskId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.projectRole !== 'admin' && task.reporter_id !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or the task creator can delete tasks' });
  }

  db.prepare('DELETE FROM comments WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return res.json({ message: 'Task deleted' });
};

const addComment = (req, res) => {
  const { projectId, taskId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content required' });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const commentId = uuidv4();
  db.prepare('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)').run(commentId, taskId, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(commentId);

  return res.status(201).json({ comment });
};

const deleteComment = (req, res) => {
  const { taskId, commentId } = req.params;
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND task_id = ?').get(commentId, taskId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.user_id !== req.user.id && req.projectRole !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own comments' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  return res.json({ message: 'Comment deleted' });
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, addComment, deleteComment };
