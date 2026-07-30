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
    const [[monthlyRevenue]] = await db.query(
      `SELECT
         COALESCE(SUM(cash_collected),0) AS cash_collected_month,
         COALESCE(SUM(commission_amount),0) AS commission_month
       FROM opportunities
       WHERE tenant_id=? AND status='won'
         AND close_date >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
         AND close_date < DATE_ADD(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 1 MONTH)`,
      [tid]
    );
    const [[followupStats]] = await db.query(
      `SELECT
        SUM(next_action_at < NOW()) AS overdue_followups,
        SUM(DATE(next_action_at) = CURDATE()) AS today_followups,
        SUM(next_action_at IS NULL) AS without_next_action,
        SUM(demo_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS demos_week,
        SUM(DATE(demo_date) = CURDATE() AND demo_status IN ('programada','reagendada')) AS demos_today,
        SUM(demo_date < NOW() AND demo_status IN ('programada','reagendada')) AS demo_results_pending,
        SUM(demo_status = 'no_show') AS no_shows_pending,
        SUM(stage_id IN (SELECT id FROM pipeline_stages WHERE tenant_id=? AND name='Propuesta enviada')) AS proposals_pending,
        SUM(stage_id IN (SELECT id FROM pipeline_stages WHERE tenant_id=? AND name='Decisión pendiente')) AS decisions_pending,
        COALESCE(SUM(amount * probability / 100),0) AS weighted_pipeline
       FROM opportunities WHERE tenant_id=? AND status='open'`,
      [tid, tid, tid]
    );
    const [[todayActivityStats]] = await db.query(
      `SELECT COUNT(*) AS tasks_today FROM activities
       WHERE tenant_id=? AND status='pendiente'
         AND (DATE(scheduled_at)=CURDATE() OR scheduled_at<NOW())`,
      [tid]
    );
    const [[prospectingStats]] = await db.query(
      `SELECT COUNT(*) AS prospecting_pending FROM daily_prospects
       WHERE tenant_id=? AND status='pendiente'`,
      [tid]
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

    const [today_tasks] = await db.query(
      `SELECT a.*, c.name AS contact_name, o.title AS opp_title
       FROM activities a
       LEFT JOIN contacts c ON a.contact_id=c.id
       LEFT JOIN opportunities o ON a.opportunity_id=o.id
       WHERE a.tenant_id=? AND a.status='pendiente'
         AND (DATE(a.scheduled_at)=CURDATE() OR a.scheduled_at<NOW())
       ORDER BY a.scheduled_at ASC LIMIT 12`,
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
      stats: { total_contacts, total_opportunities, total_activities, total_users, revenue_won, pipeline_value, ...followupStats, ...monthlyRevenue, ...todayActivityStats, ...prospectingStats },
      monthly, pipeline, top_sellers, upcoming, today_tasks, priorities,
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

const commercialAnalytics = async (req, res) => {
  const tid = req.user.tenant_id;
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const from = validDate(req.query.from) ? req.query.from : null;
  const to = validDate(req.query.to) ? req.query.to : null;
  const prospectRange = from && to ? ' AND batch_date BETWEEN ? AND ?' : '';
  const prospectParams = from && to ? [tid, from, to] : [tid];
  const opportunityRange = from && to ? ' AND created_at BETWEEN ? AND CONCAT(?,\' 23:59:59\')' : '';
  const opportunityParams = from && to ? [tid, from, to] : [tid];

  try {
    const [[prospects]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(assigned_to IS NOT NULL) AS assigned,
         SUM(status <> 'pendiente') AS worked,
         SUM(status IN ('contactada','volver_contactar','agendada')) AS contacted,
         SUM(status='agendada') AS scheduled,
         SUM(status='no_interesa') AS not_interested,
         SUM(status='ya_realadvisor') AS already_realadvisor,
         SUM(status='no_localizable') AS unreachable
       FROM daily_prospects
       WHERE tenant_id=?${prospectRange}`,
      prospectParams
    );

    const [[opportunities]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(demo_status IN ('programada','reagendada','realizada','no_show')) AS demos_scheduled,
         SUM(demo_status='realizada') AS demos_completed,
         SUM(demo_status='no_show') AS no_shows,
         SUM(status='won') AS sales,
         COALESCE(SUM(CASE WHEN status='won' THEN cash_collected ELSE 0 END),0) AS cash_collected
       FROM opportunities
       WHERE tenant_id=?${opportunityRange}`,
      opportunityParams
    );

    const [statuses] = await db.query(
      `SELECT status AS name, COUNT(*) AS value
       FROM daily_prospects
       WHERE tenant_id=?${prospectRange}
       GROUP BY status ORDER BY value DESC`,
      prospectParams
    );

    const [qualification] = await db.query(
      `SELECT COALESCE(qualification_level,'Sin clasificar') AS name, COUNT(*) AS value,
              ROUND(AVG(qualification_score),1) AS average_score
       FROM daily_prospects
       WHERE tenant_id=?${prospectRange}
       GROUP BY qualification_level
       ORDER BY FIELD(qualification_level,'A','B','C'), value DESC`,
      prospectParams
    );

    const [zones] = await db.query(
      `SELECT COALESCE(NULLIF(province,''),NULLIF(zone,''),'Sin zona') AS name,
              COUNT(*) AS leads,
              SUM(status IN ('contactada','volver_contactar','agendada')) AS contacted,
              SUM(status='agendada') AS scheduled
       FROM daily_prospects
       WHERE tenant_id=?${prospectRange}
       GROUP BY name ORDER BY leads DESC LIMIT 10`,
      prospectParams
    );

    const setterDate = from && to
      ? ` AND dp.batch_date BETWEEN ? AND ?`
      : '';
    const setterParams = from && to ? [tid, from, to, tid, from, to] : [tid, tid];
    const [setters] = await db.query(
      `SELECT u.id, u.name, u.role,
              COALESCE(p.assigned,0) AS assigned,
              COALESCE(p.pending,0) AS pending,
              COALESCE(p.contacted,0) AS contacted,
              COALESCE(p.scheduled,0) AS scheduled,
              COALESCE(o.sales,0) AS sales,
              COALESCE(o.cash_collected,0) AS cash_collected
       FROM users u
       LEFT JOIN (
         SELECT dp.assigned_to,
                COUNT(*) AS assigned,
                SUM(dp.status IN ('llamar','volver_contactar')) AS pending,
                SUM(dp.status IN ('contactada','volver_contactar','agendada')) AS contacted,
                SUM(dp.status='agendada') AS scheduled
         FROM daily_prospects dp
         WHERE dp.tenant_id=?${setterDate}
         GROUP BY dp.assigned_to
       ) p ON p.assigned_to=u.id
       LEFT JOIN (
         SELECT setter_id,
                COUNT(*) AS sales,
                COALESCE(SUM(cash_collected),0) AS cash_collected
         FROM opportunities
         WHERE tenant_id=? AND status='won'${from && to ? ' AND close_date BETWEEN ? AND ?' : ''}
         GROUP BY setter_id
       ) o ON o.setter_id=u.id
       WHERE u.tenant_id=? AND u.active=1 AND u.deleted_at IS NULL
         AND u.role IN ('admin','setter')
       ORDER BY scheduled DESC, contacted DESC, assigned DESC`,
      [...setterParams, tid]
    );

    const total = Number(prospects.total || 0);
    const worked = Number(prospects.worked || 0);
    const contacted = Number(prospects.contacted || 0);
    const scheduled = Number(prospects.scheduled || 0);
    const demosCompleted = Number(opportunities.demos_completed || 0);
    const sales = Number(opportunities.sales || 0);
    const pct = (value, base) => base ? Number(((value / base) * 100).toFixed(1)) : 0;

    res.json({
      kpis: {
        leads: total,
        assigned: Number(prospects.assigned || 0),
        worked,
        contacted,
        scheduled,
        demos_completed: demosCompleted,
        no_shows: Number(opportunities.no_shows || 0),
        sales,
        cash_collected: Number(opportunities.cash_collected || 0),
        work_rate: pct(worked, total),
        contact_rate: pct(contacted, worked),
        booking_rate: pct(scheduled, contacted),
        attendance_rate: pct(demosCompleted, demosCompleted + Number(opportunities.no_shows || 0)),
        sales_rate: pct(sales, demosCompleted),
      },
      funnel: [
        { name: 'Leads', value: total },
        { name: 'Trabajados', value: worked },
        { name: 'Contactados', value: contacted },
        { name: 'Demos agendadas', value: scheduled },
        { name: 'Demos realizadas', value: demosCompleted },
        { name: 'Ventas', value: sales },
      ],
      statuses,
      qualification,
      zones,
      setters,
      filters: { from, to },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { dashboard, salesFunnel, commercialAnalytics };
