const db = require('../config/db');
const { runAutomations } = require('../services/automations.service');

const normalizeText = value => String(value || '').trim().toLocaleLowerCase('es');
const normalizePhone = value => String(value || '').replace(/\D/g, '').replace(/^34(?=\d{9}$)/, '');

const findDuplicates = async (tenantId, data, excludeId = null) => {
  const [contacts] = await db.query(
    `SELECT id,name,email,phone,company FROM contacts
     WHERE tenant_id=?${excludeId ? ' AND id<>?' : ''}`,
    excludeId ? [tenantId, excludeId] : [tenantId]
  );
  const email = normalizeText(data.email);
  const phone = normalizePhone(data.phone);
  const name = normalizeText(data.name);
  const company = normalizeText(data.company);

  return contacts.filter(contact => {
    const sameEmail = email && normalizeText(contact.email) === email;
    const samePhone = phone && normalizePhone(contact.phone) === phone;
    const sameIdentity = name && company
      && normalizeText(contact.name) === name
      && normalizeText(contact.company) === company;
    return sameEmail || samePhone || sameIdentity;
  });
};

const list = async (req, res) => {
  const { search, tag } = req.query;
  let sql = `SELECT c.*, u.name as assigned_name
             FROM contacts c
             LEFT JOIN users u ON c.assigned_to = u.id
             WHERE c.tenant_id = ?`;
  const params = [req.user.tenant_id];
  if (search) {
    sql += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.postal_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (tag)    { sql += ' AND c.tags LIKE ?'; params.push(`%${tag}%`); }
  sql += ' ORDER BY c.name';
  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name as assigned_name FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ? AND c.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Contacto no encontrado' });
    const contact = rows[0];
    
    // Ficha 360 Unificada
    const [activities] = await db.query(
      'SELECT id, title, type, status, scheduled_at as date FROM activities WHERE contact_id = ? AND tenant_id = ?',
      [contact.id, req.user.tenant_id]
    );
    const [opportunities] = await db.query(
      `SELECT o.id, o.title, o.amount, o.status, o.created_at as date, ps.name as stage_name 
       FROM opportunities o
       LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
       WHERE o.contact_id = ? AND o.tenant_id = ?`,
      [contact.id, req.user.tenant_id]
    );
    const [emails] = await db.query(
      'SELECT id, subject, created_at as date FROM comm_emails WHERE contact_id = ? AND tenant_id = ?',
      [contact.id, req.user.tenant_id]
    );

    const timeline = [
      ...activities.map(a => ({ ...a, entityType: 'activity' })),
      ...opportunities.map(o => ({ ...o, entityType: 'opportunity' })),
      ...emails.map(e => ({ ...e, entityType: 'email' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ ...contact, timeline });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  const { name, email, phone, company, position, address, postal_code, tags, notes, assigned_to } = req.body;
  try {
    if (!req.body.allow_duplicate) {
      const duplicates = await findDuplicates(req.user.tenant_id, req.body);
      if (duplicates.length) {
        return res.status(409).json({
          code: 'DUPLICATE_CONTACT',
          message: 'Ya existe un contacto con datos coincidentes',
          duplicates,
        });
      }
    }
    const [result] = await db.query(
      `INSERT INTO contacts (tenant_id, name, email, phone, company, position, address, postal_code, tags, notes, assigned_to, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.tenant_id, name, email, phone, company, position, address, postal_code || null, tags, notes, assigned_to || null, req.user.id]
    );
    runAutomations('contact_created', {
      tenant_id: req.user.tenant_id, user_id: req.user.id,
      record: { id: result.insertId, name, email, company, assigned_to }
    });
    res.status(201).json({ id: result.insertId, name, email });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  const { name, email, phone, company, position, address, postal_code, tags, notes, assigned_to } = req.body;
  try {
    if (!req.body.allow_duplicate) {
      const duplicates = await findDuplicates(req.user.tenant_id, req.body, Number(req.params.id));
      if (duplicates.length) {
        return res.status(409).json({
          code: 'DUPLICATE_CONTACT',
          message: 'Otro contacto tiene datos coincidentes',
          duplicates,
        });
      }
    }
    await db.query(
      `UPDATE contacts SET name=?,email=?,phone=?,company=?,position=?,address=?,postal_code=?,tags=?,notes=?,assigned_to=?
       WHERE id=? AND tenant_id=?`,
      [name, email, phone, company, position, address, postal_code || null, tags, notes, assigned_to || null, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Contacto actualizado' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteContactData = async (connection, tenantId, contactId) => {
  const [[contact]] = await connection.query(
    'SELECT id, name FROM contacts WHERE id=? AND tenant_id=? FOR UPDATE',
    [contactId, tenantId]
  );
  if (!contact) return null;

  const [opportunities] = await connection.query(
    'SELECT id FROM opportunities WHERE contact_id=? AND tenant_id=?',
    [contactId, tenantId]
  );
  const opportunityIds = opportunities.map(({ id }) => id);

  const [quotes] = opportunityIds.length
    ? await connection.query(
        'SELECT id FROM quotes WHERE tenant_id=? AND (contact_id=? OR opportunity_id IN (?))',
        [tenantId, contactId, opportunityIds]
      )
    : await connection.query(
        'SELECT id FROM quotes WHERE tenant_id=? AND contact_id=?',
        [tenantId, contactId]
      );
  const quoteIds = quotes.map(({ id }) => id);

  const [invoices] = quoteIds.length
    ? await connection.query(
        'SELECT id FROM invoices WHERE tenant_id=? AND (contact_id=? OR quote_id IN (?))',
        [tenantId, contactId, quoteIds]
      )
    : await connection.query(
        'SELECT id FROM invoices WHERE tenant_id=? AND contact_id=?',
        [tenantId, contactId]
      );
  const invoiceIds = invoices.map(({ id }) => id);

  if (invoiceIds.length) {
    await connection.query('DELETE FROM invoice_items WHERE invoice_id IN (?)', [invoiceIds]);
    await connection.query('DELETE FROM invoices WHERE tenant_id=? AND id IN (?)', [tenantId, invoiceIds]);
  }
  if (quoteIds.length) {
    await connection.query('DELETE FROM quote_items WHERE quote_id IN (?)', [quoteIds]);
  }
  if (opportunityIds.length) {
    await connection.query(
      'DELETE FROM activities WHERE tenant_id=? AND (contact_id=? OR opportunity_id IN (?))',
      [tenantId, contactId, opportunityIds]
    );
  } else {
    await connection.query(
      'DELETE FROM activities WHERE tenant_id=? AND contact_id=?',
      [tenantId, contactId]
    );
  }
  await connection.query('DELETE FROM comm_emails WHERE tenant_id=? AND contact_id=?', [tenantId, contactId]);
  await connection.query('DELETE FROM comm_calls WHERE tenant_id=? AND contact_id=?', [tenantId, contactId]);
  if (quoteIds.length) {
    await connection.query('DELETE FROM quotes WHERE tenant_id=? AND id IN (?)', [tenantId, quoteIds]);
  }
  await connection.query('UPDATE daily_prospects SET converted_contact_id=NULL WHERE tenant_id=? AND converted_contact_id=?', [tenantId, contactId]);
  await connection.query('DELETE FROM opportunities WHERE tenant_id=? AND contact_id=?', [tenantId, contactId]);
  await connection.query('DELETE FROM contacts WHERE id=? AND tenant_id=?', [contactId, tenantId]);

  return {
    contact,
    opportunities: opportunityIds.length,
    quotes: quoteIds.length,
    invoices: invoiceIds.length,
  };
};

const remove = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const contactId = Number(req.params.id);
    const tenantId = req.user.tenant_id;

    await connection.beginTransaction();
    const result = await deleteContactData(connection, tenantId, contactId);
    if (!result) {
      await connection.rollback();
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }

    await connection.commit();
    res.json({
      message: `${result.contact.name} y todos sus datos asociados han sido eliminados`,
      deleted: {
        opportunities: result.opportunities,
        activities: true,
        quotes: result.quotes,
        invoices: result.invoices
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

const bulkRemove = async (req, res) => {
  const ids = [...new Set((req.body.ids || []).map(Number).filter(Number.isInteger))];
  if (!ids.length) return res.status(400).json({ message: 'Selecciona al menos un contacto' });
  if (ids.length > 500) return res.status(400).json({ message: 'Puedes eliminar hasta 500 contactos a la vez' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let deleted = 0;
    for (const contactId of ids) {
      const result = await deleteContactData(connection, req.user.tenant_id, contactId);
      if (result) deleted += 1;
    }
    await connection.commit();
    res.json({
      message: `${deleted} contacto${deleted === 1 ? '' : 's'} y sus datos asociados han sido eliminados`,
      deleted,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

module.exports = { list, getOne, create, update, remove, bulkRemove };
