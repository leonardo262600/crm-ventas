const db = require('../config/db');
const { ensureCalendarSchema, availableClosers } = require('../services/closerCalendar.service');

const available = async (req, res) => {
  try {
    await ensureCalendarSchema(db);
    const result = await availableClosers(db, req.user.tenant_id, req.query.start_at);
    res.json({ start_at:result.slot.startAt, end_at:result.slot.endAt, blocked_until:result.slot.blockEndAt, closers:result.closers });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message:error.message });
  }
};

const listClosers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id,name,email,role FROM users
        WHERE tenant_id=? AND active=1 AND deleted_at IS NULL
          AND role IN ('admin','gerente','vendedor') ORDER BY name`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ message:error.message }); }
};

const listBookings = async (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || '')) ? req.query.from : new Date().toISOString().slice(0, 10);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || '')) ? req.query.to : from;
  try {
    await ensureCalendarSchema(db);
    let restriction = '';
    const params = [req.user.tenant_id, from, to];
    if (req.user.role === 'setter') { restriction = ' AND b.setter_id=?'; params.push(req.user.id); }
    else if (req.user.role === 'vendedor') { restriction = ' AND b.closer_id=?'; params.push(req.user.id); }
    const [rows] = await db.query(
      `SELECT b.*,o.title,o.demo_status,c.name AS contact_name,c.company,c.phone,c.email,c.postal_code,c.address,
              closer.name AS closer_name,setter.name AS setter_name
         FROM demo_bookings b
         JOIN opportunities o ON o.id=b.opportunity_id AND o.tenant_id=b.tenant_id
         LEFT JOIN contacts c ON c.id=o.contact_id
         JOIN users closer ON closer.id=b.closer_id
         LEFT JOIN users setter ON setter.id=b.setter_id
        WHERE b.tenant_id=? AND DATE(b.start_at) BETWEEN ? AND ?${restriction}
        ORDER BY b.start_at,closer.name`,
      params
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ message:error.message }); }
};

const updateCorporateStatus = async (req, res) => {
  const status = String(req.body.status || '');
  if (!['pendiente','registrada'].includes(status)) return res.status(400).json({ message:'Estado no válido' });
  try {
    await ensureCalendarSchema(db);
    let restriction = '';
    const params = [status, status === 'registrada' ? new Date() : null, req.params.id, req.user.tenant_id];
    if (req.user.role === 'vendedor') { restriction = ' AND closer_id=?'; params.push(req.user.id); }
    const [result] = await db.query(
      `UPDATE demo_bookings SET corporate_status=?,corporate_synced_at=? WHERE id=? AND tenant_id=?${restriction}`,
      params
    );
    if (!result.affectedRows) return res.status(404).json({ message:'Reserva no encontrada' });
    res.json({ message:status === 'registrada' ? 'Marcada como añadida a RealAdvisor' : 'Devuelta a pendientes' });
  } catch (error) { res.status(500).json({ message:error.message }); }
};

const getAvailability = async (req, res) => {
  const closerId = req.user.role === 'vendedor' ? req.user.id : Number(req.query.closer_id || req.user.id);
  try {
    await ensureCalendarSchema(db);
    const [rows] = await db.query('SELECT weekday,start_time,end_time,active FROM closer_availability WHERE tenant_id=? AND closer_id=? ORDER BY weekday,start_time', [req.user.tenant_id, closerId]);
    res.json({ closer_id:closerId, configured:rows.length > 0, slots:rows });
  } catch (error) { res.status(500).json({ message:error.message }); }
};

const saveAvailability = async (req, res) => {
  const closerId = req.user.role === 'vendedor' ? req.user.id : Number(req.body.closer_id || req.user.id);
  const slots = Array.isArray(req.body.slots) ? req.body.slots : [];
  if (slots.some(slot => !Number.isInteger(Number(slot.weekday)) || Number(slot.weekday) < 0 || Number(slot.weekday) > 6 || !/^\d{2}:\d{2}/.test(slot.start_time) || !/^\d{2}:\d{2}/.test(slot.end_time))) {
    return res.status(400).json({ message:'Disponibilidad no válida' });
  }
  const connection = await db.getConnection();
  try {
    await ensureCalendarSchema(connection);
    await connection.beginTransaction();
    await connection.query('DELETE FROM closer_availability WHERE tenant_id=? AND closer_id=?', [req.user.tenant_id, closerId]);
    for (const slot of slots) await connection.query(
      'INSERT INTO closer_availability (tenant_id,closer_id,weekday,start_time,end_time,active) VALUES (?,?,?,?,?,1)',
      [req.user.tenant_id, closerId, Number(slot.weekday), slot.start_time, slot.end_time]
    );
    await connection.commit();
    res.json({ message:'Disponibilidad guardada' });
  } catch (error) { await connection.rollback(); res.status(500).json({ message:error.message }); }
  finally { connection.release(); }
};

module.exports = { available, listClosers, listBookings, updateCorporateStatus, getAvailability, saveAvailability };
