import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const VERSION = '0.1.0-preview.1';
export const AGENTS = Object.freeze([
  { id: 'reina', name: 'Reina', role: 'Coordinación', emoji: '♛', color: '#F7B844' },
  { id: 'exploradora', name: 'Exploradora', role: 'Productos y proveedores', emoji: '⌕', color: '#6FE4CF' },
  { id: 'financiera', name: 'Financiera', role: 'Costos y márgenes', emoji: '$', color: '#82A9FF' },
  { id: 'creativa', name: 'Creativa', role: 'Publicidad', emoji: '✎', color: '#F69FD3' },
  { id: 'vendedora', name: 'Vendedora', role: 'Pedidos y atención', emoji: '◌', color: '#F7A677' },
  { id: 'inspectora', name: 'Inspectora', role: 'Control de calidad', emoji: '✓', color: '#BFA5FF' },
  { id: 'guardiana', name: 'Guardiana', role: 'Seguridad', emoji: '◇', color: '#99D57A' },
]);
const ASSIGN = { productos: 'exploradora', precios: 'financiera', contenido: 'creativa', ventas: 'vendedora', calidad: 'inspectora', seguridad: 'guardiana' };
const validTypes = new Set(Object.keys(ASSIGN));
const validPriorities = new Set(['alta', 'media', 'baja']);
const now = () => new Date().toISOString();
const str = (input, limit = 300) => typeof input === 'string' ? input.trim().slice(0, limit) : '';
const nextId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const activeStatuses = new Set(['asignada', 'en_progreso', 'ejecutando', 'verificando']);
const interruptedStatuses = new Set(['en_progreso', 'ejecutando', 'verificando']);
const isRealTask = task => task.simulated === false || ['codex', 'codex-exec', 'omniroute'].includes(task.executionMode);

function baseState() {
  return { meta: { brand: 'ZOLVANI', version: VERSION, mode: 'simulacion', createdAt: now(), localOnly: true },
    budget: { currency: 'COP', initial: 130000, spent: 0 }, tasks: [], products: [], orders: [], events: [] };
}
function addHistory(task, status, message) {
  task.status = status;
  task.history ??= [];
  task.history.push({ status, at: now(), message });
  task.history = task.history.slice(-100);
}

export class Hive {
  constructor(stateFile, { auto = true, delayMs = 2000, provider = null, allowRealAI = false } = {}) {
    this.file = stateFile; this.auto = auto; this.delayMs = delayMs; this.provider = provider;
    this.allowRealAI = Boolean(allowRealAI && provider); this.paused = false;
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    this.db = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : baseState();
    this.db.meta ??= baseState().meta; this.db.tasks ??= []; this.db.products ??= []; this.db.orders ??= []; this.db.events ??= [];
    for (const task of this.db.tasks) {
      if (!task.executionMode) task.executionMode = 'simulation';
      if (typeof task.simulated !== 'boolean') task.simulated = task.executionMode === 'simulation';
      if (isRealTask(task) && !task.providerId) task.providerId = task.executionMode === 'codex' ? 'codex-exec' : task.executionMode;
    }
    this.current = null; this.listeners = new Set(); this.controllers = new Map();
    // Interrupted real calls are never replayed automatically: the owner can inspect and decide.
    const stranded = this.db.tasks.filter(t => isRealTask(t) && interruptedStatuses.has(t.status));
    for (const task of stranded) addHistory(task, 'necesita_intervencion', 'Interrupción del servidor; no se reintentó para evitar consumo duplicado.');
    const demoStranded = this.db.tasks.filter(t => !isRealTask(t) && ['en_progreso', 'verificando'].includes(t.status));
    for (const task of demoStranded) { addHistory(task, 'pendiente', 'Demostración recuperada tras reinicio.'); task.validation = null; }
    if (stranded.length || demoStranded.length) this.log(`${stranded.length + demoStranded.length} tarea(s) interrumpida(s) recuperada(s).`);
    this.log('Sistema local iniciado. Sin conexiones a plataformas comerciales.'); this.persist();
    if (auto) this.schedule();
  }
  persist() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), { mode: 0o600 }); fs.renameSync(tmp, this.file);
    for (const listener of this.listeners) { try { listener(); } catch {} }
  }
  log(message, taskId = null) {
    this.db.events.unshift({ id: nextId('evt'), at: now(), message, taskId }); this.db.events = this.db.events.slice(0, 100);
  }
  snapshot() {
    const busy = this.db.tasks.filter(t => ['en_progreso', 'ejecutando', 'verificando'].includes(t.status));
    return {
      meta: this.db.meta, budget: { ...this.db.budget, available: Math.max(0, this.db.budget.initial - this.db.budget.spent) },
      engine: { available: this.auto, paused: this.paused, concurrency: 1, active: this.current !== null,
        provider: this.allowRealAI ? { id: this.provider.id || 'ai-provider', enabled: true, model: this.provider.model || null, authChecked: false } : { id: 'none', enabled: false, model: null, authChecked: false } },
      agents: AGENTS.map(agent => {
        const forAgent = this.db.tasks.filter(item => item.agentId === agent.id);
        const task = forAgent.find(item => ['en_progreso', 'ejecutando', 'verificando'].includes(item.status))
          || forAgent.find(item => item.status === 'asignada')
          || forAgent.find(item => ['error', 'necesita_intervencion'].includes(item.status));
        const status = task?.status === 'asignada' ? 'asignada' : task?.status === 'verificando' ? 'entregando'
          : ['error', 'necesita_intervencion'].includes(task?.status) ? 'error' : busy.some(item => item.agentId === agent.id) ? 'trabajando' : 'disponible';
        return { ...agent, status, activeTaskId: task?.id || null, taskStatus: task?.status || null };
      }),
      tasks: this.db.tasks, products: this.db.products, orders: this.db.orders, events: this.db.events,
      metrics: { queued: this.db.tasks.filter(t => ['pendiente', 'asignada'].includes(t.status)).length, active: busy.length,
        done: this.db.tasks.filter(t => t.status === 'completada').length, total: this.db.tasks.length, simulatedOrders: this.db.orders.length },
    };
  }
  async providerStatus() {
    if (!this.allowRealAI || !this.provider) return { id: 'none', enabled: false, connected: false, model: null, models: [], canExecute: false,
      error: 'La IA real está deshabilitada. El modo demostración sigue disponible.' };
    if (typeof this.provider.status === 'function') return this.provider.status();
    return { id: this.provider.id || 'ai-provider', enabled: true, connected: null, model: this.provider.model || null, models: [],
      canExecute: true, authChecked: false, error: 'Proveedor habilitado; la autenticación se comprobará al ejecutar una tarea.' };
  }
  createTask(data, executionMode = 'simulation') {
    if (!validTypes.has(data.type)) throw new Error('Tipo de tarea inválido');
    const title = str(data.title, 130); if (title.length < 4) throw new Error('El título debe tener al menos cuatro caracteres');
    const task = { id: nextId('HUEVO'), title, type: data.type, details: str(data.details, 1500),
      priority: validPriorities.has(data.priority) ? data.priority : 'media', agentId: ASSIGN[data.type],
      status: 'pendiente', executionMode, providerId: executionMode === 'simulation' ? null : this.provider?.id || executionMode,
      simulated: executionMode === 'simulation', idempotencyKey: data.idempotencyKey || null,
      createdAt: now(), startedAt: null, completedAt: null, result: null, validation: null, attempts: 0,
      maxRetries: 0, history: [{ status: 'pendiente', at: now(), message: 'Huevo recibido por la Reina.' }] };
    addHistory(task, 'asignada', `La Reina asignó el huevo a ${AGENTS.find(agent => agent.id === task.agentId)?.name}.`);
    this.db.tasks.unshift(task); this.log(`La Reina asignó un huevo a ${AGENTS.find(agent => agent.id === task.agentId)?.name}.`, task.id);
    this.persist(); if (this.auto) this.schedule(); return task;
  }
  addTask(data) { return this.createTask(data); }
  addRealTask(data) {
    if (!this.allowRealAI) throw new Error('Ejecución IA real deshabilitada. Habilita un proveedor local desde la consola del servidor.');
    const suppliedText = `${str(data.title, 130)}\n${str(data.details, 1500)}`;
    if (/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+\S+)\b/i.test(suppliedText)
      || /\b(?:password|contrase.{0,3}|api[_ -]?key|clave)\s*[:=]\s*\S+/i.test(suppliedText)
      || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(suppliedText)
      || /(?<!\d)(?:\+?57[\s-]?)?3\d{9}(?!\d)/.test(suppliedText)) {
      throw new Error('Quita claves, credenciales o posibles datos personales antes de enviar una tarea IA.');
    }
    const key = str(data.idempotencyKey, 80);
    if (!/^[\w-]{12,80}$/.test(key)) throw new Error('La clave de idempotencia debe tener entre 12 y 80 caracteres seguros.');
    const existing = this.db.tasks.find(task => isRealTask(task) && task.idempotencyKey === key);
    if (existing) return { task: existing, duplicate: true };
    const title = str(data.title, 130) || 'Analiza tres ideas de productos económicos para comercio electrónico en Colombia';
    const type = data.type || 'productos';
    const active = this.db.tasks.find(task => isRealTask(task) && task.title === title && task.type === type && activeStatuses.has(task.status));
    if (active) return { task: active, duplicate: true };
    const task = this.createTask({ ...data, title, type, idempotencyKey: key }, this.provider?.id || 'ai-provider');
    return { task, duplicate: false };
  }
  addDemo() {
    if (this.db.tasks.some(task => task.title === 'Explorar camiseta de demostración')) return 0;
    const demo = [
      { title: 'Explorar camiseta de demostración', type: 'productos', priority: 'alta', details: 'Usar solo datos ficticios. No consultar Dropi.' },
      { title: 'Calcular margen de producto ficticio', type: 'precios', priority: 'media' },
      { title: 'Proponer anuncio de prueba', type: 'contenido', priority: 'baja' },
    ];
    for (const item of demo) this.addTask(item); return demo.length;
  }
  addOrder(data) {
    const alias = str(data.alias, 90), productCode = str(data.productCode, 90), quantity = Number(data.quantity);
    if (alias.length < 2 || !productCode || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Datos de celdilla incompletos');
    const order = { id: nextId('CELDA'), alias, productCode, quantity, channel: 'demo', status: 'borrador_simulado', verified: false, createdAt: now(), simulated: true };
    this.db.orders.unshift(order); this.log(`Se creó celdilla de prueba ${order.id}. No se envió a Dropi.`); this.persist(); return order;
  }
  schedule() {
    if (!this.auto || this.paused || this.current) return;
    const task = this.db.tasks.filter(item => ['pendiente', 'asignada'].includes(item.status)
      && (!isRealTask(item) || this.allowRealAI && this.provider)).sort((a,b) => {
      const rank = { alta: 0, media: 1, baja: 2 }; return rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt);
    })[0];
    if (!task) return;
    this.current = task.id; task.attempts += 1; task.startedAt = now();
    if (isRealTask(task)) {
      const label = this.provider?.id === 'omniroute' ? 'OmniRoute' : this.provider?.id === 'codex-exec' ? 'Codex CLI' : 'El proveedor IA';
      addHistory(task, 'ejecutando', `${label} inició la tarea solicitada.`); this.log(`${label} inició una tarea interna.`, task.id); this.persist();
      const controller = new AbortController(); this.controllers.set(task.id, controller);
      Promise.resolve().then(() => this.provider.execute(task, { signal: controller.signal })).then(result => this.finishReal(task, result), error => this.failReal(task, error));
      return;
    }
    addHistory(task, 'en_progreso', 'El motor inició la demostración local.'); this.log(`${AGENTS.find(agent => agent.id === task.agentId).name} comenzó la tarea (simulación).`, task.id); this.persist();
    this.timer = setTimeout(() => this.finishDemo(task.id), this.delayMs);
  }
  finishDemo(id) {
    const task = this.db.tasks.find(item => item.id === id);
    if (!task || task.status !== 'en_progreso') { this.current = null; this.schedule(); return; }
    addHistory(task, 'verificando', 'Inspectora verifica la estructura de la entrega.'); task.result = simulate(task); this.log('Inspectora recibió el resultado para verificarlo.', id); this.persist();
    this.timer = setTimeout(() => {
      const valid = this.validateResult(task, task.result, true);
      task.validation = { passed: valid, validator: 'inspectora', at: now(), mode: 'reglas_locales' };
      addHistory(task, valid ? 'completada' : 'bloqueada', valid ? 'Inspectora aprobó la demostración; Reina recibió la entrega.' : 'Inspectora bloqueó el resultado incompleto.');
      task.completedAt = now();
      if (valid && task.type === 'productos' && !this.db.products.some(product => product.code === 'DEMO-CAM-001')) {
        this.db.products.unshift({ code: 'DEMO-CAM-001', name: 'Camiseta de demostración', costCOP: 32000, priceCOP: 54900, stock: 'desconocido', source: 'EJEMPLO FICTICIO', checkedAt: null, simulated: true });
      }
      this.log(valid ? 'Inspectora aprobó la demostración. La Reina recibió la entrega.' : 'Inspectora bloqueó el resultado incompleto.', id);
      this.current = null; this.persist(); this.schedule();
    }, Math.min(1200, Math.floor(this.delayMs / 2)));
  }
  validateResult(task, result, simulated) {
    return Boolean(result && result.simulated === simulated && typeof result.summary === 'string' && result.summary.trim()
      && Array.isArray(result.evidence) && result.evidence.length > 0 && result.evidence.every(item => typeof item === 'string' && item.trim())
      && (simulated || result.provider === (task.providerId || this.provider?.id)));
  }
  finishReal(task, result) {
    if (!this.db.tasks.includes(task)) return;
    if (task.status === 'cancelada') { this.finishCurrent(task.id); return; }
    addHistory(task, 'verificando', 'Inspectora valida determinísticamente el formato y el proveedor.'); task.result = result; this.persist();
    const valid = this.validateResult(task, result, false);
    task.validation = { passed: valid, validator: 'inspectora', at: now(), mode: 'estructura_y_proveedor' };
    const label = this.provider?.id === 'omniroute' ? 'OmniRoute' : 'Codex';
    addHistory(task, valid ? 'completada' : 'necesita_intervencion', valid ? `Formato aprobado; Reina recibió la entrega de ${label}.` : 'La salida no superó validaciones locales.');
    task.completedAt = now(); this.log(valid ? `Inspectora aprobó la respuesta ${label}; Reina recibió la entrega.` : `Inspectora marcó la respuesta ${label} para revisión humana.`, task.id);
    this.finishCurrent(task.id);
  }
  failReal(task, error) {
    if (task.status === 'cancelada') { this.finishCurrent(task.id); return; }
    task.error = str(error?.message || 'Error de proveedor desconocido', 300);
    addHistory(task, 'error', 'El proveedor IA no pudo terminar; no se reintentará automáticamente.');
    task.completedAt = now(); this.log(`La tarea ${task.providerId || 'IA'} terminó con error: ${task.error}`, task.id); this.finishCurrent(task.id);
  }
  finishCurrent(id) { this.controllers.delete(id); if (this.current === id) this.current = null; this.persist(); this.schedule(); }
  cancelTask(id) {
    const task = this.db.tasks.find(item => item.id === id); if (!task) return false;
    if (!activeStatuses.has(task.status) && !['pendiente', 'asignada'].includes(task.status)) return false;
    this.controllers.get(id)?.abort(); if (this.current === id && task.executionMode !== 'codex') { clearTimeout(this.timer); this.current = null; }
    addHistory(task, 'cancelada', 'Cancelada por solicitud local.'); task.completedAt = now(); this.log('Tarea cancelada por el propietario.', id);
    if (this.current === id && !this.controllers.has(id)) this.current = null; this.persist(); this.schedule(); return true;
  }
  pause() { this.paused = true; this.log('Cola pausada por el propietario.'); this.persist(); }
  resume() { this.paused = false; this.log('Cola reanudada por el propietario.'); this.persist(); this.schedule(); }
  close() { if (this.timer) clearTimeout(this.timer); for (const controller of this.controllers.values()) controller.abort(); this.controllers.clear(); this.current = null; }
}

function simulate(task) {
  const common = { simulated: true, mode: 'DEMO_SIN_IA', evidence: ['Ejecución controlada por el motor local, sin proveedores externos.'] };
  switch (task.type) {
    case 'productos': return { ...common, summary: 'Ficha ficticia preparada. Código DEMO-CAM-001. Disponibilidad real no verificada.', evidence: [...common.evidence, 'No se consultó Dropi: precio, costo y existencia no son datos reales.'] };
    case 'precios': { const cost = 32000, selling = 54900, shipping = 12000; return { ...common, summary: `Ejemplo: venta $${selling.toLocaleString('es-CO')} COP, costo $${cost.toLocaleString('es-CO')} COP, envío $${shipping.toLocaleString('es-CO')} COP. Margen antes de publicidad, comisiones, devoluciones e impuestos: $${(selling - cost - shipping).toLocaleString('es-CO')} COP.`, evidence: [...common.evidence, 'Valores didácticos, no datos de un proveedor.'] }; }
    case 'contenido': return { ...common, summary: 'Borrador de anuncio: «Descubre prendas cómodas para todos los días. Escríbenos a WhatsApp para conocer referencias y disponibilidad». No publicado.', evidence: [...common.evidence, 'Contenido sin envío a redes sociales.'] };
    case 'ventas': return { ...common, summary: 'Preparada plantilla de atención. Ningún mensaje real fue enviado.', evidence: [...common.evidence, 'Falta integración autorizada de WhatsApp Business.'] };
    case 'calidad': return { ...common, summary: 'Revisión local: campos obligatorios y registros marcados como DEMO.', evidence: [...common.evidence, 'Las existencias comerciales no se verifican en esta versión.'] };
    case 'seguridad': return { ...common, summary: 'Modo local: sin claves comerciales ni compras externas habilitadas.', evidence: [...common.evidence, 'Auditoría básica y límites del motor activo.'] };
    default: throw new Error('Tipo de tarea no soportado');
  }
}
