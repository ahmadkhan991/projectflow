const db = require("./index");
const statements = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, avatar_color TEXT NOT NULL DEFAULT '#6366f1', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active', color TEXT NOT NULL DEFAULT '#6366f1', owner_id TEXT NOT NULL, due_date TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (owner_id) REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS project_members (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', joined_at TEXT DEFAULT (datetime('now')), UNIQUE(project_id, user_id), FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (user_id) REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium', project_id TEXT NOT NULL, assignee_id TEXT, reporter_id TEXT NOT NULL, due_date TEXT, estimated_hours REAL, tags TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (reporter_id) REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (task_id) REFERENCES tasks(id), FOREIGN KEY (user_id) REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, task_id TEXT, action TEXT NOT NULL, details TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id)",
  "CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)"
];
for (const sql of statements) { db.exec(sql); }
console.log("Migration complete");
module.exports = db;
