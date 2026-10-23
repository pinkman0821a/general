// Renderer 3D ligero. Modelos y celdillas con vértices (x,y,z), proyección isométrica y oclusión.
// Sin bibliotecas externas: útil para probar la visualización en equipos modestos.
const TAU = Math.PI * 2;
export function createPalette(readToken) {
  const read = name => readToken(name).trim();
  return {
    stations: ['--zolvani-rose-gold','--zolvani-cobre-suave','--zolvani-cobre-profundo','--zolvani-borgona','--zolvani-texto-secundario','--zolvani-rose-gold','--zolvani-cobre-profundo'].map(read),
    floor: read('--zolvani-fondo'), surface: read('--zolvani-superficie'), burgundy: read('--zolvani-borgona'),
    copper: read('--zolvani-rose-gold'), copperDeep: read('--zolvani-cobre-profundo'), text: read('--zolvani-texto'),
    textSoft: read('--zolvani-texto-secundario'), available: read('--zolvani-ok'), working: read('--zolvani-alerta'), error: read('--zolvani-error'),
  };
}
const STATIONS = [
  [0, 0], [0, -3.06], [2.65, -1.53], [2.65, 1.53], [0, 3.06], [-2.65, 1.53], [-2.65, -1.53],
];
const rgba = (hex,a) => {
  const h=hex.replace('#','');const n=parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};
export class Hive3D {
  constructor(canvas, onSelect) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.agents=[];this.angle=-.32;this.zoom=1;this.motion=new Map();this.travelValues=new Map();this.agentStates=new Map();
    const styles=getComputedStyle(document.documentElement);this.colors=createPalette(name=>styles.getPropertyValue(name));
    this.onSelect=onSelect;this.drag=null;this.points=[];
    this.setupEvents();this.render=this.render.bind(this);this.resize();this.frame=requestAnimationFrame(this.render);
  }
  setAgents(agents){
    this.agents=agents;
    for(const agent of agents){
      const previous=this.agentStates.get(agent.id);const target=this.travelTarget(agent.status);
      if(previous!==undefined&&previous!==agent.status){
        this.motion.set(agent.id,{from:this.travelValues.get(agent.id)??this.travelTarget(previous),to:target,started:performance.now(),duration:850});
      }else if(previous===undefined)this.travelValues.set(agent.id,target);
      this.agentStates.set(agent.id,agent.status);
    }
  }
  travelTarget(status){return status==='asignada' ? 0.36 : status==='entregando' ? 0.72 : status==='trabajando' ? 0.12 : 0;}
  travelFor(agent,t){
    const motion=this.motion.get(agent?.id);if(!motion)return this.travelValues.get(agent?.id)||0;
    const progress=Math.max(0,Math.min(1,(t-motion.started)/motion.duration));const eased=progress*progress*(3-2*progress);
    const value=motion.from+(motion.to-motion.from)*eased;this.travelValues.set(agent.id,value);
    if(progress===1)this.motion.delete(agent.id);return value;
  }
  resize() {
    const bounds=this.canvas.getBoundingClientRect();
    const ratio=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(1,Math.round(bounds.width*ratio)),h=Math.max(1,Math.round(bounds.height*ratio));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.w=bounds.width;this.h=bounds.height;this.ratio=ratio;
  }
  setupEvents() {
    const c=this.canvas;
    c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);this.drag={x:e.clientX,original:e.clientX,y:e.clientY};});
    c.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x;this.angle+=dx*.008;this.drag.x=e.clientX;});
    c.addEventListener('pointerup',e=>{if(!this.drag)return;const moved=Math.abs(e.clientX-this.drag.original);this.drag=null;
      if(moved<7){const r=c.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;const nearest=[...this.points].sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];if(nearest&&Math.hypot(x-nearest.x,y-nearest.y)<45)this.onSelect?.(nearest.agent);} });
    c.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.7,Math.min(1.35,this.zoom-e.deltaY*.001));},{passive:false});
    window.addEventListener('resize',()=>this.resize());
  }
  point(x,y,z){
    const a=this.angle,rx=x*Math.cos(a)-z*Math.sin(a),rz=x*Math.sin(a)+z*Math.cos(a);
    const s=Math.min(this.w/11.8,this.h/9.7)*this.zoom;
    return {x:this.w/2+rx*s,y:this.h*.51+(rz*.48-y*.98)*s,depth:rz};
  }
  polygon(pts,fill,stroke='#ffffff08',width=1){const c=this.ctx;c.beginPath();c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  ellipse(x,y,rx,ry,fill,rot=0){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fillStyle=fill;c.fill();}
  drawFloor(t){const c=this.ctx;const p=this.point(0,-.9,0);this.ellipse(p.x,p.y+36,this.w*.31,this.h*.20,rgba(this.colors.copper,.07));
    // Caminos visibles conectan la cámara central de la Reina con cada estación.
    c.save();c.lineCap='round';c.lineWidth=5;c.strokeStyle=rgba(this.colors.copperDeep,.35);
    for(let i=1;i<STATIONS.length;i++){const [x,z]=STATIONS[i];const a=this.point(0,-.82,0),b=this.point(x,-.82,z);c.beginPath();c.moveTo(a.x,a.y+30);c.lineTo(b.x,b.y+30);c.stroke();}
    c.restore();
    for(let i=0;i<22;i++){const a=i*2.4+t*.00005,r=(i%7+2)*.56;const q=this.point(Math.cos(a)*r,-.86,Math.sin(a)*r);this.ellipse(q.x,q.y,1.2,1.2,rgba(this.colors.copper,.33));}
  }
  hex(x,y,z,r=1.15){return Array.from({length:6},(_,i)=>{const a=Math.PI/6+i*TAU/6;return this.point(x+Math.cos(a)*r,y,z+Math.sin(a)*r);});}
  tile(index,agent,t){const [x,z]=STATIONS[index];const color=this.colors.stations[index];const lower=this.hex(x,-.60,z),top=this.hex(x,-.08,z);const c=this.ctx;
    for(let k=0;k<6;k++){const j=(k+1)%6;this.polygon([lower[k],lower[j],top[j],top[k]],(k%2===0)?this.colors.surface:this.colors.floor,rgba(this.colors.copperDeep,.35));}
    this.polygon(top,index===0?this.colors.burgundy:this.colors.surface,rgba(this.colors.copper,.42),1.5);
    const center=this.point(x,-.07,z);
    const gradient=c.createRadialGradient(center.x,center.y,2,center.x,center.y,45);gradient.addColorStop(0,rgba(color,.24));gradient.addColorStop(1,rgba(color,0));this.ellipse(center.x,center.y,44,27,gradient);
    const status=agent?.status||'disponible';const working=status==='trabajando';const assigned=status==='asignada';const delivering=status==='entregando';
    const walk=working||assigned||delivering;const bob=Math.sin(t*.003+index*2)*.06+(working?Math.sin(t*.012)*.16:0);
    const travel=this.travelFor(agent,t);const antX=x*(1-travel),antZ=z*(1-travel);
    const b=this.point(antX,.75+bob,antZ);
    const shadow=this.point(antX,-.10,antZ);this.ellipse(shadow.x,shadow.y,19,7,rgba(this.colors.floor,.6));
    // Hormiga sobria de seis patas: cabeza, tórax, abdomen y antenas, dibujados por código.
    const legSwing=walk?Math.sin(t*.018+index)*5:Math.sin(t*.003+index)*1.1;
    c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=this.colors.floor;c.lineWidth=2.1;
    for(let side of [-1,1])for(let leg=0;leg<3;leg++){
      const jointX=b.x-5+leg*8,jointY=b.y+6+side*2;
      c.beginPath();c.moveTo(jointX,jointY);c.lineTo(jointX-5+legSwing*side,b.y+13+side*3);c.lineTo(jointX-8+legSwing*side,b.y+17+side*5);c.stroke();
    }
    c.strokeStyle=this.colors.copperDeep;c.lineWidth=1.5;
    for(let side of [-1,1]){c.beginPath();c.moveTo(b.x+12,b.y-8);c.quadraticCurveTo(b.x+15,b.y-17-side*2,b.x+21,b.y-18-side*4);c.stroke();}
    c.restore();
    const abdomen=c.createRadialGradient(b.x-17,b.y-5,1,b.x-14,b.y,12);abdomen.addColorStop(0,this.colors.textSoft);abdomen.addColorStop(.5,this.colors.copperDeep);abdomen.addColorStop(1,this.colors.floor);
    this.ellipse(b.x-14,b.y+1,index===0?14:11,8,abdomen);
    this.ellipse(b.x,b.y,7,6,this.colors.burgundy);
    const head=c.createRadialGradient(b.x+12,b.y-7,1,b.x+13,b.y,10);head.addColorStop(0,this.colors.text);head.addColorStop(.5,this.colors.copper);head.addColorStop(1,this.colors.burgundy);
    this.ellipse(b.x+13,b.y-1,index===0?10:8,index===0?9:7,head);
    this.ellipse(b.x+16,b.y-3,1.5,1.5,this.colors.text);
    if(index===0){c.font='20px sans-serif';c.textAlign='center';c.fillStyle=this.colors.text;c.fillText('♛',b.x+1,b.y-17);}
    if(working||delivering){const egg=this.point(antX+.52,.35+bob,antZ-.3);this.ellipse(egg.x,egg.y,5,7,this.colors.text);}
    c.font='700 11px "Segoe UI",sans-serif';c.textAlign='center';c.fillStyle=this.colors.text;c.fillText(agent?.name||'...',center.x,center.y+40);
    const statusText={disponible:'● Disponible',trabajando:'● Trabajando',asignada:'↗ Asignada',entregando:'◆ Entregando',error:'! Error'}[status]||'● Disponible';
    c.font='9px "Segoe UI",sans-serif';c.fillStyle=status==='error'?this.colors.error:walk?this.colors.working:this.colors.available;c.fillText(statusText,center.x,center.y+53);
    this.points.push({...b,agent});
  }
  render(t){this.resize();const c=this.ctx;c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,this.w,this.h);this.drawFloor(t);this.points=[];
    const tiles=STATIONS.map(([x,z],i)=>({i,depth:this.point(x,0,z).depth})).sort((a,b)=>a.depth-b.depth);
    for(const {i} of tiles)this.tile(i,this.agents[i],t);
    this.frame=requestAnimationFrame(this.render);
  }
  destroy(){cancelAnimationFrame(this.frame);}
}
