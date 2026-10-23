import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Hive, AGENTS, VERSION } from '../server/core.mjs';
import { createServer } from '../server/index.mjs';
import { OmniRouteProvider } from '../server/providers/omniroute.mjs';
const testDataRoot=path.resolve('.test-tmp');
const setup=()=>{fs.mkdirSync(testDataRoot,{recursive:true});const dir=fs.mkdtempSync(path.join(testDataRoot,'case-'));return {dir,file:path.join(dir,'state.json'),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('la Reina asigna seis especialidades sin facturar, con persistencia',()=>{
  const temp=setup();const hive=new Hive(temp.file,{auto:false});
  try {
    assert.equal(AGENTS.length,7);assert.equal(VERSION,'0.1.0-preview.1');
    for(const [type,agentId] of Object.entries({productos:'exploradora',precios:'financiera',contenido:'creativa',ventas:'vendedora',calidad:'inspectora',seguridad:'guardiana'})){
      const t=hive.addTask({title:'Tarea verificable '+type,type});assert.equal(t.agentId,agentId);assert.equal(t.status,'asignada');assert.equal(t.simulated,true);
    }
    assert.equal(hive.snapshot().metrics.total,6);
    assert.equal(hive.snapshot().budget.available,130000);
    const second=new Hive(temp.file,{auto:false});assert.equal(second.snapshot().metrics.total,6);second.close();
  }finally{hive.close();temp.cleanup();}
});
test('rechaza pedidos y huevos incompletos o maliciosos',()=>{
 const temp=setup();const hive=new Hive(temp.file,{auto:false});try{
  assert.throws(()=>hive.addTask({title:'X',type:'productos'}));
  assert.throws(()=>hive.addTask({title:'Algo válido',type:'transferir_dinero'}));
  assert.throws(()=>hive.addOrder({alias:'X',productCode:'ABC',quantity:1}));
  assert.throws(()=>hive.addOrder({alias:'Demo',productCode:'ABC',quantity:-1}));
  assert.equal(hive.snapshot().tasks.length,0);
 }finally{hive.close();temp.cleanup();}
});
test('flujo real del motor simulado: huevo -> inspectora -> entrega',async()=>{
 const temp=setup();const hive=new Hive(temp.file,{auto:true,delayMs:25});
 try{
  const task=hive.addTask({title:'Investigar camiseta ficticia',type:'productos',priority:'alta'});
  await sleep(190);
  const done=hive.snapshot().tasks.find(x=>x.id===task.id);
  assert.equal(done.status,'completada');assert.equal(done.validation.passed,true);
  assert.equal(done.result.mode,'DEMO_SIN_IA');
  assert.equal(hive.snapshot().products.length,1);
  assert.equal(hive.snapshot().budget.spent,0);
 }finally{hive.close();temp.cleanup();}
});
test('flujo Codex inyectado: asignación, ejecución, inspección y entrega real sin duplicar',async()=>{
 const temp=setup();let calls=0,completeProvider;
 const provider={id:'codex-test',execute(task){calls++;return new Promise(resolve=>{completeProvider=()=>resolve({provider:this.id,simulated:false,mode:'CODEX_TEST',summary:`Resultado IA para ${task.title}`,evidence:['Salida estructurada de prueba.'],usage:{inputTokens:12,outputTokens:8}});});}};
 const {server,hive}=createServer({stateFile:temp.file,auto:true,delayMs:1,provider,allowRealAI:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const request={idempotencyKey:'real-test-0001',title:'Investigar producto de prueba',type:'productos',details:'Comparar ideas; marcar hipótesis.'};
  const first=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
  assert.equal(first.status,202);const accepted=await first.json();
  assert.equal(accepted.task.title,request.title);assert.equal(accepted.task.details,request.details);
  const duplicate=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
  assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).task.id,accepted.task.id);
  const duplicateWhileActive=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...request,idempotencyKey:'real-test-0002'})});
  assert.equal((await duplicateWhileActive.json()).task.id,accepted.task.id);
  completeProvider();
  await new Promise(resolve=>{const deadline=Date.now()+1000;const poll=()=>{const task=hive.snapshot().tasks.find(t=>t.id===accepted.task.id);if(task?.status==='completada')resolve();else if(Date.now()>deadline)resolve();else setTimeout(poll,5);};poll();});
  const done=hive.snapshot().tasks.find(t=>t.id===accepted.task.id);
  assert.equal(calls,1);assert.equal(done.agentId,'exploradora');assert.equal(done.status,'completada');assert.equal(done.simulated,false);
  assert.match(done.result.summary,/Resultado IA/);assert.equal(done.validation.passed,true);assert.ok(done.history.some(item=>item.status==='ejecutando'));
  assert.equal(done.result.usage.outputTokens,8);
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('cola pausada espera; la cancelación conserva el resultado y libera el ejecutor',async()=>{
 const temp=setup();let release;
 const provider={id:'codex-test',execute:()=>new Promise(resolve=>{release=resolve;})};
 const hive=new Hive(temp.file,{auto:true,provider,allowRealAI:true});
 try{
  hive.pause();const first=hive.addRealTask({title:'Trabajo cancelable de prueba',type:'productos',idempotencyKey:'cancel-test-0001'}).task;
  await sleep(15);assert.equal(first.status,'asignada');hive.resume();await sleep(15);assert.equal(first.status,'ejecutando');
  const queued=hive.addTask({title:'Segunda tarea del mismo agente',type:'productos'});
  assert.equal(queued.status,'asignada');assert.equal(hive.snapshot().agents.find(agent=>agent.id==='exploradora').status,'trabajando');
  assert.equal(hive.cancelTask(first.id),true);assert.equal(first.status,'cancelada');
  assert.equal(hive.cancelTask(queued.id),true);
  release({provider:'codex-test',simulated:false,mode:'CODEX_TEST',summary:'Tarde',evidence:['Salida tardía']});await sleep(15);
  assert.equal(first.status,'cancelada');assert.equal(hive.current,null);
 }finally{hive.close();temp.cleanup();}
});
test('un error del proveedor queda trazado sin reintento automático',async()=>{
 const temp=setup();let calls=0;const provider={id:'codex-test',async execute(){calls++;throw new Error('CLI no disponible');}};
 const hive=new Hive(temp.file,{auto:true,provider,allowRealAI:true});
 try{const {task}=hive.addRealTask({title:'Tarea de error controlado',type:'productos',idempotencyKey:'error-test-0001'});await sleep(25);
  assert.equal(task.status,'error');assert.match(task.error,/CLI no disponible/);assert.equal(task.attempts,1);assert.equal(calls,1);assert.ok(task.history.some(item=>item.status==='error'));
 }finally{hive.close();temp.cleanup();}
});
test('el motor rechaza credenciales antes de persistir una tarea IA',()=>{
 const temp=setup();const provider={id:'codex-test',execute:async()=>({})};const hive=new Hive(temp.file,{auto:false,provider,allowRealAI:true});
 try{assert.throws(()=>hive.addRealTask({title:'Revisar servicio de prueba',type:'seguridad',details:'password=NoEsUnaClaveReal12345',idempotencyKey:'secret-test-0001'}),/Quita claves/);assert.equal(hive.snapshot().tasks.length,0);}
 finally{hive.close();temp.cleanup();}
});
test('el motor rechaza datos de contacto de clientes antes de enviar a un proveedor externo',()=>{
 const temp=setup();const provider={id:'omniroute',execute:async()=>({})};const hive=new Hive(temp.file,{auto:false,provider,allowRealAI:true});
 try{assert.throws(()=>hive.addRealTask({title:'Preparar respuesta comercial',type:'ventas',details:'Enviar a cliente@example.com',idempotencyKey:'pii-test-email-001'}),/datos personales/i);
  assert.throws(()=>hive.addRealTask({title:'Preparar llamada comercial',type:'ventas',details:'Teléfono 3001234567',idempotencyKey:'pii-test-phone-001'}),/datos personales/i);assert.equal(hive.snapshot().tasks.length,0);
 }finally{hive.close();temp.cleanup();}
});
test('la ruta de IA real permanece deshabilitada salvo opt-in del servidor',async()=>{
 const temp=setup();const {server,hive}=createServer({stateFile:temp.file,auto:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{assert.equal(hive.snapshot().engine.available,false);
  const response=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Prueba real controlada'})});assert.equal(response.status,503);assert.equal(hive.snapshot().tasks.length,0);
  const queued=await fetch(`${base}/api/tasks`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Conservar tarea sin motor',type:'productos'})});assert.equal(queued.status,201);assert.equal((await queued.json()).task.status,'asignada');assert.equal(hive.snapshot().metrics.active,0);
 }
 finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('el botón de prueba crea el análisis fijo de tres ideas sin datos inventados',async()=>{
 const temp=setup();const provider={id:'codex-test',execute:async()=>({})};const {server,hive}=createServer({stateFile:temp.file,auto:false,provider,allowRealAI:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{const response=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idempotencyKey:'fixed-test-0001'})});assert.equal(response.status,202);
  const {task}=await response.json();assert.equal(task.title,'Analiza tres ideas de productos económicos para comercio electrónico en Colombia');assert.equal(task.agentId,'exploradora');
  assert.match(task.details,/no inventes precios/i);assert.equal(task.simulated,false);assert.equal(task.status,'asignada');
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('integración HTTP completa Reina → OmniRoute simulado → Inspectora con trazabilidad de proveedor y modelo',async()=>{
 const temp=setup();
 const provider=new OmniRouteProvider({baseURL:'http://127.0.0.1:20128/v1',model:'pollinations/test-model',freeModelIds:['pollinations/test-model'],fetchImpl:async url=>{
  if(String(url).endsWith('/models'))return new Response(JSON.stringify({data:[{id:'pollinations/test-model',owned_by:'Pollinations'}]}),{headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({model:'pollinations/test-model',provider:'pollinations',choices:[{message:{content:'```json\n'+JSON.stringify({summary:'Tres categorías hipotéticas; no se verificaron precios.',evidence:['Comparación razonada de prueba.','Falta verificar proveedores y demanda.']})+'\n```'}}],usage:{prompt_tokens:42,completion_tokens:24}}),{headers:{'content-type':'application/json'}});
 }});
 const {server,hive}=createServer({stateFile:temp.file,auto:true,delayMs:1,provider,allowRealAI:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const status=await(await fetch(`${base}/api/provider/status`)).json();assert.equal(status.connected,true);assert.equal(status.canExecute,true);assert.equal(status.model,'pollinations/test-model');
  const response=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idempotencyKey:'omni-route-test-001',title:'Investigar tres categorías en Colombia',type:'productos'})});
  assert.equal(response.status,202);const {task:accepted}=await response.json();assert.equal(accepted.agentId,'exploradora');
  await new Promise(resolve=>{const deadline=Date.now()+1000;const poll=()=>{if(hive.snapshot().tasks[0]?.status==='completada'||Date.now()>deadline)resolve();else setTimeout(poll,5);};poll();});
  const done=hive.snapshot().tasks.find(item=>item.id===accepted.id);assert.equal(done.status,'completada');assert.equal(done.executionMode,'omniroute');assert.equal(done.providerId,'omniroute');
  assert.equal(done.result.simulated,false);assert.equal(done.result.mode,'OMNIROUTE_REAL');assert.equal(done.result.upstreamProvider,'pollinations');assert.match(done.result.summary,/Tres categorías/);
  assert.equal(done.result.usage.inputTokens,42);assert.equal(done.validation.passed,true);assert.ok(done.history.some(event=>event.status==='ejecutando'));assert.ok(done.history.some(event=>event.status==='verificando'));
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('OmniRoute sin modelo gratuito conectado informa error y no crea ni simula una tarea IA',async()=>{
 const temp=setup();const provider=new OmniRouteProvider({baseURL:'http://127.0.0.1:20128/v1',fetchImpl:async()=>new Response(JSON.stringify({data:[]}),{headers:{'content-type':'application/json'}})});
 const {server,hive}=createServer({stateFile:temp.file,auto:true,provider,allowRealAI:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{const status=await(await fetch(`${base}/api/provider/status`)).json();assert.equal(status.connected,true);assert.equal(status.canExecute,false);
  const response=await fetch(`${base}/api/tasks/real`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idempotencyKey:'omni-no-route-001'})});assert.equal(response.status,503);assert.match((await response.json()).error,/modelo gratuito/i);assert.equal(hive.snapshot().tasks.length,0);
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('API local permite seleccionar un modelo gratuito y rechaza un modelo no marcado como gratuito',async()=>{
 const temp=setup();const provider=new OmniRouteProvider({baseURL:'http://127.0.0.1:20128/v1',freeModelIds:[],fetchImpl:async()=>new Response(JSON.stringify({data:[
  {id:'free/verified',owned_by:'Proveedor gratuito',free:true},{id:'paid/not-allowed',owned_by:'Proveedor comercial'}]}),{headers:{'content-type':'application/json'}})});
 const {server,hive}=createServer({stateFile:temp.file,auto:false,provider,allowRealAI:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{let status=await(await fetch(`${base}/api/provider/status`)).json();assert.equal(status.canExecute,false);assert.equal(status.models.length,2);
  const paid=await fetch(`${base}/api/provider/select-model`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'paid/not-allowed'})});assert.equal(paid.status,400);assert.match((await paid.json()).error,/no está marcado como gratuito/i);
  const free=await fetch(`${base}/api/provider/select-model`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'free/verified'})});assert.equal(free.status,200);
  status=await(await fetch(`${base}/api/provider/status`)).json();assert.equal(status.model,'free/verified');assert.equal(status.canExecute,true);
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
test('reinicio seguro recupera tareas incompletas',()=>{
 const temp=setup();const provider={id:'codex-test',execute:async()=>({})};const first=new Hive(temp.file,{auto:false,provider,allowRealAI:true});
 try{const t=first.addTask({title:'Tarea tras interrupción',type:'calidad'});first.db.tasks[0].status='en_progreso';first.persist();first.close();
  const second=new Hive(temp.file,{auto:false});assert.equal(second.snapshot().tasks[0].status,'pendiente');second.close();
 }finally{temp.cleanup();}
});
test('un huevo Codex interrumpido requiere intervención y no se reejecuta al reiniciar',()=>{
 const temp=setup();const provider={id:'codex-test',execute:async()=>({})};const first=new Hive(temp.file,{auto:false,provider,allowRealAI:true});
 try{const {task}=first.addRealTask({title:'Tarea Codex interrumpida',type:'productos',idempotencyKey:'restart-test-0001'});first.db.tasks[0].status='ejecutando';first.persist();first.close();
  const second=new Hive(temp.file,{auto:false,provider,allowRealAI:true});const recovered=second.snapshot().tasks.find(t=>t.id===task.id);assert.equal(recovered.status,'necesita_intervencion');assert.equal(recovered.simulated,false);second.close();
 }finally{temp.cleanup();}
});
test('preserva un huevo real asignado sin proveedor y ejecuta las demostraciones disponibles',async()=>{
 const temp=setup();const provider={id:'omniroute',execute:async()=>({})};const first=new Hive(temp.file,{auto:false,provider,allowRealAI:true});
 let task;
 try{task=first.addRealTask({title:'Tarea OmniRoute en espera',type:'productos',idempotencyKey:'omni-queued-test-001'}).task;assert.equal(task.status,'asignada');first.close();
  const disabled=new Hive(temp.file,{auto:true,delayMs:5,allowRealAI:false});const waiting=disabled.snapshot().tasks.find(item=>item.id===task.id);assert.equal(waiting.status,'asignada');
  const demo=disabled.addTask({title:'Demostración pendiente de motor',type:'seguridad'});await sleep(80);assert.equal(demo.status,'completada');assert.equal(waiting.status,'asignada');disabled.close();
 }finally{temp.cleanup();}
});
test('migra tareas antiguas sin campos de modo como simulaciones, preservando su identidad',()=>{
 const temp=setup();const first=new Hive(temp.file,{auto:false});let task;
 try{task=first.addTask({title:'Tarea histórica sin modo explícito',type:'seguridad'});delete task.executionMode;delete task.simulated;first.persist();first.close();
  const migrated=new Hive(temp.file,{auto:false,allowRealAI:false});const restored=migrated.snapshot().tasks.find(item=>item.id===task.id);
  assert.equal(restored.id,task.id);assert.equal(restored.executionMode,'simulation');assert.equal(restored.simulated,true);migrated.close();
 }finally{temp.cleanup();}
});
test('no duplica las demostraciones ni registra pedidos reales',()=>{
 const temp=setup();const hive=new Hive(temp.file,{auto:false});try{
  assert.equal(hive.addDemo(),3);assert.equal(hive.addDemo(),0);
  const order=hive.addOrder({alias:'Cliente demo',productCode:'DEMO-CAM-001',quantity:2});
  assert.equal(order.status,'borrador_simulado');assert.equal(order.verified,false);
  assert.equal(hive.snapshot().budget.spent,0);
 }finally{hive.close();temp.cleanup();}
});
test('servidor HTTP ofrece interfaz y API locales; rechaza orígenes foráneos',async()=>{
 const temp=setup();const {server,hive}=createServer({stateFile:temp.file,auto:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const p=server.address().port, base=`http://127.0.0.1:${p}`;
 try{
  const index=await fetch(base);assert.equal(index.status,200);const html=await index.text();assert.match(html,/LA COLONIA/);assert.match(html,/EJECUTAR CON IA REAL/);assert.match(html,/real-ai-button/);assert.match(html,/new-real-task-button/);assert.match(html,/real-task-form/);assert.match(html,/zolvani-brand/);
  const logo=await fetch(`${base}/assets/zolvani-horizontal.png`);assert.equal(logo.status,200);assert.match(logo.headers.get('content-type'),/image\/png/);
  const mobileMark=await fetch(`${base}/assets/zolvani-icono-64.png`);assert.equal(mobileMark.status,200);assert.match(mobileMark.headers.get('content-type'),/image\/png/);
  const favicon=await fetch(`${base}/assets/favicon.ico`);assert.equal(favicon.status,200);assert.match(favicon.headers.get('content-type'),/image\/x-icon/);
  const tokens=await fetch(`${base}/tokens.css`);assert.equal(tokens.status,200);assert.match(await tokens.text(),/--zolvani-fondo:\s*#2B0D12/);
  const js=await fetch(`${base}/hive3d.js`);assert.equal(js.status,200);
  const state=await(await fetch(`${base}/api/state`)).json();assert.equal(state.meta.mode,'simulacion');
  const cross=await fetch(`${base}/api/tasks`,{method:'POST',headers:{origin:'https://malicioso.ejemplo','content-type':'application/json'},body:JSON.stringify({title:'No autorizado',type:'productos'})});assert.equal(cross.status,403);
  const created=await fetch(`${base}/api/tasks`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({title:'Crear por API de prueba',type:'seguridad'})});assert.equal(created.status,201);
  const outside=await fetch(`${base}/../package.json`);assert.notEqual(outside.status,200);
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
