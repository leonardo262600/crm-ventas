const db = require('../config/db');

const ensureReadTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_reads (
      tenant_id INT NOT NULL,
      user_id INT NOT NULL,
      room VARCHAR(100) NOT NULL,
      last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, user_id, room),
      INDEX idx_chat_reads_user (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const directRoom = (firstId, secondId) =>
  `dm:${[Number(firstId), Number(secondId)].sort((a, b) => a - b).join(':')}`;

const roomParticipants = room => {
  const match = String(room || '').match(/^dm:(\d+):(\d+)$/);
  return match ? [Number(match[1]), Number(match[2])] : [];
};

const canAccessRoom = (room, userId) => roomParticipants(room).includes(Number(userId));

const getPeers = async (req, res) => {
  try {
    await ensureReadTable();
    const [rows] = await db.query(
      `SELECT id, name, role, avatar
       FROM users
       WHERE tenant_id=? AND active=1 AND id<>?
         AND role IN ('admin','gerente','setter')
       ORDER BY name`,
      [req.user.tenant_id, req.user.id]
    );

    // A room depends on both users, so calculate counters with one compact query.
    const [unreadRows] = await db.query(
      `SELECT cm.room, MAX(cm.created_at) AS last_message_at,
              SUM(CASE WHEN cm.user_id<>?
                        AND cm.created_at>COALESCE(cr.last_read_at,'1970-01-01')
                       THEN 1 ELSE 0 END) AS unread
       FROM chat_messages cm
       LEFT JOIN chat_reads cr
         ON cr.tenant_id=cm.tenant_id AND cr.user_id=? AND cr.room=cm.room
       WHERE cm.tenant_id=? AND cm.room LIKE ?
       GROUP BY cm.room, cr.last_read_at`,
      [req.user.id, req.user.id, req.user.tenant_id, `dm:%:${req.user.id}%`]
    );
    const stats = new Map(unreadRows.map(row => [row.room, row]));
    res.json(rows.map(peer => {
      const room = directRoom(req.user.id, peer.id);
      const roomStats = stats.get(room);
      return {
        ...peer,
        room,
        unread: Number(roomStats?.unread || 0),
        last_message_at: roomStats?.last_message_at || null,
      };
    }).sort((a, b) => b.unread - a.unread || new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getHistory = async (req, res) => {
  const { room, limit = 50 } = req.query;
  if (!canAccessRoom(room, req.user.id)) return res.status(403).json({ message: 'Conversación no autorizada' });
  try {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const [rows] = await db.query(
      `SELECT cm.*, u.name AS user_name FROM chat_messages cm
       JOIN users u ON cm.user_id=u.id
       WHERE cm.tenant_id=? AND cm.room=?
       ORDER BY cm.created_at DESC LIMIT ${safeLimit}`,
      [req.user.tenant_id, room]
    );
    res.json(rows.reverse());
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markRead = async (req, res) => {
  const { room } = req.body;
  if (!canAccessRoom(room, req.user.id)) return res.status(403).json({ message: 'Conversación no autorizada' });
  try {
    await ensureReadTable();
    await db.query(
      `INSERT INTO chat_reads (tenant_id,user_id,room,last_read_at) VALUES (?,?,?,NOW())
       ON DUPLICATE KEY UPDATE last_read_at=NOW()`,
      [req.user.tenant_id, req.user.id, room]
    );
    res.json({ message: 'Conversación leída' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const unreadCount = async (req, res) => {
  try {
    await ensureReadTable();
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM chat_messages cm
       LEFT JOIN chat_reads cr
         ON cr.tenant_id=cm.tenant_id AND cr.user_id=? AND cr.room=cm.room
       WHERE cm.tenant_id=? AND cm.user_id<>?
         AND (cm.room LIKE ? OR cm.room LIKE ?)
         AND cm.created_at>COALESCE(cr.last_read_at,'1970-01-01')`,
      [req.user.id, req.user.tenant_id, req.user.id, `dm:${req.user.id}:%`, `dm:%:${req.user.id}`]
    );
    res.json({ unread: Number(row.total || 0) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getPeers,
  getHistory,
  markRead,
  unreadCount,
  canAccessRoom,
  roomParticipants,
};
