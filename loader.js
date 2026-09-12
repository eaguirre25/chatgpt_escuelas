(async function(){
const base='https://raw.githubusercontent.com/eaguirre25/chatgpt_escuelas/main/';
const radioFiles=['data/radios_01.js','data/radios_02.js','data/radios_03.js','data/radios_04_1.js','data/radios_04_2.js','data/radios_04_3.js','data/radios_04_4.js','data/radios_04_5.js','data/radios_05_1.js','data/radios_05_2.js'];
async function ft(p){const r=await fetch(base+p+'?v=20260911b',{cache:'no-store'});if(!r.ok)throw Error(`No se pudo descargar ${p}`);return r.text()}
function arr(c,p){const q=c.indexOf('.concat('),s=c.indexOf('[',q);if(q<0||s<0)throw Error(`Formato inesperado ${p}`);let d=0,z=false,e=false;for(let i=s;i<c.length;i++){let x=c[i];if(z){if(e){e=false;continue}if(x==='\\'){e=true;continue}if(x==='"')z=false;continue}if(x==='"'){z=true;continue}if(x==='[')d++;if(x===']'&&--d===0)return JSON.parse(c.slice(s,i+1))}throw Error(`Array incompleto ${p}`)}
function compact(c){const k='window.STUDENT_COMPACT=',s=c.indexOf(k)+k.length,e=c.lastIndexOf(';');if(s<k.length)throw Error('Formato de estudiantes inesperado');return JSON.parse(c.slice(s,e))}
function ring(pt,r){let x=pt[0],y=pt[1],inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){let xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside}return inside}
function poly(pt,g){if(g.type==='Polygon')return ring(pt,g.coordinates[0]);if(g.type==='MultiPolygon')return g.coordinates.some(p=>ring(pt,p[0]));return false}
const IA=['ChatGPT','Meta','Gemini','Copilot','Notebook Gemini','Claude','DeepSeek','Qwen'];
try{
 window.RADIOS_RAW=[];for(const p of radioFiles)window.RADIOS_RAW.push(...arr(await ft(p),p));
 const pts=compact(await ft('data/students.js'));
 window.STUDENT_DATA={type:'FeatureCollection',features:pts.map(([x,y,m])=>({type:'Feature',geometry:{type:'Point',coordinates:[x,y]},properties:{ias:IA.filter((_,i)=>m&(1<<i))}}))};
 const geos=window.RADIOS_RAW.map(r=>({r,g:{type:r[5],coordinates:r[6]},counts:{},n:0}));let assigned=0;
 for(const [x,y,m] of pts){const hit=geos.find(o=>poly([x,y],o.g));if(!hit)continue;assigned++;hit.n++;IA.forEach((name,i)=>{if(m&(1<<i))hit.counts[name]=(hit.counts[name]||0)+1})}
 for(const o of geos){o.r[2]=o.n;o.r[4]=o.counts;o.r[3]=Object.entries(o.counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Sin IA'}
 console.log('Radios:',window.RADIOS_RAW.length,'Georreferenciadas:',pts.length,'Dentro de radios:',assigned);
 if(window.RADIOS_RAW.length!==524)throw Error('Cantidad de radios inválida');
 (0,eval)(await ft('app.js'));
}catch(err){console.error(err);const m=document.getElementById('map');if(m)m.innerHTML='<div style="padding:24px;color:#fff;background:#7f1d1d;font:14px system-ui"><b>Error cargando las capas censales.</b><br>'+String(err.message||err)+'</div>'}
})();