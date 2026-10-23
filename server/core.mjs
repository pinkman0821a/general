import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const VERSION = '0.1.0-preview.1';
export const AGENTS = Object.freeze([
  { id: 'reina', name: 'Reina', role: 'Coordinación', emoji: '👑', color: '#F7B844' },
  { id: 'exploradora', name: 'Exploradora', role: 'Productos y proveedores', emoji: '🔎', color: '#6FE4CF' },
  { id: 'financiera', name: 'Financiera', role: 'Costos y márgenes', emoji: '📊', color: '#82A9FF' },
  { id: 'creativa', name: 'Creativa', role: 'Publicidad', emoji: '🎨', color: '#F69FD3' },
  { id: 'vendedora', name: 'Vendedora', role: 'Pedidos y atención', emoji: '💬', color: '#F7A677' },
  { id: 'inspectora', name: 'Inspectora', role: 'Control de calidad', emoji: '🛡️', color: '#BFA5FF' },
  { id: 'guardiana', name: 'Guardiana', role: 'Seguridad', emoji: '🔐', color: '#99D57A' },
]);
const ASSIGN = { productos: 'exploradora', precios: 'financiera', contenido: 'creativa', ventas: 'vendedora', calidad: 'inspectora', seguridad: 'guardiana' };
const validTypes = new Set(Object.keys(ASSIGN));
const validPriorities = new Set(['alta', 'media', 'baja']);
const now = () => new Date().toISOString();
const str = (input, limit = 300) => typeof input === 'string' ? input.trim().slice(0, limit) : '';
const nextId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

function baseState() {
  return {
    meta: { brand: 'ZOLVANI', version: VERSION, mode: 'simulacion', createdAt: now(), localOnly: true },
    budget: { currency: 'COP', initial: 130000, spent: 0 },
    tasks: [], products: [], orders: [], events: [],
  };
}

export class Hive {
  constructor(stateFile, { auto = true, delayMs = 2000 } = {}) {
    this.file = stateFile;
    this.auto = auto;
    this.delayMs = delayMs;
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    this.db = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : baseState();
    this.current = null;
    this.listeners = new Set();
    const stranded = this.db.tasks.filter(t => ['en_progreso', 'verificando'].includes(t.status));
    for (const task of stranded) { task.status = 'pendiente'; task.validation = null; }
    if (stranded.length) this.log(`${stranded.length} tarea(s) interrumpida(s) recuperada(s) en cola para reintento.`);
    this.log('Sistema local iniciado. Sin conexiones a plataformas comerciales.');
    this.persist();
    if (auto) this.schedule();
  }
  persist() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
    for (const f of this.listeners) { try { f(); } catch {} }
  }
  log(message, taskId = null) {
    this.db.events.unshift({ id: nextId('evt'), at: now(), message, taskId });
    this.db.events = this.db.events.slice(0, 100);
  }
  snapshot() {
    const busy = this.db.tasks.filter(t => ['en_progreso', 'verificando'].includes(t.status));
    return {
      meta: this.db.meta, budget: { ...this.db.budget, available: Math.max(0, this.db.budget.initial - this.db.budget.spent) },
      agents: AGENTS.map(a => ({ ...a, status: busy.some(t => t.agentId === a.id) ? 'trabajando' : 'disponible' })),
      tasks: this.db.tasks, products: this.db.products, orders: this.db.orders, events: this.db.events,
      metrics: {
        queued: this.db.tasks.filter(t => t.status === 'pendiente').length,
        active: busy.length,
        done: this.db.tasks.filter(t => t.status === 'completada').length,
        total: this.db.tasks.length,
        simulatedOrders: this.db.orders.length,
      },
    };
  }
  addTask(data) {
    if (!validTypes.has(data.type)) throw new Error('Tipo de tarea inválido');
    const title = str(data.title, 130);
    if (title.length < 4) throw new Error('El título debe tener al menos cuatro caracteres');
    const task = {
      id: nextId('HUEVO'), title, type: data.type,
      details: str(data.details, 1500), priority: validPriorities.has(data.priority) ? data.priority : 'media',
      agentId: ASSIGN[data.type], status: 'pendiente', simulated: true,
      createdAt: now(), startedAt: null, completedAt: null,
      result: null, validation: null, attempts: 0,
    };
    this.db.tasks.unshift(task);
    this.log(`La Reina asignó un huevo a ${AGENTS.find(a => a.id === task.agentId)?.name}.`, task.id);
    this.persist();
    if (this.auto) this.schedule();
    return task;
  }
  addDemo() {
    if (this.db.tasks.some(t => t.title === 'Explorar camiseta de demostración')) return 0;
    const demo = [
      { title: 'Explorar camiseta de demostración', type: 'productos', priority: 'alta', details: 'Usar solo datos ficticios. No consultar Dropi.' },
      { title: 'Calcular margen de producto ficticio', type: 'precios', priority: 'media' },
      { title: 'Proponer anuncio de prueba', type: 'contenido', priority: 'baja' },
    ];
    for (const item of demo) this.addTask(item);
    return demo.length;
  }
  addOrder(data) {
    const alias = str(data.alias, 90), productCode = str(data.productCode, 90);
    const quantity = Number(data.quantity);
    if (alias.length < 2 || !productCode || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Datos de celdilla incompletos');
    const order = {
      id: nextId('CELDA'), alias, productCode, quantity, channel: 'demo', status: 'borrador_simulado',
      verified: false, createdAt: now(), simulated: true,
    };
    this.db.orders.unshift(order);
    this.log(`Se creó celdilla de prueba ${order.id}. No se envió a Dropi.`);
    this.persist();
    return order;
  }
  schedule() {
    if (!this.auto || this.current) return;
    const task = this.db.tasks.filter(t => t.status === 'pendiente').sort((a,b) => {
      const rank = { alta: 0, media: 1, baja: 2 };
      return rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt);
    })[0];
    if (!task) return;
    this.current = task.id;
    task.status = 'en_progreso';
    task.startedAt = now();
    task.attempts += 1;
    this.log(`${AGENTS.find(a => a.id === task.agentId).name} comenzó la tarea (simulación).`, task.id);
    this.persist();
    this.timer = setTimeout(() => this.finish(task.id), this.delayMs);
  }
  finish(id) {
    const task = this.db.tasks.find(t => t.id === id);
    if (!task || task.status !== 'en_progreso') { this.current = null; if (this.auto) this.schedule(); return; }
    task.status = 'verificando';
    task.result = simulate(task);
    this.log(`Inspectora recibió el resultado para verificarlo.`, id);
    this.persist();
    this.timer = setTimeout(() => {
      const valid = Boolean(task.result?.simulated && task.result?.summary && task.result?.evidence?.length);
      task.validation = { passed: valid, validator: 'inspectora', at: now(), mode: 'reglas_locales' };
      task.status = valid ? 'completada' : 'bloqueada';
      task.completedAt = now();
      if (valid && task.type === 'productos' && !this.db.products.some(p => p.code === 'DEMO-CAM-001')) {
        this.db.products.unshift({ code: 'DEMO-CAM-001', name: 'Camiseta de demostración', costCOP: 32000, priceCOP: 54900, stock: 'desconocido', source: 'EJEMPLO FICTICIO', checkedAt: null, simulated: true });
      }
      this.log(valid ? `Inspectora aprobó la demostración. La Reina recibió la entrega.` : 'Inspectora bloqueó el resultado incompleto.', id);
      this.current = null;
      this.persist();
      if (this.auto) this.schedule();
    }, Math.min(1200, Math.floor(this.delayMs / 2)));
  }
  close() { if (this.timer) clearTimeout(this.timer); this.current = null; }
}

function simulate(task) {
  const common = { simulated: true, mode: 'DEMO_SIN_IA', evidence: ['Ejecución controlada por el motor local, sin proveedores externos.'] };
  switch (task.type) {
    case 'productos': return { ...common, summary: 'Ficha ficticia preparada. Código DEMO-CAM-001. Disponibilidad real no verificada.', evidence: [...common.evidence, 'No se consultó Dropi: precio, costo y existencia no son datos reales.'] };
    case 'precios': {
      const cost = 32000, selling = 54900, shipping = 12000;
      return { ...common, summary: `Ejemplo: venta $${selling.toLocaleString('es-CO')} COP, costo $${cost.toLocaleString('es-CO')} COP, envío $${shipping.toLocaleString('es-CO')} COP. Margen antes de publicidad, comisiones, devoluciones e impuestos: $${(selling - cost - shipping).toLocaleString('es-CO')} COP.`, evidence: [...common.evidence, 'Valores didácticos, no datos de un proveedor.'] };
    }
    case 'contenido': return { ...common, summary: 'Borrador de anuncio: «Descubre prendas cómodas para todos los días. Escríbenos a WhatsApp para conocer referencias y disponibilidad». No publicado.', evidence: [...common.evidence, 'Contenido sin envío a redes sociales.'] };
    case 'ventas': return { ...common, summary: 'Preparada plantilla de atención. Ningún mensaje real fue enviado.', evidence: [...common.evidence, 'Falta integración autorizada de WhatsApp Business.'] };
    case 'calidad': return { ...common, summary: 'Revisión local: campos obligatorios y registros marcados como DEMO.', evidence: [...common.evidence, 'Las existencias comerciales no se verifican en esta versión.'] };
    case 'seguridad': return { ...common, summary: 'Modo local: sin claves comerciales ni compras externas habilitadas.', evidence: [...common.evidence, 'Auditoría básica y límites del motor activo.'] };
    default: throw new Error('Tipo de tarea no soportado');
  }
}
