import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { createDatabase } from './lib/db.js';
import { createAuthRouter, authMiddleware } from './routes/auth.js';
import { createRoomsRouter } from './routes/rooms.js';
import { registerSocketHandlers } from './sockets/index.js';

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] }
});

const db = createDatabase(process.env.DATABASE_PATH || './data/chat.db');

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', createAuthRouter(db));
app.use('/api/rooms', authMiddleware, createRoomsRouter(db));

registerSocketHandlers(io, db);

server.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});

