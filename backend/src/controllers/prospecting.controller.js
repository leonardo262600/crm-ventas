const db = require('../config/db');
const { syncDemoTasks } = require('../services/demoAutomation.service');

let qualificationSchemaPromise;
const ensureQualificationSchema = () => {
  if (qualificationSchemaPromise) return qualificationSchemaPromise;
  qualificationSchemaPromise = (async () => {
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='daily_prospects'`
    );
    const existing = new Set(columns.map(row => row.COLUMN_NAME));
    const definitions = {
      qualification_score: 'TINYINT UNSIGNED NULL',
      qualification_level: 'VARCHAR(1) NULL',
      qualification_reason: 'VARCHAR(700) NULL',
      call_angle: 'VARCHAR(500) NULL',
      realadvisor_crm_check: "VARCHAR(12) NOT NULL DEFAULT 'pendiente'",
      assigned_to: 'INT NULL',
    };
    for (const [column, definition] of Object.entries(definitions)) {
      if (!existing.has(column)) {
        await db.query(`ALTER TABLE daily_prospects ADD COLUMN ${column} ${definition}`);
      }
    }
    const [[index]] = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='daily_prospects'
         AND INDEX_NAME='idx_prospect_qualification' LIMIT 1`
    );
    if (!index) {
      await db.query(
        'CREATE INDEX idx_prospect_qualification ON daily_prospects (tenant_id,status,qualification_score)'
      );
    }
    const [[raIndex]] = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='daily_prospects'
         AND INDEX_NAME='idx_prospect_ra_check' LIMIT 1`
    );
    if (!raIndex) {
      await db.query(
        'CREATE INDEX idx_prospect_ra_check ON daily_prospects (tenant_id,realadvisor_crm_check)'
      );
    }
    const [[assignmentIndex]] = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='daily_prospects'
         AND INDEX_NAME='idx_prospect_assignment' LIMIT 1`
    );
    if (!assignmentIndex) {
      await db.query(
        'CREATE INDEX idx_prospect_assignment ON daily_prospects (tenant_id,assigned_to,status)'
      );
    }
  })().catch(error => {
    qualificationSchemaPromise = null;
    throw error;
  });
  return qualificationSchemaPromise;
};

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
  const { date, status, search, mine, crm_check, page = 1, limit = 50 } = req.query;
  const personalView = String(mine || '') === '1';
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;
  try {
    await ensureQualificationSchema();
    const selectedDate = date || null;
    let sql = `SELECT dp.*, u.name AS assigned_name
               FROM daily_prospects dp
               LEFT JOIN users u ON u.id=dp.assigned_to AND u.tenant_id=dp.tenant_id
               WHERE dp.tenant_id=?`;
    const params = [req.user.tenant_id];
    if (selectedDate) { sql += ' AND dp.batch_date=DATE(?)'; params.push(selectedDate); }
    if (req.user.role === 'setter' || personalView) {
      sql += " AND dp.assigned_to=? AND dp.status IN ('llamar','volver_contactar','contactada','agendada','ya_realadvisor','no_interesa','no_localizable')";
      params.push(req.user.id);
    }
    if (status && status !== 'todos') { sql += ' AND dp.status=?'; params.push(status); }
    if (
      req.user.role === 'admin'
      && ['pendiente', 'si', 'no'].includes(String(crm_check || ''))
    ) {
      sql += ' AND dp.realadvisor_crm_check=?';
      params.push(crm_check);
    }
    if (search) {
      sql += ' AND (dp.agency_name LIKE ? OR dp.city LIKE ? OR dp.province LIKE ? OR dp.email LIKE ? OR dp.phone LIKE ?)';
      params.push(...Array(5).fill(`%${search}%`));
    }
    sql += ` ORDER BY FIELD(dp.status,'llamar','pendiente','volver_contactar','agendada','contactada','ya_realadvisor','no_interesa','no_localizable'),
             dp.qualification_score IS NULL, dp.qualification_score DESC, dp.agency_name
             LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await db.query(sql, params);
    res.json({ date: selectedDate, items: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const summary = async (req, res) => {
  try {
    await ensureQualificationSchema();
    const personalView = String(req.query.mine || '') === '1';
    let statusSql = `SELECT status, COUNT(*) AS total FROM daily_prospects WHERE tenant_id=?`;
    const statusParams = [req.user.tenant_id];
    if (req.user.role === 'setter' || personalView) {
      statusSql += ' AND assigned_to=?';
      statusParams.push(req.user.id);
    }
    statusSql += ' GROUP BY status';
    const [rows] = await db.query(statusSql, statusParams);
    const [[latest]] = await db.query('SELECT MAX(batch_date) AS batch_date FROM daily_prospects WHERE tenant_id=?', [req.user.tenant_id]);
    const [[history]] = personalView || req.user.role === 'setter'
      ? await db.query('SELECT COUNT(*) AS total FROM daily_prospects WHERE tenant_id=? AND assigned_to=?', [req.user.tenant_id, req.user.id])
      : await db.query('SELECT COUNT(*) AS total FROM daily_prospects WHERE tenant_id=?', [req.user.tenant_id]);
    let performance = null;
    if (req.user.role === 'setter') {
      [[performance]] = await db.query(
        `SELECT COUNT(*) AS sales,
                COALESCE(SUM(cash_collected),0) AS cash_collected,
                COALESCE(SUM(setter_commission_amount),0) AS commission
         FROM opportunities
         WHERE tenant_id=? AND setter_id=? AND status='won'
           AND close_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01')
           AND close_date<DATE_ADD(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH)`,
        [req.user.tenant_id, req.user.id]
      );
    } else if (personalView) {
      [[performance]] = await db.query(
        `SELECT COUNT(*) AS sales,
                COALESCE(SUM(cash_collected),0) AS cash_collected,
                COALESCE(SUM(commission_amount),0) AS commission
         FROM opportunities
         WHERE tenant_id=? AND assigned_to=? AND status='won'
           AND close_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01')
           AND close_date<DATE_ADD(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH)`,
        [req.user.tenant_id, req.user.id]
      );
    }
    let assignments = [];
    if (req.user.role === 'admin' || req.user.role === 'gerente') {
      [assignments] = await db.query(
        `SELECT u.id, u.name, u.role,
                SUM(CASE WHEN dp.status IN ('llamar','volver_contactar') THEN 1 ELSE 0 END) AS pending_calls
         FROM users u
         LEFT JOIN daily_prospects dp
           ON dp.tenant_id=u.tenant_id AND dp.assigned_to=u.id
         WHERE u.tenant_id=? AND u.active=1 AND u.deleted_at IS NULL
           AND u.role IN ('admin','setter')
         GROUP BY u.id,u.name,u.role
         ORDER BY FIELD(u.role,'admin','setter'),u.name`,
        [req.user.tenant_id]
      );
    }
    res.json({ date: latest?.batch_date || null, statuses: rows, history: history.total, performance, assignments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const bulkCreate = async (req, res) => {
  const prospects = Array.isArray(req.body.prospects) ? req.body.prospects.slice(0, 100) : [];
  const batchDate = req.body.batch_date || new Date().toISOString().slice(0, 10);
  if (!prospects.length) return res.status(400).json({ message: 'No hay prospectos para cargar' });
  let inserted = 0;
  let duplicates = 0;
  try {
    await ensureQualificationSchema();
    for (const item of prospects) {
      if (!item.agency_name) continue;
      const [result] = await db.query(
        `INSERT IGNORE INTO daily_prospects
         (tenant_id,batch_date,zone,city,province,agency_name,phone,email,website,address,postal_code,source_url,
          qualification_score,qualification_level,qualification_reason,call_angle,normalized_key,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.tenant_id, batchDate, item.zone || item.city || null, item.city || null, item.province || null,
         item.agency_name, normalizeSpanishPhone(item.phone), item.email || null, item.website || null, item.address || null,
         postalCodeFrom(item.postal_code, item.address), item.source_url || item.website || null,
         Number.isFinite(Number(item.qualification_score)) ? Math.min(100, Math.max(0, Math.round(Number(item.qualification_score)))) : null,
         ['A','B','C'].includes(String(item.qualification_level || '').toUpperCase())
           ? String(item.qualification_level).toUpperCase()
           : null,
         item.qualification_reason || null, item.call_angle || null, makeKey(item), req.user.id]
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
  if (Object.prototype.hasOwnProperty.call(req.body, 'realadvisor_crm_check')) {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Solo el administrador puede verificar el CRM de RealAdvisor' });
    if (!['pendiente','si','no'].includes(req.body.realadvisor_crm_check)) {
      return res.status(400).json({ message: 'Verificación de CRM no válida' });
    }
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'assigned_to') && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Solo el administrador puede asignar prospectos' });
  }
  try {
    await ensureQualificationSchema();
    if (Object.prototype.hasOwnProperty.call(req.body, 'assigned_to') && req.body.assigned_to) {
      const [[assignee]] = await db.query(
        `SELECT id FROM users
         WHERE id=? AND tenant_id=? AND active=1 AND deleted_at IS NULL
           AND role IN ('admin','setter')`,
        [req.body.assigned_to, req.user.tenant_id]
      );
      if (!assignee) return res.status(400).json({ message: 'El responsable seleccionado no está disponible' });
    }
    const allowedFields = [
      'status', 'notes', 'follow_up_at', 'agency_name', 'phone', 'secondary_phone',
      'email', 'secondary_email', 'website', 'address', 'postal_code', 'google_maps_url',
      'contact_person', 'extra_info', 'qualification_score', 'qualification_level',
      'qualification_reason', 'call_angle', 'realadvisor_crm_check', 'assigned_to',
    ];
    const updates = [];
    const params = [];
    allowedFields.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) return;
      updates.push(`${field}=?`);
      let value = req.body[field];
      if (field === 'phone' || field === 'secondary_phone') value = normalizeSpanishPhone(value);
      if (field === 'qualification_score' && value !== '' && value != null) {
        value = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
      }
      if (field === 'qualification_level' && value) {
        value = String(value).toUpperCase();
        if (!['A','B','C'].includes(value)) return;
      }
      if (value === '') value = null;
      params.push(value);
    });
    if (!updates.length) return res.status(400).json({ message: 'No hay cambios para guardar' });
    if (status === 'contactada') updates.push('contacted_at=COALESCE(contacted_at,NOW())');
    params.push(req.params.id, req.user.tenant_id);
    let scope = 'id=? AND tenant_id=?';
    if (req.user.role === 'setter') {
      scope += ' AND assigned_to=?';
      params.push(req.user.id);
    }
    const [result] = await db.query(`UPDATE daily_prospects SET ${updates.join(', ')} WHERE ${scope}`, params);
    if (!result.affectedRows) return res.status(404).json({ message: 'Prospecto no disponible para este usuario' });
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
    if (req.user.role === 'setter' && Number(prospect.assigned_to) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Esta agencia está asignada a otro responsable' });
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
    if (req.user.role === 'setter' && Number(prospect.assigned_to) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Esta agencia está asignada a otro responsable' });
    }
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
    if (req.user.role === 'setter' && Number(prospect.assigned_to) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Esta agencia está asignada a otro responsable' });
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
        assigned_to,setter_id,created_by,next_action,next_action_type,next_action_at,demo_date,demo_status,followup_phase)
       VALUES (?,?,?,?,'open','templada',?,?,?,'prospección setter',?,?,?,?,'reunion',?,?,'programada',0)`,
      [req.user.tenant_id, `Demo · ${prospect.agency_name}`, contactId, stage?.id || null,
       prospect.zone || prospect.city, prospect.city, prospect.province, owner.id, req.user.id, req.user.id,
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
       VALUES (?,?, 'tarea', ?, NOW(), NOW(), 'pendiente', ?, ?, ?, ?)`,
      [req.user.tenant_id, `Agendar en mi Calendar: ${prospect.agency_name}`,
       `${req.user.name || 'El setter'} ha agendado una demo para ${new Date(demo_date).toLocaleString('es-ES')}. Añádela al Calendar corporativo y confirma los datos de la reunión.`,
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
