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
  document.getElementById("nbiLegend").innerHTML=NBI_BREAKS.map(b=>
    `<div class="legend-row"><span class="legend-swatch" style="background:${b.color}"></span><span>${b.label}</span></div>`
  ).join("");
}

function renderBars(el,data,total){
  const max=Math.max(...data.map(d=>d.value),1);
  el.innerHTML=data.map(d=>`<div class="bar-row">
    <div class="bar-label" title="${d.label}">${d.label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(d.value/max)*100}%"></div></div>
    <div class="bar-val">${d.value}${total?` (${Math.round(d.value/total*100)}%)`:""}</div>
  </div>`).join("");
}

function normalizeIaName(name){
  const clean=String(name||"").trim();
  const key=clean.toLowerCase().replace(/[^a-z0-9]/g,"");
  if(key==="chatgpt"||key==="chatgp") return "ChatGPT";
  return clean;
}

function mentionSummary(counts){
  const grouped={};
  Object.entries(counts||{}).forEach(([name,value])=>{
    const normalized=normalizeIaName(name);
    if(!normalized) return;
    grouped[normalized]=(grouped[normalized]||0)+(Number(value)||0);
  });
  const ordered=Object.entries(grouped).sort((a,b)=>
    b[1]-a[1] || (a[0]==="ChatGPT"?-1:b[0]==="ChatGPT"?1:a[0].localeCompare(b[0],"es"))
  );
  return {grouped,ordered,top:ordered[0]?.[0]||"Sin IA"};
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
  let counts={};
  try{ counts=typeof p.ia_counts==="string"?JSON.parse(p.ia_counts):(p.ia_counts||{}); }catch{}
  const {ordered}=mentionSummary(counts);
  return `<div><b>Radio:</b> ${p.LINK}</div>
    <div><b>Estudiantes:</b> ${p.n}</div>
    <div><b>NBI:</b> ${Number(p.pct_nbi).toFixed(1)}%</div>
    <div><b>IA predominante:</b> ${p.top_ia||"—"}</div>
    ${ordered.length?`<div style="margin-top:8px"><b>Menciones:</b><br>${ordered.map(([k,v])=>`${k}: ${v}`).join("<br>")}</div>`:`<div style="margin-top:8px">Sin menciones de IA.</div>`}`;
}

function toGeoJSON(raw){
  return {
    type:"FeatureCollection",
    features:(raw||[]).map(([LINK,pct_nbi,n,_top_ia,ia_counts,geometryType,coordinates])=>{
      const summary=mentionSummary(ia_counts);
      return {
        type:"Feature",
        geometry:{type:geometryType,coordinates},
        properties:{LINK,pct_nbi,n,top_ia:summary.top,ia_counts:JSON.stringify(summary.grouped)}
      };
    })
  };
}

initLegends();

const radios=toGeoJSON(window.RADIOS_RAW||[]);
const activeRadios={type:"FeatureCollection",features:radios.features.filter(f=>f.properties.n>0)};
const students=window.STUDENT_DATA||{type:"FeatureCollection",features:[]};
buildStats(radios);

const map=new maplibregl.Map({
  container:"map",
  style:{
    version:8,
    glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources:{
      cartoDark:{
        type:"raster",
        tiles:[
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
        ],
        tileSize:256,
        attribution:"© OpenStreetMap contributors © CARTO"
      },
      cartoLight:{
        type:"raster",
        tiles:[
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
        ],
        tileSize:256,
        attribution:"© OpenStreetMap contributors © CARTO"
      }
    },
    layers:[
      {id:"base-dark",type:"raster",source:"cartoDark",paint:{"raster-opacity":0.92}},
      {id:"base-light",type:"raster",source:"cartoLight",layout:{visibility:"none"},paint:{"raster-opacity":0.96}}
    ]
  },
  center:[-58.565,-34.57],
  zoom:12.3,
  pitch:56,
  bearing:-18,
  antialias:true
});

map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");

let mapTheme="dark";
function toggleMapTheme(){
  mapTheme=mapTheme==="dark"?"light":"dark";
  map.setLayoutProperty("base-dark","visibility",mapTheme==="dark"?"visible":"none");
  map.setLayoutProperty("base-light","visibility",mapTheme==="light"?"visible":"none");
  const button=document.getElementById("themeToggle");
  button.textContent=mapTheme==="dark"?"☀ Mapa claro (L)":"☾ Mapa oscuro (L)";
  button.setAttribute("aria-pressed",String(mapTheme==="light"));
}

map.on("load",()=>{
  map.addSource("radios",{type:"geojson",data:activeRadios});
  map.addSource("students",{type:"geojson",data:students});
  map.addSource("schools",{type:"geojson",data:SCHOOL_POINTS});

  map.addLayer({
    id:"radios-base",type:"fill",source:"radios",
    paint:{
      "fill-color":nbiColorExpression(),
      "fill-opacity":0.58,
      "fill-outline-color":"rgba(224,240,250,.68)"
    }
  });

  map.addLayer({
    id:"radios-lines",type:"line",source:"radios",
    paint:{"line-color":"rgba(216,235,249,.68)","line-width":0.75,"line-opacity":0.72}
  });

  map.addLayer({
    id:"radios-3d",type:"fill-extrusion",source:"radios",
    filter:[">",["get","n"],0],
    paint:{
      "fill-extrusion-color":["interpolate",["linear"],["get","n"],1,"#2868c9",3,"#303fc1",6,"#26178f"],
      "fill-extrusion-height":["*",["get","n"],260],
      "fill-extrusion-base":0,
      "fill-extrusion-opacity":0.91,
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
      "circle-opacity":0.96
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
      "text-size":["interpolate",["linear"],["get","n"],1,10,6,17],
      "text-font":["Noto Sans Regular"],
      "text-anchor":"center",
      "text-allow-overlap":false,
      "text-ignore-placement":false
    },
    paint:{
      "text-color":"#ffffff",
      "text-halo-color":"#172263",
      "text-halo-width":2.4
    }
  });

  const bounds=new maplibregl.LngLatBounds();
  activeRadios.features.forEach(f=>{
    const groups=f.geometry.type==="Polygon"?f.geometry.coordinates:f.geometry.coordinates.flat();
    groups.flat().forEach(c=>{
      if(Array.isArray(c)&&typeof c[0]==="number") bounds.extend(c);
    });
  });
  map.fitBounds(bounds,{padding:{top:35,bottom:35,left:35,right:35},pitch:56,bearing:-18,duration:0});

  const hoverPopup=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:12});
  const showRadio=(feature,lngLat)=>{
    const p=feature.properties;
    document.getElementById("selectedInfo").innerHTML=selectedHtml(p);
    hoverPopup
      .setLngLat(lngLat)
      .setHTML(selectedHtml(p))
      .addTo(map);
  };
  map.on("mousemove",e=>{
    const features=map.queryRenderedFeatures(e.point,{layers:["radios-3d","radios-base"]});
    if(features.length){
      map.getCanvas().style.cursor="pointer";
      showRadio(features[0],e.lngLat);
    }else{
      map.getCanvas().style.cursor="";
      hoverPopup.remove();
    }
  });
  map.getCanvas().addEventListener("mouseleave",()=>{
    map.getCanvas().style.cursor="";
    hoverPopup.remove();
  });

  document.getElementById("threshold").addEventListener("change",e=>{
    map.setFilter("labels",[">=",["get","n"],Number(e.target.value)]);
  });
  document.getElementById("toggle3d").addEventListener("change",e=>map.setLayoutProperty("radios-3d","visibility",e.target.checked?"visible":"none"));
  document.getElementById("toggleNbi").addEventListener("change",e=>map.setLayoutProperty("radios-base","visibility",e.target.checked?"visible":"none"));
  document.getElementById("togglePoints").addEventListener("change",e=>map.setLayoutProperty("students","visibility",e.target.checked?"visible":"none"));
  document.getElementById("toggleSchools").addEventListener("change",e=>map.setLayoutProperty("schools","visibility",e.target.checked?"visible":"none"));
  document.getElementById("toggleLabels").addEventListener("change",e=>map.setLayoutProperty("labels","visibility",e.target.checked?"visible":"none"));
  document.getElementById("pitch").addEventListener("input",e=>map.easeTo({pitch:Number(e.target.value),duration:150}));
  document.getElementById("themeToggle").addEventListener("click",toggleMapTheme);
  document.addEventListener("keydown",e=>{
    if(e.key.toLowerCase()==="l"&&!/input|select|textarea/i.test(document.activeElement?.tagName||"")) toggleMapTheme();
  });
});

