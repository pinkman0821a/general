// Renderer 3D ligero. Modelos y celdillas con vértices (x,y,z), proyección isométrica y oclusión.
// Sin bibliotecas externas: útil para probar la visualización en equipos modestos.
const TAU = Math.PI * 2;
const COLORS = ['#efb44d','#5dd2bb','#7aa6ff','#f5a1d1','#eea576','#b99ff7','#95d581'];
const STATIONS = [
  [0, 0], [0, -3.06], [2.65, -1.53], [2.65, 1.53], [0, 3.06], [-2.65, 1.53], [-2.65, -1.53],
];
const rgba = (hex,a) => {
  const h=hex.replace('#','');const n=parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};
export class Hive3D {
  constructor(canvas, onSelect) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.agents=[];this.angle=-.32;this.zoom=1;
    this.onSelect=onSelect;this.drag=null;this.points=[];
    this.setupEvents();this.render=this.render.bind(this);this.resize();this.frame=requestAnimationFrame(this.render);
  }
  setAgents(agents){this.agents=agents;}
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
  drawFloor(t){const c=this.ctx;const p=this.point(0,-.9,0);this.ellipse(p.x,p.y+36,this.w*.31,this.h*.20,'#0f2c2e');
    for(let i=0;i<22;i++){const a=i*2.4+t*.00005,r=(i%7+2)*.56;const q=this.point(Math.cos(a)*r,-.86,Math.sin(a)*r);this.ellipse(q.x,q.y,1.2,1.2,'#42605a55');}
  }
  hex(x,y,z,r=1.15){return Array.from({length:6},(_,i)=>{const a=Math.PI/6+i*TAU/6;return this.point(x+Math.cos(a)*r,y,z+Math.sin(a)*r);});}
  tile(index,agent,t){const [x,z]=STATIONS[index];const color=COLORS[index];const lower=this.hex(x,-.60,z),top=this.hex(x,-.08,z);const c=this.ctx;
    for(let k=0;k<6;k++){const j=(k+1)%6;this.polygon([lower[k],lower[j],top[j],top[k]],(k%2===0)?'#344331':'#263e39','#61807725');}
    this.polygon(top,index===0?'#6f5526':'#1b3940','#d9ac5766',1.5);
    const center=this.point(x,-.07,z);
    const gradient=c.createRadialGradient(center.x,center.y,2,center.x,center.y,45);gradient.addColorStop(0,rgba(color,.24));gradient.addColorStop(1,rgba(color,0));this.ellipse(center.x,center.y,44,27,gradient);
    const working=agent?.status==='trabajando';const bob=Math.sin(t*.003+index*2)*.10+(working?.20:0);
    const b=this.point(x,.75+bob,z);
    const shadow=this.point(x,-.10,z);this.ellipse(shadow.x,shadow.y,21,8,'#07181b99');
    // Alas translúcidas, cabeza y abdomen: volumen radial y patrón de franjas.
    const flutter=working?Math.sin(t*.027)*5:Math.sin(t*.008)*2;
    this.ellipse(b.x-19,b.y-8-flutter,22,10,'#c8edee88',-.45);
    this.ellipse(b.x+19,b.y-8+flutter,22,10,'#c8edee88',.45);
    const grad=c.createRadialGradient(b.x-6,b.y-10,2,b.x,b.y,28);grad.addColorStop(0,'#fff3a9');grad.addColorStop(.52,'#e9b33f');grad.addColorStop(1,'#8f591b');
    this.ellipse(b.x,b.y,24,20,grad);
    c.save();c.beginPath();c.ellipse(b.x,b.y,24,20,0,0,TAU);c.clip();c.fillStyle='#333335';c.fillRect(b.x-10,b.y-22,8,47);c.fillRect(b.x+7,b.y-22,7,47);c.restore();
    this.ellipse(b.x-12,b.y-7,3.1,4,'#fff8d7');this.ellipse(b.x+14,b.y-7,3.1,4,'#fff8d7');
    if(index===0){this.ctx.font='25px sans-serif';this.ctx.textAlign='center';this.ctx.fillText('♛',b.x,b.y-21);}
    if(working){const egg=this.point(x+.52,.35+bob,z-.3);this.ellipse(egg.x,egg.y,6,9,'#fff1ae');}
    c.font='700 11px "Segoe UI",sans-serif';c.textAlign='center';c.fillStyle='#e4edf0';c.fillText(agent?.name||'...',center.x,center.y+40);
    c.font='9px "Segoe UI",sans-serif';c.fillStyle=working?'#f4bf63':'#76d8be';c.fillText(working?'● Trabajando':'● Disponible',center.x,center.y+53);
    this.points.push({...b,agent});
  }
  render(t){this.resize();const c=this.ctx;c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,this.w,this.h);this.drawFloor(t);this.points=[];
    const tiles=STATIONS.map(([x,z],i)=>({i,depth:this.point(x,0,z).depth})).sort((a,b)=>a.depth-b.depth);
    for(const {i} of tiles)this.tile(i,this.agents[i],t);
    this.frame=requestAnimationFrame(this.render);
  }
  destroy(){cancelAnimationFrame(this.frame);}
}
