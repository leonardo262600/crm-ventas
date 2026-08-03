const db = require('../config/db');

const get = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const [[member]] = await db.query(
      `SELECT id,name,email,role,active,created_at FROM users
       WHERE id=? AND tenant_id=? AND deleted_at IS NULL`,
      [userId, req.user.tenant_id]
    );
    if (!member) return res.status(404).json({ message:'Usuario no encontrado' });

    const [[prospecting]] = await db.query(
      `SELECT COUNT(*) total,
              SUM(status IN ('llamar','volver_contactar')) pending_calls,
              SUM(status='contactada') contacted,
              SUM(status='agendada') booked
       FROM daily_prospects WHERE tenant_id=? AND assigned_to=?`,
      [req.user.tenant_id, userId]
    );
    const [[sales]] = await db.query(
      `SELECT COUNT(*) opportunities,
              SUM(status='won') sales,
              COALESCE(SUM(CASE WHEN status='won' THEN cash_collected ELSE 0 END),0) cash_collected,
              COALESCE(SUM(CASE WHEN status='won' THEN commission_amount ELSE 0 END),0) commission
       FROM opportunities WHERE tenant_id=? AND assigned_to=?
         AND created_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01')`,
      [req.user.tenant_id, userId]
    );
    const [[setterResults]] = await db.query(
      `SELECT COUNT(*) demos_sourced,
              SUM(demo_status='realizada') completed_demos,
              SUM(status='won') sourced_sales
       FROM opportunities WHERE tenant_id=? AND setter_id=?
         AND demo_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01')`,
      [req.user.tenant_id, userId]
    );
    const [demos] = await db.query(
      `SELECT o.id,o.title,o.demo_date,o.demo_status,c.name contact_name,c.company,c.phone
       FROM opportunities o LEFT JOIN contacts c ON c.id=o.contact_id
       WHERE o.tenant_id=? AND o.assigned_to=? AND o.demo_date>=NOW()
         AND o.demo_status IN ('programada','reagendada')
       ORDER BY o.demo_date LIMIT 12`,
      [req.user.tenant_id, userId]
    );
    const [tasks] = await db.query(
      `SELECT id,title,type,due_at,scheduled_at,status FROM activities
       WHERE tenant_id=? AND assigned_to=? AND status='pendiente'
       ORDER BY COALESCE(due_at,scheduled_at) LIMIT 12`,
      [req.user.tenant_id, userId]
    );
    res.json({ member, prospecting, sales, setter_results:setterResults, demos, tasks });
  } catch (error) { res.status(500).json({ message:error.message }); }
};

module.exports = { get };
