const db = require('../config/db');

const normalize = value => (value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const makeKey = item => `${normalize(item.agency_name)}|${normalize(item.city || item.zone)}|${(item.phone || '').replace(/\D/g, '')}`;

const normalizeSpanishPhone = value => {
  if (!value) return null;
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('0034')) digits = digits.slice(4);
  if (digits.startsWith('34') && digits.length === 11) digits = digits.slice(2);
  if (digits.length === 9) return `+34 ${digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
  return String(value).trim();
};

const list = async (req, res) => {
  const { date, status, search, page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;
  try {
    let selectedDate = date;
    if (!selectedDate) {
      const [[latest]] = await db.query('SELECT MAX(batch_date) AS batch_date FROM daily_prospects WHERE tenant_id=?', [req.user.tenant_id]);
      selectedDate = latest?.batch_date || null;
    }
    let sql = 'SELECT * FROM daily_prospects WHERE tenant_id=?';
    const params = [req.user.tenant_id];
    if (selectedDate) { sql += ' AND batch_date=DATE(?)'; params.push(selectedDate); }
    if (status && status !== 'todos') { sql += ' AND status=?'; params.push(status); }
    if (search) {
      sql += ' AND (agency_name LIKE ? OR city LIKE ? OR province LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(...Array(5).fill(`%${search}%`));
    }
    sql += ` ORDER BY FIELD(status,'llamar','pendiente','volver_contactar','contactada','ya_realadvisor','no_interesa','no_localizable'), agency_name LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await db.query(sql, params);
    res.json({ date: selectedDate, items: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const summary = async (req, res) => {
  try {
    const [[latest]] = await db.query('SELECT MAX(batch_date) AS batch_date FROM daily_prospects WHERE tenant_id=?', [req.user.tenant_id]);
    const [rows] = await db.query(
      `SELECT status, COUNT(*) AS total FROM daily_prospects
       WHERE tenant_id=? AND batch_date=? GROUP BY status`,
      [req.user.tenant_id, latest?.batch_date]
    );
    const [[history]] = await db.query('SELECT COUNT(*) AS total FROM daily_prospects WHERE tenant_id=?', [req.user.tenant_id]);
    res.json({ date: latest?.batch_date || null, statuses: rows, history: history.total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const bulkCreate = async (req, res) => {
  const prospects = Array.isArray(req.body.prospects) ? req.body.prospects.slice(0, 100) : [];
  const batchDate = req.body.batch_date || new Date().toISOString().slice(0, 10);
  if (!prospects.length) return res.status(400).json({ message: 'No hay prospectos para cargar' });
  let inserted = 0;
  let duplicates = 0;
  try {
    for (const item of prospects) {
      if (!item.agency_name) continue;
      const [result] = await db.query(
        `INSERT IGNORE INTO daily_prospects
         (tenant_id,batch_date,zone,city,province,agency_name,phone,email,website,address,source_url,normalized_key,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.tenant_id, batchDate, item.zone || item.city || null, item.city || null, item.province || null,
         item.agency_name, normalizeSpanishPhone(item.phone), item.email || null, item.website || null, item.address || null,
         item.source_url || item.website || null, makeKey(item), req.user.id]
      );
      if (result.affectedRows) inserted += 1; else duplicates += 1;
    }
    res.status(201).json({ inserted, duplicates, batch_date: batchDate });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const allowedStatuses = ['pendiente','llamar','contactada','ya_realadvisor','no_interesa','volver_contactar','no_localizable'];
  const { status } = req.body;
  if (status && !allowedStatuses.includes(status)) return res.status(400).json({ message: 'Estado no válido' });
  try {
    const allowedFields = [
      'status', 'notes', 'follow_up_at', 'agency_name', 'phone', 'secondary_phone',
      'email', 'secondary_email', 'website', 'address', 'google_maps_url',
      'contact_person', 'extra_info',
    ];
    const updates = [];
    const params = [];
    allowedFields.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) return;
      updates.push(`${field}=?`);
      let value = req.body[field];
      if (field === 'phone' || field === 'secondary_phone') value = normalizeSpanishPhone(value);
      if (value === '') value = null;
      params.push(value);
    });
    if (!updates.length) return res.status(400).json({ message: 'No hay cambios para guardar' });
    if (status === 'contactada') updates.push('contacted_at=COALESCE(contacted_at,NOW())');
    params.push(req.params.id, req.user.tenant_id);
    await db.query(`UPDATE daily_prospects SET ${updates.join(', ')} WHERE id=? AND tenant_id=?`, params);
    res.json({ message: 'Prospecto actualizado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const convert = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[prospect]] = await connection.query('SELECT * FROM daily_prospects WHERE id=? AND tenant_id=? FOR UPDATE', [req.params.id, req.user.tenant_id]);
    if (!prospect) { await connection.rollback(); return res.status(404).json({ message: 'Prospecto no encontrado' }); }
    if (prospect.converted_contact_id) { await connection.rollback(); return res.status(409).json({ message: 'Este prospecto ya fue convertido' }); }
    const [contact] = await connection.query(
      `INSERT INTO contacts (tenant_id,name,email,phone,company,address,tags,notes,assigned_to,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.user.tenant_id, prospect.agency_name, prospect.email, prospect.phone, prospect.agency_name,
       prospect.address, 'prospección diaria', prospect.notes, req.user.id, req.user.id]
    );
    const [[stage]] = await connection.query('SELECT id FROM pipeline_stages WHERE tenant_id=? ORDER BY order_index LIMIT 1', [req.user.tenant_id]);
    const [opportunity] = await connection.query(
      `INSERT INTO opportunities (tenant_id,title,contact_id,stage_id,status,temperature,zone,lead_source,assigned_to,created_by,next_action,next_action_type)
       VALUES (?,?,?,?,'open','fria',?,'prospección diaria',?,?,?,'llamada')`,
      [req.user.tenant_id, `Prospección · ${prospect.agency_name}`, contact.insertId, stage?.id || null,
       prospect.zone || prospect.city, req.user.id, req.user.id, 'Realizar primer contacto']
    );
    await connection.query(
      "UPDATE daily_prospects SET status='contactada', converted_contact_id=? WHERE id=? AND tenant_id=?",
      [contact.insertId, prospect.id, req.user.tenant_id]
    );
    await connection.commit();
    res.json({ message: 'Convertido en contacto y oportunidad', contact_id: contact.insertId, opportunity_id: opportunity.insertId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally { connection.release(); }
};

module.exports = { list, summary, bulkCreate, update, convert };
