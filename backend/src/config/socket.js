const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { canAccessRoom, roomParticipants } = require('../controllers/chat.controller');
const { sendPushToUser } = require('../controllers/notifications.controller');

let io;

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
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autorizado'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Join tenant room
    socket.join(`tenant_${user.tenant_id}`);
    socket.join(`user_${user.tenant_id}_${user.id}`);

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
      io.to(`tenant_${user.tenant_id}`).emit('user_offline', { user_id: user.id });
    });
  });

  return io;
};

const getIo = () => io;
module.exports = { initSocket, getIo };
