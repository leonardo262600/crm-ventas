const DEFAULT_START = '09:00:00';
const DEFAULT_END = '19:00:00';
const CLOSER_ROLES = ['admin', 'gerente', 'vendedor'];

const ensureCalendarSchema = async db => {
  await db.query(`CREATE TABLE IF NOT EXISTS closer_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    closer_id INT NOT NULL,
    weekday TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_closer_availability (tenant_id,closer_id,weekday,start_time,end_time),
    KEY idx_closer_availability_lookup (tenant_id,closer_id,weekday,active)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS demo_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    opportunity_id INT NOT NULL,
    prospect_id INT NULL,
    closer_id INT NOT NULL,
    setter_id INT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'programada',
    corporate_status VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    corporate_synced_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_demo_booking_opportunity (tenant_id,opportunity_id),
    KEY idx_demo_booking_slot (tenant_id,closer_id,start_at,end_at,status),
    KEY idx_demo_booking_corporate (tenant_id,closer_id,corporate_status)
  )`);
  // The calendar event lasts 30 minutes. Availability is blocked separately for 60 minutes.
  await db.query(`UPDATE demo_bookings
    SET end_at=DATE_ADD(start_at, INTERVAL 30 MINUTE)
    WHERE end_at<>DATE_ADD(start_at, INTERVAL 30 MINUTE)`);
};

const parseSlot = value => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const startAt = `${year}-${month}-${day} ${hour}:${minute}:00`;
  const meetingEndDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute) + 30));
  const blockEndDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute) + 60));
  const endAt = meetingEndDate.toISOString().slice(0, 19).replace('T', ' ');
  const blockEndAt = blockEndDate.toISOString().slice(0, 19).replace('T', ' ');
  const weekday = (new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay() + 6) % 7;
  return { startAt, endAt, blockEndAt, weekday, time:`${hour}:${minute}:00`, blockEndTime:blockEndAt.slice(11), date:`${year}-${month}-${day}` };
};

const availabilityForCloser = async (connection, tenantId, closerId, slot) => {
  const [configured] = await connection.query(
    'SELECT weekday,start_time,end_time,active FROM closer_availability WHERE tenant_id=? AND closer_id=?',
    [tenantId, closerId]
  );
  if (!configured.length) {
    return slot.weekday < 5 && slot.time >= DEFAULT_START && slot.blockEndTime <= DEFAULT_END;
  }
  return configured.some(row => Number(row.active) === 1
    && Number(row.weekday) === slot.weekday
    && slot.time >= String(row.start_time)
    && slot.blockEndTime <= String(row.end_time));
};

const closerHasConflict = async (connection, tenantId, closerId, slot) => {
  const [[row]] = await connection.query(
    `SELECT COUNT(*) AS total FROM opportunities
      WHERE tenant_id=? AND assigned_to=? AND demo_status IN ('programada','reagendada')
        AND demo_date < ? AND DATE_ADD(demo_date, INTERVAL 60 MINUTE) > ?`,
    [tenantId, closerId, slot.blockEndAt, slot.startAt]
  );
  return Number(row.total || 0) > 0;
};

const availableClosers = async (connection, tenantId, startAt) => {
  const slot = parseSlot(startAt);
  if (!slot) throw Object.assign(new Error('Fecha y hora no válidas'), { statusCode:400 });
  const [closers] = await connection.query(
    `SELECT id,name,email,role FROM users
      WHERE tenant_id=? AND active=1 AND deleted_at IS NULL AND role IN (?,?,?) ORDER BY name`,
    [tenantId, ...CLOSER_ROLES]
  );
  const result = [];
  for (const closer of closers) {
    if (!await availabilityForCloser(connection, tenantId, closer.id, slot)) continue;
    if (await closerHasConflict(connection, tenantId, closer.id, slot)) continue;
    const [[load]] = await connection.query(
      `SELECT COUNT(*) AS total FROM opportunities
        WHERE tenant_id=? AND assigned_to=? AND DATE(demo_date)=? AND demo_status IN ('programada','reagendada')`,
      [tenantId, closer.id, slot.date]
    );
    result.push({ ...closer, bookings_that_day:Number(load.total || 0) });
  }
  return { slot, closers:result.sort((a, b) => a.bookings_that_day - b.bookings_that_day || a.id - b.id) };
};

const acquireSlotLock = async (connection, tenantId, startAt) => {
  const lockName = `demo-slot-${tenantId}-${String(startAt).slice(0, 16)}`;
  const [[lock]] = await connection.query('SELECT GET_LOCK(?,5) AS acquired', [lockName]);
  if (Number(lock.acquired) !== 1) throw Object.assign(new Error('Otro usuario está reservando este horario. Inténtalo de nuevo.'), { statusCode:409 });
  return lockName;
};

const releaseSlotLock = async (connection, lockName) => {
  if (lockName) await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
};

module.exports = { ensureCalendarSchema, parseSlot, availableClosers, acquireSlotLock, releaseSlotLock };
