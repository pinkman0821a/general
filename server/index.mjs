import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hive } from './core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'app');
const statePath = process.env.ZOLVANI_STATE_FILE || path.join(root, 'data', 'state.json');
const PORT = Number(process.env.PORT || 4173);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createServer({ stateFile = statePath, auto = true, delayMs = 2000 } = {}) {
  const hive = new Hive(stateFile, { auto, delayMs });
  const send = (res, code, payload) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(payload));
  };
  const server = http.createServer(async (req,res) => {
    try {
      const host = (req.headers.host || '').split(':')[0];
      // Bound to loopback by default and reject DNS rebinding.
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return send(res, 403, { error: 'Acceso exclusivamente local' });
      const url = new URL(req.url, 'http://127.0.0.1');
      const pathname = url.pathname;
      if (pathname === '/api/state' && req.method === 'GET') return send(res, 200, hive.snapshot());
      if (pathname.startsWith('/api/') && req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'Origen no autorizado' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 12_000) return send(res, 413, { error: 'Solicitud demasiado grande' }); }
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { error: 'JSON inválido' }); }
        if (!data || Array.isArray(data) || typeof data !== 'object') return send(res, 400, { error: 'Datos inválidos' });
        if (pathname === '/api/tasks') return send(res, 201, { task: hive.addTask(data) });
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
    } catch (e) {
      const badInput = /inválido|incompletos|debe tener/i.test(e.message);
      send(res, badInput ? 400 : 500, { error: badInput ? e.message : 'Error interno' });
      if (!badInput) console.error('Error interno:', e);
    }
  });
  return { server, hive };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = createServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🐝 ZOLVANI · LA COLMENA · v0.1.0-preview.1`);
    console.log(`Panel local: http://127.0.0.1:${PORT}`);
    console.log(`Simulación segura activa. No hay acceso a Dropi, WhatsApp ni redes.\n`);
  });
}
