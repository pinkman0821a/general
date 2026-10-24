import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hive } from './core.mjs';
import { CodexExecProvider } from './providers/codex-exec.mjs';
import { OmniRouteProvider } from './providers/omniroute.mjs';
import { productsCsvTemplate } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'app');
const statePath = process.env.ZOLVANI_STATE_FILE || path.join(root, 'data', 'state.json');
const codexWorkspace = path.join(root, '.test-tmp', 'codex-workspace');
const PORT = Number(process.env.PORT || 4173);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function selectedProviderConfig() {
  const requested = process.env.ZOLVANI_AI_PROVIDER || (process.env.ZOLVANI_ENABLE_CODEX === '1' && process.env.ZOLVANI_ENABLE_OMNIROUTE !== '1' ? 'codex-exec' : 'omniroute');
  if (requested === 'codex-exec') return { id: requested, enabled: process.env.ZOLVANI_ENABLE_CODEX === '1' };
  return { id: 'omniroute', enabled: process.env.ZOLVANI_ENABLE_OMNIROUTE === '1' };
}

export function createServer({ stateFile = statePath, auto = true, delayMs = 2000, provider = null, allowRealAI = selectedProviderConfig().enabled } = {}) {
  const config = selectedProviderConfig();
  if (allowRealAI && !provider && config.id === 'codex-exec') fs.mkdirSync(codexWorkspace, { recursive: true });
  const selectedProvider = provider || (allowRealAI ? config.id === 'codex-exec' ? new CodexExecProvider({ cwd: codexWorkspace }) : new OmniRouteProvider() : null);
  const hive = new Hive(stateFile, { auto, delayMs, provider: selectedProvider, allowRealAI });
  const send = (res, code, payload) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(payload));
  };
  const server = http.createServer(async (req, res) => {
    try {
      const host = (req.headers.host || '').split(':')[0];
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return send(res, 403, { error: 'Acceso exclusivamente local' });
      const url = new URL(req.url, 'http://127.0.0.1');
      const pathname = url.pathname;
      if (pathname === '/api/state' && req.method === 'GET') return send(res, 200, hive.snapshot());
      if (pathname === '/api/provider/status' && req.method === 'GET') return send(res, 200, await hive.providerStatus());
      if (pathname === '/api/products/template.csv' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="zolvani-productos-plantilla.csv"', 'X-Content-Type-Options': 'nosniff' });
        return res.end(productsCsvTemplate());
      }
      if (pathname.startsWith('/api/') && req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'Origen no autorizado' });
        let raw = '';
        const maxBody = pathname === '/api/products/import' ? 2_100_000 : 12_000;
        for await (const chunk of req) { raw += chunk; if (raw.length > maxBody) return send(res, 413, { error: 'Solicitud demasiado grande' }); }
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { error: 'JSON inválido' }); }
        if (!data || Array.isArray(data) || typeof data !== 'object') return send(res, 400, { error: 'Datos inválidos' });
        if (pathname === '/api/tasks') return send(res, 201, { task: hive.addTask(data) });
        if (pathname === '/api/products') return send(res, 201, { product: hive.addProduct(data) });
        if (pathname === '/api/products/import') {
          if (typeof data.csv !== 'string') return send(res, 400, { error: 'Falta el contenido CSV de productos.' });
          const imported = hive.importProductsCsv(data.csv);
          return send(res, 201, { imported: imported.length, products: imported });
        }
        const productMatch = pathname.match(/^\/api\/products\/([\w-]+)$/);
        if (productMatch) return send(res, 200, { product: hive.updateProduct(decodeURIComponent(productMatch[1]), data) });
        if (pathname === '/api/provider/select-model') {
          if (!hive.allowRealAI || typeof hive.provider?.selectModel !== 'function') return send(res, 503, { error: 'El proveedor activo no permite cambiar el modelo desde el panel.' });
          try {
            const model = await hive.provider.selectModel(data.model);
            return send(res, 200, { model: model.id, provider: hive.provider.id });
          } catch (error) { return send(res, 400, { error: error.message }); }
        }
        if (pathname === '/api/goals/real') {
          if (!hive.allowRealAI) return send(res, 503, { error: 'IA real deshabilitada. Habilita OmniRoute local desde la consola del servidor.' });
          const providerStatus = await hive.providerStatus();
          if (!providerStatus.canExecute) return send(res, 503, { error: providerStatus.error || 'No hay un modelo gratuito listo para coordinar el objetivo.' });
          const accepted = hive.addRealGoal(data);
          return send(res, accepted.duplicate ? 200 : 202, { goal: accepted.goal, duplicate: accepted.duplicate });
        }
        if (pathname === '/api/tasks/real') {
          if (!hive.allowRealAI) return send(res, 503, { error: 'IA real deshabilitada. Habilita OmniRoute local con ZOLVANI_ENABLE_OMNIROUTE=1 o selecciona Codex con ZOLVANI_AI_PROVIDER=codex-exec y ZOLVANI_ENABLE_CODEX=1.' });
          const providerStatus = await hive.providerStatus();
          if (!providerStatus.canExecute) return send(res, 503, { error: providerStatus.error || 'No hay un modelo real listo para ejecutar.' });
          const request = { ...data,
            title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Analiza tres ideas de productos económicos para comercio electrónico en Colombia',
            type: typeof data.type === 'string' ? data.type : 'productos',
            details: typeof data.details === 'string' && data.details.trim() ? data.details
              : 'Compara tres ideas con razonamiento cualitativo, supuestos y aspectos pendientes de verificación. Sin acceso a búsqueda web: no inventes precios, inventarios, proveedores ni fuentes. Etiqueta las ideas como hipótesis no verificadas. No hagas compras, publicaciones, mensajes ni cambios de archivos.' };
          const accepted = hive.addRealTask(request);
          return send(res, accepted.duplicate ? 200 : 202, { task: accepted.task, duplicate: accepted.duplicate });
        }
        const cancelMatch = pathname.match(/^\/api\/tasks\/([\w-]+)\/cancel$/);
        if (cancelMatch) return hive.cancelTask(cancelMatch[1]) ? send(res, 200, { cancelled: true }) : send(res, 409, { error: 'La tarea no existe o no puede cancelarse en su estado actual.' });
        const cancelGoalMatch = pathname.match(/^\/api\/goals\/([\w-]+)\/cancel$/);
        if (cancelGoalMatch) return hive.cancelGoal(cancelGoalMatch[1]) ? send(res, 200, { cancelled: true }) : send(res, 409, { error: 'El objetivo no existe o ya terminó.' });
        if (pathname === '/api/engine/pause') { hive.pause(); return send(res, 200, { paused: true }); }
        if (pathname === '/api/engine/resume') { hive.resume(); return send(res, 200, { paused: false }); }
        if (pathname === '/api/seed-demo') return send(res, 200, { created: hive.addDemo() });
        if (pathname === '/api/orders') return send(res, 201, { order: hive.addOrder(data) });
        return send(res, 404, { error: 'Ruta desconocida' });
      }
      if (pathname.startsWith('/api/')) return send(res, 404, { error: 'Ruta desconocida' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método no permitido' });
      const requested = pathname === '/' ? '/index.html' : pathname;
      const file = path.resolve(assets, '.' + decodeURIComponent(requested));
      if (!file.startsWith(assets + path.sep)) return send(res, 403, { error: 'Prohibido' });
      let stats;
      try { stats = fs.statSync(file); } catch { return send(res, 404, { error: 'Archivo no encontrado' }); }
      if (!stats.isFile()) return send(res, 404, { error: 'Archivo no encontrado' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      const notFound = /Producto no encontrado/i.test(error.message);
      const busy = /Ya hay un objetivo IA activo/i.test(error.message);
      const badInput = /incompletos|debe tener|clave de idempotencia|quita claves|credenciales|objetivo.*caracteres/i.test(error.message) || error.message.includes('inválido');
      const unavailable = /deshabilitada/i.test(error.message);
      const productInput = /fórmula|CSV|COP|duplicada|referencia|URL|fecha|fuente|importación|producto|datos personales/i.test(error.message);
      send(res, notFound ? 404 : busy ? 409 : badInput || productInput ? 400 : unavailable ? 503 : 500, { error: busy || badInput || productInput || unavailable || notFound ? error.message : 'Error interno' });
      if (!busy && !badInput && !productInput && !unavailable && !notFound) console.error('Error interno:', error);
    }
  });
  return { server, hive };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = createServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🐜 ZOLVANI · LA COLONIA · v0.1.0-preview.1`);
    console.log(`Panel local: http://127.0.0.1:${PORT}`);
    const active = selectedProviderConfig();
    console.log(`Modo: ${active.enabled ? `${active.id} habilitado; el estado del proveedor se comprobará localmente` : 'demostración'}; sin conexiones comerciales.\n`);
  });
}
