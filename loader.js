(async function(){
  const base='https://raw.githubusercontent.com/eaguirre25/chatgpt_escuelas/main/';
  const radioFiles=[
    'data/radios_01.js','data/radios_02.js','data/radios_03.js',
    'data/radios_04_1.js','data/radios_04_2.js','data/radios_04_3.js','data/radios_04_4.js','data/radios_04_5.js',
    'data/radios_05_1.js','data/radios_05_2.js'
  ];
  async function fetchText(path){ const r=await fetch(base+path+'?v=20260911',{cache:'no-store'}); if(!r.ok) throw new Error(`No se pudo descargar ${path} (HTTP ${r.status})`); return await r.text(); }
  function extractJsonArray(code,path){ const pos=code.indexOf('.concat('), start=code.indexOf('[',pos); if(pos<0||start<0) throw new Error(`Formato inesperado en ${path}`); let depth=0,inString=false,escape=false; for(let i=start;i<code.length;i++){const ch=code[i]; if(inString){if(escape){escape=false;continue} if(ch==='\\'){escape=true;continue} if(ch==='"')inString=false;continue} if(ch==='"'){inString=true;continue} if(ch==='[')depth++; if(ch===']'&&--depth===0)return JSON.parse(code.slice(start,i+1));} throw new Error(`Array incompleto en ${path}`); }
  function extractAssignedJson(code,path){ const eq=code.indexOf('='),start=code.indexOf('{',eq); if(start<0)throw new Error(`Formato inesperado en ${path}`); let depth=0,inString=false,escape=false; for(let i=start;i<code.length;i++){const ch=code[i];if(inString){if(escape){escape=false;continue}if(ch==='\\'){escape=true;continue}if(ch==='"')inString=false;continue}if(ch==='"'){inString=true;continue}if(ch==='{')depth++;if(ch==='}'&&--depth===0)return JSON.parse(code.slice(start,i+1));}throw new Error(`Objeto incompleto en ${path}`);}
  try{
    window.RADIOS_RAW=[]; for(const path of radioFiles){window.RADIOS_RAW.push(...extractJsonArray(await fetchText(path),path));}
    window.STUDENT_DATA=extractAssignedJson(await fetchText('data/students.js'),'data/students.js');
    console.log('Radios cargados:',window.RADIOS_RAW.length,'Estudiantes:',window.STUDENT_DATA?.features?.length||0);
    if(window.RADIOS_RAW.length!==524) throw new Error(`Se cargaron ${window.RADIOS_RAW.length} radios; se esperaban 524`);
    const code=await fetchText('app.js'); (0,eval)(code);
  }catch(err){console.error(err);const m=document.getElementById('map');if(m)m.innerHTML='<div style="padding:24px;color:#fff;background:#7f1d1d;font:14px system-ui"><b>Error cargando las capas censales.</b><br>'+String(err.message||err)+'</div>';}
})();