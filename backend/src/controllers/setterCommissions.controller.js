const db = require('../config/db');

const DEMO_TIERS = [
  { min: 10, max: 19, amount: 300 },
  { min: 20, max: 29, amount: 600 },
  { min: 30, max: 39, amount: 1000 },
  { min: 40, max: 49, amount: 1300 },
  { min: 50, max: 59, amount: 1600 },
  { min: 60, max: 69, amount: 1900 },
  { min: 70, max: 79, amount: 2200 },
  { min: 80, max: null, amount: 2500 },
];

const fixedForDemos = demos => [...DEMO_TIERS].reverse().find(item => demos >= item.min)?.amount || 0;
const nextDemoTarget = demos => DEMO_TIERS.find(item => demos < item.min)?.min || null;
const rateForClients = clients => clients >= 8 ? 100 : clients >= 5 ? 80 : clients >= 1 ? 50 : 0;

const list = async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
    ? String(req.query.month)
    : new Date().toISOString().slice(0, 7);
  const ownRestriction = req.user.role === 'setter' ? ' AND u.id=?' : '';
  const params = [req.user.tenant_id, month, req.user.tenant_id, month, req.user.tenant_id];
  if (req.user.role === 'setter') params.push(req.user.id);

  try {
    const [rows] = await db.query(
      `SELECT u.id,u.name,u.email,
              COALESCE(d.completed_demos,0) AS completed_demos,
              COALESCE(s.clients,0) AS clients,
              COALESCE(s.cash_collected,0) AS cash_collected
         FROM users u
         LEFT JOIN (
           SELECT setter_id,COUNT(*) AS completed_demos
             FROM opportunities
            WHERE tenant_id=? AND demo_status='realizada' AND DATE_FORMAT(demo_date,'%Y-%m')=?
            GROUP BY setter_id
         ) d ON d.setter_id=u.id
         LEFT JOIN (
           SELECT setter_id,COUNT(*) AS clients,COALESCE(SUM(cash_collected),0) AS cash_collected
             FROM opportunities
            WHERE tenant_id=? AND status='won' AND DATE_FORMAT(close_date,'%Y-%m')=?
            GROUP BY setter_id
         ) s ON s.setter_id=u.id
        WHERE u.tenant_id=? AND u.role='setter' AND u.active=1 AND u.deleted_at IS NULL${ownRestriction}
        ORDER BY u.name`,
      params
    );

    const setters = rows.map(row => {
      const completedDemos = Number(row.completed_demos || 0);
      const clients = Number(row.clients || 0);
      const fixed = fixedForDemos(completedDemos);
      const clientRate = rateForClients(clients);
      const salesCommission = clients * clientRate;
      const nextTarget = nextDemoTarget(completedDemos);
      return {
        id: row.id, name: row.name, email: row.email,
        completed_demos: completedDemos,
        fixed,
        next_demo_target: nextTarget,
        demos_to_next_target: nextTarget ? Math.max(0, nextTarget - completedDemos) : 0,
        clients,
        client_rate: clientRate,
        sales_commission: salesCommission,
        total_commission: fixed + salesCommission,
        cash_collected: Number(row.cash_collected || 0),
        demos: [],
      };
    });

    const detailParams = [req.user.tenant_id, month];
    let detailRestriction = '';
    if (req.user.role === 'setter') {
      detailRestriction = ' AND o.setter_id=?';
      detailParams.push(req.user.id);
    }
    const [demoRows] = await db.query(
      `SELECT o.id,o.setter_id,o.title,o.demo_date,o.demo_status,
              c.name AS contact_name,c.company,c.phone,
              closer.id AS closer_id,closer.name AS closer_name
         FROM opportunities o
         LEFT JOIN contacts c ON c.id=o.contact_id
         LEFT JOIN users closer ON closer.id=o.assigned_to
        WHERE o.tenant_id=? AND DATE_FORMAT(o.demo_date,'%Y-%m')=?
          AND o.demo_status='realizada'${detailRestriction}
        ORDER BY o.demo_date DESC,o.id DESC`,
      detailParams
    );
    const setterMap = new Map(setters.map(item => [Number(item.id), item]));
    demoRows.forEach(demo => {
      const setter = setterMap.get(Number(demo.setter_id));
      if (setter) setter.demos.push(demo);
    });

    res.json({ month, demo_tiers: DEMO_TIERS, setters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { list };
