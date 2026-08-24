(async function(){
  const base='https://raw.githubusercontent.com/eaguirre25/chatgpt_escuelas/main/';
  const radioFiles=[
    'data/radios_01.js','data/radios_02.js','data/radios_03.js',
    'data/radios_04_1.js','data/radios_04_2.js','data/radios_04_3.js','data/radios_04_4.js','data/radios_04_5.js',
    'data/radios_05_1.js','data/radios_05_2.js'
  ];

  async function fetchText(path){
    const r=await fetch(base+path+'?v=20260824d',{cache:'no-store'});
    if(!r.ok) throw new Error(`No se pudo descargar ${path} (HTTP ${r.status})`);
    return await r.text();
  }

  function extractJsonArray(code,path){
    const pos=code.indexOf('.concat(');
    if(pos<0) throw new Error(`Formato inesperado en ${path}: no aparece .concat(`);
    const start=code.indexOf('[',pos);
    if(start<0) throw new Error(`Formato inesperado en ${path}: no aparece el array`);
    let depth=0, inString=false, escape=false;
    for(let i=start;i<code.length;i++){
      const ch=code[i];
      if(inString){
        if(escape){ escape=false; continue; }
        if(ch==='\\'){ escape=true; continue; }
        if(ch==='"') inString=false;
        continue;
      }
      if(ch==='"'){ inString=true; continue; }
      if(ch==='[') depth++;
      if(ch===']'){
        depth--;
        if(depth===0){
          const jsonText=code.slice(start,i+1);
          try{ return JSON.parse(jsonText); }
          catch(e){ throw new Error(`JSON inválido en ${path}: ${e.message}`); }
        }
      }
    }
    throw new Error(`No se pudo cerrar el array de ${path}`);
  }

  function extractAssignedJson(code,path){
    const eq=code.indexOf('=');
    const start=code.indexOf('{',eq);
    if(start<0) throw new Error(`Formato inesperado en ${path}`);
    let depth=0, inString=false, escape=false;
    for(let i=start;i<code.length;i++){
      const ch=code[i];
      if(inString){
        if(escape){ escape=false; continue; }
        if(ch==='\\'){ escape=true; continue; }
        if(ch==='"') inString=false;
        continue;
      }
      if(ch==='"'){ inString=true; continue; }
      if(ch==='{') depth++;
      if(ch==='}'){
        depth--;
        if(depth===0){
          const jsonText=code.slice(start,i+1);
          try{ return JSON.parse(jsonText); }
          catch(e){ throw new Error(`JSON inválido en ${path}: ${e.message}`); }
        }
      }
    }
    throw new Error(`No se pudo cerrar el objeto de ${path}`);
  }

  async function runApp(){
    const code=await fetchText('app.js');
    try{ (0,eval)(code); }
    catch(e){ throw new Error(`Error iniciando app.js: ${e.message}`); }
  }

  try{
    window.RADIOS_RAW=[];
    for(const path of radioFiles){
      const code=await fetchText(path);
      const chunk=extractJsonArray(code,path);
      window.RADIOS_RAW.push(...chunk);
    }

    const studentsCode=await fetchText('data/students.js');
    window.STUDENT_DATA=extractAssignedJson(studentsCode,'data/students.js');

    const nr=window.RADIOS_RAW.length;
    const ne=window.STUDENT_DATA?.features?.length||0;
    console.log('Radios cargados:',nr,'Estudiantes:',ne);
    if(nr!==524) throw new Error(`Se cargaron ${nr} radios; se esperaban 524`);
    if(ne!==50) throw new Error(`Se cargaron ${ne} estudiantes; se esperaban 50`);

    await runApp();
  }catch(err){
    console.error(err);
    const m=document.getElementById('map');
    if(m) m.innerHTML='<div style="padding:24px;color:#fff;background:#7f1d1d;font:14px system-ui"><b>Error cargando las capas censales.</b><br>'+String(err.message||err)+'</div>';
  }
})();
