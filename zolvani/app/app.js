import { Hive3D } from './hive3d.js';

const $ = (selector) => document.querySelector(selector);
const fmt = (date) => date ? new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const cop = (amount) => '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount || 0);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = { pendiente: 'Pendiente', asignada: 'Asignada', en_progreso: 'En progreso · demo', ejecutando: 'Ejecutando IA', verificando: 'En verificación', completada: 'Terminada', bloqueada: 'Bloqueada', error: 'Error', pausada: 'Pausada', cancelada: 'Cancelada', necesita_intervencion: 'Necesita intervención', borrador_simulado: 'Borrador demo', planificando: 'Planificando', en_ejecucion: 'En ejecución', completado: 'Completado' };
const tags = { pendiente: 'pending', asignada: 'pending', planificando: 'running', en_ejecucion: 'running', en_progreso: 'running', ejecutando: 'running', verificando: 'running', completada: '', completado: '', bloqueada: 'block', error: 'block', necesita_intervencion: 'block' };
const agentIcon = { exploradora: '⌕', financiera: '$', creativa: '✎', vendedora: '◌', inspectora: '✓', guardiana: '◇' };
let state = null, providerStatus = null, tab = 'panel', flashTimer;
const hive = new Hive3D($('#hive3d'), agent => { if (agent) notice(`${agent.name}: ${agent.role} · ${agent.status}`); });

function notice(message, bad = false) {
  const element = $('#notice'); element.textContent = message; element.style.background = bad ? '#59302e' : '#203e3a'; element.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(() => element.classList.remove('show'), 4500);
}
async function api(route, data) {
  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Error de conexión'); return body;
}
function switchTab(next) {
  tab = next;
  document.querySelectorAll('[data-tab]').forEach(element => { if (element.classList.contains('nav')) element.classList.toggle('active', element.dataset.tab === next); });
  document.querySelectorAll('.view').forEach(element => element.classList.toggle('visible', element.id === 'view-' + next));
  $('#current-page').textContent = { panel: 'Vista general', tareas: 'Huevos', pedidos: 'Celdillas', productos: 'Productos', registro: 'Registro' }[next] || next;
}
function taskTemplate(task, expanded = false) {
  const agent = state.agents.find(item => item.id === task.agentId);
  const tag = `<span class="state-tag ${tags[task.status] || ''}">${escape(names[task.status] || task.status)}</span>`;
  const mode = task.executionMode === 'simulation' ? 'DEMOSTRACIÓN' : `IA REAL · ${task.providerId || task.executionMode}`;
  if (!expanded) return `<div class="stack-item"><div class="item-icon">${agentIcon[task.agentId] || '◈'}</div><div class="item-body"><div class="item-title">${escape(task.title)}</div><div class="item-detail">${escape(agent?.name || 'Hormiga')} · ${mode} · ${fmt(task.createdAt)}</div></div>${tag}</div>`;
  const evidence = task.result?.evidence?.length ? `<ul>${task.result.evidence.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : '';
  const history = task.history?.length ? `<details><summary>Historial (${task.history.length})</summary><ol>${task.history.map(item => `<li><strong>${escape(names[item.status] || item.status)}</strong> · ${fmt(item.at)} — ${escape(item.message)}</li>`).join('')}</ol></details>` : '';
  const usage = task.result?.usage && (task.result.usage.inputTokens !== null || task.result.usage.outputTokens !== null)
    ? `<br><strong>Uso reportado por el proveedor:</strong> entrada ${task.result.usage.inputTokens ?? 's/d'} · salida ${task.result.usage.outputTokens ?? 's/d'} tokens` : '';
  const result = task.result ? `<p class="task-result">${escape(task.result.summary)}${usage}<br><strong>Inspectora:</strong> ${task.validation?.passed ? 'formato validado' : 'sin validar'} · <strong>Modo:</strong> ${escape(task.result.mode)}</p>${evidence}` : '';
  const provenance = task.result ? `<small>Modelo: ${escape(task.result.model || 'no reportado')} · proveedor upstream: ${escape(task.result.upstreamProvider || task.result.provider || 'no reportado')}${task.result.fallback ? ` · ${escape(task.result.fallback)}` : ''}</small>` : '';
  const error = task.error ? `<p class="task-result">Error del proveedor: ${escape(task.error)}</p>` : '';
  const cancel = ['asignada', 'en_progreso', 'ejecutando', 'verificando'].includes(task.status) ? `<button class="quiet" data-action="cancel-task" data-task-id="${escape(task.id)}">Cancelar tarea</button>` : '';
  return `<article class="task-row"><div><div class="task-meta">${escape(task.id)} · ${escape(agent?.name || 'Hormiga')} · ${fmt(task.createdAt)} · PRIORIDAD ${escape(task.priority.toUpperCase())} · ${mode}</div><h3>${escape(task.title)}</h3>${task.details ? `<p>${escape(task.details)}</p>` : ''}${result}${provenance}${error}${history}${cancel}</div>${tag}</article>`;
}
function eventTemplate(event) {
  return `<div class="stack-item"><div class="item-icon">◷</div><div class="item-body"><div class="item-title">${escape(event.message)}</div><div class="item-detail">${fmt(event.at)}${event.taskId ? ' · ' + escape(event.taskId) : ''}</div></div></div>`;
}
function goalTemplate(goal) {
  const taskById = new Map((state.tasks || []).map(task => [task.id, task]));
  const stages = (goal.taskIds || []).map(id => taskById.get(id)).filter(Boolean).map(task => {
    const dependencies = (task.dependsOn || []).map(id => taskById.get(id)?.title || id);
    const detail = task.result ? `<p>${escape(task.result.summary)}</p><small>Resultado ${task.simulated ? 'simulado' : 'real'} · Inspectora: ${task.validation?.passed ? 'aprobado' : 'sin validar'} · modelo: ${escape(task.result.model || goal.model || 'no reportado')}</small>${task.result.evidence?.length ? `<ul>${task.result.evidence.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}` : task.error ? `<p class="task-result">${escape(task.error)}</p>` : '';
    return `<article class="goal-stage"><strong>${escape(state.agents.find(agent => agent.id === task.agentId)?.name || 'Reina')} · ${escape(task.title)}</strong><span class="state-tag ${tags[task.status] || ''}">${escape(names[task.status] || task.status)}</span><div class="goal-meta">Huevo ${escape(task.id)}${dependencies.length ? ` · Depende de: ${dependencies.map(escape).join(', ')}` : ' · Sin dependencias'}</div>${detail}</article>`;
  }).join('');
  const report = goal.report ? `<h4>Informe de la Reina</h4><p class="goal-report">${escape(goal.report.text)}</p><p class="goal-pending"><strong>Pendiente:</strong> ${goal.report.pending.map(escape).join(' ')}</p>` : '';
  const input = goal.usage?.inputTokens ?? 's/d', output = goal.usage?.outputTokens ?? 's/d';
  const history = goal.history?.length ? `<details><summary>Historial del objetivo (${goal.history.length})</summary><ol>${goal.history.map(item => `<li><strong>${escape(names[item.status] || item.status)}</strong> · ${fmt(item.at)} — ${escape(item.message)}</li>`).join('')}</ol></details>` : '';
  const cancel = ['planificando', 'en_ejecucion'].includes(goal.status) ? `<button class="quiet" data-action="cancel-goal" data-goal-id="${escape(goal.id)}">Cancelar objetivo y sus etapas</button>` : '';
  return `<article class="goal-card"><div class="goal-card-head"><div><div class="goal-meta">${escape(goal.id)} · IA REAL · ${escape(goal.providerId)} · ${fmt(goal.createdAt)}</div><h3>${escape(goal.objective)}</h3></div><span class="state-tag ${tags[goal.status] || ''}">${escape(names[goal.status] || goal.status)}</span></div><div class="goal-meta">Llamadas IA: ${goal.aiCalls}/${goal.maxAICalls} · tokens reportados entrada: ${input} · salida: ${output}</div>${stages ? `<div class="goal-stages">${stages}</div>` : '<p class="muted">La Reina está preparando y validando el plan.</p>'}${report}${history}${cancel}</article>`;
}
function setHtml(selector, items, renderItem, empty) { $(selector).innerHTML = items.length ? items.map(renderItem).join('') : `<div class="empty">${escape(empty)}</div>`; }
function render() {
  if (!state) return;
  hive.setAgents(state.agents);
  const realEnabled = Boolean(providerStatus?.canExecute);
  const providerName = providerStatus?.id === 'omniroute' ? 'OmniRoute' : providerStatus?.id === 'codex-exec' ? 'Codex' : 'Proveedor IA';
  $('#mode-label').textContent = realEnabled ? `● MODO IA REAL · ${providerName.toUpperCase()}` : '● MODO DEMOSTRACIÓN';
  $('#provider-status').textContent = providerStatus?.connected === false ? `${providerName} desconectado`
    : providerStatus?.connected === true ? `${providerName} conectado${providerStatus.model ? ` · ${providerStatus.model}` : ''}`
      : providerStatus?.enabled ? `${providerName} habilitado · acceso no comprobado` : 'OmniRoute deshabilitado';
  const modelSelect = $('#provider-model-select');
  const freeModels = (providerStatus?.models || []).filter(model => model.free);
  const nextOptions = freeModels.map(model => `<option value="${escape(model.id)}" ${model.id === providerStatus?.model ? 'selected' : ''}>${escape(model.name)}${model.provider ? ` · ${escape(model.provider)}` : ''}</option>`).join('');
  if (modelSelect.dataset.options !== nextOptions) { modelSelect.innerHTML = nextOptions || '<option value="">Sin modelo gratuito disponible</option>'; modelSelect.dataset.options = nextOptions; }
  modelSelect.disabled = freeModels.length === 0;
  $('#select-provider-model').disabled = freeModels.length === 0 || modelSelect.value === providerStatus?.model;
  $('#engine-status').textContent = state.engine?.paused ? 'Ⅱ Cola pausada' : state.engine?.active ? '● Ejecutando una tarea' : '● Motor disponible';
  $('#pause-button').textContent = state.engine?.paused ? 'Reanudar cola' : 'Pausar cola';
  $('#real-ai-button').disabled = !realEnabled;
  $('#new-real-task-button').disabled = !realEnabled;
  $('#real-goal-submit').disabled = !realEnabled;
  $('#mode-disclaimer').textContent = realEnabled
    ? `La Reina asignará la tarea a una hormiga; ${providerName} usará el modelo indicado. ${providerStatus?.error || 'No se realizan acciones comerciales.'}`
    : providerStatus?.error || 'Inicia OmniRoute en localhost:20128, conecta una ruta gratuita y habilita el motor para ejecutar IA real.';
  $('#metric-total').textContent = state.metrics.total; $('#metric-active').textContent = state.metrics.active; $('#metric-done').textContent = state.metrics.done; $('#metric-budget').textContent = cop(state.budget.available);
  setHtml('#recent-tasks', state.tasks.slice(0, 3), task => taskTemplate(task), 'Sin huevos aún. Crea el primero o inicia la demostración.');
  setHtml('#recent-events', state.events.slice(0, 3), eventTemplate, 'Sin actividad todavía.');
  setHtml('#all-tasks', state.tasks, task => taskTemplate(task, true), 'No hay tareas. La primera se asignará automáticamente.');
  setHtml('#goals-list', state.goals || [], goalTemplate, 'Aún no hay objetivos coordinados por la Reina.');
  setHtml('#all-events', state.events, eventTemplate, 'Aún no hay eventos.');
  setHtml('#all-products', state.products, product => `<article class="product-row"><div><h3>${escape(product.name)}</h3><p>Código: <strong>${escape(product.code)}</strong> · Costo ficticio: ${cop(product.costCOP)} · Precio ficticio: ${cop(product.priceCOP)}</p><small>Fuente: ${escape(product.source)} · Existencia real: NO VERIFICADA</small></div><span class="state-tag pending">FICTICIO</span></article>`, 'Sin productos de demostración. Prueba una tarea de Exploradora.');
  setHtml('#all-orders', state.orders, order => `<article class="order-row"><div><h3>${escape(order.id)} · ${escape(order.alias)}</h3><p>${escape(order.productCode)} · Cantidad ${order.quantity} · ${fmt(order.createdAt)}</p><small>Jamás enviado a Dropi. No usar datos personales reales.</small></div><span class="state-tag pending">DEMO</span></article>`, 'No hay celdillas de prueba. Puedes crear una sin registrar clientes reales.');
}
async function refresh() {
  try {
    const [response, providerResponse] = await Promise.all([fetch('/api/state', { cache: 'no-store' }), fetch('/api/provider/status', { cache: 'no-store' })]);
    if (!response.ok) throw new Error('No hay conexión con el motor');
    state = await response.json(); providerStatus = providerResponse.ok ? await providerResponse.json() : null; render();
  }
  catch (error) { notice('Motor desconectado: ' + error.message, true); }
}
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }

document.addEventListener('click', async event => {
  const tabButton = event.target.closest('[data-tab]'); if (tabButton) { switchTab(tabButton.dataset.tab); return; }
  const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
  if (action === 'close') { closeDialogs(); return; }
  if (action === 'new-task' || action === 'new-order' || action === 'new-real-task') { $(action === 'new-task' ? '#dialog-task' : action === 'new-order' ? '#dialog-order' : '#dialog-real-task').showModal(); return; }
  try {
    if (action === 'real-ai') {
      const button = $('#real-ai-button'); button.disabled = true;
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const accepted = await api('/api/tasks/real', { idempotencyKey });
      const providerName = providerStatus?.id === 'omniroute' ? 'OmniRoute' : 'Codex';
      notice(accepted.duplicate ? 'La solicitud ya existe en la cola.' : `La Reina asignó el análisis a ${state.agents.find(agent => agent.id === accepted.task.agentId)?.name || 'una hormiga'}; ${providerName} ejecutará la tarea.`); switchTab('tareas');
    }
    if (action === 'refresh-provider') { providerStatus = await (await fetch('/api/provider/status', { cache: 'no-store' })).json(); render(); notice(providerStatus.error || 'Estado de OmniRoute actualizado.', !providerStatus.canExecute); }
    if (action === 'select-provider-model') {
      const selection = await api('/api/provider/select-model', { model: $('#provider-model-select').value });
      providerStatus = await (await fetch('/api/provider/status', { cache: 'no-store' })).json();
      render(); notice(`Modelo gratuito seleccionado: ${selection.model}`);
    }
    if (action === 'toggle-pause') { const paused = state?.engine?.paused; await api(paused ? '/api/engine/resume' : '/api/engine/pause'); notice(paused ? 'Cola reanudada.' : 'Cola pausada; la tarea activa terminará.'); }
    if (action === 'cancel-task') { const id = event.target.closest('[data-task-id]')?.dataset.taskId; await api(`/api/tasks/${encodeURIComponent(id)}/cancel`); notice('Cancelación solicitada y registrada.'); switchTab('tareas'); }
    if (action === 'cancel-goal') { const id = event.target.closest('[data-goal-id]')?.dataset.goalId; await api(`/api/goals/${encodeURIComponent(id)}/cancel`); notice('La Reina canceló el objetivo y detuvo sus etapas.'); }
    if (action === 'demo') { const result = await api('/api/seed-demo'); notice(result.created ? `${result.created} huevos demo creados. La Reina está trabajando.` : 'La demostración ya fue creada anteriormente.'); }
    if (action === 'product-demo') { await api('/api/tasks', { title: 'Investigar producto ficticio para catálogo', type: 'productos' }); notice('Huevo de investigación ficticia asignado.'); }
    await refresh();
  } catch (error) { notice(error.message, true); }
});

$('#task-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  try { await api('/api/tasks', Object.fromEntries(new FormData(form))); closeDialogs(); form.reset(); notice('Huevo creado y asignado a una hormiga.'); switchTab('tareas'); await refresh(); }
  catch (error) { notice(error.message, true); await refresh(); }
});
$('#real-task-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  data.idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try { const accepted = await api('/api/tasks/real', data); closeDialogs(); form.reset(); notice(`La Reina asignó el huevo real a ${state.agents.find(agent => agent.id === accepted.task.agentId)?.name || 'la hormiga especialista'}.`); switchTab('tareas'); await refresh(); }
  catch (error) { notice(error.message, true); }
});
$('#real-goal-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  data.idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const submit = $('#real-goal-submit'); submit.disabled = true;
  try { const accepted = await api('/api/goals/real', data); form.reset(); notice(accepted.duplicate ? 'Ese objetivo ya está registrado.' : 'La Reina recibió el objetivo y preparará tres etapas con IA real.'); await refresh(); }
  catch (error) { notice(error.message, true); }
  finally { submit.disabled = !providerStatus?.canExecute; }
});
$('#order-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  try { await api('/api/orders', Object.fromEntries(new FormData(form))); closeDialogs(); form.reset(); notice('Celdilla ficticia guardada. Sin envío a Dropi.'); switchTab('pedidos'); await refresh(); }
  catch (error) { notice(error.message, true); }
});

refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 1200);
