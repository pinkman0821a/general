import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Hive, AGENTS, VERSION } from '../server/core.mjs';
import { createServer } from '../server/index.mjs';
const setup=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zolvani-test-'));return {dir,file:path.join(dir,'state.json'),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('la Reina asigna seis especialidades sin facturar, con persistencia',()=>{
  const temp=setup();const hive=new Hive(temp.file,{auto:false});
  try {
    assert.equal(AGENTS.length,7);assert.equal(VERSION,'0.1.0-preview.1');
    for(const [type,agentId] of Object.entries({productos:'exploradora',precios:'financiera',contenido:'creativa',ventas:'vendedora',calidad:'inspectora',seguridad:'guardiana'})){
      const t=hive.addTask({title:'Tarea verificable '+type,type});assert.equal(t.agentId,agentId);assert.equal(t.status,'pendiente');assert.equal(t.simulated,true);
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
test('reinicio seguro recupera tareas incompletas',()=>{
 const temp=setup();const first=new Hive(temp.file,{auto:false});
 try{const t=first.addTask({title:'Tarea tras interrupción',type:'calidad'});first.db.tasks[0].status='en_progreso';first.persist();first.close();
  const second=new Hive(temp.file,{auto:false});assert.equal(second.snapshot().tasks[0].status,'pendiente');second.close();
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
  const index=await fetch(base);assert.equal(index.status,200);assert.match(await index.text(),/LA COLMENA/);
  const js=await fetch(`${base}/hive3d.js`);assert.equal(js.status,200);
  const state=await(await fetch(`${base}/api/state`)).json();assert.equal(state.meta.mode,'simulacion');
  const cross=await fetch(`${base}/api/tasks`,{method:'POST',headers:{origin:'https://malicioso.ejemplo','content-type':'application/json'},body:JSON.stringify({title:'No autorizado',type:'productos'})});assert.equal(cross.status,403);
  const created=await fetch(`${base}/api/tasks`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({title:'Crear por API de prueba',type:'seguridad'})});assert.equal(created.status,201);
  const outside=await fetch(`${base}/../package.json`);assert.notEqual(outside.status,200);
 }finally{hive.close();await new Promise(resolve=>server.close(resolve));temp.cleanup();}
});
