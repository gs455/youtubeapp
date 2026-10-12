const C='ytshelves-v8',F=['./','index.html','app.js','config.js','manifest.json','icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
