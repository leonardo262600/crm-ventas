const db = require('../config/db');
const { runAutomations } = require('../services/automations.service');
const { syncDemoTasks, completePendingDemoTasks } = require('../services/demoAutomation.service');
const { ensureCalendarSchema, parseSlot } = require('../services/closerCalendar.service');

const list = async (req, res) => {
  const { stage_id, status, assigned_to } = req.query;
  let sql = `SELECT o.*, ps.name as stage_name, ps.color as stage_color,
             c.name as contact_name, c.company, c.phone, c.email, c.postal_code,
             u.name as assigned_name, setter.name as setter_name
             FROM opportunities o
             LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
             LEFT JOIN contacts c ON o.contact_id = c.id
             LEFT JOIN users u ON o.assigned_to = u.id
             LEFT JOIN users setter ON o.setter_id = setter.id
             WHERE o.tenant_id = ?`;
  const params = [req.user.tenant_id];
  if (stage_id)   { sql += ' AND o.stage_id = ?'; params.push(stage_id); }
  if (status)     { sql += ' AND o.status = ?'; params.push(status); }
  if (assigned_to){ sql += ' AND o.assigned_to = ?'; params.push(assigned_to); }
  sql += ' ORDER BY o.created_at DESC';
  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const stages = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM pipeline_stages WHERE tenant_id = ? ORDER BY order_index',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.*, ps.name as stage_name, c.name as contact_name, u.name as assigned_name
       FROM opportunities o
       LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
       LEFT JOIN contacts c ON o.contact_id = c.id
       LEFT JOIN users u ON o.assigned_to = u.id
       WHERE o.id = ? AND o.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Oportunidad no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  const fields = [
    'title','contact_id','stage_id','amount','probability','close_date','assigned_to','description',
    'client_type','zone','city','province','offices_count','agents_count','lead_source','demo_date',
    'temperature','monthly_amount','proposal_period','current_solution','decision_maker','stakeholders',
    'main_goal','current_problem','problem_impact','current_acquisition','current_captures','target_captures',
    'urgency','urgency_reason','decision_criteria','client_quote','objection_type','objection_detail',
    'objection_response','objection_status','next_action','next_action_type','next_action_at',
    'latest_response','decision_date','resume_date','followup_phase','demo_status','no_show_step','no_show_at'
  ];
  const createDefaults = {
    probability: 0,
    followup_phase: 0,
    demo_status: 'programada',
    no_show_step: 0,
  };
  if (req.user.role === 'setter') {
    const [[owner]] = await db.query(
      `SELECT id FROM users WHERE tenant_id=? AND active=1 AND role='admin'
       ORDER BY CASE WHEN LOWER(name) LIKE 'leonardo%' THEN 0 ELSE 1 END,id LIMIT 1`,
      [req.user.tenant_id]
    );
    if (!owner) return res.status(409).json({ message: 'No hay un asesor activo para asignar la demo' });
    req.body.assigned_to = owner.id;
    req.body.setter_id = req.user.id;
    req.body.lead_source = req.body.lead_source || 'prospección setter';
  }
  const values = fields.map(field => {
    const value = req.body[field];
    if (value !== '' && value !== undefined && value !== null) return value;
    return Object.prototype.hasOwnProperty.call(createDefaults, field) ? createDefaults[field] : null;
  });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO opportunities (tenant_id, ${fields.join(',')}, setter_id, created_by)
       VALUES (?,${fields.map(() => '?').join(',')},?,?)`,
      [req.user.tenant_id, ...values, req.body.setter_id || null, req.user.id]
    );
    await syncDemoTasks(connection, {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      opportunityId: result.insertId,
      title: req.body.title,
      contactId: req.body.contact_id,
      assignedTo: req.body.assigned_to,
      demoDate: req.body.demo_date,
      demoStatus: req.body.demo_status || 'programada',
    });
    if (req.user.role === 'setter' && req.body.demo_date) {
      await connection.query(
        `INSERT INTO activities
         (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,opportunity_id,assigned_to,created_by)
         VALUES (?,?,'tarea',?,NOW(),NOW(),'pendiente',?,?,?,?)`,
        [req.user.tenant_id, `Agendar en mi Calendar: ${req.body.title}`,
         `${req.user.name} ha creado y agendado esta demo para ${new Date(req.body.demo_date).toLocaleString('es-ES')}.`,
         req.body.contact_id, result.insertId, req.body.assigned_to, req.user.id]
      );
    }
    await connection.commit();
    runAutomations('opportunity_created', {
      tenant_id: req.user.tenant_id, user_id: req.user.id,
      record: { id: result.insertId, title: req.body.title, contact_id: req.body.contact_id, stage_id: req.body.stage_id, amount: req.body.amount, assigned_to: req.body.assigned_to }
    });
    res.status(201).json({ id: result.insertId, title: req.body.title });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

const update = async (req, res) => {
  const fields = [
    'title','contact_id','stage_id','amount','probability','close_date','assigned_to','description','status',
    'client_type','zone','city','province','offices_count','agents_count','lead_source','demo_date',
    'temperature','monthly_amount','proposal_period','current_solution','decision_maker','stakeholders',
    'main_goal','current_problem','problem_impact','current_acquisition','current_captures','target_captures',
    'urgency','urgency_reason','decision_criteria','client_quote','objection_type','objection_detail',
    'objection_response','objection_status','next_action','next_action_type','next_action_at',
    'latest_response','decision_date','resume_date','followup_phase','demo_status','no_show_step','no_show_at'
  ];
  const values = fields.map(field => {
    if (field === 'status') return req.body[field] || 'open';
    return req.body[field] === '' || req.body[field] === undefined ? null : req.body[field];
  });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE opportunities SET ${fields.map(field => `${field}=?`).join(',')}
       WHERE id=? AND tenant_id=?`,
      [...values, req.params.id, req.user.tenant_id]
    );
    await syncDemoTasks(connection, {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      opportunityId: req.params.id,
      title: req.body.title,
      contactId: req.body.contact_id,
      assignedTo: req.body.assigned_to,
      demoDate: req.body.demo_date,
      demoStatus: req.body.demo_status || 'programada',
    });
    await connection.commit();
    res.json({ message: 'Oportunidad actualizada' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

const moveStage = async (req, res) => {
  const { stage_id } = req.body;
  try {
    await db.query('UPDATE opportunities SET stage_id=?, stage_entered_at=NOW() WHERE id=? AND tenant_id=?',
      [stage_id, req.params.id, req.user.tenant_id]);
    // Trigger automatizaciones de cambio de etapa
    const [rows] = await db.query('SELECT * FROM opportunities WHERE id=?', [req.params.id]);
    if (rows.length) {
      runAutomations('opportunity_stage_changed', {
        tenant_id: req.user.tenant_id, user_id: req.user.id,
        record: { ...rows[0], stage_id }
      });
    }
    res.json({ message: 'Etapa actualizada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateFollowupPhase = async (req, res) => {
  const phase = Number(req.body.followup_phase);
  if (!Number.isInteger(phase) || phase < 0 || phase > 5) {
    return res.status(400).json({ message: 'La fase debe estar entre 0 y 5' });
  }
  try {
    const cadence = {
      0: { days: 2, action: 'Enviar recordatorio con valor', type: 'whatsapp' },
      1: { days: 3, action: 'Resolver la objeción principal', type: 'llamada' },
      2: { days: 2, action: 'Pedir una decisión concreta', type: 'llamada' },
      3: { days: 3, action: 'Realizar último intento activo', type: 'whatsapp' },
      4: { days: 4, action: 'Cerrar el ciclo de seguimiento', type: 'email' },
      5: { days: 30, action: 'Revisar si conviene retomar el contacto', type: 'llamada' },
    }[phase];
    await db.query(
      `UPDATE opportunities SET followup_phase=?, next_action=?, next_action_type=?,
       next_action_at=DATE_ADD(NOW(), INTERVAL ${cadence.days} DAY)
       WHERE id=? AND tenant_id=?`,
      [phase, cadence.action, cadence.type, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Fase y próxima acción actualizadas', followup_phase: phase, ...cadence });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateDemoStatus = async (req, res) => {
  const { demo_status, demo_date } = req.body;
  const allowed = ['programada', 'realizada', 'no_show', 'reagendada', 'cancelada'];
  if (!allowed.includes(demo_status)) return res.status(400).json({ message: 'Estado de demo no válido' });
  const connection = await db.getConnection();
  try {
    await ensureCalendarSchema(connection);
    await connection.beginTransaction();
    let sql = 'UPDATE opportunities SET demo_status=?';
    const params = [demo_status];
    if (demo_status === 'no_show') {
      sql += ", no_show_at=NOW(), no_show_step=0, next_action='Intentar reagendar la demo', next_action_type='whatsapp', next_action_at=NOW()";
    }
    if (demo_status === 'reagendada') {
      if (!demo_date) return res.status(400).json({ message: 'Indica la nueva fecha de la demo' });
      sql += ", demo_date=?, next_action='Realizar demo reagendada', next_action_type='reunion', next_action_at=?";
      params.push(demo_date, demo_date);
    }
    if (demo_status === 'realizada') {
      sql += ", no_show_step=0, followup_phase=0, next_action='Enviar resumen y propuesta después de la demo', next_action_type='email', next_action_at=DATE_ADD(NOW(), INTERVAL 1 DAY)";
    }
    if (demo_status === 'cancelada') {
      sql += ", next_action='Valorar si conviene retomar el contacto', next_action_type='llamada', next_action_at=DATE_ADD(NOW(), INTERVAL 30 DAY)";
    }
    sql += ' WHERE id=? AND tenant_id=?';
    params.push(req.params.id, req.user.tenant_id);
    await connection.query(sql, params);
    if (demo_status === 'reagendada') {
      const slot = parseSlot(demo_date);
      await connection.query(
        'UPDATE demo_bookings SET status=?,start_at=?,end_at=? WHERE tenant_id=? AND opportunity_id=?',
        [demo_status, slot.startAt, slot.endAt, req.user.tenant_id, req.params.id]
      );
    } else {
      await connection.query(
        'UPDATE demo_bookings SET status=? WHERE tenant_id=? AND opportunity_id=?',
        [demo_status, req.user.tenant_id, req.params.id]
      );
    }

    const [[opportunity]] = await connection.query(
      'SELECT * FROM opportunities WHERE id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]
    );
    if (demo_status === 'reagendada') {
      await syncDemoTasks(connection, {
        tenantId: req.user.tenant_id,
        userId: req.user.id,
        opportunityId: opportunity.id,
        title: opportunity.title,
        contactId: opportunity.contact_id,
        assignedTo: opportunity.assigned_to,
        demoDate: opportunity.demo_date,
        demoStatus,
      });
    } else {
      await completePendingDemoTasks(connection, req.user.tenant_id, req.params.id);
    }
    await connection.commit();
    res.json({ message: 'Estado de la demo actualizado' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

const updateNoShowStep = async (req, res) => {
  const step = Number(req.body.no_show_step);
  if (!Number.isInteger(step) || step < 0 || step > 2) return res.status(400).json({ message: 'El intento debe estar entre 0 y 2' });
  try {
    const cadence = {
      0: { days: 1, action: 'Segundo intento para reagendar la demo', type: 'whatsapp' },
      1: { days: 2, action: 'Último intento para reagendar la demo', type: 'whatsapp' },
      2: { days: 30, action: 'Revisar si conviene retomar el No Show', type: 'llamada' },
    }[step];
    await db.query(
      `UPDATE opportunities SET demo_status='no_show', no_show_step=?, next_action=?,
       next_action_type=?, next_action_at=DATE_ADD(NOW(), INTERVAL ${cadence.days} DAY)
       WHERE id=? AND tenant_id=?`,
      [step, cadence.action, cadence.type, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Intento No Show y próxima acción actualizados', no_show_step: step, ...cadence });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateStatus = async (req, res) => {
  const { status, amount, close_date, cash_collected, commission_amount, setter_id, setter_commission_amount, lost_reason, lost_detail, competitor_chosen, activation_date, resume_date } = req.body;
  try {
    let sql = 'UPDATE opportunities SET status=?';
    const params = [status];
    
    if (amount !== undefined) { sql += ', amount=?'; params.push(amount); }
    if (close_date !== undefined) { sql += ', close_date=?'; params.push(close_date); }
    if (cash_collected !== undefined) { sql += ', cash_collected=?'; params.push(cash_collected || 0); }
    if (commission_amount !== undefined) { sql += ', commission_amount=?'; params.push(commission_amount || 0); }
    if (setter_id !== undefined) { sql += ', setter_id=?'; params.push(setter_id || null); }
    if (setter_commission_amount !== undefined) { sql += ', setter_commission_amount=?'; params.push(setter_commission_amount || 0); }
    
    if (lost_reason !== undefined) { sql += ', lost_reason=?'; params.push(lost_reason || null); }
    if (lost_detail !== undefined) { sql += ', lost_detail=?'; params.push(lost_detail || null); }
    if (competitor_chosen !== undefined) { sql += ', competitor_chosen=?'; params.push(competitor_chosen || null); }
    if (activation_date !== undefined) { sql += ', activation_date=?'; params.push(activation_date || null); }
    if (resume_date !== undefined) { sql += ', resume_date=?'; params.push(resume_date || null); }
    
    sql += ' WHERE id=? AND tenant_id=?';
    params.push(req.params.id, req.user.tenant_id);

    await db.query(sql, params);
    res.json({ message: 'Estado de oportunidad actualizado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const forecast = async (req, res) => {
  const tid = req.user.tenant_id;
  try {
    // Pronóstico por mes (próximos 6 meses) usando close_date y probability
    const [byMonth] = await db.query(
      `SELECT
         DATE_FORMAT(close_date,'%Y-%m') as month,
         COUNT(*) as count,
         SUM(amount) as total_amount,
         SUM(amount * probability / 100) as weighted_amount
       FROM opportunities
       WHERE tenant_id=? AND status='open' AND close_date >= CURDATE()
         AND close_date <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month`,
      [tid]
    );
    // Por etapa
    const [byStage] = await db.query(
      `SELECT ps.name as stage, ps.color, COUNT(o.id) as count,
              COALESCE(SUM(o.amount),0) as total,
              COALESCE(SUM(o.amount * o.probability/100),0) as weighted,
              AVG(o.probability) as avg_prob
       FROM pipeline_stages ps
       LEFT JOIN opportunities o ON o.stage_id=ps.id AND o.tenant_id=? AND o.status='open'
       WHERE ps.tenant_id=? GROUP BY ps.id ORDER BY ps.order_index`,
      [tid, tid]
    );
    // Totales globales
    const [[totals]] = await db.query(
      `SELECT
         COUNT(*) as total_open,
         COALESCE(SUM(amount),0) as pipeline_total,
         COALESCE(SUM(amount * probability/100),0) as weighted_total,
         AVG(probability) as avg_probability
       FROM opportunities WHERE tenant_id=? AND status='open'`,
      [tid]
    );
    // Oportunidades próximas a cerrar (30 días)
    const [closing_soon] = await db.query(
      `SELECT o.*, c.name as contact_name, ps.name as stage_name, u.name as assigned_name
       FROM opportunities o
       LEFT JOIN contacts c ON o.contact_id=c.id
       LEFT JOIN pipeline_stages ps ON o.stage_id=ps.id
       LEFT JOIN users u ON o.assigned_to=u.id
       WHERE o.tenant_id=? AND o.status='open'
         AND o.close_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY o.close_date ASC LIMIT 10`,
      [tid]
    );
    res.json({ byMonth, byStage, totals, closing_soon });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'DELETE FROM activities WHERE opportunity_id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]
    );
    await connection.query(
      'UPDATE quotes SET opportunity_id=NULL WHERE opportunity_id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]
    );
    await connection.query(
      'DELETE FROM opportunities WHERE id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]
    );
    await connection.commit();
    res.json({ message: 'Oportunidad eliminada' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

module.exports = { list, stages, getOne, create, update, moveStage, updateFollowupPhase, updateDemoStatus, updateNoShowStep, updateStatus, forecast, remove };
