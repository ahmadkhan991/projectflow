const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const db = require('../db');
const { generateToken } = require('../middleware/auth');

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'
];

const signup = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = bcrypt.hashSync(password, 12);
  const userId = uuidv4();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  db.prepare('INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)')
    .run(userId, name.trim(), email.toLowerCase(), passwordHash, avatarColor);

  const token = generateToken(userId);
  const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(userId);
  return res.status(201).json({ token, user });
};

const login = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = generateToken(user.id);
  const { password_hash, ...safeUser } = user;
  return res.json({ token, user: safeUser });
};

const getMe = (req, res) => res.json({ user: req.user });

const updateProfile = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name } = req.body;
  db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name.trim(), req.user.id);

  const updated = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: updated });
};

module.exports = { signup, login, getMe, updateProfile };
