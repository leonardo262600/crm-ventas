const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const SECTIONS = new Set(['inbox', 'task', 'agenda', 'resource']);
const TASK_STATUSES = new Set(['por_hacer', 'hoy', 'en_proceso', 'esperando', 'hecho']);

const ensurePersonalHubSchema = async () => {
  const migrationPath = path.join(__dirname, '../../../database/migrations/018_personal_hub.sql');
  await db.query(fs.readFileSync(migrationPath, 'utf8'));
};

const serialize = (row) => ({
  id: row.id,
  section: row.section,
  title: row.title,
  body: row.body,
  status: row.task_status,
  scheduled_start: row.scheduled_start,
  scheduled_end: row.scheduled_end,
  url: row.resource_url,
  source: row.source,
  position: row.position,
  metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
  completed_at: row.completed_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const groupedPayload = (rows) => {
  const items = rows.map(serialize);
  const tasks = items.filter((item) => item.section === 'task');
  const byStatus = (status) => tasks.filter((item) => item.status === status);
  return {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    inbox: items.filter((item) => item.section === 'inbox'),
    kanban: {
      por_hacer: byStatus('por_hacer'),
      hoy: byStatus('hoy'),
      en_proceso: byStatus('en_proceso'),
      esperando: byStatus('esperando'),
      hecho: byStatus('hecho'),
    },
    agenda: items.filter((item) => item.section === 'agenda'),
    resources: items.filter((item) => item.section === 'resource'),
  };
};

const validate = (payload) => {
  const section = String(payload.section || '').trim();
  const title = String(payload.title || '').trim();
  if (!SECTIONS.has(section)) return 'Sección no válida';
  if (!title) return 'El título es obligatorio';
  if (section === 'task' && !TASK_STATUSES.has(payload.status || 'por_hacer')) return 'Estado de tarea no válido';
  if (section === 'agenda' && !payload.scheduled_start) return 'La agenda requiere fecha y hora de inicio';
  if (section === 'resource' && !payload.url) return 'El recurso requiere una URL o ruta';
  return null;
};

const ensureTodayCapacity = async (tenantId, ownerId, status, excludedId = null) => {
  if (status !== 'hoy') return true;
  let sql = "SELECT COUNT(*) total FROM personal_hub_items WHERE tenant_id=? AND owner_id=? AND section='task' AND task_status='hoy'";
  const params = [tenantId, ownerId];
  if (excludedId) { sql += ' AND id<>?'; params.push(excludedId); }
  const [[row]] = await db.query(sql, params);
  return Number(row.total) < 3;
};

const list = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM personal_hub_items WHERE tenant_id=? AND owner_id=?
       ORDER BY section, CASE WHEN task_status='hecho' THEN 1 ELSE 0 END,
                COALESCE(scheduled_start, created_at), position, id`,
      [req.user.tenant_id, req.user.id]
    );
    res.json(groupedPayload(rows));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const create = async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const section = req.body.section;
  const status = section === 'task' ? (req.body.status || 'por_hacer') : null;
  try {
    if (!(await ensureTodayCapacity(req.user.tenant_id, req.user.id, status))) {
      return res.status(409).json({ message: '#Hoy admite un máximo de 3 tareas' });
    }
    const source = req.puchiAutomation ? 'puchi' : String(req.body.source || 'user').slice(0, 40);
    const [result] = await db.query(
      `INSERT INTO personal_hub_items
       (tenant_id,owner_id,section,title,body,task_status,scheduled_start,scheduled_end,resource_url,source,position,metadata,completed_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.tenant_id, req.user.id, section, req.body.title.trim(), req.body.body || null, status,
       req.body.scheduled_start || null, req.body.scheduled_end || null, req.body.url || null, source,
       Number(req.body.position || 0), req.body.metadata ? JSON.stringify(req.body.metadata) : null,
       status === 'hecho' ? new Date() : null, req.user.id]
    );
    const [[row]] = await db.query('SELECT * FROM personal_hub_items WHERE id=?', [result.insertId]);
    res.status(201).json(serialize(row));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const section = req.body.section;
  const status = section === 'task' ? (req.body.status || 'por_hacer') : null;
  try {
    if (!(await ensureTodayCapacity(req.user.tenant_id, req.user.id, status, req.params.id))) {
      return res.status(409).json({ message: '#Hoy admite un máximo de 3 tareas' });
    }
    const [result] = await db.query(
      `UPDATE personal_hub_items SET section=?,title=?,body=?,task_status=?,scheduled_start=?,scheduled_end=?,
       resource_url=?,position=?,metadata=?,completed_at=CASE WHEN ?='hecho' THEN COALESCE(completed_at,NOW()) ELSE NULL END
       WHERE id=? AND tenant_id=? AND owner_id=?`,
      [section, req.body.title.trim(), req.body.body || null, status, req.body.scheduled_start || null,
       req.body.scheduled_end || null, req.body.url || null, Number(req.body.position || 0),
       req.body.metadata ? JSON.stringify(req.body.metadata) : null, status, req.params.id,
       req.user.tenant_id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Elemento no encontrado' });
    const [[row]] = await db.query('SELECT * FROM personal_hub_items WHERE id=?', [req.params.id]);
    res.json(serialize(row));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM personal_hub_items WHERE id=? AND tenant_id=? AND owner_id=?',
      [req.params.id, req.user.tenant_id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Elemento no encontrado' });
    res.json({ message: 'Elemento eliminado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { ensurePersonalHubSchema, list, create, update, remove };
