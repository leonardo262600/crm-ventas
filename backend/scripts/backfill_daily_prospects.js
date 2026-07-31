#!/usr/bin/env node
'use strict';

const readline = require('readline');
const fs = require('fs');

const API_BASE = process.env.CRM_API_BASE || 'https://crm-ventas-backend-lidd.onrender.com/api';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
];

const batches = [
  {
    date: '2026-07-29',
    zones: [
      { name: 'Costa Brava y costa catalana', province: 'Girona/Tarragona', bboxes: [[41.32, 2.05, 41.48, 2.23], [41.90, 2.70, 42.05, 2.90]], target: 35 },
      { name: 'Costa Blanca', province: 'Alicante', bboxes: [[38.28, -0.58, 38.42, -0.38], [38.48, -0.22, 38.62, -0.05], [37.93, -0.78, 38.05, -0.62]], target: 35 },
      { name: 'Islas Canarias', province: 'Las Palmas/Santa Cruz de Tenerife', bboxes: [[28.02, -15.50, 28.20, -15.35], [28.40, -16.36, 28.52, -16.20], [28.00, -16.82, 28.15, -16.60], [28.90, -13.72, 29.03, -13.50], [28.43, -13.95, 28.58, -13.80], [27.72, -15.72, 27.88, -15.48], [28.34, -16.63, 28.45, -16.48]], target: 30 },
    ],
  },
  {
    date: '2026-07-30',
    zones: [
      { name: 'Costa de Galicia y Asturias', province: 'Galicia/Asturias', bboxes: [[42.15, -8.82, 42.32, -8.58], [43.28, -8.50, 43.43, -8.30], [43.48, -5.78, 43.60, -5.55]], searches: ['Vigo', 'A Coruña', 'Gijón', 'Pontevedra', 'Santiago de Compostela', 'Avilés'], target: 35 },
      { name: 'Costa de la Luz y Andalucía costera', province: 'Cádiz/Huelva/Málaga/Granada/Almería', bboxes: [[36.42, -6.38, 36.62, -6.15], [36.62, -6.02, 36.80, -5.85], [37.17, -7.05, 37.34, -6.85], [36.32, -6.22, 36.48, -6.05], [36.52, -6.30, 36.70, -6.12], [36.16, -6.17, 36.34, -5.93], [36.00, -5.70, 36.15, -5.52], [37.15, -7.45, 37.32, -7.25], [37.10, -7.38, 37.28, -7.12], [36.57, -6.44, 36.69, -6.30], [36.68, -6.50, 36.82, -6.28], [36.12, -6.02, 36.30, -5.80]], searches: ['Cádiz', 'Huelva', 'Jerez de la Frontera', 'Chiclana de la Frontera', 'San Fernando Cádiz', 'El Puerto de Santa María', 'Conil de la Frontera', 'Ayamonte', 'Isla Cristina', 'Rota Cádiz', 'Málaga', 'Marbella', 'Estepona', 'Fuengirola', 'Torremolinos', 'Benalmádena', 'Nerja', 'Motril', 'Almuñécar', 'Almería', 'Roquetas de Mar'], target: 35 },
      { name: 'Madrid, Castilla y zona centro', province: 'Madrid/Castilla y León/Castilla-La Mancha', bboxes: [[40.30, -3.85, 40.55, -3.55]], searches: ['Madrid', 'Getafe', 'Leganés', 'Alcobendas', 'Alcalá de Henares', 'Pozuelo de Alarcón', 'Majadahonda', 'Toledo', 'Guadalajara España', 'Segovia', 'Valladolid', 'Salamanca', 'Burgos', 'Cuenca España', 'Ávila'], target: 30 },
    ],
  },
];

const normalize = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const digits = value => String(value || '').replace(/\D/g, '');
const dateKey = value => value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value || '').slice(0, 10);

const normalizeWebsite = value => {
  if (!value) return '';
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      .hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return normalize(value);
  }
};

const normalizePhone = value => {
  if (!value) return null;
  const first = String(value).split(/[;,/]/)[0].trim();
  let number = digits(first);
  if (number.startsWith('0034')) number = number.slice(4);
  if (number.startsWith('34') && number.length === 11) number = number.slice(2);
  if (number.length !== 9) return first || null;
  return `+34 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
};

const pick = (tags, ...keys) => {
  for (const key of keys) if (tags[key]) return String(tags[key]).trim();
  return null;
};

const buildAddress = tags => {
  const street = pick(tags, 'addr:street', 'addr:place');
  const number = pick(tags, 'addr:housenumber');
  const postcode = pick(tags, 'addr:postcode');
  const city = pick(tags, 'addr:city', 'addr:town', 'addr:village', 'addr:municipality');
  return [street && number ? `${street}, ${number}` : street, postcode, city].filter(Boolean).join(', ') || null;
};

const scoreProspect = item => {
  let score = 15;
  const signals = ['nombre comercial y fuente pública'];
  if (item.phone) { score += 25; signals.push('teléfono comercial'); }
  if (item.email) { score += 20; signals.push('correo comercial'); }
  if (item.website) { score += 20; signals.push('web propia'); }
  if (item.address) { score += 10; signals.push('dirección pública'); }
  if (item.postal_code) { score += 5; signals.push('código postal'); }
  if (item.opening_hours) { score += 5; signals.push('horario publicado'); }
  score = Math.min(100, score);
  return {
    score,
    level: score >= 75 ? 'A' : score >= 50 ? 'B' : 'C',
    reason: `Señales verificadas: ${signals.join(', ')}. Fuente: OpenStreetMap.`,
    angle: item.website && item.phone
      ? 'Agencia con presencia digital y teléfono público: validar captación actual y proponer mayor visibilidad local.'
      : item.phone
        ? 'Contacto telefónico público: validar zona de captación y necesidad de mayor posicionamiento.'
        : 'Completar primero el contacto comercial desde su web o fuente pública antes de llamar.',
  };
};

const osmToProspect = (element, zone) => {
  const tags = element.tags || {};
  const agencyName = pick(tags, 'name', 'brand', 'operator');
  if (!agencyName) return null;
  const phone = normalizePhone(pick(tags, 'contact:phone', 'phone', 'contact:mobile', 'mobile'));
  const email = pick(tags, 'contact:email', 'email');
  const website = pick(tags, 'contact:website', 'website', 'url');
  const city = pick(tags, 'addr:city', 'addr:town', 'addr:village', 'addr:municipality') || zone.name;
  const province = pick(tags, 'addr:province', 'addr:state') || zone.province;
  const postalCode = pick(tags, 'addr:postcode');
  const address = buildAddress(tags);
  const type = element.type === 'node' ? 'node' : element.type === 'way' ? 'way' : 'relation';
  const sourceUrl = `https://www.openstreetmap.org/${type}/${element.id}`;
  const base = {
    zone: zone.name,
    city,
    province,
    agency_name: agencyName,
    phone,
    email,
    website,
    address,
    postal_code: postalCode,
    source_url: sourceUrl,
    opening_hours: pick(tags, 'opening_hours'),
  };
  const qualification = scoreProspect(base);
  return {
    ...base,
    qualification_score: qualification.score,
    qualification_level: qualification.level,
    qualification_reason: qualification.reason,
    call_angle: qualification.angle,
  };
};

const fetchJson = async (url, options = {}, attempts = 3) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(20000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 200)}`);
      return text ? JSON.parse(text) : {};
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
};

const queryZone = async zone => {
  const cachePath = `/private/tmp/crm-prospect-cache-${normalize(zone.name).replace(/ /g, '-')}.json`;
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (cached.length >= zone.target * 2) return cached;
  }
  const collected = [];
  if (process.env.CRM_USE_NOMINATIM !== '1') for (const bounds of zone.bboxes || [zone.bbox]) {
    const bbox = bounds.join(',');
    const query = `[out:json][timeout:45];
(
  nwr["office"="estate_agent"](${bbox});
  nwr["shop"="estate_agent"](${bbox});
  nwr["office"="property_management"](${bbox});
);
out center tags;`;
    let lastError;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const result = await fetchJson(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'CRM-Leonardo-Prospecting/1.0',
          },
          body: new URLSearchParams({ data: query }).toString(),
        }, 3);
        collected.push(...(result.elements || []).map(item => osmToProspect(item, zone)).filter(Boolean));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError && collected.length === 0) continue;
  }
  if (process.env.CRM_USE_NOMINATIM === '1' || collected.length < zone.target) {
    for (const cityName of zone.searches || []) {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=50&extratags=1&addressdetails=1&q=${encodeURIComponent(`inmobiliaria ${cityName} España`)}`;
      const results = await fetchJson(url, {
        headers: { 'User-Agent': 'CRM-Leonardo-Prospecting/1.0' },
      }, 2);
      for (const place of results) {
        const tags = place.extratags || {};
        const address = place.address || {};
        const base = {
          zone: zone.name,
          city: address.city || address.town || address.village || address.municipality || cityName,
          province: address.province || address.state || zone.province,
          agency_name: place.name || String(place.display_name || '').split(',')[0],
          phone: normalizePhone(pick(tags, 'contact:phone', 'phone', 'contact:mobile', 'mobile')),
          email: pick(tags, 'contact:email', 'email'),
          website: pick(tags, 'contact:website', 'website', 'url'),
          address: place.display_name || null,
          postal_code: address.postcode || null,
          source_url: place.osm_type && place.osm_id
            ? `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`
            : url,
          opening_hours: pick(tags, 'opening_hours'),
        };
        if (!base.agency_name) continue;
        const qualification = scoreProspect(base);
        collected.push({
          ...base,
          qualification_score: qualification.score,
          qualification_level: qualification.level,
          qualification_reason: qualification.reason,
          call_angle: qualification.angle,
        });
      }
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }
  if (!collected.length) throw new Error(`No se pudo consultar ${zone.name}`);
  fs.writeFileSync(cachePath, JSON.stringify(collected), { mode: 0o600 });
  return collected;
};

const promptHidden = question => new Promise(resolve => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  process.stdout.write(question);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  let value = '';
  const onData = chunk => {
    const char = chunk.toString();
    if (char === '\r' || char === '\n') {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.off('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(value);
    } else if (char === '\u0003') {
      process.exit(130);
    } else if (char === '\u007f') {
      value = value.slice(0, -1);
    } else {
      value += char;
    }
  };
  process.stdin.on('data', onData);
});

const api = async (path, token, options = {}, prospectingKey = null) => fetchJson(`${API_BASE}${path}`, {
  ...options,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(prospectingKey ? { 'X-Prospecting-Key': prospectingKey } : {}),
    ...(options.headers || {}),
  },
}, 2);

const loadAllExisting = async (token, prospectingKey = null) => {
  const all = [];
  for (let page = 1; ; page += 1) {
    const path = prospectingKey ? '/prospecting-automation' : '/prospecting';
    const result = await api(`${path}?status=todos&limit=100&page=${page}`, token, {}, prospectingKey);
    const items = result.items || [];
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
};

const loadDirectDatabase = () => {
  const envFile = process.env.CRM_DB_ENV_FILE;
  if (!envFile) return null;
  const values = JSON.parse(fs.readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(values)) process.env[key] = String(value);
  return require('../src/config/db');
};

const loadAllExistingDirect = async db => {
  const [rows] = await db.query(
    `SELECT id,batch_date,zone,city,province,agency_name,phone,email,website,address,postal_code,source_url,
            qualification_score,qualification_level,qualification_reason,call_angle
       FROM daily_prospects
      WHERE tenant_id=1`
  );
  return rows;
};

const insertDirect = async (db, batchDate, prospects) => {
  const [[admin]] = await db.query(
    `SELECT id FROM users
      WHERE tenant_id=1 AND role='admin' AND active=1
      ORDER BY id LIMIT 1`
  );
  if (!admin) throw new Error('No existe un administrador activo en producción');
  let inserted = 0;
  let duplicates = 0;
  for (const item of prospects) {
    const normalizedKey = [
      normalize(item.agency_name),
      normalize(item.city || item.zone),
      digits(item.phone),
    ].join('|');
    const [result] = await db.query(
      `INSERT IGNORE INTO daily_prospects
       (tenant_id,batch_date,zone,city,province,agency_name,phone,email,website,address,postal_code,source_url,
        qualification_score,qualification_level,qualification_reason,call_angle,normalized_key,created_by)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [batchDate, item.zone || item.city || null, item.city || null, item.province || null,
       item.agency_name, item.phone || null, item.email || null, item.website || null, item.address || null,
       item.postal_code || null, item.source_url || item.website || null,
       item.qualification_score, item.qualification_level, item.qualification_reason, item.call_angle,
       normalizedKey, admin.id]
    );
    if (result.affectedRows) inserted += 1; else duplicates += 1;
  }
  return { inserted, duplicates };
};

const makeSets = items => ({
  names: new Set(items.map(item => `${normalize(item.agency_name)}|${normalize(item.city || item.zone)}`)),
  phones: new Set(items.map(item => digits(item.phone)).filter(value => value.length >= 9)),
  emails: new Set(items.map(item => normalize(item.email)).filter(Boolean)),
  websites: new Set(items.map(item => normalizeWebsite(item.website)).filter(Boolean)),
});

const isDuplicate = (item, sets) => {
  if (sets.names.has(`${normalize(item.agency_name)}|${normalize(item.city || item.zone)}`)) return true;
  if (item.phone && sets.phones.has(digits(item.phone))) return true;
  if (item.email && sets.emails.has(normalize(item.email))) return true;
  if (item.website && sets.websites.has(normalizeWebsite(item.website))) return true;
  return false;
};

const addToSets = (item, sets) => {
  sets.names.add(`${normalize(item.agency_name)}|${normalize(item.city || item.zone)}`);
  if (item.phone) sets.phones.add(digits(item.phone));
  if (item.email) sets.emails.add(normalize(item.email));
  if (item.website) sets.websites.add(normalizeWebsite(item.website));
};

const main = async () => {
  const directDb = loadDirectDatabase();
  const keyFile = process.env.CRM_PROSPECTING_KEY_FILE;
  const prospectingKey = keyFile
    ? fs.readFileSync(keyFile, 'utf8').trim()
    : String(process.env.CRM_PROSPECTING_KEY || '').trim();
  let token = null;
  if (!directDb && !prospectingKey) {
    const email = process.env.CRM_EMAIL || await promptHidden('Usuario administrador: ');
    const password = process.env.CRM_PASSWORD || await promptHidden('Contraseña: ');
    const login = await api('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!login.token || login.user?.role !== 'admin') throw new Error('La cuenta no tiene acceso de administrador');
    token = login.token;
  }
  const existing = directDb
    ? await loadAllExistingDirect(directDb)
    : await loadAllExisting(token, prospectingKey);
  const sets = makeSets(existing);
  console.log(`Histórico actual: ${existing.length}`);

  for (const batch of batches) {
    const current = existing.filter(item => dateKey(item.batch_date) === batch.date);
    if (current.length >= 100) {
      console.log(`${batch.date}: ya contiene ${current.length}; no se modifica.`);
      continue;
    }
    const selected = [];
    for (const zone of batch.zones) {
      const candidates = await queryZone(zone);
      const accepted = [];
      for (const candidate of candidates) {
        if (isDuplicate(candidate, sets)) continue;
        accepted.push(candidate);
        addToSets(candidate, sets);
        if (accepted.length === zone.target) break;
      }
      if (accepted.length !== zone.target) {
        throw new Error(`${zone.name}: solo se encontraron ${accepted.length}/${zone.target} agencias nuevas`);
      }
      selected.push(...accepted);
      console.log(`${batch.date} · ${zone.name}: ${accepted.length}`);
    }
    if (selected.length !== 100) throw new Error(`${batch.date}: selección incorrecta (${selected.length})`);
    const result = directDb
      ? await insertDirect(directDb, batch.date, selected)
      : await api(prospectingKey ? '/prospecting-automation/bulk' : '/prospecting/bulk', token, {
          method: 'POST',
          body: JSON.stringify({ batch_date: batch.date, prospects: selected }),
        }, prospectingKey);
    if (result.inserted !== 100) {
      throw new Error(`${batch.date}: producción insertó ${result.inserted}/100; duplicados=${result.duplicates}`);
    }
    existing.push(...selected.map(item => ({ ...item, batch_date: batch.date })));
    console.log(`${batch.date}: 100 insertadas correctamente.`);
  }

  const verified = directDb
    ? await loadAllExistingDirect(directDb)
    : await loadAllExisting(token, prospectingKey);
  const counts = Object.fromEntries(batches.map(batch => [
    batch.date,
    verified.filter(item => dateKey(item.batch_date) === batch.date).length,
  ]));
  console.log(`Verificación final: ${JSON.stringify(counts)}; histórico=${verified.length}`);
  if (counts['2026-07-29'] !== 100 || counts['2026-07-30'] !== 100) {
    throw new Error('La verificación final no coincide con 100+100');
  }
  if (directDb) await directDb.end();
};

main().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
