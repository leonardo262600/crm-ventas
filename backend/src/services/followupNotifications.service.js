const db = require('../config/db');
const { sendPushToUser } = require('../controllers/notifications.controller');

let running = false;

const ensureTable = () => db.query(`
  CREATE TABLE IF NOT EXISTS followup_notification_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    scheduled_for DATETIME NOT NULL,
    user_id INT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_followup_notice (opportunity_id, scheduled_for, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);

const sendDueFollowupNotifications = async () => {
  if (running) return;
  running = true;
  try {
    await ensureTable();
    const [rows] = await db.query(`
      SELECT o.id, o.title, o.next_action, o.next_action_type, o.next_action_at,
             COALESCE(o.assigned_to, o.created_by, admin_user.id) AS user_id,
             COALESCE(c.company, c.name, o.title) AS client_name
      FROM opportunities o
      LEFT JOIN contacts c ON c.id=o.contact_id
      LEFT JOIN users admin_user ON admin_user.tenant_id=o.tenant_id
        AND admin_user.role='admin' AND admin_user.active=1
      LEFT JOIN followup_notification_log log ON log.opportunity_id=o.id
        AND log.scheduled_for=o.next_action_at
        AND log.user_id=COALESCE(o.assigned_to, o.created_by, admin_user.id)
      WHERE o.status='open' AND o.next_action_at IS NOT NULL
        AND o.next_action_at<=NOW()
        AND o.next_action_at>=DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND log.id IS NULL
        AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id=COALESCE(o.assigned_to, o.created_by, admin_user.id))
      GROUP BY o.id, user_id
    `);

    for (const item of rows) {
      if (!item.user_id) continue;
      await sendPushToUser(
        item.user_id,
        `Seguimiento: ${item.client_name}`,
        item.next_action || `Tienes un seguimiento por ${item.next_action_type || 'realizar'}`,
        { url:'/followups', tag:`followup-${item.id}-${new Date(item.next_action_at).getTime()}` }
      );
      await db.query(
        'INSERT IGNORE INTO followup_notification_log (opportunity_id,scheduled_for,user_id) VALUES (?,?,?)',
        [item.id, item.next_action_at, item.user_id]
      );
    }
  } catch (error) {
    console.error('[Followup notifications]', error.message);
  } finally {
    running = false;
  }
};

const startFollowupNotificationRunner = () => {
  sendDueFollowupNotifications();
  const timer = setInterval(sendDueFollowupNotifications, 60 * 1000);
  timer.unref?.();
};

module.exports = { startFollowupNotificationRunner, sendDueFollowupNotifications };
