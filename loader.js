(async function(){
  const base='https://raw.githubusercontent.com/eaguirre25/chatgpt_escuelas/main/';
  const files=[
    'data/radios_01.js','data/radios_02.js','data/radios_03.js',
    'data/radios_04_1.js','data/radios_04_2.js','data/radios_04_3.js','data/radios_04_4.js','data/radios_04_5.js',
    'data/radios_05_1.js','data/radios_05_2.js','data/students.js'
  ];

  async function fetchAndRun(path){
    const url=base+path+'?v=20260824c';
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok) throw new Error(`No se pudo descargar ${path} (HTTP ${r.status})`);
    const code=await r.text();
    try{
      (0,eval)(code);
    }catch(e){
      throw new Error(`Error ejecutando ${path}: ${e.message}`);
    }
  }

  try{
    window.RADIOS_RAW=[];
    window.STUDENT_DATA=undefined;
    for(const f of files) await fetchAndRun(f);

    const nr=window.RADIOS_RAW?.length||0;
    const ne=window.STUDENT_DATA?.features?.length||0;
    console.log('Radios cargados:',nr,'Estudiantes:',ne);
    if(nr!==524) throw new Error(`Se cargaron ${nr} radios; se esperaban 524`);
    if(ne!==50) throw new Error(`Se cargaron ${ne} estudiantes; se esperaban 50`);

    await fetchAndRun('app.js');
  }catch(err){
    console.error(err);
    const m=document.getElementById('map');
    if(m) m.innerHTML='<div style="padding:24px;color:#fff;background:#7f1d1d;font:14px system-ui"><b>Error cargando las capas censales.</b><br>'+String(err.message||err)+'</div>';
  }
})();
