const db = require('../config/db');
const { runAutomations } = require('../services/automations.service');

const list = async (req, res) => {
  const { status, type, contact_id, opportunity_id, from, to } = req.query;
  let sql = `SELECT a.*, u.name as assigned_name, c.name as contact_name, o.title as opp_title
             FROM activities a
             LEFT JOIN users u ON a.assigned_to = u.id
             LEFT JOIN contacts c ON a.contact_id = c.id
             LEFT JOIN opportunities o ON a.opportunity_id = o.id
             WHERE a.tenant_id = ?`;
  const params = [req.user.tenant_id];
  if (status)       { sql += ' AND a.status = ?'; params.push(status); }
  if (type)         { sql += ' AND a.type = ?'; params.push(type); }
  if (contact_id)   { sql += ' AND a.contact_id = ?'; params.push(contact_id); }
  if (opportunity_id){ sql += ' AND a.opportunity_id = ?'; params.push(opportunity_id); }
  if (from)         { sql += ' AND a.scheduled_at >= ?'; params.push(from); }
  if (to)           { sql += ' AND a.scheduled_at <= ?'; params.push(to); }
  sql += ' ORDER BY a.scheduled_at ASC';
  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  const { title, type, description, outcome, contacted, scheduled_at, due_at, contact_id, opportunity_id, assigned_to, next_action, next_action_type, next_action_at } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO activities (tenant_id, title, type, description, outcome, contacted, scheduled_at, due_at, contact_id, opportunity_id, assigned_to, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.tenant_id, title, type || 'tarea', description, outcome || null,
       contacted === '' || contacted === undefined ? null : Boolean(contacted), scheduled_at || null,
       due_at || null, contact_id || null, opportunity_id || null, assigned_to || req.user.id, req.user.id]
    );
    if (opportunity_id) {
      await db.query(
        `UPDATE opportunities SET last_interaction_at=COALESCE(?,NOW()), last_interaction_channel=?,
         followup_attempts=followup_attempts+1,
         next_action=COALESCE(?,next_action), next_action_type=COALESCE(?,next_action_type),
         next_action_at=COALESCE(?,next_action_at)
         WHERE id=? AND tenant_id=?`,
        [scheduled_at || null, type || 'tarea', next_action || null, next_action_type || null,
         next_action_at || null, opportunity_id, req.user.tenant_id]
      );
    }
    res.status(201).json({ id: result.insertId, title });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const { title, type, description, scheduled_at, due_at, status, contact_id, opportunity_id, assigned_to } = req.body;
  try {
    await db.query(
      `UPDATE activities SET title=?,type=?,description=?,scheduled_at=?,due_at=?,status=?,
       contact_id=?,opportunity_id=?,assigned_to=? WHERE id=? AND tenant_id=?`,
      [title, type, description, scheduled_at || null, due_at || null, status || 'pendiente',
       contact_id || null, opportunity_id || null, assigned_to || null, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Actividad actualizada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const complete = async (req, res) => {
  try {
    await db.query("UPDATE activities SET status='completada' WHERE id=? AND tenant_id=?",
      [req.params.id, req.user.tenant_id]);

    // Disparar automatización activity_due con datos completos de la actividad
    const [rows] = await db.query(
      `SELECT a.*, c.name as contact_name, o.title as opp_title
       FROM activities a
       LEFT JOIN contacts c ON a.contact_id = c.id
       LEFT JOIN opportunities o ON a.opportunity_id = o.id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length) {
      runAutomations('activity_due', {
        tenant_id: req.user.tenant_id,
        user_id: req.user.id,
        record: rows[0],
      });
    }

    res.json({ message: 'Actividad completada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const followups = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.id, o.title, o.contact_id, o.zone, o.temperature, o.next_action, o.next_action_type,
              o.next_action_at, o.last_interaction_at, o.followup_attempts, o.objection_type,
              ps.name AS stage_name, ps.color AS stage_color,
              c.name AS contact_name, c.company, c.phone, c.email,
              TIMESTAMPDIFF(DAY, COALESCE(o.last_interaction_at,o.created_at), NOW()) AS days_without_contact,
              CASE
                WHEN o.next_action_at IS NULL THEN 'sin_fecha'
                WHEN o.next_action_at < NOW() THEN 'vencido'
                WHEN DATE(o.next_action_at) = CURDATE() THEN 'hoy'
                WHEN o.next_action_at <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 'proximo'
                ELSE 'futuro'
              END AS followup_status
       FROM opportunities o
       LEFT JOIN contacts c ON o.contact_id=c.id
       LEFT JOIN pipeline_stages ps ON o.stage_id=ps.id
       WHERE o.tenant_id=? AND o.status='open'
       ORDER BY
         CASE WHEN o.next_action_at < NOW() THEN 0
              WHEN DATE(o.next_action_at)=CURDATE() THEN 1
              WHEN o.next_action_at IS NULL THEN 3 ELSE 2 END,
         CASE o.temperature WHEN 'caliente' THEN 0 WHEN 'templada' THEN 1 ELSE 2 END,
         o.next_action_at ASC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM activities WHERE id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]);
    res.json({ message: 'Actividad eliminada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { list, create, update, complete, followups, remove };
