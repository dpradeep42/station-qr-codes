(function(){
'use strict';
var app=document.getElementById('app'),q=document.getElementById('q');
var DATA=null,ALL=[],PAGE=60,shown=PAGE,view=[],cur=-1;
var QR_CACHE='station-qr-images-v1';
var cached=new Set(),cacheCount=0,dlCancel=false,dlBusy=false,deferredPrompt=null,waitingReg=null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cap(s){return String(s||'').toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase()})}

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || !!window.navigator.standalone;
}
function isIOS(){
  var ua=navigator.userAgent||'';
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}
function qrKey(url){
  try{
    var path=new URL(url,location.href).pathname;
    var i=path.indexOf('/qr/');
    return i>=0?path.slice(i+1):null;
  }catch(e){return null}
}
function isCached(t){return !!(t&&t.qr&&cached.has(t.qr))}
function stateCachedCount(s){return s.stations.filter(isCached).length}

function refreshCached(){
  if(!('caches' in window)) return Promise.resolve();
  return caches.open(QR_CACHE).then(function(cache){
    return cache.keys();
  }).then(function(keys){
    cached=new Set();
    keys.forEach(function(req){
      var k=qrKey(req.url);
      if(k) cached.add(k);
    });
    cacheCount=cached.size;
    if(DATA) route({keepScroll:true});
  }).catch(function(){});
}

function requestPersist(){
  if(navigator.storage&&navigator.storage.persist){
    return navigator.storage.persist().catch(function(){return false});
  }
  return Promise.resolve(false);
}

function setDlProgress(done,total,failed){
  var bar=document.getElementById('dl-bar');
  var meta=document.getElementById('dl-meta');
  var prog=document.getElementById('dl-prog');
  var wrap=document.getElementById('dl-progwrap');
  if(!total){bar.hidden=true;return}
  bar.hidden=false;
  var pct=Math.round(done/total*100);
  var msg='Saving offline… '+done.toLocaleString()+' of '+total.toLocaleString();
  if(failed) msg+=' ('+failed+' failed)';
  meta.textContent=msg;
  prog.style.width=pct+'%';
  wrap.setAttribute('aria-valuenow',String(pct));
}

function downloadUrls(urls){
  if(dlBusy) return Promise.resolve();
  urls=urls.filter(function(u){return u&&!cached.has(u)});
  if(!urls.length){return refreshCached()}
  dlBusy=true;dlCancel=false;
  setDlProgress(0,urls.length,0);
  return requestPersist().then(function(){
    return caches.open(QR_CACHE);
  }).then(function(cache){
    var done=0,failed=0,batch=10;
    function next(i){
      if(dlCancel) return Promise.resolve();
      if(i>=urls.length) return Promise.resolve();
      var slice=urls.slice(i,i+batch);
      return Promise.all(slice.map(function(u){
        return cache.match(u).then(function(hit){
          if(hit) return;
          return fetch(u).then(function(res){
            if(res.ok) return cache.put(u,res);
            failed++;
          });
        }).catch(function(){failed++}).then(function(){
          done++;
          setDlProgress(done,urls.length,failed);
        });
      })).then(function(){return next(i+batch)});
    }
    return next(0);
  }).catch(function(){
    document.getElementById('dl-meta').textContent='Could not finish saving. Check your connection and try again.';
  }).then(function(){
    dlBusy=false;
    return refreshCached().then(function(){
      var bar=document.getElementById('dl-bar');
      var total=ALL.filter(function(t){return t.qr}).length;
      var meta=document.getElementById('dl-meta');
      if(dlCancel){
        meta.textContent='Cancelled. '+cacheCount.toLocaleString()+' of '+total.toLocaleString()+' QR codes saved.';
      }else{
        meta.textContent='Saved. '+cacheCount.toLocaleString()+' of '+total.toLocaleString()+' QR codes available offline.';
      }
      setTimeout(function(){if(!dlBusy) bar.hidden=true},2800);
    });
  });
}

document.getElementById('dl-cancel').addEventListener('click',function(){dlCancel=true});

function wireOfflineButtons(){
  var all=document.getElementById('dl-all');
  if(all) all.onclick=function(){
    downloadUrls(ALL.map(function(t){return t.qr}));
  };
  var st=document.getElementById('dl-state');
  if(st) st.onclick=function(){
    var slug=st.getAttribute('data-slug');
    var s=DATA.states.filter(function(x){return x.slug===slug})[0];
    if(s) downloadUrls(s.stations.map(function(t){return t.qr}));
  };
}

function offlinePanelHTML(){
  var total=ALL.filter(function(t){return t.qr}).length;
  var n=cacheCount;
  var label=n>0?'Download remaining for offline':'Download all for offline';
  var h='<div class="offline-panel" id="off-panel"><div><b>Use without internet</b>';
  h+='<p class="muted" id="cache-stat">'+n.toLocaleString()+' of '+total.toLocaleString()+' QR codes saved on this device. Viewed codes are saved automatically; use the button to download the rest (about 11&nbsp;MB).</p></div>';
  if(n>=total && total) h+='<span class="badge-off">Available offline</span>';
  else h+='<button type="button" class="btn" id="dl-all">'+label+'</button>';
  h+='</div>';
  return h;
}

fetch('data/stations.json').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(d){
  DATA=d;
  d.states.forEach(function(s){s.stations.forEach(function(t){t._s=s;t._k=(t.name+' '+t.code+' '+(t.city||'')+' '+(t.address||'')).toLowerCase();ALL.push(t)})});
  route();
  refreshCached();
}).catch(function(e){app.innerHTML='<p class="center">Could not load <code>data/stations.json</code> ('+esc(e.message)+'). If you opened this file directly, serve it over HTTP (e.g. <code>python3 -m http.server</code>) or host on GitHub Pages.</p>'});

window.addEventListener('hashchange',function(){route()});
q.addEventListener('input',function(){
  var v=q.value.trim();
  if(v)location.hash='#/search/'+encodeURIComponent(v); else if(/^#\/search\//.test(location.hash))location.hash='#/';
});

function route(opts){
  if(!DATA)return;
  var h=location.hash||'#/',m;
  if(!(opts&&opts.keepScroll)){shown=PAGE;window.scrollTo(0,0)}
  if((m=h.match(/^#\/state\/([^\/]+)(?:\/(.*))?$/)))return stateView(m[1],m[2]?decodeURIComponent(m[2]):null);
  if((m=h.match(/^#\/search\/(.*)$/))){var t=decodeURIComponent(m[1]);if(q.value!==t)q.value=t;return searchView(t)}
  q.value='';home();
}

function home(){
  document.title='Station QR Collection – State-wise Railway Station QR Codes';
  var total=ALL.length,withqr=ALL.filter(function(t){return t.qr}).length;
  var h='<h1>Railway Station QR Codes</h1><p class="sub">Pick a state, or search any station by name or code above. Install the app to use it without internet.</p>';
  h+='<div class="stats"><span class="pill"><b>'+total.toLocaleString()+'</b> stations</span><span class="pill"><b>'+DATA.states.length+'</b> states / UTs</span><span class="pill"><b>'+withqr.toLocaleString()+'</b> QR codes</span></div>';
  h+=offlinePanelHTML();
  h+='<div class="grid-states">'+DATA.states.map(function(s){
    var n=stateCachedCount(s),all=s.stations.length,badge='';
    if(n===all&&all) badge='<span class="badge-off">Available offline</span>';
    else if(n>0) badge='<span class="badge-off partial">'+n.toLocaleString()+' saved</span>';
    return '<a class="scard" href="#/state/'+s.slug+'"><b>'+esc(s.name)+'</b><span>'+s.stations.length.toLocaleString()+' stations</span>'+badge+'</a>';
  }).join('')+'</div>';
  app.innerHTML=h;
  wireOfflineButtons();
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
    var n=stateCachedCount(s),all=s.stations.length;
    h+='<div class="state-actions">';
    if(n>=all&&all) h+='<span class="badge-off">Available offline</span>';
    else{
      h+='<button type="button" class="btn ghost" id="dl-state" data-slug="'+esc(s.slug)+'">Save this state offline'+(n?(' ('+(all-n)+' left)'):'')+'</button>';
      if(n>0) h+='<span class="muted">'+n.toLocaleString()+' already saved</span>';
    }
    h+='</div>';
    if(zl.length>1)h+='<div class="chips"><a class="chip'+(zone?'':' on')+'" href="#/state/'+slug+'">All ('+s.stations.length+')</a>'+zl.map(function(z){return '<a class="chip'+(z===zone?' on':'')+'" href="#/state/'+slug+'/'+encodeURIComponent(z)+'">'+esc(z)+' ('+zones[z]+')</a>'}).join('')+'</div>';
    h+=cards(list);app.innerHTML=h;bind();wireGrid();wireOfflineButtons();
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

/* install + offline + updates */
(function setupNetwork(){
  var pill=document.getElementById('net-pill');
  function setOffline(off){pill.hidden=!off}
  function probe(){
    fetch('index.html?online-check='+Date.now(),{cache:'no-store'}).then(function(r){
      setOffline(!r.ok);
    }).catch(function(){setOffline(true)});
  }
  function sync(){
    if(!navigator.onLine){setOffline(true);return}
    setOffline(false);
    probe();
  }
  window.addEventListener('online',sync);
  window.addEventListener('offline',function(){setOffline(true)});
  window.addEventListener('pageshow',sync);
  sync();
})();

(function setupInstall(){
  var btn=document.getElementById('btn-install');
  var hint=document.getElementById('ios-hint');
  if(isStandalone()){
    btn.hidden=true;
    hint.hidden=true;
    return;
  }
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    btn.hidden=false;
  });
  btn.addEventListener('click',function(){
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function(){
      deferredPrompt=null;
      btn.hidden=true;
    });
  });
  window.addEventListener('appinstalled',function(){
    deferredPrompt=null;
    btn.hidden=true;
    hint.hidden=true;
  });
  if(isIOS() && !localStorage.getItem('station-qr-ios-hint')){
    hint.hidden=false;
  }
  document.getElementById('ios-hint-dismiss').addEventListener('click',function(){
    hint.hidden=true;
    try{localStorage.setItem('station-qr-ios-hint','1')}catch(e){}
  });
})();

(function setupSW(){
  if(!('serviceWorker' in navigator)) return;
  var banner=document.getElementById('upd-banner');
  var reloadBtn=document.getElementById('upd-reload');
  function showUpdate(reg){
    waitingReg=reg;
    banner.hidden=false;
  }
  reloadBtn.addEventListener('click',function(){
    if(waitingReg && waitingReg.waiting){
      waitingReg.waiting.postMessage({type:'SKIP_WAITING'});
    }else{
      location.reload();
    }
  });
  var refreshing=false;
  // Reload only when an updated worker takes control, not on the first clients.claim().
  if(navigator.serviceWorker.controller){
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(refreshing)return;
      refreshing=true;
      location.reload();
    });
  }
  navigator.serviceWorker.register('sw.js',{scope:'./'}).then(function(reg){
    if(reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
    reg.addEventListener('updatefound',function(){
      var w=reg.installing;
      if(!w)return;
      w.addEventListener('statechange',function(){
        if(w.state==='installed' && navigator.serviceWorker.controller) showUpdate(reg);
      });
    });
  }).catch(function(){});
})();
})();
