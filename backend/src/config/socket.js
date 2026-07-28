const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { canAccessRoom, roomParticipants } = require('../controllers/chat.controller');
const { sendPushToUser } = require('../controllers/notifications.controller');

let io;
const onlineConnections = new Map();

const presenceKey = (tenantId, userId) => `${tenantId}:${userId}`;
const onlineUsersForTenant = tenantId => Array.from(onlineConnections.entries())
  .filter(([key, count]) => key.startsWith(`${tenantId}:`) && count > 0)
  .map(([key]) => Number(key.split(':')[1]));

const initSocket = (httpServer, allowedOrigins = []) => {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autorizado'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.query(
        'SELECT id, tenant_id, name, email, role FROM users WHERE id=? AND tenant_id=? AND active=1 LIMIT 1',
        [decoded.id, decoded.tenant_id]
      );
      if (!rows.length) return next(new Error('Cuenta inactiva'));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userPresenceKey = presenceKey(user.tenant_id, user.id);
    onlineConnections.set(userPresenceKey, (onlineConnections.get(userPresenceKey) || 0) + 1);

    // Join tenant room
    socket.join(`tenant_${user.tenant_id}`);
    socket.join(`user_${user.tenant_id}_${user.id}`);
    socket.emit('presence_state', { online_user_ids: onlineUsersForTenant(user.tenant_id) });
    io.to(`tenant_${user.tenant_id}`).emit('user_online', { user_id: user.id });

    // Join a specific chat room
    socket.on('join_room', async (payload) => {
      const room = typeof payload === 'string' ? payload : payload?.room;
      if (!room || !canAccessRoom(room, user.id)) return;
      socket.activeChatRoom = room;
      socket.join(`chat_${user.tenant_id}_${room}`);

      // Load last 50 messages
      try {
        const [msgs] = await db.query(
          `SELECT cm.*, u.name as user_name FROM chat_messages cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.tenant_id = ? AND cm.room = ?
           ORDER BY cm.created_at DESC LIMIT 50`,
          [user.tenant_id, room]
        );
        socket.emit('room_history', msgs.reverse());
      } catch {}
    });

    // Send message
    socket.on('send_message', async ({ room, message }) => {
      if (!message?.trim() || !canAccessRoom(room, user.id)) return;
      try {
        const [result] = await db.query(
          'INSERT INTO chat_messages (tenant_id, user_id, room, message) VALUES (?,?,?,?)',
          [user.tenant_id, user.id, room || 'general', message.trim()]
        );
        const payload = {
          id: result.insertId,
          user_id: user.id,
          user_name: user.name,
          room: room || 'general',
          message: message.trim(),
          created_at: new Date().toISOString()
        };
        io.to(`chat_${user.tenant_id}_${room}`).emit('new_message', payload);
        const recipients = roomParticipants(room).filter(participantId => participantId !== Number(user.id));
        recipients.forEach(async participantId => {
          io.to(`user_${user.tenant_id}_${participantId}`).emit('chat_notification', payload);
          const recipientSockets = await io.in(`user_${user.tenant_id}_${participantId}`).fetchSockets();
          const hasConversationOpen = recipientSockets.some(recipient => recipient.activeChatRoom === room);
          if (!hasConversationOpen) {
            sendPushToUser(participantId, `Mensaje de ${user.name}`, message.trim(), { url:'/chat', tag:`chat-${room}` });
          }
        });
      } catch {}
    });

    // Typing indicator
    socket.on('typing', ({ room, isTyping }) => {
      if (!room || !canAccessRoom(room, user.id)) return;
      socket.to(`chat_${user.tenant_id}_${room}`).emit('user_typing', {
        user_name: user.name,
        isTyping: !!isTyping,
      });
    });

    socket.on('disconnect', () => {
      const remaining = Math.max((onlineConnections.get(userPresenceKey) || 1) - 1, 0);
      if (remaining) {
        onlineConnections.set(userPresenceKey, remaining);
        return;
      }
      onlineConnections.delete(userPresenceKey);
      io.to(`tenant_${user.tenant_id}`).emit('user_offline', {
        user_id: user.id,
        last_seen: new Date().toISOString(),
      });
    });
  });

  return io;
};

const getIo = () => io;
module.exports = { initSocket, getIo };
