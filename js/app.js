(function(){
'use strict';
var app=document.getElementById('app'),q=document.getElementById('q');
var DATA=null,ALL=[],PAGE=60,shown=PAGE,view=[],cur=-1;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cap(s){return String(s||'').toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase()})}

fetch('data/stations.json').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(d){
  DATA=d;
  d.states.forEach(function(s){s.stations.forEach(function(t){t._s=s;t._k=(t.name+' '+t.code+' '+(t.city||'')+' '+(t.address||'')).toLowerCase();ALL.push(t)})});
  route();
}).catch(function(e){app.innerHTML='<p class="center">Could not load <code>data/stations.json</code> ('+esc(e.message)+'). If you opened this file directly, serve it over HTTP (e.g. <code>python3 -m http.server</code>) or host on GitHub Pages.</p>'});

window.addEventListener('hashchange',route);
q.addEventListener('input',function(){
  var v=q.value.trim();
  if(v)location.hash='#/search/'+encodeURIComponent(v); else if(/^#\/search\//.test(location.hash))location.hash='#/';
});

function route(){
  if(!DATA)return;
  var h=location.hash||'#/',m;
  shown=PAGE;window.scrollTo(0,0);
  if((m=h.match(/^#\/state\/([^\/]+)(?:\/(.*))?$/)))return stateView(m[1],m[2]?decodeURIComponent(m[2]):null);
  if((m=h.match(/^#\/search\/(.*)$/))){var t=decodeURIComponent(m[1]);if(q.value!==t)q.value=t;return searchView(t)}
  q.value='';home();
}

function home(){
  document.title='Station QR Collection – State-wise Railway Station QR Codes';
  var total=ALL.length,withqr=ALL.filter(function(t){return t.qr}).length;
  var h='<h1>Railway Station QR Codes</h1><p class="sub">Pick a state, or search any station by name or code above.</p>';
  h+='<div class="stats"><span class="pill"><b>'+total.toLocaleString()+'</b> stations</span><span class="pill"><b>'+DATA.states.length+'</b> states / UTs</span><span class="pill"><b>'+withqr.toLocaleString()+'</b> QR codes</span></div>';
  h+='<div class="grid-states">'+DATA.states.map(function(s){return '<a class="scard" href="#/state/'+s.slug+'"><b>'+esc(s.name)+'</b><span>'+s.stations.length.toLocaleString()+' stations</span></a>'}).join('')+'</div>';
  app.innerHTML=h;
}

function cards(list){
  view=list;
  var h='<div class="grid">'+list.slice(0,shown).map(function(t,i){
    return '<div class="card" data-i="'+i+'" tabindex="0" role="button" aria-label="'+esc(t.name)+' QR">'+
      (t.qr?'<img loading="lazy" decoding="async" src="'+esc(t.qr)+'" alt="QR code for '+esc(t.name)+'" width="170" height="170">':'<div class="noqr">No QR</div>')+
      '<div class="nm">'+esc(t.name)+'</div><div><span class="code">'+esc(t.code)+'</span></div>'+
      (t._s&&t._showState?'<div class="cd">'+esc(t._s.name)+'</div>':'')+'</div>'}).join('')+'</div>';
  if(list.length>shown)h+='<button class="btn more" id="more">Show more ('+(list.length-shown)+' left)</button>';
  return h;
}
function bind(list){
  var more=document.getElementById('more');
  if(more)more.onclick=function(){shown+=PAGE;paint(list)};
}
var paint=function(){};
function wireGrid(){
  var g=app.querySelector('.grid');if(!g)return;
  g.onclick=function(e){var c=e.target.closest('.card');if(c)openModal(+c.dataset.i)};
  g.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){var c=e.target.closest('.card');if(c){e.preventDefault();openModal(+c.dataset.i)}}};
}

function stateView(slug,zone){
  var s=DATA.states.filter(function(x){return x.slug===slug})[0];
  if(!s){app.innerHTML='<p class="center">State not found. <a href="#/">Back</a></p>';return}
  document.title=s.name+' – Station QR Codes';
  var zones={};s.stations.forEach(function(t){if(t.zone)zones[t.zone]=(zones[t.zone]||0)+1});
  var zl=Object.keys(zones).sort();
  var list=zone?s.stations.filter(function(t){return t.zone===zone}):s.stations;
  paint=function(){
    var h='<p class="crumbs"><a href="#/">&larr; All states</a></p><h1>'+esc(s.name)+'</h1><p class="sub">'+list.length.toLocaleString()+' station'+(list.length===1?'':'s')+(zone?' in zone '+esc(zone):'')+'</p>';
    if(zl.length>1)h+='<div class="chips"><a class="chip'+(zone?'':' on')+'" href="#/state/'+slug+'">All ('+s.stations.length+')</a>'+zl.map(function(z){return '<a class="chip'+(z===zone?' on':'')+'" href="#/state/'+slug+'/'+encodeURIComponent(z)+'">'+esc(z)+' ('+zones[z]+')</a>'}).join('')+'</div>';
    h+=cards(list);app.innerHTML=h;bind();wireGrid();
  };
  paint();
}

function searchView(t){
  var k=t.toLowerCase(),words=k.split(/\s+/).filter(Boolean);
  var res=ALL.filter(function(x){return words.every(function(w){return x._k.indexOf(w)>-1})});
  res.sort(function(a,b){
    function sc(x){var c=x.code.toLowerCase(),n=x.name.toLowerCase();return c===k?0:n===k?1:c.indexOf(k)===0?2:n.indexOf(k)===0?3:4}
    return sc(a)-sc(b)||a.name.localeCompare(b.name)});
  res.forEach(function(x){x._showState=true});
  document.title='Search: '+t+' – Station QR Codes';
  paint=function(){
    var h='<p class="crumbs"><a href="#/">&larr; All states</a></p><h1>Search results</h1><p class="sub">'+res.length.toLocaleString()+' station'+(res.length===1?'':'s')+' matching “'+esc(t)+'”</p>';
    h+=res.length?cards(res):'<p class="muted">No stations found.</p>';app.innerHTML=h;bind();wireGrid();
  };
  paint();
}

/* modal */
var M=document.getElementById('modal');
function openModal(i){
  var t=view[i];if(!t)return;cur=i;
  document.getElementById('m-title').textContent=t.name+' ('+t.code+')';
  document.getElementById('m-sub').textContent=[t._s&&t._s.name,t.zone&&('Zone '+t.zone),t.address].filter(Boolean).join(' · ');
  var img=document.getElementById('m-img'),dl=document.getElementById('m-dl');
  if(t.qr){img.hidden=false;img.src=t.qr;img.alt='QR code for '+t.name;dl.hidden=false;dl.href=t.qr;dl.setAttribute('download',t.code.toLowerCase()+'_station_qr.png')}
  else{img.hidden=true;dl.hidden=true}
  M.hidden=false;document.body.style.overflow='hidden';
}
function closeModal(){M.hidden=true;document.body.style.overflow=''}
function step(d){var n=cur+d;if(n>=0&&n<Math.min(view.length,shown))openModal(n)}
document.getElementById('m-close').onclick=closeModal;
M.addEventListener('click',function(e){if(e.target===M)closeModal()});
document.getElementById('m-prev').onclick=function(){step(-1)};
document.getElementById('m-next').onclick=function(){step(1)};
document.addEventListener('keydown',function(e){if(M.hidden)return;if(e.key==='Escape')closeModal();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});
})();
