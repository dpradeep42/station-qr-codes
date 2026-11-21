/* Station QR Codes service worker.
   Bump SHELL_CACHE when index/css/js/manifest/icons/data change.
   Bump QR_CACHE only when QR image files themselves change in a breaking way. */
var SHELL_CACHE = 'station-qr-shell-v2';
var QR_CACHE = 'station-qr-images-v1';
var PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/stations.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil((async function(){
    var cache = await caches.open(SHELL_CACHE);
    await Promise.all(PRECACHE.map(async function(url){
      var res = await fetch(url, {cache: 'reload'});
      if(!res.ok) throw new Error('Failed to precache ' + url + ' (' + res.status + ')');
      await cache.put(url, res);
    }));
  })());
});

self.addEventListener('activate', function(event){
  event.waitUntil((async function(){
    var keep = {};
    keep[SHELL_CACHE] = 1;
    keep[QR_CACHE] = 1;
    var keys = await caches.keys();
    await Promise.all(keys.map(function(k){
      if(k.indexOf('station-qr-') === 0 && !keep[k]) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isQrRequest(url){
  try{
    var u = new URL(url);
    return u.origin === self.location.origin && /\/qr\/.+\.png$/i.test(u.pathname);
  }catch(e){ return false; }
}

async function cacheFirst(cacheName, request){
  var cache = await caches.open(cacheName);
  var hit = await cache.match(request);
  if(hit) return hit;
  var res = await fetch(request);
  if(res.ok) cache.put(request, res.clone());
  return res;
}

async function matchShell(request){
  var cache = await caches.open(SHELL_CACHE);
  return (await cache.match(request))
    || (await cache.match('./index.html'))
    || (await cache.match('./'));
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url;
  try{ url = new URL(req.url); }catch(e){ return; }
  if(url.origin !== self.location.origin) return;

  if(isQrRequest(req.url)){
    event.respondWith(cacheFirst(QR_CACHE, req));
    return;
  }

  if(req.mode === 'navigate'){
    event.respondWith((async function(){
      try{
        var fresh = await fetch(req);
        if(fresh.ok){
          var cache = await caches.open(SHELL_CACHE);
          cache.put('./index.html', fresh.clone());
        }
        return fresh;
      }catch(e){
        var cached = await matchShell(req);
        if(cached) return cached;
        throw e;
      }
    })());
    return;
  }

  if(url.searchParams.has('online-check')){
    event.respondWith(fetch(req, {cache: 'no-store'}));
    return;
  }

  event.respondWith((async function(){
    var cache = await caches.open(SHELL_CACHE);
    var hit = await cache.match(req, {ignoreSearch: false});
    if(hit){
      fetch(req).then(function(res){ if(res && res.ok) cache.put(req, res); }).catch(function(){});
      return hit;
    }
    try{
      var res = await fetch(req);
      if(res.ok) cache.put(req, res.clone());
      return res;
    }catch(e){
      throw e;
    }
  })());
});
