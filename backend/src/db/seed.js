// Run migration first to ensure tables exist
require('./migrate');
const db = require('./index');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('🌱 Seeding database...');

try {
  // Clear existing data
  db.exec('DELETE FROM activity_logs');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM project_members');
  db.exec('DELETE FROM projects');
  db.exec('DELETE FROM users');

  const pw = bcrypt.hashSync('password123', 12);

  const users = [
    { id: uuidv4(), name: 'Ahmad Khan',  email: 'test@example.com',   color: '#6366f1' },
    { id: uuidv4(), name: 'Sarah Chen',    email: 'sarah@example.com',  color: '#ec4899' },
    { id: uuidv4(), name: 'Marcus Webb',   email: 'marcus@example.com', color: '#22c55e' },
    { id: uuidv4(), name: 'Priya Nair',    email: 'priya@example.com',  color: '#f97316' },
  ];

  for (const u of users) {
    db.prepare('INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, u.name, u.email, pw, u.color);
  }

  const projects = [
    { id: uuidv4(), name: 'Website Redesign',  description: 'Complete overhaul of company website with new branding', color: '#6366f1', owner: users[0].id, due: '2025-12-31' },
    { id: uuidv4(), name: 'Mobile App v2',     description: 'Second version of the mobile app with new features',     color: '#ec4899', owner: users[0].id, due: '2025-11-30' },
    { id: uuidv4(), name: 'API Infrastructure',description: 'Modernize backend and improve scalability',              color: '#22c55e', owner: users[1].id, due: '2026-01-15' },
  ];

  for (const p of projects) {
    db.prepare('INSERT INTO projects (id, name, description, color, owner_id, due_date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.id, p.name, p.description, p.color, p.owner, p.due);
  }

  const memberRows = [
    [projects[0].id, users[0].id, 'admin'],
    [projects[0].id, users[1].id, 'member'],
    [projects[0].id, users[2].id, 'member'],
    [projects[1].id, users[0].id, 'admin'],
    [projects[1].id, users[3].id, 'member'],
    [projects[2].id, users[1].id, 'admin'],
    [projects[2].id, users[0].id, 'member'],
    [projects[2].id, users[2].id, 'member'],
  ];
  for (const [pid, uid, role] of memberRows) {
    db.prepare('INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), pid, uid, role);
  }

  const tasks = [
    { pid: projects[0].id, title: 'Design homepage mockup',     status: 'done',        priority: 'high',     assignee: users[1].id, reporter: users[0].id, due: '2025-09-01', tags: '["design","figma"]' },
    { pid: projects[0].id, title: 'Implement navigation',       status: 'done',        priority: 'medium',   assignee: users[2].id, reporter: users[0].id, due: '2025-09-15', tags: '["frontend"]' },
    { pid: projects[0].id, title: 'SEO optimization audit',     status: 'in_progress', priority: 'medium',   assignee: users[0].id, reporter: users[0].id, due: '2025-10-30', tags: '["seo"]' },
    { pid: projects[0].id, title: 'Performance optimization',   status: 'in_progress', priority: 'high',     assignee: users[2].id, reporter: users[0].id, due: '2025-11-15', tags: '["performance"]' },
    { pid: projects[0].id, title: 'Content migration',          status: 'todo',        priority: 'medium',   assignee: users[1].id, reporter: users[0].id, due: '2025-12-01', tags: '["content"]' },
    { pid: projects[0].id, title: 'Cross-browser testing',      status: 'todo',        priority: 'low',      assignee: null,        reporter: users[0].id, due: null,          tags: '["qa"]' },
    { pid: projects[0].id, title: 'Accessibility audit (WCAG)', status: 'review',      priority: 'critical', assignee: users[0].id, reporter: users[1].id, due: '2025-10-20', tags: '["a11y"]' },
    { pid: projects[1].id, title: 'User auth flow',             status: 'done',        priority: 'critical', assignee: users[0].id, reporter: users[0].id, due: '2025-09-20', tags: '["auth"]' },
    { pid: projects[1].id, title: 'Push notifications',         status: 'in_progress', priority: 'high',     assignee: users[3].id, reporter: users[0].id, due: '2025-11-01', tags: '["mobile"]' },
    { pid: projects[1].id, title: 'Offline mode support',       status: 'todo',        priority: 'high',     assignee: users[0].id, reporter: users[3].id, due: '2025-12-15', tags: '["pwa"]' },
    { pid: projects[2].id, title: 'Migrate to PostgreSQL',      status: 'in_progress', priority: 'critical', assignee: users[1].id, reporter: users[1].id, due: '2025-10-15', tags: '["database"]' },
    { pid: projects[2].id, title: 'Redis caching layer',        status: 'todo',        priority: 'high',     assignee: users[2].id, reporter: users[1].id, due: '2025-11-01', tags: '["cache"]' },
    { pid: projects[2].id, title: 'API rate limiting',          status: 'done',        priority: 'high',     assignee: users[0].id, reporter: users[1].id, due: '2025-09-10', tags: '["security"]' },
    { pid: projects[2].id, title: 'Write API documentation',    status: 'review',      priority: 'medium',   assignee: users[2].id, reporter: users[0].id, due: '2025-10-31', tags: '["docs"]' },
  ];

  const taskIds = [];
  for (const t of tasks) {
    const tid = uuidv4();
    taskIds.push(tid);
    db.prepare('INSERT INTO tasks (id, title, status, priority, project_id, assignee_id, reporter_id, due_date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(tid, t.title, t.status, t.priority, t.pid, t.assignee, t.reporter, t.due, t.tags);
  }

  const commentData = [
    [taskIds[0], users[0].id, 'Looks great! Need a few tweaks on mobile.'],
    [taskIds[0], users[1].id, 'Updated the file with your feedback. Ready for review.'],
    [taskIds[2], users[0].id, 'Found 3 critical meta tag issues. Working on fixes.'],
    [taskIds[6], users[1].id, 'Color contrast ratio is failing on the hero section.'],
    [taskIds[10], users[1].id, 'Schema migration complete. Running data validation now.'],
  ];
  for (const [tid, uid, content] of commentData) {
    db.prepare('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)').run(uuidv4(), tid, uid, content);
  }

  const activities = [
    [users[0].id, projects[0].id, null,       'project_created',      JSON.stringify({ name: 'Website Redesign' })],
    [users[1].id, projects[0].id, taskIds[0], 'task_created',         JSON.stringify({ title: 'Design homepage mockup' })],
    [users[0].id, projects[0].id, taskIds[0], 'task_status_changed',  JSON.stringify({ from: 'todo', to: 'done' })],
    [users[0].id, projects[0].id, taskIds[2], 'task_status_changed',  JSON.stringify({ from: 'todo', to: 'in_progress' })],
    [users[1].id, projects[2].id, null,       'project_created',      JSON.stringify({ name: 'API Infrastructure' })],
  ];
  for (const [uid, pid, tid, action, details] of activities) {
    db.prepare('INSERT INTO activity_logs (id, user_id, project_id, task_id, action, details) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), uid, pid, tid, action, details);
  }

  console.log('✅ Seed complete!');
  console.log('📧 Login: test@example.com / password123');
  process.exit(0);
} catch (err) {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
}
