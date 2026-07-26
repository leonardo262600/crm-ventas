const db = require('../config/db');
const { runAutomations } = require('../services/automations.service');

const list = async (req, res) => {
  const { stage_id, status, assigned_to } = req.query;
  let sql = `SELECT o.*, ps.name as stage_name, ps.color as stage_color,
             c.name as contact_name, u.name as assigned_name
             FROM opportunities o
             LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
             LEFT JOIN contacts c ON o.contact_id = c.id
             LEFT JOIN users u ON o.assigned_to = u.id
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
  const values = fields.map(field => req.body[field] === '' || req.body[field] === undefined ? null : req.body[field]);
  try {
    const [result] = await db.query(
      `INSERT INTO opportunities (tenant_id, ${fields.join(',')}, created_by)
       VALUES (?,${fields.map(() => '?').join(',')},?)`,
      [req.user.tenant_id, ...values, req.user.id]
    );
    runAutomations('opportunity_created', {
      tenant_id: req.user.tenant_id, user_id: req.user.id,
      record: { id: result.insertId, title: req.body.title, contact_id: req.body.contact_id, stage_id: req.body.stage_id, amount: req.body.amount, assigned_to: req.body.assigned_to }
    });
    res.status(201).json({ id: result.insertId, title: req.body.title });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  try {
    await db.query(
      `UPDATE opportunities SET ${fields.map(field => `${field}=?`).join(',')}
       WHERE id=? AND tenant_id=?`,
      [...values, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Oportunidad actualizada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  const allowed = ['programada', 'realizada', 'no_show', 'reagendada'];
  if (!allowed.includes(demo_status)) return res.status(400).json({ message: 'Estado de demo no válido' });
  try {
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
      sql += ', no_show_step=0';
    }
    sql += ' WHERE id=? AND tenant_id=?';
    params.push(req.params.id, req.user.tenant_id);
    await db.query(sql, params);
    res.json({ message: 'Estado de la demo actualizado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  const { status, amount, close_date, cash_collected, commission_amount, lost_reason, lost_detail, competitor_chosen, activation_date, resume_date } = req.body;
  try {
    let sql = 'UPDATE opportunities SET status=?';
    const params = [status];
    
    if (amount !== undefined) { sql += ', amount=?'; params.push(amount); }
    if (close_date !== undefined) { sql += ', close_date=?'; params.push(close_date); }
    if (cash_collected !== undefined) { sql += ', cash_collected=?'; params.push(cash_collected || 0); }
    if (commission_amount !== undefined) { sql += ', commission_amount=?'; params.push(commission_amount || 0); }
    
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
  try {
    await db.query('DELETE FROM opportunities WHERE id=? AND tenant_id=?',
      [req.params.id, req.user.tenant_id]);
    res.json({ message: 'Oportunidad eliminada' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { list, stages, getOne, create, update, moveStage, updateFollowupPhase, updateDemoStatus, updateNoShowStep, updateStatus, forecast, remove };
