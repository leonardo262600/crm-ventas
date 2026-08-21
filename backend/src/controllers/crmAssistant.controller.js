const db = require('../config/db');

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const plainText = value => String(value || '')
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .trim();

const renderTemplate = (value, record) => String(value || '').replace(/{{\s*([^}]+)\s*}}/g, (_, rawKey) => {
  const key = rawKey.trim().toLowerCase();
  const values = {
    nombre: record.contact_name || record.company || 'cliente',
    cliente: record.contact_name || record.company || 'cliente',
    empresa: record.company || record.contact_name || '',
    accion: record.next_action || record.title || '',
    fecha: record.action_date || '',
    telefono: record.phone || '',
    correo: record.email || '',
  };
  return values[key] ?? `{{${rawKey}}}`;
});

const templateFor = (templates, record) => {
  const channel = String(record.channel || '').toLowerCase();
  const phase = Number(record.followup_phase || 0);
  return templates.find(item => item.channel === channel && Number(item.phase || 0) === phase)
    || templates.find(item => item.channel === channel)
    || null;
};

const dailyBrief = async (req, res) => {
  const madridHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()));
  const date = validDate(req.query.date) ? req.query.date : new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const slot = req.query.slot === 'morning' || req.query.slot === 'afternoon'
    ? req.query.slot
    : madridHour >= 12 ? 'afternoon' : 'morning';
  const tenantId = req.user.tenant_id;
  const baseUrl = String(process.env.FRONTEND_URL || 'https://crm-leonardo.vercel.app').replace(/\/$/, '');

  try {
    const [[activities], [followups], [demos], [templates]] = await Promise.all([
      db.query(
        `SELECT a.id,a.title,a.type,a.description,a.scheduled_at,a.due_at,
                c.id AS contact_id,c.name AS contact_name,c.company,c.phone,c.email
           FROM activities a
           LEFT JOIN contacts c ON c.id=a.contact_id
          WHERE a.tenant_id=? AND COALESCE(a.status,'pendiente')<>'completada'
            AND DATE(COALESCE(a.due_at,a.scheduled_at,a.created_at))<=?
          ORDER BY COALESCE(a.due_at,a.scheduled_at,a.created_at),a.id`,
        [tenantId, date]
      ),
      db.query(
        `SELECT o.id,o.title,o.followup_phase,o.next_action,o.next_action_type,o.next_action_at,
                c.id AS contact_id,c.name AS contact_name,c.company,c.phone,c.email
           FROM opportunities o
           LEFT JOIN contacts c ON c.id=o.contact_id
          WHERE o.tenant_id=? AND o.status='open' AND o.next_action_at IS NOT NULL
            AND DATE(o.next_action_at)<=?
          ORDER BY o.next_action_at,o.id`,
        [tenantId, date]
      ),
      db.query(
        `SELECT o.id,o.title,o.demo_date,c.id AS contact_id,c.name AS contact_name,c.company,c.phone,c.email
           FROM opportunities o
           LEFT JOIN contacts c ON c.id=o.contact_id
          WHERE o.tenant_id=? AND o.status='open' AND DATE(o.demo_date)=?
            AND COALESCE(o.demo_status,'programada') IN ('programada','reagendada')
          ORDER BY o.demo_date,o.id`,
        [tenantId, date]
      ),
      db.query(
        `SELECT id,name,subject,body,channel,phase,category
           FROM comm_templates WHERE tenant_id=? ORDER BY category,phase,channel,name`,
        [tenantId]
      ),
    ]);

    const actions = followups.map(item => {
      const record = {
        ...item,
        channel: item.next_action_type || 'whatsapp',
        action_date: item.next_action_at,
      };
      const template = templateFor(templates, record);
      return {
        kind: 'followup', id: item.id, contact_id: item.contact_id,
        client: item.company || item.contact_name || item.title,
        action: item.next_action || 'Realizar seguimiento', channel: record.channel,
        due_at: item.next_action_at, phone: item.phone, email: item.email,
        crm_url: `${baseUrl}/followups?opportunity=${item.id}`,
        template: template ? {
          id: template.id, name: template.name,
          subject: renderTemplate(template.subject, record),
          body: renderTemplate(template.body, record),
        } : null,
      };
    });

    const pendingActivities = activities.map(item => ({
      kind: 'task', id: item.id, contact_id: item.contact_id,
      client: item.company || item.contact_name || 'Tarea personal',
      action: item.title, channel: item.type || 'tarea',
      due_at: item.due_at || item.scheduled_at, phone: item.phone, email: item.email,
      crm_url: `${baseUrl}/activities`, template: null,
    }));

    const greeting = slot === 'morning' ? 'Buenos días' : 'Actualización de la tarde';
    const lines = [
      `${greeting}, ${req.user.name}.`,
      `Para hoy tienes ${actions.length} seguimiento${actions.length === 1 ? '' : 's'}, ${pendingActivities.length} tarea${pendingActivities.length === 1 ? '' : 's'} y ${demos.length} demo${demos.length === 1 ? '' : 's'}.`,
    ];
    if (actions.length) {
      lines.push('', 'Siguientes acciones:');
      actions.slice(0, 8).forEach((item, index) => lines.push(`${index + 1}. ${item.client}: ${item.action}`));
      if (actions.length > 8) lines.push(`Y ${actions.length - 8} seguimiento${actions.length - 8 === 1 ? '' : 's'} más.`);
    }
    lines.push('', `Abrir CRM: ${baseUrl}/followups`);

    res.json({
      date, slot, user: { id:req.user.id, name:req.user.name },
      counts: { followups:actions.length, tasks:pendingActivities.length, demos:demos.length },
      whatsapp_message: lines.join('\n'),
      actions, tasks: pendingActivities,
      demos: demos.map(item => ({ ...item, crm_url:`${baseUrl}/followups?opportunity=${item.id}` })),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message:error.message });
  }
};

module.exports = { dailyBrief };
