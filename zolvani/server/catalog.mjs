import crypto from 'node:crypto';

export const PRODUCT_MONEY_FIELDS = Object.freeze([
  'costCOP', 'salePriceCOP', 'shippingCOP', 'commissionCOP', 'packagingCOP', 'advertisingCOP', 'otherCostsCOP', 'returnLossCOP',
]);
export const PRODUCT_FIELDS = Object.freeze([
  'name', 'category', 'supplier', 'supplierCode', 'sourceUrl', ...PRODUCT_MONEY_FIELDS, 'returnRateBps', 'availability', 'checkedAt',
]);
const TEXT_LIMITS = { name: 180, category: 80, supplier: 120, supplierCode: 100, availability: 80 };
const csvColumns = Object.freeze([
  ['name','nombre'],['category','categoria'],['supplier','proveedor'],['supplierCode','codigo_proveedor'],['sourceUrl','url_origen'],
  ['costCOP','costo_cop'],['salePriceCOP','precio_venta_cop'],['shippingCOP','flete_cop'],['commissionCOP','comision_cop'],
  ['packagingCOP','empaque_cop'],['advertisingCOP','publicidad_cop'],['otherCostsCOP','otros_costos_cop'],
  ['returnRateBps','tasa_rechazo_bps'],['returnLossCOP','perdida_por_rechazo_cop'],
  ['availability','disponibilidad'],['checkedAt','fecha_verificacion'],
]);
const sourceColumn = Object.fromEntries(csvColumns.filter(([field]) => field !== 'checkedAt').map(([field, column]) => [field, `fuente_${column}`]));
const freshDays = 30;
const nowIso = () => new Date().toISOString();
const newId = () => `PRD-${crypto.randomUUID().slice(0, 12)}`;
const cleanText = value => typeof value === 'string' ? value.trim() : '';

function parseCOP(value, field) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^[=+@]/.test(value.trim())) throw new Error(`Fórmula CSV no permitida en ${field}.`);
  if (typeof value === 'string' && value.trim().startsWith('-')) throw new Error(`El valor ${field} debe ser COP entero no negativo.`);
  const parsed = typeof value === 'number' ? value : /^\d+$/.test(String(value).trim()) ? Number(String(value).trim()) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`El valor ${field} debe ser COP entero no negativo.`);
  return parsed;
}
function parseBasisPoints(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) throw new Error('La tasa de rechazo debe ser un entero en puntos base entre 0 y 10000.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 10000) throw new Error('La tasa de rechazo debe ser un entero en puntos base entre 0 y 10000.');
  return parsed;
}

function validDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))
    || new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text) throw new Error('La fecha de verificación debe tener formato válido AAAA-MM-DD.');
  return text;
}

function normalizeSourceUrl(value) {
  const text = cleanText(value);
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { throw new Error('La URL de origen no es válida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('La URL de origen debe usar HTTP(S) y no incluir credenciales.');
  return url.toString().slice(0, 1000);
}

export function normalizeProduct(input, { id = newId(), existing = null, action = 'creado' } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ficha de producto inválida.');
  const product = { id, createdAt: existing?.createdAt || nowIso(), updatedAt: nowIso(), history: [...(existing?.history || [])], provenance: { ...(existing?.provenance || {}) } };
  for (const field of PRODUCT_FIELDS) {
    let value = input[field];
    if (field === 'sourceUrl') value = normalizeSourceUrl(value);
    else if (PRODUCT_MONEY_FIELDS.includes(field)) value = parseCOP(value, field);
    else if (field === 'returnRateBps') value = parseBasisPoints(value);
    else if (field === 'checkedAt') value = validDate(value);
    else {
      value = cleanText(value).slice(0, TEXT_LIMITS[field] || 180);
      if (/^[=+@]/.test(value)) throw new Error(`Fórmula no permitida en ${field}.`);
    }
    product[field] = value;
    const sourceInput = input.provenance?.[field] ?? existing?.provenance?.[field] ?? {};
    const source = cleanText(sourceInput.source ?? input.source).slice(0, 500);
    const verifiedAt = validDate(sourceInput.verifiedAt ?? (field === 'checkedAt' ? value : input.checkedAt)) || null;
    const hasData = value !== null && value !== '';
    product.provenance[field] = hasData ? { source, verifiedAt, verified: Boolean((sourceInput.verified || input.dataVerified) && source && verifiedAt) } : { source: '', verifiedAt, verified: false };
  }
  if (product.name.length < 2) throw new Error('El nombre del producto debe tener al menos dos caracteres.');
  if (product.availability && !['desconocida', 'disponible', 'agotada', 'limitada'].includes(product.availability.toLowerCase())) {
    product.availability = product.availability.slice(0, 80);
  }
  product.code = product.supplierCode || existing?.code || '';
  const changed = PRODUCT_FIELDS.filter(field => existing && JSON.stringify(existing[field] ?? null) !== JSON.stringify(product[field] ?? null));
  const changes = existing ? changed.map(field => ({ field, previous: existing[field] ?? null, current: product[field] ?? null,
    previousSource: existing.provenance?.[field]?.source || '', currentSource: product.provenance[field]?.source || '' })) : [];
  product.history.push({ at: nowIso(), action, changed: existing ? changed : [...PRODUCT_FIELDS], changes, source: 'catálogo local' });
  product.history = product.history.slice(-100);
  const inspection = inspectProduct(product);
  product.validationStatus = inspection.status;
  product.inspection = inspection;
  product.financial = calculateProfitability(product);
  return product;
}

export function calculateProfitability(product, { costIncreasePercent = 10 } = {}) {
  const sale = product?.salePriceCOP;
  const cost = product?.costCOP;
  const requiredMissing = ['salePriceCOP', 'costCOP'].filter(field => !Number.isSafeInteger(product?.[field]));
  const costFields = ['costCOP', 'shippingCOP', 'commissionCOP', 'packagingCOP', 'advertisingCOP', 'otherCostsCOP'];
  const missing = costFields.filter(field => !Number.isSafeInteger(product?.[field]));
  if (!Number.isSafeInteger(sale) || sale <= 0 || requiredMissing.length) return { status: 'no_calculable', salePriceCOP: Number.isSafeInteger(sale) ? sale : null,
    partialProfitCOP: null, profitCOP: null, marginPercent: null, knownCostsCOP: costFields.filter(f => Number.isSafeInteger(product?.[f])).reduce((sum, f) => sum + product[f], 0), missing, requiredMissing,
    scenarios: { plus10Percent: { partialProfitCOP: null, profitCOP: null } }, assumptions: ['Los importes ausentes siguen desconocidos; no se sustituyen por cero.'] };
  const knownCostsCOP = costFields.filter(field => Number.isSafeInteger(product?.[field])).reduce((sum, field) => sum + product[field], 0);
  const partialProfitCOP = sale - knownCostsCOP;
  const returnsBps = Number.isSafeInteger(product.returnRateBps) ? product.returnRateBps : null;
  const returnLossCOP = Number.isSafeInteger(product.returnLossCOP) ? product.returnLossCOP : null;
  const returnAdjustmentCOP = returnsBps !== null && returnLossCOP !== null ? Math.round(returnsBps * returnLossCOP / 10000) : 0;
  const adjustedPartial = partialProfitCOP - returnAdjustmentCOP;
  const full = missing.length === 0;
  const increase = Number.isFinite(costIncreasePercent) ? Math.max(0, Math.min(100, costIncreasePercent)) : 10;
  const stressedCosts = Math.round(knownCostsCOP * (1 + increase / 100));
  const profitCOP = full ? adjustedPartial : null;
  return { status: full ? 'calculable' : 'parcial', salePriceCOP: sale, knownCostsCOP, partialProfitCOP: adjustedPartial, profitCOP,
    marginPercent: Number((adjustedPartial / sale) * 100).toFixed(2) * 1,
    missing: missing.filter(field => !Number.isSafeInteger(product[field])), requiredMissing: [], returnAdjustmentCOP,
    scenarios: { plus10Percent: { partialProfitCOP: sale - stressedCosts - returnAdjustmentCOP, profitCOP: full ? sale - stressedCosts - returnAdjustmentCOP : null } },
    assumptions: [returnsBps !== null && returnLossCOP !== null ? `Riesgo de rechazo/devolución supuesto por el propietario: ${returnsBps / 100}% y pérdida por evento de ${returnLossCOP} COP.` : 'No se aplicó ajuste por devoluciones/rechazos: el supuesto no fue proporcionado.',
      `Escenario de sensibilidad: aumento del ${increase}% sobre los costos conocidos.`, ...(full ? [] : ['La utilidad es parcial; faltan costos que no se han supuesto.'])] };
}

export function inspectProduct(product, { now = nowIso(), maxAgeDays = freshDays } = {}) {
  const findings = [];
  for (const [field, title] of [['name','Nombre'],['category','Categoría'],['supplier','Proveedor'],['supplierCode','Código del proveedor']]) {
    if (!cleanText(product?.[field])) findings.push({ severity: 'error', code: `campo_${field}_faltante`, message: `Falta ${title}.` });
  }
  for (const field of PRODUCT_FIELDS) {
    if (product?.[field] !== null && product?.[field] !== '') {
      const provenance = product.provenance?.[field];
      if (!provenance?.source) findings.push({ severity: 'warning', code: 'fuente_faltante', field, message: `Falta fuente para ${field}.` });
      else if (!provenance.verified) findings.push({ severity: 'warning', code: 'dato_no_verificado', field, message: `El dato ${field} tiene una fuente registrada, pero aún no se confirmó.` });
      if (provenance?.verifiedAt) {
        const age = (Date.parse(now) - Date.parse(`${provenance.verifiedAt}T00:00:00Z`)) / 86400000;
        if (age > maxAgeDays) findings.push({ severity: 'warning', code: 'dato_desactualizado', field, message: `La verificación de ${field} tiene más de ${maxAgeDays} días.` });
      } else if (field !== 'checkedAt') findings.push({ severity: 'warning', code: 'verificacion_fecha_faltante', field, message: `No hay fecha de verificación para ${field}.` });
    }
  }
  if (!product?.checkedAt) findings.push({ severity: 'warning', code: 'fecha_verificacion_faltante', message: 'No hay fecha general de verificación.' });
  if (!product?.supplierCode) findings.push({ severity: 'error', code: 'referencia_faltante', message: 'Falta la referencia del proveedor.' });
  if (!product?.availability || product.availability.toLowerCase() === 'desconocida') findings.push({ severity: 'warning', code: 'disponibilidad_desconocida', message: 'La disponibilidad no está confirmada.' });
  if (product?.sourceUrl) {
    try { const url = new URL(product.sourceUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
    catch { findings.push({ severity: 'error', code: 'url_invalida', message: 'La URL de origen no es válida.' }); }
  }
  const financial = calculateProfitability(product || {});
  if (financial.status !== 'calculable') findings.push({ severity: 'warning', code: 'rentabilidad_incompleta', message: `Rentabilidad ${financial.status}; campos pendientes: ${financial.missing.join(', ') || financial.requiredMissing.join(', ')}.` });
  const regulated = /suplement|vitamina|cosm[eé]tic|crema|medic|salud|alimento|bebida|inal[aá]mbric|radiofrecuencia|bater[ií]a/i.test(`${product?.name || ''} ${product?.category || ''}`);
  if (regulated) findings.push({ severity: 'warning', code: 'riesgo_regulatorio', message: 'Revisar requisitos regulatorios, etiquetado y seguridad aplicables antes de ofrecer; Zolvani no determina cumplimiento legal.' });
  const status = findings.some(item => item.severity === 'error') ? 'requiere_datos'
    : findings.length ? 'requiere_revision' : 'candidato_aprobacion_propietario';
  return { status, inspectedAt: now, freshnessDays: maxAgeDays, findings };
}

function parseRows(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('El CSV debe ser texto UTF-8 de máximo 2 MB.');
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('CSV inválido: campo entre comillas sin cierre.');
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(item => item.some(value => value.trim() !== ''));
}

export function parseProductsCsv(text) {
  const rows = parseRows(text);
  if (!rows.length) throw new Error('El CSV está vacío.');
  const headers = rows[0].map(value => value.replace(/^\uFEFF/, '').trim());
  if (new Set(headers).size !== headers.length) throw new Error('CSV inválido: hay encabezados duplicados.');
  const required = [...csvColumns.map(([, col]) => col), ...Object.values(sourceColumn)];
  const missing = required.filter(column => !headers.includes(column));
  const extra = headers.filter(column => !required.includes(column));
  if (missing.length || extra.length) throw new Error(`Encabezados CSV incorrectos. Faltan: ${missing.join(', ') || 'ninguno'}; sobran: ${extra.join(', ') || 'ninguno'}.`);
  if (rows.length - 1 > 500) throw new Error('El CSV admite máximo 500 productos por importación.');
  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Fila ${index + 2}: cantidad de columnas incorrecta.`);
    const raw = Object.fromEntries(headers.map((header, column) => [header, values[column].trim()]));
    for (const [header, value] of Object.entries(raw)) if (/^[=+@-]/.test(value)) throw new Error(`Fórmula CSV no permitida en fila ${index + 2}, campo ${header}.`);
    const product = Object.fromEntries(csvColumns.map(([field, column]) => [field, raw[column] || null]));
    product.provenance = Object.fromEntries(csvColumns.filter(([field]) => field !== 'checkedAt').map(([field]) => [field, { source: raw[sourceColumn[field]], verifiedAt: raw.fecha_verificacion || null, verified: false }]));
    return normalizeProduct(product);
  });
}

export function productsCsvTemplate() {
  const headers = [...csvColumns.map(([, col]) => col), ...Object.values(sourceColumn)];
  return `${headers.join(',')}\r\n`;
}
