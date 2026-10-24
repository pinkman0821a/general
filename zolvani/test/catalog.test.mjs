import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProfitability, inspectProduct, normalizeProduct, parseProductsCsv, productsCsvTemplate,
} from '../server/catalog.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../server/index.mjs';
import { Hive } from '../server/core.mjs';

const input = (extra = {}) => ({
  name: 'Producto ficticio para pruebas', category: 'Accesorios', supplier: 'Proveedor ficticio', supplierCode: 'FIC-001',
  sourceUrl: 'https://ejemplo.invalid/producto', costCOP: '20000', salePriceCOP: '50000', shippingCOP: '5000',
  commissionCOP: '2500', packagingCOP: '1000', advertisingCOP: '3000', otherCostsCOP: '500', availability: 'desconocida',
  source: 'Referencia ficticia entregada manualmente', checkedAt: '2026-10-23', ...extra,
});

test('normaliza producto en COP entero, registra procedencia por campo e historial inicial', () => {
  const product = normalizeProduct(input(), { id: 'PRD-test' });
  assert.equal(product.id, 'PRD-test');
  assert.equal(product.costCOP, 20000);
  assert.equal(product.provenance.costCOP.source, 'Referencia ficticia entregada manualmente');
  assert.equal(product.provenance.costCOP.verified, false);
  assert.equal(product.history[0].action, 'creado');
});

test('rechaza importes fraccionarios, negativos, desbordados y enlaces con credenciales', () => {
  for (const value of ['1.5', '-2', '9007199254740992', '=1+1']) {
    assert.throws(() => normalizeProduct(input({ costCOP: value })), /COP|fórmula/i);
  }
  assert.throws(() => normalizeProduct(input({ sourceUrl: 'https://usuario:secreto@example.com/p' })), /URL/i);
});

test('un precio de venta cero no produce margen infinito ni rentabilidad calculable', () => {
  const result = calculateProfitability(normalizeProduct(input({ salePriceCOP:'0' })));
  assert.equal(result.status, 'no_calculable');
  assert.equal(result.marginPercent, null);
});

test('aplica devolución/rechazo solo cuando ambos valores se registran como supuesto explícito', () => {
  const product = normalizeProduct(input({ returnRateBps:'500', returnLossCOP:'20000' }));
  assert.equal(product.financial.returnAdjustmentCOP, 1000);
  assert.equal(product.financial.profitCOP, 17000);
  assert.match(product.financial.assumptions[0], /supuesto por el propietario/);
});

test('calcula utilidad unitaria y margen con solo costos conocidos, sin rellenar faltantes', () => {
  const result = calculateProfitability(normalizeProduct(input({ commissionCOP: '', packagingCOP: '', advertisingCOP: '', otherCostsCOP: '' })));
  assert.equal(result.status, 'parcial');
  assert.equal(result.partialProfitCOP, 25000);
  assert.equal(result.marginPercent, 50);
  assert.deepEqual(result.missing, ['commissionCOP', 'packagingCOP', 'advertisingCOP', 'otherCostsCOP']);
  assert.equal(result.scenarios.plus10Percent.partialProfitCOP, 22500);
});

test('no calcula si falta precio de venta o costo de adquisición y no inventa disponibilidad', () => {
  const product = normalizeProduct(input({ salePriceCOP: '', costCOP: '' }));
  const result = calculateProfitability(product);
  assert.equal(result.status, 'no_calculable');
  assert.equal(result.partialProfitCOP, null);
  const inspection = inspectProduct(product, { now: '2026-10-23T12:00:00Z' });
  assert.ok(inspection.findings.some(item => item.code === 'disponibilidad_desconocida'));
  assert.equal(product.availability, 'desconocida');
});

test('inspecciona origen, vigencia y riesgos regulatorios sin declarar listo para vender', () => {
  const product = normalizeProduct(input({ name: 'Suplemento vitamínico ficticio', checkedAt: '2026-08-01' }));
  const inspection = inspectProduct(product, { now: '2026-10-23T12:00:00Z' });
  assert.equal(inspection.status, 'requiere_revision');
  assert.ok(inspection.findings.some(item => item.code === 'dato_desactualizado'));
  assert.ok(inspection.findings.some(item => item.code === 'riesgo_regulatorio'));
  assert.notEqual(inspection.status, 'listo_para_vender');
});

test('importa CSV compatible con fuentes individuales, tolera comillas y rechaza fórmulas', () => {
  const columns = ['nombre','categoria','proveedor','codigo_proveedor','url_origen','costo_cop','precio_venta_cop','flete_cop','comision_cop','empaque_cop','publicidad_cop','otros_costos_cop','tasa_rechazo_bps','perdida_por_rechazo_cop','disponibilidad','fecha_verificacion','fuente_nombre','fuente_categoria','fuente_proveedor','fuente_codigo_proveedor','fuente_url_origen','fuente_costo_cop','fuente_precio_venta_cop','fuente_flete_cop','fuente_comision_cop','fuente_empaque_cop','fuente_publicidad_cop','fuente_otros_costos_cop','fuente_tasa_rechazo_bps','fuente_perdida_por_rechazo_cop','fuente_disponibilidad'];
  const values = ['"Camiseta, prueba"','Ropa','Proveedor demo','REF-1','https://ejemplo.invalid/p','10000','25000','3000','0','0','0','0','','','desconocida','2026-10-23',...Array(15).fill('fuente ficticia')];
  const products = parseProductsCsv(`${columns.join(',')}\r\n${values.join(',')}`);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Camiseta, prueba');
  assert.equal(products[0].provenance.costCOP.source, 'fuente ficticia');
  assert.throws(() => parseProductsCsv(`${columns.join(',')}\n${values.map((item,index)=>index===0?'=HYPERLINK("http://malicioso")':item).join(',')}`), /fórmula/i);
  assert.throws(() => parseProductsCsv(`${columns.join(',')}\n${values.map((item,index)=>index===2?'-1+cmd':item).join(',')}`), /fórmula/i);
  assert.throws(() => parseProductsCsv('nombre,nombre\nuno,dos'), /encabezados/i);
});

test('API local registra, actualiza con historial, importa y persiste el catálogo sin tocar ventas', async () => {
  const tempRoot = path.resolve('.test-tmp'); fs.mkdirSync(tempRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tempRoot, 'catalog-'));
  const file = path.join(dir, 'state.json');
  const { server, hive } = createServer({ stateFile: file, auto: false, allowRealAI: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const saved = await fetch(`${base}/api/products`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(input({ source:'Proveedor ficticio / referencia aportada manualmente', dataVerified:true })) });
    assert.equal(saved.status, 201);
    const product = (await saved.json()).product;
    assert.equal(product.financial.profitCOP, 18000);
    assert.equal(product.validationStatus, 'requiere_revision');
    const duplicate = await fetch(`${base}/api/products`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(input({ supplier:'PROVEEDOR FICTICIO', supplierCode:'fic-001' })) });
    assert.equal(duplicate.status, 400);
    const changed = await fetch(`${base}/api/products/${product.id}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(input({ source:'Proveedor ficticio / cotización nueva', dataVerified:true, costCOP:'21000' })) });
    assert.equal(changed.status, 200);
    const updated = (await changed.json()).product;
    assert.ok(updated.history.at(-1).changes.some(change => change.field === 'costCOP' && change.previous === 20000 && change.current === 21000));
    const notReady = await fetch(`${base}/api/products/PRD-ausente`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(input()) });
    assert.equal(notReady.status, 404);
    const snapshot = await (await fetch(`${base}/api/state`)).json();
    assert.equal(snapshot.products.length, 1);
    assert.equal(snapshot.budget.spent, 0);
    assert.equal(snapshot.orders.length, 0);
    const restored = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(restored.products[0].history.at(-1).action, 'actualizado');
    const template = await fetch(`${base}/api/products/template.csv`); assert.equal(template.status, 200); assert.match(template.headers.get('content-type'), /text\/csv/);
    const headers = productsCsvTemplate().trim().split(',');
    const values = ['Producto CSV ficticio','Accesorios','Proveedor ficticio','CSV-TEST','','15000','30000','3000','0','0','0','0','','','desconocida','2026-10-23',...Array(15).fill('Fuente ficticia importada')];
    const imported = await fetch(`${base}/api/products/import`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ csv:`${headers.join(',')}\n${values.join(',')}` }) });
    assert.equal(imported.status, 201); assert.equal((await imported.json()).imported, 1);
    const attack = await fetch(`${base}/api/products/import`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ csv:`${headers.join(',')}\n${values.map((value,index)=>index===0?'=cmd|calc':value).join(',')}` }) });
    assert.equal(attack.status, 400);
  } finally { hive.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive:true, force:true }); }
});

test('Reina envía fichas de producto y cálculos deterministas a las etapas con entrada no confiable', async () => {
  const tempRoot = path.resolve('.test-tmp'); fs.mkdirSync(tempRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tempRoot, 'catalog-goal-'));
  const captured = [];
  const provider = { id:'omniroute-test', model:'free-test', async execute(task) {
    captured.push(task);
    const base = { provider:this.id, simulated:false, summary:'Revisión cualitativa con datos aportados.', evidence:['No se consultó Internet ni se comprobó mercado.'] };
    if (task.taskKind === 'plan') return { ...base, summary:'Plan del catálogo.', plan:[
      {type:'productos',title:'Explorar referencias aportadas',details:'Ordena características y riesgos.',dependsOn:[]},
      {type:'precios',title:'Interpretar cálculo determinista',details:'Usa solo cálculo local y datos previos.',dependsOn:['productos']},
      {type:'calidad',title:'Inspeccionar ficha',details:'Revisa fuentes y campos faltantes.',dependsOn:['productos','precios']},
    ] };
    if (task.agentId === 'financiera') return { ...base, summary:'El cálculo determinista local está disponible; no se estiman datos de mercado.', evidence:['No se agregaron costos, precio ni demanda externos.'] };
    return base;
  } };
  const hive = new (await import('../server/core.mjs')).Hive(path.join(dir,'state.json'), { auto:true, provider, allowRealAI:true });
  try {
    const product = hive.addProduct(input({ availability:'disponible', dataVerified:true }));
    const accepted = hive.addRealGoal({ objective:'Analizar la ficha del producto ficticio para revisar oportunidad y riesgos.', productIds:[product.id], idempotencyKey:'catalog-goal-test-001' });
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline && hive.snapshot().goals[0].status !== 'completado') await new Promise(resolve => setTimeout(resolve, 5));
    const goal = hive.snapshot().goals[0];
    assert.equal(goal.status, 'completado');
    assert.equal(goal.productAnalysis[0].financial.profitCOP, 18000);
    assert.equal(goal.report.products[0].financial.profitCOP, 18000);
    assert.match(captured.find(task=>task.taskKind==='plan').details, /FICHAS DE CATÁLOGO/);
    const financialTask = captured.find(task=>task.agentId==='financiera');
    assert.match(financialTask.details, /CÁLCULO DETERMINISTA DE ZOLVANI/);
    assert.match(financialTask.details, /No se consultó Internet ni se comprobó mercado/);
    assert.equal(goal.aiCalls, 4);
    assert.equal(hive.snapshot().budget.spent, 0);
    assert.deepEqual(hive.snapshot().orders, []);
    const privateProduct = hive.addProduct(input({ supplier:'contacto@example.com' }));
    assert.throws(() => hive.addRealGoal({ objective:'Analizar esta referencia de catálogo ficticia.', productIds:[privateProduct.id], idempotencyKey:'catalog-goal-test-002' }), /datos personales/);
  } finally { hive.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test('Financiera solo acepta cifras respaldadas por el catálogo y la calculadora local', () => {
  const dir = fs.mkdtempSync(path.join(path.resolve('.test-tmp'), 'catalog-finance-'));
  const provider = { id:'omniroute-test', model:'test' };
  const hive = new Hive(path.join(dir,'state.json'), { auto:false, provider, allowRealAI:true });
  try {
    const product = hive.addProduct(input({ availability:'disponible', dataVerified:true }));
    const goal = hive.addRealGoal({ objective:'Analizar rentabilidad de esta referencia ficticia.', productIds:[product.id], idempotencyKey:'catalog-finance-test-01' }).goal;
    const task = { goalId:goal.id, agentId:'financiera', providerId:provider.id };
    const valid = { simulated:false, provider:provider.id, summary:'La utilidad local calculada es 18000 COP; no valida la oportunidad comercial.', evidence:['El cálculo usa solo la ficha aportada.'] };
    const fabricated = { ...valid, summary:'La utilidad real será 999999 COP y el margen será 99%.', evidence:['Precio de venta confirmado.'] };
    assert.equal(hive.validateGoalStage(task, valid), true);
    assert.equal(hive.validateGoalStage(task, fabricated), false);
  } finally { hive.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test('la API rechaza una evaluación con posible PII antes de llamar al proveedor', async () => {
  const tempRoot = path.resolve('.test-tmp'); fs.mkdirSync(tempRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tempRoot, 'catalog-pii-'));
  let calls = 0;
  const provider = { id:'omniroute-test', model:'free-test', status:async()=>({canExecute:true}), async execute(){calls++;throw new Error('No debe llamarse');} };
  const { server, hive } = createServer({ stateFile:path.join(dir,'state.json'), auto:false, provider, allowRealAI:true });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const saved = await fetch(`${base}/api/products`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(input({ supplier:'contacto@example.com' })) });
    const product = (await saved.json()).product;
    const response = await fetch(`${base}/api/goals/real`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({
      idempotencyKey:'catalog-pii-goal-001', objective:'Evalúa la ficha comercial aportada por el propietario.', productIds:[product.id],
    }) });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /datos personales/);
    assert.equal(calls, 0);
    assert.equal(hive.snapshot().goals.length, 0);
  } finally { hive.close(); await new Promise(resolve=>server.close(resolve)); fs.rmSync(dir,{recursive:true,force:true}); }
});
