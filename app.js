const NBI_BREAKS = [
  {max:2, label:"0 - 2%", color:"#cbe7f4"},
  {max:4, label:"2 - 4%", color:"#9ec9e6"},
  {max:6, label:"4 - 6%", color:"#6fa5d6"},
  {max:8, label:"6 - 8%", color:"#3f73b9"},
  {max:10,label:"8 - 10%",color:"#244d99"},
  {max:Infinity,label:"10% o más",color:"#0d2f78"}
];
const SCHOOL_POINTS = {
  type:"FeatureCollection",
  features:[
    {type:"Feature",geometry:{type:"Point",coordinates:[-58.564828343219,-34.5698120823037]},properties:{id:"A"}},
    {type:"Feature",geometry:{type:"Point",coordinates:[-58.5754911,-34.57649]},properties:{id:"B"}}
  ]
};

function nbiColorExpression(){
  return ["step",["coalesce",["get","pct_nbi"],0],
    "#cbe7f4",2,"#9ec9e6",4,"#6fa5d6",6,"#3f73b9",8,"#244d99",10,"#0d2f78"
  ];
}
function initLegends(){
  const el=document.getElementById("nbiLegend");
  el.innerHTML=NBI_BREAKS.map(b=>`<div class="legend-row"><span class="legend-swatch" style="background:${b.color}"></span><span>${b.label}</span></div>`).join("");
}
function renderBars(el,data,total){
  const max=Math.max(...data.map(d=>d.value),1);
  el.innerHTML=data.map(d=>`<div class="bar-row">
    <div class="bar-label" title="${d.label}">${d.label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(d.value/max)*100}%"></div></div>
    <div class="bar-val">${d.value}${total?` (${Math.round(d.value/total*100)}%)`:""}</div>
  </div>`).join("");
}
function buildStats(geo){
  const active=geo.features.filter(f=>f.properties.n>0);
  const ia={};
  active.forEach(f=>{
    const name=f.properties.top_ia||"Sin IA";
    ia[name]=(ia[name]||0)+1;
  });
  const iaData=Object.entries(ia).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value}));
  renderBars(document.getElementById("iaBars"),iaData,active.length);

  const bins=NBI_BREAKS.map(b=>({label:b.label,value:0,max:b.max}));
  active.forEach(f=>{
    const v=Number(f.properties.pct_nbi)||0;
    const b=bins.find(x=>v<x.max);
    if(b)b.value++;
  });
  renderBars(document.getElementById("nbiBars"),bins,active.length);
}
function selectedHtml(p){
  const counts=p.ia_counts||{};
  const ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return `<div><b>Radio:</b> ${p.LINK}</div>
    <div><b>Estudiantes:</b> ${p.n}</div>
    <div><b>NBI:</b> ${Number(p.pct_nbi).toFixed(1)}%</div>
    <div><b>IA predominante:</b> ${p.top_ia||"—"}</div>
    ${ordered.length?`<div style="margin-top:8px"><b>Herramientas declaradas:</b><br>${ordered.map(([k,v])=>`${k}: ${v}`).join("<br>")}</div>`:""}`;
}

initLegends();

Promise.all([
  fetch("data/radios_nbi_ia.geojson").then(r=>r.json()),
  fetch("data/estudiantes.geojson").then(r=>r.json())
]).then(([radios,students])=>{
  buildStats(radios);

  const map=new maplibregl.Map({
    container:"map",
    style:{
      version:8,
      sources:{
        carto:{
          type:"raster",
          tiles:["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png","https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
          tileSize:256,
          attribution:"© OpenStreetMap contributors © CARTO"
        }
      },
      layers:[{id:"base",type:"raster",source:"carto",paint:{"raster-opacity":0.92}}]
    },
    center:[-58.565,-34.57],
    zoom:12.3,
    pitch:56,
    bearing:-18,
    antialias:true
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");

  map.on("load",()=>{
    map.addSource("radios",{type:"geojson",data:radios});
    map.addSource("students",{type:"geojson",data:students});
    map.addSource("schools",{type:"geojson",data:SCHOOL_POINTS});

    map.addLayer({
      id:"radios-base",type:"fill",source:"radios",
      paint:{
        "fill-color":nbiColorExpression(),
        "fill-opacity":0.62,
        "fill-outline-color":"rgba(224,240,250,.72)"
      }
    });

    map.addLayer({
      id:"radios-3d",type:"fill-extrusion",source:"radios",
      filter:[">",["get","n"],0],
      paint:{
        "fill-extrusion-color":nbiColorExpression(),
        "fill-extrusion-height":["*",["get","n"],260],
        "fill-extrusion-base":0,
        "fill-extrusion-opacity":0.88,
        "fill-extrusion-vertical-gradient":true
      }
    });

    map.addLayer({
      id:"students",type:"circle",source:"students",
      paint:{
        "circle-radius":4,
        "circle-color":"#087ff5",
        "circle-stroke-color":"#e7f4ff",
        "circle-stroke-width":1.1,
        "circle-opacity":0.95
      }
    });

    map.addLayer({
      id:"schools",type:"circle",source:"schools",
      paint:{
        "circle-radius":7,
        "circle-color":"#27d4ff",
        "circle-stroke-color":"#06121c",
        "circle-stroke-width":2
      }
    });

    map.addLayer({
      id:"labels",type:"symbol",source:"radios",
      filter:[">=",["get","n"],3],
      layout:{
        "text-field":["get","top_ia"],
        "text-size":["interpolate",["linear"],["get","n"],1,10,6,16],
        "text-font":["Open Sans Bold"],
        "text-anchor":"center",
        "text-allow-overlap":false
      },
      paint:{
        "text-color":"#ffffff",
        "text-halo-color":"#13284d",
        "text-halo-width":2
      }
    });

    const bounds=new maplibregl.LngLatBounds();
    radios.features.forEach(f=>{
      const coords=f.geometry.type==="Polygon"?f.geometry.coordinates.flat():f.geometry.coordinates.flat(2);
      coords.forEach(c=>bounds.extend(c));
    });
    map.fitBounds(bounds,{padding:38,pitch:56,bearing:-18,duration:0});

    map.on("click","radios-3d",e=>{
      const p=e.features[0].properties;
      try{ p.ia_counts=JSON.parse(p.ia_counts); }catch{}
      document.getElementById("selectedInfo").innerHTML=selectedHtml(p);
      new maplibregl.Popup({closeButton:false})
        .setLngLat(e.lngLat)
        .setHTML(`<b>Radio ${p.LINK}</b><br>Estudiantes: ${p.n}<br>NBI: ${Number(p.pct_nbi).toFixed(1)}%<br>IA: ${p.top_ia||"—"}`)
        .addTo(map);
    });
    map.on("mouseenter","radios-3d",()=>map.getCanvas().style.cursor="pointer");
    map.on("mouseleave","radios-3d",()=>map.getCanvas().style.cursor="");

    const threshold=document.getElementById("threshold");
    threshold.addEventListener("change",()=>{
      map.setFilter("labels",[">=",["get","n"],Number(threshold.value)]);
    });
    document.getElementById("toggle3d").addEventListener("change",e=>map.setLayoutProperty("radios-3d","visibility",e.target.checked?"visible":"none"));
    document.getElementById("toggleNbi").addEventListener("change",e=>map.setLayoutProperty("radios-base","visibility",e.target.checked?"visible":"none"));
    document.getElementById("togglePoints").addEventListener("change",e=>map.setLayoutProperty("students","visibility",e.target.checked?"visible":"none"));
    document.getElementById("toggleSchools").addEventListener("change",e=>map.setLayoutProperty("schools","visibility",e.target.checked?"visible":"none"));
    document.getElementById("toggleLabels").addEventListener("change",e=>map.setLayoutProperty("labels","visibility",e.target.checked?"visible":"none"));
    document.getElementById("pitch").addEventListener("input",e=>map.easeTo({pitch:Number(e.target.value),duration:150}));
  });
}).catch(err=>{
  document.getElementById("map").innerHTML=`<div style="padding:30px;color:white">No se pudieron cargar los datos: ${err.message}</div>`;
});
