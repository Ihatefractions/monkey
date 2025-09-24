import jwt from 'jsonwebtoken';

export function registerSocketHandlers(io, db) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '') || '';
      if (!token) return next(new Error('missing token'));
      const payload = jwt.verify(token, getJwtSecret());
      socket.data.user = { id: payload.sub, username: payload.username };
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;

    // Join all rooms the user is a member of
    const roomIds = db.prepare('SELECT room_id AS id FROM room_members WHERE user_id = ?').all(userId).map(r => String(r.id));
    for (const roomId of roomIds) socket.join(roomId);

    socket.on('joinRoom', ({ roomId }, cb) => {
      const membership = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
      if (!membership) return cb && cb({ error: 'not a member' });
      socket.join(String(roomId));
      cb && cb({ ok: true });
    });

    socket.on('leaveRoom', ({ roomId }, cb) => {
      socket.leave(String(roomId));
      cb && cb({ ok: true });
    });

    socket.on('message', ({ roomId, content }, cb) => {
      if (!content || !String(content).trim()) return cb && cb({ error: 'empty message' });
      const membership = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
      if (!membership) return cb && cb({ error: 'not a member' });
      const now = Date.now();
      const info = db.prepare('INSERT INTO messages (room_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)')
        .run(roomId, userId, String(content), now);
      const message = { id: info.lastInsertRowid, roomId, senderId: userId, content: String(content), createdAt: now };
      io.to(String(roomId)).emit('message', message);
      cb && cb({ ok: true, message });
    });
  });
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set');
  }
  return secret;
}

