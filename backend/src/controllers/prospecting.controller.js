const db = require('../config/db');
const { syncDemoTasks } = require('../services/demoAutomation.service');

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

const postalCodeFrom = (postalCode, address) => {
  const explicit = String(postalCode || '').match(/\b\d{5}\b/);
  if (explicit) return explicit[0];
  const fromAddress = String(address || '').match(/\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\b/);
  return fromAddress ? fromAddress[0] : null;
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
    if (req.user.role === 'setter') {
      sql += " AND status IN ('llamar','volver_contactar','contactada','agendada','ya_realadvisor','no_interesa','no_localizable')";
    }
    if (status && status !== 'todos') { sql += ' AND status=?'; params.push(status); }
    if (search) {
      sql += ' AND (agency_name LIKE ? OR city LIKE ? OR province LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(...Array(5).fill(`%${search}%`));
    }
    sql += ` ORDER BY FIELD(status,'llamar','pendiente','volver_contactar','agendada','contactada','ya_realadvisor','no_interesa','no_localizable'), agency_name LIMIT ${safeLimit} OFFSET ${offset}`;
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
         (tenant_id,batch_date,zone,city,province,agency_name,phone,email,website,address,postal_code,source_url,normalized_key,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.tenant_id, batchDate, item.zone || item.city || null, item.city || null, item.province || null,
         item.agency_name, normalizeSpanishPhone(item.phone), item.email || null, item.website || null, item.address || null,
         postalCodeFrom(item.postal_code, item.address), item.source_url || item.website || null, makeKey(item), req.user.id]
      );
      if (result.affectedRows) inserted += 1; else duplicates += 1;
    }
    res.status(201).json({ inserted, duplicates, batch_date: batchDate });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const allowedStatuses = ['pendiente','llamar','contactada','agendada','ya_realadvisor','no_interesa','volver_contactar','no_localizable'];
  const { status } = req.body;
  if (status && !allowedStatuses.includes(status)) return res.status(400).json({ message: 'Estado no válido' });
  try {
    const allowedFields = [
      'status', 'notes', 'follow_up_at', 'agency_name', 'phone', 'secondary_phone',
      'email', 'secondary_email', 'website', 'address', 'postal_code', 'google_maps_url',
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

const scheduleFollowUp = async (req, res) => {
  const { scheduled_at } = req.body;
  if (!scheduled_at) return res.status(400).json({ message: 'Selecciona fecha y hora' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[prospect]] = await connection.query(
      'SELECT * FROM daily_prospects WHERE id=? AND tenant_id=? FOR UPDATE',
      [req.params.id, req.user.tenant_id]
    );
    if (!prospect) {
      await connection.rollback();
      return res.status(404).json({ message: 'Agencia no encontrada' });
    }
    const marker = `[PROSPECT:${prospect.id}]`;
    const [[existing]] = await connection.query(
      `SELECT id FROM activities
       WHERE tenant_id=? AND status='pendiente' AND description LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [req.user.tenant_id, `%${marker}%`]
    );
    const title = `Llamar · ${prospect.agency_name}`;
    const description = `${marker} Seguimiento de prospección diaria${prospect.phone ? ` · ${prospect.phone}` : ''}`;
    if (existing) {
      await connection.query(
        `UPDATE activities SET title=?, type='llamada', description=?, scheduled_at=?, due_at=?,
         contact_id=?, assigned_to=? WHERE id=? AND tenant_id=?`,
        [title, description, scheduled_at, scheduled_at, prospect.converted_contact_id || null,
         req.user.id, existing.id, req.user.tenant_id]
      );
    } else {
      await connection.query(
        `INSERT INTO activities
         (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,assigned_to,created_by)
         VALUES (?,?, 'llamada', ?, ?, ?, 'pendiente', ?, ?, ?)`,
        [req.user.tenant_id, title, description, scheduled_at, scheduled_at,
         prospect.converted_contact_id || null, req.user.id, req.user.id]
      );
    }
    await connection.query(
      "UPDATE daily_prospects SET status='volver_contactar', follow_up_at=? WHERE id=? AND tenant_id=?",
      [scheduled_at, prospect.id, req.user.tenant_id]
    );
    await connection.commit();
    res.json({ message: existing ? 'Tarea de llamada actualizada' : 'Tarea de llamada creada' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally { connection.release(); }
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

const scheduleDemo = async (req, res) => {
  const { demo_date } = req.body;
  if (!demo_date || Number.isNaN(new Date(demo_date).getTime())) {
    return res.status(400).json({ message: 'Selecciona una fecha y hora válidas' });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[prospect]] = await connection.query(
      'SELECT * FROM daily_prospects WHERE id=? AND tenant_id=? FOR UPDATE',
      [req.params.id, req.user.tenant_id]
    );
    if (!prospect) {
      await connection.rollback();
      return res.status(404).json({ message: 'Agencia no encontrada' });
    }

    const [[owner]] = await connection.query(
      `SELECT id,name FROM users
       WHERE tenant_id=? AND active=1 AND role='admin'
       ORDER BY CASE WHEN LOWER(name) LIKE 'leonardo%' THEN 0 ELSE 1 END,id LIMIT 1`,
      [req.user.tenant_id]
    );
    if (!owner) {
      await connection.rollback();
      return res.status(409).json({ message: 'No hay un asesor administrador activo para asignar la demo' });
    }

    let contactId = prospect.converted_contact_id;
    if (!contactId) {
      const [contact] = await connection.query(
        `INSERT INTO contacts
         (tenant_id,name,email,phone,company,address,postal_code,tags,notes,assigned_to,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.tenant_id, prospect.agency_name, prospect.email, prospect.phone,
         prospect.agency_name, prospect.address, prospect.postal_code, 'prospección diaria',
         prospect.notes, owner.id, req.user.id]
      );
      contactId = contact.insertId;
    }

    const [[stage]] = await connection.query(
      `SELECT id FROM pipeline_stages WHERE tenant_id=?
       ORDER BY CASE WHEN LOWER(name) LIKE '%demo agendada%' THEN 0 ELSE 1 END,order_index LIMIT 1`,
      [req.user.tenant_id]
    );
    const [opportunity] = await connection.query(
      `INSERT INTO opportunities
       (tenant_id,title,contact_id,stage_id,status,temperature,zone,city,province,lead_source,
        assigned_to,created_by,next_action,next_action_type,next_action_at,demo_date,demo_status,followup_phase)
       VALUES (?,?,?,?,'open','templada',?,?,?,'prospección setter',?,?,?,'reunion',?,?,'programada',0)`,
      [req.user.tenant_id, `Demo · ${prospect.agency_name}`, contactId, stage?.id || null,
       prospect.zone || prospect.city, prospect.city, prospect.province, owner.id, req.user.id,
       'Realizar demo agendada', demo_date, demo_date]
    );

    await syncDemoTasks(connection, {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      opportunityId: opportunity.insertId,
      title: `Demo · ${prospect.agency_name}`,
      contactId,
      assignedTo: owner.id,
      demoDate: demo_date,
      demoStatus: 'programada',
    });

    await connection.query(
      `INSERT INTO activities
       (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,opportunity_id,assigned_to,created_by)
       VALUES (?,?, 'recordatorio', ?, NOW(), NOW(), 'pendiente', ?, ?, ?, ?)`,
      [req.user.tenant_id, `Nueva oportunidad agendada: ${prospect.agency_name}`,
       `${req.user.name || 'El setter'} ha agendado una demo para ${new Date(demo_date).toLocaleString('es-ES')}.`,
       contactId, opportunity.insertId, owner.id, req.user.id]
    );
    await connection.query(
      `UPDATE daily_prospects
       SET status='agendada',follow_up_at=?,converted_contact_id=?,contacted_at=COALESCE(contacted_at,NOW())
       WHERE id=? AND tenant_id=?`,
      [demo_date, contactId, prospect.id, req.user.tenant_id]
    );
    await connection.commit();
    res.status(201).json({
      message: 'Demo agendada y oportunidad creada',
      status: 'agendada',
      contact_id: contactId,
      opportunity_id: opportunity.insertId,
      assigned_to: owner.name,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally { connection.release(); }
};

module.exports = { list, summary, bulkCreate, update, scheduleFollowUp, scheduleDemo, convert };
