import { Hive3D } from './hive3d.js';
const $=(q)=>document.querySelector(q);
const fmt=(date)=>date?new Date(date).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'—';
const cop=(n)=>'$'+new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(n||0);
const escape=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={pendiente:'Pendiente',en_progreso:'En progreso',verificando:'En verificación',completada:'Completada',bloqueada:'Bloqueada',borrador_simulado:'Borrador demo'};
const tags={pendiente:'pending',en_progreso:'running',verificando:'running',completada:'',bloqueada:'block'};
const agentIcon={exploradora:'⌕',financiera:'$',creativa:'✎',vendedora:'◌',inspectora:'✓',guardiana:'◇'};
let state=null,tab='panel',flashTimer;
const hive=new Hive3D($('#hive3d'),a=>{if(a)notice(`${a.name}: ${a.role} · ${a.status}`);});
function notice(message,bad=false){const n=$('#notice');n.textContent=message;n.style.background=bad?'#59302e':'#203e3a';n.classList.add('show');clearTimeout(flashTimer);flashTimer=setTimeout(()=>n.classList.remove('show'),4500);}
async function api(path,data){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});const obj=await r.json();if(!r.ok)throw new Error(obj.error||'Error de conexión');return obj;}
function switchTab(next){tab=next;document.querySelectorAll('[data-tab]').forEach(el=>{if(el.classList.contains('nav'))el.classList.toggle('active',el.dataset.tab===next)});document.querySelectorAll('.view').forEach(el=>el.classList.toggle('visible',el.id==='view-'+next));$('#current-page').textContent={panel:'Vista general',tareas:'Huevos',pedidos:'Celdillas',productos:'Productos',registro:'Registro'}[next]||next;}
function taskTemplate(t,expanded=false){const agent=state.agents.find(a=>a.id===t.agentId);const tag=`<span class="state-tag ${tags[t.status]||''}">${escape(names[t.status]||t.status)}</span>`;
  if(!expanded)return `<div class="stack-item"><div class="item-icon">${agentIcon[t.agentId]||'◈'}</div><div class="item-body"><div class="item-title">${escape(t.title)}</div><div class="item-detail">${escape(agent?.name||'Abeja')} · ${fmt(t.createdAt)}</div></div>${tag}</div>`;
  return `<article class="task-row"><div><div class="task-meta">${escape(t.id)} · ${escape(agent?.name||'Abeja')} · ${fmt(t.createdAt)} · PRIORIDAD ${escape(t.priority.toUpperCase())}</div><h3>${escape(t.title)}</h3>${t.details?`<p>${escape(t.details)}</p>`:''}${t.result?`<p class="task-result">${escape(t.result.summary)}<br><strong>Inspectora:</strong> ${t.validation?.passed?'formato validado':'sin validar'} · <strong>Modo:</strong> ${escape(t.result.mode)}</p>`:''}</div>${tag}</article>`;
}
function eventTemplate(e){return `<div class="stack-item"><div class="item-icon">◷</div><div class="item-body"><div class="item-title">${escape(e.message)}</div><div class="item-detail">${fmt(e.at)}${e.taskId?' · '+escape(e.taskId):''}</div></div></div>`;}
function setHtml(id,items,fn,empty){$(id).innerHTML=items.length?items.map(fn).join(''):`<div class="empty">${escape(empty)}</div>`;}
function render(){if(!state)return;hive.setAgents(state.agents);
  $('#metric-total').textContent=state.metrics.total;$('#metric-active').textContent=state.metrics.active;$('#metric-done').textContent=state.metrics.done;$('#metric-budget').textContent=cop(state.budget.available);
  setHtml('#recent-tasks',state.tasks.slice(0,3),t=>taskTemplate(t),'Sin huevos aún. Crea el primero o inicia la demostración.');
  setHtml('#recent-events',state.events.slice(0,3),eventTemplate,'Sin actividad todavía.');
  setHtml('#all-tasks',state.tasks,t=>taskTemplate(t,true),'No hay tareas. La primera se asignará automáticamente.');
  setHtml('#all-events',state.events,eventTemplate,'Aún no hay eventos.');
  setHtml('#all-products',state.products,p=>`<article class="product-row"><div><h3>${escape(p.name)}</h3><p>Código: <strong>${escape(p.code)}</strong> · Costo ficticio: ${cop(p.costCOP)} · Precio ficticio: ${cop(p.priceCOP)}</p><small>Fuente: ${escape(p.source)} · Existencia real: NO VERIFICADA</small></div><span class="state-tag pending">FICTICIO</span></article>`,'Sin productos de demostración. Prueba una tarea de Exploradora.');
  setHtml('#all-orders',state.orders,o=>`<article class="order-row"><div><h3>${escape(o.id)} · ${escape(o.alias)}</h3><p>${escape(o.productCode)} · Cantidad ${o.quantity} · ${fmt(o.createdAt)}</p><small>Jamás enviado a Dropi. No usar datos personales reales.</small></div><span class="state-tag pending">DEMO</span></article>`,'No hay celdillas de prueba. Puedes crear una sin registrar clientes reales.');
}
async function refresh(){try{const response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw new Error('No hay conexión con el motor');state=await response.json();render();}catch(e){notice('Motor desconectado: '+e.message,true);}}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
document.addEventListener('click',async e=>{const tabButton=e.target.closest('[data-tab]');if(tabButton){switchTab(tabButton.dataset.tab);return;}
 const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(action==='close'){closeDialogs();return;}
 if(action==='new-task'||action==='new-order'){const dialog=$(action==='new-task'?'#dialog-task':'#dialog-order');dialog.showModal();return;}
 try{if(action==='demo'){const r=await api('/api/seed-demo');notice(r.created?`${r.created} huevos demo creados. La Reina está trabajando.`:'La demostración ya fue creada anteriormente.');}
 if(action==='product-demo'){await api('/api/tasks',{title:'Investigar producto ficticio para catálogo',type:'productos'});notice('Huevo de investigación ficticia asignado.');}
 await refresh();}catch(err){notice(err.message,true);}
});
$('#task-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));try{await api('/api/tasks',data);closeDialogs();form.reset();notice('Huevo creado y asignado a una abeja.');switchTab('tareas');await refresh();}catch(err){notice(err.message,true);}});
$('#order-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;try{await api('/api/orders',Object.fromEntries(new FormData(form)));closeDialogs();form.reset();notice('Celdilla ficticia guardada. Sin envío a Dropi.');switchTab('pedidos');await refresh();}catch(err){notice(err.message,true);}});
refresh();setInterval(()=>{if(!document.hidden)refresh();},1200);
