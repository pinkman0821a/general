import test from 'node:test';
import assert from 'node:assert/strict';
import { OmniRouteProvider } from '../server/providers/omniroute.mjs';

const freeModel = { id: 'pollinations/openai', owned_by: 'Pollinations', free: true };
function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('OmniRoute descubre modelos OpenAI-compatible y ejecuta solo un modelo libre verificado', async () => {
  const calls = [];
  const provider = new OmniRouteProvider({
    baseURL: 'http://127.0.0.1:20128/v1', freeModelIds: [],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/models')) return response({ data: [freeModel, { id: 'paid/model', owned_by: 'Paid' }] });
      return response({ model: 'pollinations/openai', provider: 'pollinations', choices: [{ message: { content: JSON.stringify({ summary: 'Informe razonado de prueba.', evidence: ['Supuestos identificados.'] }) } }], usage: { prompt_tokens: 21, completion_tokens: 13 } });
    },
  });

  const models = await provider.listModels();
  assert.deepEqual(models.map(item => ({ id: item.id, free: item.free })), [{ id: 'pollinations/openai', free: true }, { id: 'paid/model', free: false }]);
  assert.equal(await provider.selectModel('paid/model').then(() => false, () => true), true);
  await provider.selectModel('pollinations/openai');
  const status = await provider.status();
  assert.equal(status.connected, true);
  assert.equal(status.canExecute, true);
  const result = await provider.execute({ id: 'HUEVO-prueba', agentId: 'exploradora', title: 'Analizar una categoría ficticia', details: 'Sin precios reales.' });
  assert.equal(result.provider, 'omniroute');
  assert.equal(result.upstreamProvider, 'pollinations');
  assert.equal(result.model, 'pollinations/openai');
  assert.equal(result.simulated, false);
  assert.equal(result.usage.inputTokens, 21);
  const chat = calls.find(call => call.url.endsWith('/chat/completions'));
  assert.ok(chat);
  assert.equal(JSON.parse(chat.init.body).model, 'pollinations/openai');
  assert.match(JSON.parse(chat.init.body).messages[0].content, /Exploradora/);
  assert.deepEqual(JSON.parse(chat.init.body).response_format, {
    type: 'json_schema',
    json_schema: {
      name: 'zolvani_task_result', strict: true,
      schema: { type: 'object', properties: { summary: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'evidence'] },
    },
  });
  assert.equal('tools' in JSON.parse(chat.init.body), false);
  assert.equal(chat.init.headers.Authorization, undefined);
});

test('OmniRoute extrae un único bloque Markdown JSON y valida el contrato', async () => {
  const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async url =>
    String(url).endsWith('/models') ? response({ data: [freeModel] }) : response({ choices: [{ message: { content: '```json\n{"summary":"Hipótesis razonada.","evidence":["Precio por verificar."]}\n```' } }] }) });
  const result = await provider.execute({ id: 'HUEVO-md', agentId: 'exploradora', title: 'Comparar hipótesis de producto' });
  assert.equal(result.summary, 'Hipótesis razonada.');
});

test('OmniRoute rechaza JSON envuelto en prosa o con propiedades adicionales', async () => {
  const invalidReplies = [
    'Resultado:\n```json\n{"summary":"No aceptar prosa alrededor.","evidence":["Evidencia."]}\n```',
    '{"summary":"Contrato extra.","evidence":["Evidencia."],"tool":"no permitido"}',
  ];
  for (const content of invalidReplies) {
    const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async url =>
      String(url).endsWith('/models') ? response({ data: [freeModel] }) : response({ choices: [{ message: { content } }] }) });
    await assert.rejects(provider.execute({ id: 'HUEVO-estricto', title: 'Contrato estricto' }), error =>
      ['OMNIROUTE_INVALID_JSON', 'OMNIROUTE_INVALID_SCHEMA'].includes(error.code));
  }
});

test('OmniRoute distingue respuesta vacía, JSON inválido, contrato incorrecto y truncamiento', async () => {
  const cases = [
    [{ choices: [{ message: { content: '' } }] }, 'OMNIROUTE_EMPTY_RESPONSE'],
    [{ choices: [{ message: { content: 'No pude estructurar esto.' } }] }, 'OMNIROUTE_INVALID_JSON'],
    [{ choices: [{ message: { content: '{"summary":"Falta evidencia"}' } }] }, 'OMNIROUTE_INVALID_SCHEMA'],
    [{ choices: [{ finish_reason: 'length', message: { content: '{"summary":"cortado' } }] }, 'OMNIROUTE_TRUNCATED'],
  ];
  for (const [payload, code] of cases) {
    const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async url =>
      String(url).endsWith('/models') ? response({ data: [freeModel] }) : response(payload) });
    await assert.rejects(provider.execute({ id: 'HUEVO-diagnostico', title: 'Respuesta de control' }), error => error.code === code);
  }
});

test('OmniRoute reconoce rechazo HTTP de response_format como incompatibilidad explícita', async () => {
  const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async url =>
    String(url).endsWith('/models') ? response({ data: [freeModel] }) : response({ error: { message: 'response_format json_schema is unsupported' } }, 400) });
  await assert.rejects(provider.execute({ id: 'HUEVO-formato', title: 'Prueba de formato' }), error => error.code === 'OMNIROUTE_FORMAT_UNSUPPORTED');
});

test('OmniRoute acepta contenido textual OpenAI en partes y objeto parsed, sin relajar el esquema', async () => {
  const replies = [
    { choices: [{ message: { content: [{ type: 'text', text: '{"summary":"Parte textual.","evidence":["Una evidencia."]}' }] } }] },
    { choices: [{ message: { parsed: { summary: 'Objeto estructurado.', evidence: ['Evidencia estructurada.'] } } }] },
    { choices: [{ message: { content: { summary: 'Objeto en content.', evidence: ['Estructura no textual.'] } } }] },
  ];
  for (const payload of replies) {
    const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async url =>
      String(url).endsWith('/models') ? response({ data: [freeModel] }) : response(payload) });
    const result = await provider.execute({ id: 'HUEVO-shapes', title: 'Variantes compatibles' });
    assert.match(result.summary, /Parte textual|Objeto estructurado|Objeto en content/);
  }
});

test('OmniRoute entrega un plan estructurado para Reina sin aceptar tareas arbitrarias', async () => {
  const plan = [
    { type: 'productos', title: 'Explorar categoría', details: 'Compara hipótesis con cautela.', dependsOn: [] },
    { type: 'precios', title: 'Analizar costos', details: 'Usa solo la entrega previa.', dependsOn: ['productos'] },
    { type: 'calidad', title: 'Revisar consistencia', details: 'Verifica las dos entregas previas.', dependsOn: ['productos', 'precios'] },
  ];
  const requests = [];
  const provider = new OmniRouteProvider({ model: freeModel.id, freeModelIds: [freeModel.id], fetchImpl: async (url, init) => {
    if (String(url).endsWith('/models')) return response({ data: [freeModel] });
    const body = JSON.parse(init.body); requests.push(body);
    return response({ model: freeModel.id, provider: 'test-upstream', choices: [{ message: { content: JSON.stringify({ summary: 'Plan de tres etapas.', evidence: ['No hay búsqueda externa.'], tasks: plan }) } }] });
  } });
  const result = await provider.execute({ id: 'HUEVO-plan', taskKind: 'plan', agentId: 'reina', title: 'Planificar análisis', details: 'Objetivo de prueba.' });
  assert.deepEqual(result.plan, plan);
  const schema = requests[0].response_format.json_schema.schema;
  assert.ok(schema.properties.tasks);
  assert.match(requests[0].messages[0].content, /Reina/);
});

test('OmniRoute limita el endpoint a loopback y nunca usa auto-routing sin una ruta libre conocida', async () => {
  assert.throws(() => new OmniRouteProvider({ baseURL: 'https://example.com/v1' }), /localhost|loopback/i);
  const provider = new OmniRouteProvider({ freeModelIds: ['auto'], fetchImpl: async () => response({ data: [{ id: 'auto', owned_by: 'OmniRoute' }] }) });
  assert.equal((await provider.listModels())[0].free, false);
  await assert.rejects(provider.execute({ id: 'HUEVO-x', title: 'Trabajo controlado' }), /gratuito verificado/i);
});

test('OmniRoute convierte cuotas y errores HTTP en diagnósticos sin fingir resultados', async () => {
  const provider = new OmniRouteProvider({ model: 'pollinations/openai', freeModelIds: ['pollinations/openai'], fetchImpl: async url =>
    String(url).endsWith('/models') ? response({ data: [freeModel] }) : response({ error: { message: 'Rate limit exceeded' } }, 429) });
  await assert.rejects(provider.execute({ id: 'HUEVO-x', title: 'Consulta de prueba' }), /cuota|límite/i);
});

test('OmniRoute usa como máximo un modelo alternativo declarado gratuito al alcanzar cuota', async () => {
  const calls = [];
  const alternate = { id: 'free/second', owned_by: 'Proveedor gratuito', free: true };
  const provider = new OmniRouteProvider({ model: 'pollinations/openai', freeModelIds: ['pollinations/openai', 'free/second'],
    fallbackModelIds: ['free/second', 'free/third'], fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
      if (String(url).endsWith('/models')) return response({ data: [freeModel, alternate] });
      if (calls.at(-1).body.model === 'pollinations/openai') return response({ error: { message: 'rate limit exceeded' } }, 429);
      return response({ model: alternate.id, provider: 'Proveedor gratuito', choices: [{ message: { content: JSON.stringify({ summary: 'Resultado alternativo.', evidence: ['Ruta de respaldo declarada gratuita.'] }) } }] });
    },
  });
  const result = await provider.execute({ id: 'HUEVO-x', title: 'Análisis con respaldo gratuito' });
  assert.equal(result.model, 'free/second');
  assert.match(result.fallback, /única ruta alternativa/);
  const requests = calls.filter(call => call.url.endsWith('/chat/completions'));
  assert.deepEqual(requests.map(call => call.body.model), ['pollinations/openai', 'free/second']);
});

test('OmniRoute respeta cancelación de la llamada', async () => {
  const provider = new OmniRouteProvider({ model: 'pollinations/openai', freeModelIds: ['pollinations/openai'], fetchImpl: async (_url, init) => {
    if (String(_url).endsWith('/models')) return response({ data: [freeModel] });
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  const controller = new AbortController();
  const task = provider.execute({ id: 'HUEVO-x', title: 'Consulta de prueba' }, { signal: controller.signal });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(task, /cancelada|aborted/i);
});

test('OmniRoute limita el tiempo de espera de solicitudes', async () => {
  const provider = new OmniRouteProvider({ model: 'pollinations/openai', freeModelIds: ['pollinations/openai'], timeoutMs: 1000, fetchImpl: async (_url, init) => {
    if (String(_url).endsWith('/models')) return response({ data: [freeModel] });
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  provider.timeoutMs = 1000;
  const request = provider.execute({ id: 'HUEVO-x', title: 'Solicitud que excede el límite' });
  provider.timeoutMs = 1000;
  await assert.rejects(request, /tiempo máximo/i);
});
