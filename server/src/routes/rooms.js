import express from 'express';

export function createRoomsRouter(db) {
  const router = express.Router();

  // List rooms current user belongs to
  router.get('/', (req, res) => {
    const userId = req.user.id;
    const rooms = db.prepare(`
      SELECT r.id, r.name, r.owner_id AS ownerId, r.created_at AS createdAt
      FROM rooms r
      JOIN room_members m ON m.room_id = r.id
      WHERE m.user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);
    res.json({ rooms });
  });

  // Create room
  router.post('/', (req, res) => {
    const userId = req.user.id;
    const { name } = req.body || {};
    const trimmed = String(name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'name required' });
    const now = Date.now();
    const info = db.prepare('INSERT INTO rooms (name, owner_id, created_at) VALUES (?, ?, ?)')
      .run(trimmed, userId, now);
    db.prepare('INSERT INTO room_members (room_id, user_id, role, added_at) VALUES (?, ?, ?, ?)')
      .run(info.lastInsertRowid, userId, 'owner', now);
    res.status(201).json({ id: info.lastInsertRowid, name: trimmed, ownerId: userId });
  });

  // Add member (owner only)
  router.post('/:roomId/members', (req, res) => {
    const roomId = Number(req.params.roomId);
    const requesterId = req.user.id;
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username required' });

    const room = db.prepare('SELECT id, owner_id FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (room.owner_id !== requesterId) return res.status(403).json({ error: 'only owner can add' });

    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const now = Date.now();
    try {
      db.prepare('INSERT INTO room_members (room_id, user_id, role, added_at) VALUES (?, ?, ?, ?)')
        .run(roomId, user.id, 'member', now);
    } catch (e) {
      return res.status(409).json({ error: 'already a member' });
    }
    res.status(204).end();
  });

  // Remove member (owner only)
  router.delete('/:roomId/members/:userId', (req, res) => {
    const roomId = Number(req.params.roomId);
    const targetUserId = Number(req.params.userId);
    const requesterId = req.user.id;

    const room = db.prepare('SELECT id, owner_id FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (room.owner_id !== requesterId) return res.status(403).json({ error: 'only owner can remove' });

    db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, targetUserId);
    res.status(204).end();
  });

  // Get recent messages
  router.get('/:roomId/messages', (req, res) => {
    const roomId = Number(req.params.roomId);
    const userId = req.user.id;
    const membership = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?')
      .get(roomId, userId);
    if (!membership) return res.status(403).json({ error: 'not a member' });

    const messages = db.prepare(`
      SELECT m.id, m.room_id AS roomId, m.sender_id AS senderId, m.content, m.created_at AS createdAt
      FROM messages m
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all(roomId).reverse();
    res.json({ messages });
  });

  return router;
}

