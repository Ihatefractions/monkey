import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const ONE_DAY_SECONDS = 24 * 60 * 60;

export function createAuthRouter(db) {
  const router = express.Router();

  router.post('/signup', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const trimmedUsername = String(username).trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 32) {
      return res.status(400).json({ error: 'username must be 3-32 chars' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 chars' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    try {
      const now = Date.now();
      const info = db.prepare(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
      ).run(trimmedUsername, passwordHash, now);
      const user = { id: info.lastInsertRowid, username: trimmedUsername };
      const token = createJwt(user);
      res.json({ token, user });
    } catch (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return res.status(409).json({ error: 'username already taken' });
      }
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
    if (!row) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const user = { id: row.id, username: row.username };
    const token = createJwt(user);
    res.json({ token, user });
  });

  router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function createJwt(user) {
  const payload = { sub: user.id, username: user.username };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ONE_DAY_SECONDS });
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set');
  }
  return secret;
}

