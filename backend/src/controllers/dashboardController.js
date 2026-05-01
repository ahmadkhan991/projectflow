const db = require('../db');

const getDashboard = (req, res) => {
  const userId = req.user.id;

  const totalProjects = db.prepare('SELECT COUNT(*) as c FROM project_members WHERE user_id = ?').get(userId).c;

  const totalTasks = db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN project_members pm ON t.project_id = pm.project_id
    WHERE pm.user_id = ? AND (t.assignee_id = ? OR t.reporter_id = ?)
  `).get(userId, userId, userId).c;

  const completedTasks = db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN project_members pm ON t.project_id = pm.project_id
    WHERE pm.user_id = ? AND (t.assignee_id = ? OR t.reporter_id = ?) AND t.status = 'done'
  `).get(userId, userId, userId).c;

  const overdueTasks = db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN project_members pm ON t.project_id = pm.project_id
    WHERE pm.user_id = ? AND (t.assignee_id = ? OR t.reporter_id = ?)
      AND t.due_date < date('now') AND t.status != 'done'
  `).get(userId, userId, userId).c;

  const stats = { total_projects: totalProjects, total_tasks: totalTasks, completed_tasks: completedTasks, overdue_tasks: overdueTasks };

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar_color as assignee_color
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
    LIMIT 10
  `).all(userId);

  const activity = db.prepare(`
    SELECT al.*, u.name as user_name, u.avatar_color,
      p.name as project_name, t.title as task_title
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    LEFT JOIN projects p ON al.project_id = p.id
    LEFT JOIN tasks t ON al.task_id = t.id
    WHERE al.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)
    ORDER BY al.created_at DESC
    LIMIT 20
  `).all(userId);

  const tasksByStatus = db.prepare(`
    SELECT t.status, COUNT(*) as count
    FROM tasks t JOIN project_members pm ON t.project_id = pm.project_id
    WHERE pm.user_id = ? GROUP BY t.status
  `).all(userId);

  const tasksByPriority = db.prepare(`
    SELECT t.priority, COUNT(*) as count
    FROM tasks t JOIN project_members pm ON t.project_id = pm.project_id
    WHERE pm.user_id = ? AND t.status != 'done' GROUP BY t.priority
  `).all(userId);

  const projects = db.prepare(`
    SELECT p.id, p.name, p.color, p.status, p.due_date, pm.role as my_role,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND due_date < date('now') AND status != 'done') as overdue
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    WHERE p.status = 'active'
    ORDER BY p.created_at DESC LIMIT 6
  `).all(userId);

  const overdueTasks2 = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar_color as assignee_color
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
    WHERE t.due_date < date('now') AND t.status != 'done'
      AND (t.assignee_id = ? OR t.reporter_id = ?)
    ORDER BY t.due_date ASC LIMIT 5
  `).all(userId, userId, userId);

  return res.json({
    stats,
    myTasks: myTasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })),
    activity: activity.map(a => ({ ...a, details: JSON.parse(a.details || '{}') })),
    tasksByStatus,
    tasksByPriority,
    projects,
    overdueTasks: overdueTasks2.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') }))
  });
};

module.exports = { getDashboard };
