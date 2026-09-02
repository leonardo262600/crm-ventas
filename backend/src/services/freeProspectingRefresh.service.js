const db = require('../config/db');

const BBOXES = [
  [40.20,-4.10,40.80,-3.20], [41.15,1.70,41.80,2.60], [38.90,-0.80,39.90,0.10],
  [36.25,-7.00,38.00,-3.80], [37.70,-1.00,39.00,0.10], [41.20,-1.30,43.70,0.00],
  [42.70,-9.40,43.80,-5.30], [27.60,-18.20,29.50,-13.20], [38.70,-9.60,41.20,-5.50],
];
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let refreshJob = { status: 'idle', result: null, error: null, started_at: null, finished_at: null };
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digits = value => String(value || '').replace(/\D/g, '');
const websiteHost = value => { try { return new URL(/^https?:/i.test(value || '') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return normalize(value); } };
const pick = (tags, ...keys) => keys.map(key => tags[key]).find(Boolean) || null;

const toProspect = element => {
  const tags = element.tags || {};
  const agencyName = pick(tags, 'name', 'brand', 'operator');
  if (!agencyName) return null;
  const phone = pick(tags, 'contact:phone', 'phone', 'contact:mobile', 'mobile');
  const email = pick(tags, 'contact:email', 'email');
  const website = pick(tags, 'contact:website', 'website', 'url');
  if (!phone && !email && !website) return null;
  const city = pick(tags, 'addr:city', 'addr:town', 'addr:village', 'addr:municipality') || 'España';
  const province = pick(tags, 'addr:province', 'addr:state');
  const postalCode = pick(tags, 'addr:postcode');
  const street = pick(tags, 'addr:street', 'addr:place');
  const number = pick(tags, 'addr:housenumber');
  const address = [street && number ? `${street}, ${number}` : street, postalCode, city].filter(Boolean).join(', ') || null;
  let score = 20;
  const signals = ['actividad en un directorio público'];
  if (phone) { score += 25; signals.push('teléfono público'); }
  if (email) { score += 20; signals.push('correo público'); }
  if (website) { score += 20; signals.push('web propia'); }
  if (address) { score += 10; signals.push('dirección'); }
  if (tags.opening_hours) { score += 5; signals.push('horario publicado'); }
  score = Math.min(score, 100);
  return {
    agency_name: agencyName, city, zone: city, province, phone, email, website, address,
    postal_code: postalCode,
    source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    qualification_score: score,
    qualification_level: score >= 75 ? 'A' : score >= 50 ? 'B' : 'C',
    qualification_reason: `Señales públicas verificables: ${signals.join(', ')}.`,
    call_angle: website && phone
      ? 'Validar su volumen de captación actual y ofrecer más contactos de propietarios en su zona.'
      : 'Confirmar su zona de trabajo y su necesidad actual de captar nuevas propiedades.',
    extra_info: JSON.stringify({ provider: 'openstreetmap', osm_type: element.type, osm_id: element.id }),
  };
};

const queryBox = async box => {
  const query = `[out:json][timeout:60];(nwr["office"="estate_agent"](${box.join(',')});nwr["shop"="estate_agent"](${box.join(',')}););out center tags;`;
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', signal: AbortSignal.timeout(70000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'CRM-Personal-Prospecting/2.0' },
        body: new URLSearchParams({ data: query }).toString(),
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      return (await response.json()).elements || [];
    } catch (error) { lastError = error; }
  }
  throw lastError;
};

const refreshFreeProspecting = async (tenantId, userId, target = 50) => {
  const results = await Promise.allSettled(BBOXES.map(queryBox));
  const elements = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!elements.length) throw new Error('Las fuentes públicas no están disponibles temporalmente');
  const [existing] = await db.query('SELECT agency_name,city,zone,phone,email,website FROM daily_prospects WHERE tenant_id=?', [tenantId]);
  const names = new Set(existing.map(item => `${normalize(item.agency_name)}|${normalize(item.city || item.zone)}`));
  const phones = new Set(existing.map(item => digits(item.phone)).filter(value => value.length >= 9));
  const emails = new Set(existing.map(item => normalize(item.email)).filter(Boolean));
  const websites = new Set(existing.map(item => websiteHost(item.website)).filter(Boolean));
  const selected = [];
  const seen = new Set();
  for (const prospect of elements.map(toProspect).filter(Boolean).sort((a, b) => b.qualification_score - a.qualification_score)) {
    const nameKey = `${normalize(prospect.agency_name)}|${normalize(prospect.city || prospect.zone)}`;
    const key = `${nameKey}|${digits(prospect.phone)}`;
    if (seen.has(key) || names.has(nameKey) || (prospect.phone && phones.has(digits(prospect.phone))) ||
        (prospect.email && emails.has(normalize(prospect.email))) || (prospect.website && websites.has(websiteHost(prospect.website)))) continue;
    seen.add(key); selected.push(prospect);
    if (selected.length === target) break;
  }
  if (selected.length !== target) throw new Error(`Solo se encontraron ${selected.length}/${target} agencias nuevas; no se modificó nada`);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [archived] = await connection.query("UPDATE daily_prospects SET status='no_interesa' WHERE tenant_id=? AND status='pendiente'", [tenantId]);
    const batchDate = new Date().toISOString().slice(0, 10);
    let inserted = 0;
    for (const item of selected) {
      const normalizedKey = `${normalize(item.agency_name)}|${normalize(item.city || item.zone)}|${digits(item.phone)}`;
      const [result] = await connection.query(
        `INSERT IGNORE INTO daily_prospects
         (tenant_id,batch_date,zone,city,province,agency_name,phone,email,website,address,postal_code,source_url,
          contact_person,extra_info,qualification_score,qualification_level,qualification_reason,call_angle,normalized_key,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [tenantId,batchDate,item.zone,item.city,item.province,item.agency_name,item.phone,item.email,item.website,item.address,item.postal_code,item.source_url,
         null,item.extra_info,item.qualification_score,item.qualification_level,item.qualification_reason,item.call_angle,normalizedKey,userId]
      );
      inserted += result.affectedRows;
    }
    if (inserted !== target) throw new Error(`La carga insertó ${inserted}/${target}; se canceló toda la operación`);
    await connection.commit();
    return { archived: archived.affectedRows, inserted, batch_date: batchDate, sources_ok: results.filter(x => x.status === 'fulfilled').length };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const startRefreshJob = (tenantId, userId, target = 50) => {
  if (refreshJob.status === 'processing') return refreshJob;
  refreshJob = { status: 'processing', result: null, error: null, started_at: new Date().toISOString(), finished_at: null };
  refreshFreeProspecting(tenantId, userId, target)
    .then(result => { refreshJob = { ...refreshJob, status: 'completed', result, finished_at: new Date().toISOString() }; })
    .catch(error => { refreshJob = { ...refreshJob, status: 'failed', error: error.message, finished_at: new Date().toISOString() }; });
  return refreshJob;
};

const getRefreshJob = () => refreshJob;

module.exports = { startRefreshJob, getRefreshJob };
