const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

let deletionSchemaReady = false;
const ensureDeletionSchema = async () => {
  if (deletionSchemaReady) return;
  const [columns] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='deleted_at'`
  );
  if (!columns.length) {
    await db.query('ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL');
  }
  deletionSchemaReady = true;
};

const list = async (req, res) => {
  try {
    await ensureDeletionSchema();
    const [rows] = await db.query(
      `SELECT id, name, email, role, active, created_at
       FROM users WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?,?,?,?,?)',
      [req.user.tenant_id, name, email, hashed, role || 'vendedor']
    );
    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const { name, email, role, active } = req.body;
  try {
    await db.query(
      'UPDATE users SET name=?, email=?, role=?, active=? WHERE id=? AND tenant_id=?',
      [name, email, role, active, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Usuario actualizado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  let connection;
  try {
    await ensureDeletionSchema();
    const targetId = Number(req.params.id);
    const confirmation = String(req.body?.confirmation || '').trim();

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, name, email, role, active FROM users
       WHERE id=? AND tenant_id=? AND deleted_at IS NULL FOR UPDATE`,
      [targetId, req.user.tenant_id]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const target = rows[0];
    if (target.active) {
      await connection.rollback();
      return res.status(400).json({ message: 'Primero debes desactivar al usuario' });
    }
    if (['admin', 'gerente'].includes(target.role)) {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede eliminar un administrador o gerente' });
    }
    if (confirmation !== target.name) {
      await connection.rollback();
      return res.status(400).json({ message: `Escribe exactamente “${target.name}” para confirmar` });
    }

    const ownerId = Number(req.user.id);
    await connection.query(
      'UPDATE contacts SET assigned_to=? WHERE tenant_id=? AND assigned_to=?',
      [ownerId, req.user.tenant_id, targetId]
    );
    await connection.query(
      'UPDATE opportunities SET assigned_to=? WHERE tenant_id=? AND assigned_to=?',
      [ownerId, req.user.tenant_id, targetId]
    );
    await connection.query(
      'UPDATE activities SET assigned_to=? WHERE tenant_id=? AND assigned_to=?',
      [ownerId, req.user.tenant_id, targetId]
    );

    const room = `dm:${[ownerId, targetId].sort((a, b) => a - b).join(':')}`;
    await connection.query(
      'DELETE FROM chat_messages WHERE tenant_id=? AND (user_id=? OR room=?)',
      [req.user.tenant_id, targetId, room]
    );
    await connection.query(
      'DELETE FROM chat_reads WHERE tenant_id=? AND (user_id=? OR room=?)',
      [req.user.tenant_id, targetId, room]
    );
    await connection.query('DELETE FROM push_subscriptions WHERE user_id=?', [targetId]);

    const archivedEmail = `eliminado-${targetId}-${Date.now()}@crm.local`;
    const disabledPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    await connection.query(
      `UPDATE users
       SET active=0, email=?, password=?, deleted_at=NOW()
       WHERE id=? AND tenant_id=?`,
      [archivedEmail, disabledPassword, targetId, req.user.tenant_id]
    );
    await connection.query(
      `INSERT INTO audit_logs (tenant_id,user_id,action,details)
       VALUES (?,?,'user_deleted',?)`,
      [req.user.tenant_id, req.user.id, JSON.stringify({
        deleted_user_id: targetId,
        deleted_user_name: target.name,
        previous_email: target.email,
        reassigned_to: ownerId,
      })]
    );

    await connection.commit();
    const { getIo } = require('../config/socket');
    getIo()?.to(`user_${req.user.tenant_id}_${targetId}`).emit('account_disabled');
    res.json({
      message: `${target.name} ha sido eliminado. Su trabajo pendiente se reasignó y el histórico se conserva.`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection?.release();
  }
};

module.exports = { list, create, update, remove };
