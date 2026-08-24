(async function(){
  const base='https://raw.githubusercontent.com/eaguirre25/chatgpt_escuelas/main/';
  const files=[
    'data/radios_01.js','data/radios_02.js','data/radios_03.js',
    'data/radios_04_1.js','data/radios_04_2.js','data/radios_04_3.js','data/radios_04_4.js','data/radios_04_5.js',
    'data/radios_05_1.js','data/radios_05_2.js','data/students.js'
  ];
  function load(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src+'?v=20260824b';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('No se pudo cargar '+src));
      document.head.appendChild(s);
    });
  }
  try{
    window.RADIOS_RAW=[];
    for(const f of files) await load(base+f);
    console.log('Radios cargados:',window.RADIOS_RAW.length,'Estudiantes:',window.STUDENT_DATA?.features?.length||0);
    if(!window.RADIOS_RAW.length) throw new Error('RADIOS_RAW quedó vacío');
    await load(base+'app.js');
  }catch(err){
    console.error(err);
    const m=document.getElementById('map');
    if(m) m.innerHTML='<div style="padding:24px;color:#fff;background:#7f1d1d;font:14px system-ui"><b>Error cargando las capas censales.</b><br>'+String(err.message||err)+'</div>';
  }
})();
