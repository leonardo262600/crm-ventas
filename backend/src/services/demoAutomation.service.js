const AUTO_DEMO_TITLES = [
  'Preparar demo:',
  'Recordatorio de demo:',
  'Registrar resultado de la demo:',
];

const clearPendingDemoTasks = async (connection, tenantId, opportunityId) => {
  await connection.query(
    `DELETE FROM activities
     WHERE tenant_id=? AND opportunity_id=? AND status='pendiente'
       AND (${AUTO_DEMO_TITLES.map(() => 'title LIKE ?').join(' OR ')})`,
    [tenantId, opportunityId, ...AUTO_DEMO_TITLES.map(prefix => `${prefix}%`)]
  );
};

const syncDemoTasks = async (connection, {
  tenantId,
  userId,
  opportunityId,
  title,
  contactId,
  assignedTo,
  demoDate,
  demoStatus,
}) => {
  await clearPendingDemoTasks(connection, tenantId, opportunityId);

  if (!demoDate || !['programada', 'reagendada'].includes(demoStatus)) return;

  const assignee = assignedTo || userId;
  const common = [tenantId, contactId || null, opportunityId, assignee, userId];

  await connection.query(
    `INSERT INTO activities
     (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,opportunity_id,assigned_to,created_by)
     VALUES
     (? ,?,'tarea',?,
      GREATEST(DATE_SUB(?, INTERVAL 1 DAY), NOW()),?,'pendiente',?,?,?,?)`,
    [
      tenantId,
      `Preparar demo: ${title}`,
      'Checklist: revisar la agencia, su zona, propiedades anunciadas, presencia actual en RealAdvisor, objetivo probable y preguntas de descubrimiento.',
      demoDate,
      demoDate,
      ...common.slice(1),
    ]
  );

  await connection.query(
    `INSERT INTO activities
     (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,opportunity_id,assigned_to,created_by)
     VALUES
     (? ,?,'recordatorio',?,
      GREATEST(TIMESTAMP(DATE(?),'09:00:00'), NOW()),?,'pendiente',?,?,?,?)`,
    [
      tenantId,
      `Recordatorio de demo: ${title}`,
      'Demo programada para hoy. Comprueba los datos del contacto y abre tus notas de preparación.',
      demoDate,
      demoDate,
      ...common.slice(1),
    ]
  );

  await connection.query(
    `INSERT INTO activities
     (tenant_id,title,type,description,scheduled_at,due_at,status,contact_id,opportunity_id,assigned_to,created_by)
     VALUES
     (? ,?,'tarea',?,
      DATE_ADD(?, INTERVAL 1 HOUR),DATE_ADD(?, INTERVAL 1 HOUR),'pendiente',?,?,?,?)`,
    [
      tenantId,
      `Registrar resultado de la demo: ${title}`,
      'Indica si la demo fue realizada, No Show, reagendada o cancelada. El CRM configurará el siguiente paso.',
      demoDate,
      demoDate,
      ...common.slice(1),
    ]
  );
};

const completePendingDemoTasks = async (connection, tenantId, opportunityId) => {
  await connection.query(
    `UPDATE activities SET status='completada'
     WHERE tenant_id=? AND opportunity_id=? AND status='pendiente'
       AND (${AUTO_DEMO_TITLES.map(() => 'title LIKE ?').join(' OR ')})`,
    [tenantId, opportunityId, ...AUTO_DEMO_TITLES.map(prefix => `${prefix}%`)]
  );
};

module.exports = { syncDemoTasks, completePendingDemoTasks };
