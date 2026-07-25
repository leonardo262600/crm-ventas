const db = require('../config/db');

const dashboard = async (req, res) => {
  const tid = req.user.tenant_id;
  const { from, to } = req.query; // Filtros de rango de fechas opcionales
  const dateFilter = from && to ? ` AND created_at BETWEEN '${from}' AND '${to} 23:59:59'` : '';
  const dateFilterA = from && to ? ` AND scheduled_at BETWEEN '${from}' AND '${to} 23:59:59'` : '';

  try {
    const [[{ total_contacts }]] = await db.query(
      `SELECT COUNT(*) as total_contacts FROM contacts WHERE tenant_id=?${dateFilter}`, [tid]);
    const [[{ total_opportunities }]] = await db.query(
      `SELECT COUNT(*) as total_opportunities FROM opportunities WHERE tenant_id=? AND status='open'${dateFilter}`, [tid]);
    const [[{ total_activities }]] = await db.query(
      `SELECT COUNT(*) as total_activities FROM activities WHERE tenant_id=? AND status='pendiente'${dateFilterA}`, [tid]);
    const [[{ total_users }]] = await db.query(
      'SELECT COUNT(*) as total_users FROM users WHERE tenant_id=? AND active=1', [tid]);
    const [[{ revenue_won }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as revenue_won FROM opportunities WHERE tenant_id=? AND status='won'${dateFilter}`, [tid]);
    const [[{ pipeline_value }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as pipeline_value FROM opportunities WHERE tenant_id=? AND status='open'${dateFilter}`, [tid]);
    const [[followupStats]] = await db.query(
      `SELECT
        SUM(next_action_at < NOW()) AS overdue_followups,
        SUM(DATE(next_action_at) = CURDATE()) AS today_followups,
        SUM(next_action_at IS NULL) AS without_next_action,
        SUM(demo_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS demos_week,
        SUM(stage_id IN (SELECT id FROM pipeline_stages WHERE tenant_id=? AND name='Propuesta enviada')) AS proposals_pending,
        SUM(stage_id IN (SELECT id FROM pipeline_stages WHERE tenant_id=? AND name='Decisión pendiente')) AS decisions_pending,
        COALESCE(SUM(amount * probability / 100),0) AS weighted_pipeline
       FROM opportunities WHERE tenant_id=? AND status='open'`,
      [tid, tid, tid]
    );

    // Oportunidades por mes (últimos 12 meses o dentro del rango)
    const monthlyWhere = from && to
      ? `WHERE tenant_id=? AND created_at BETWEEN '${from}' AND '${to} 23:59:59'`
      : `WHERE tenant_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`;
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(amount),0) as amount
       FROM opportunities ${monthlyWhere} GROUP BY month ORDER BY month`,
      [tid]
    );

    // Pipeline por etapa
    const [pipeline] = await db.query(
      `SELECT ps.name, ps.color, COUNT(o.id) as count, COALESCE(SUM(o.amount),0) as amount
       FROM pipeline_stages ps
       LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.tenant_id=? AND o.status='open'
       WHERE ps.tenant_id=? GROUP BY ps.id ORDER BY ps.order_index`,
      [tid, tid]
    );

    // Top vendedores
    const [top_sellers] = await db.query(
      `SELECT u.name, COUNT(o.id) as opportunities, COALESCE(SUM(o.amount),0) as total_amount
       FROM users u LEFT JOIN opportunities o ON o.assigned_to=u.id AND o.tenant_id=? AND o.status='won'${dateFilter}
       WHERE u.tenant_id=? AND u.active=1 GROUP BY u.id ORDER BY total_amount DESC LIMIT 5`,
      [tid, tid]
    );

    // Actividades próximas (7 días)
    const [upcoming] = await db.query(
      `SELECT a.*, c.name as contact_name FROM activities a
       LEFT JOIN contacts c ON a.contact_id=c.id
       WHERE a.tenant_id=? AND a.status='pendiente' AND a.scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY)
       ORDER BY a.scheduled_at ASC LIMIT 10`,
      [tid]
    );

    const [priorities] = await db.query(
      `SELECT o.id, o.title, o.temperature, o.next_action, o.next_action_type, o.next_action_at,
              c.name AS contact_name, c.company, ps.name AS stage_name,
              TIMESTAMPDIFF(DAY, COALESCE(o.last_interaction_at,o.created_at), NOW()) AS days_without_contact
       FROM opportunities o
       LEFT JOIN contacts c ON o.contact_id=c.id
       LEFT JOIN pipeline_stages ps ON o.stage_id=ps.id
       WHERE o.tenant_id=? AND o.status='open'
         AND (o.next_action_at <= DATE_ADD(NOW(),INTERVAL 7 DAY) OR o.next_action_at IS NULL)
       ORDER BY
         CASE WHEN o.next_action_at < NOW() THEN 0 WHEN DATE(o.next_action_at)=CURDATE() THEN 1
              WHEN o.next_action_at IS NULL THEN 3 ELSE 2 END,
         CASE o.temperature WHEN 'caliente' THEN 0 WHEN 'templada' THEN 1 ELSE 2 END,
         o.next_action_at ASC LIMIT 10`,
      [tid]
    );

    res.json({
      stats: { total_contacts, total_opportunities, total_activities, total_users, revenue_won, pipeline_value, ...followupStats },
      monthly, pipeline, top_sellers, upcoming, priorities,
      filters: { from: from || null, to: to || null },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const salesFunnel = async (req, res) => {
  const tid = req.user.tenant_id;
  try {
    const [rows] = await db.query(
      `SELECT ps.name, ps.color, COUNT(o.id) as count, COALESCE(SUM(o.amount),0) as amount
       FROM pipeline_stages ps
       LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.tenant_id=?
       WHERE ps.tenant_id=? GROUP BY ps.id ORDER BY ps.order_index`,
      [tid, tid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { dashboard, salesFunnel };
