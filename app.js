const YT='https://www.googleapis.com/youtube/v3/',SCOPES='https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/drive.appdata';
const $=id=>document.getElementById(id);
let chFilter='',token=null,tokenExp=0,client,subs=[],cur=null;
let S=JSON.parse(localStorage.getItem('state')||'{"folders":{},"updated":0}');
let prefs=JSON.parse(localStorage.getItem('prefs')||'{"shorts":false,"view":"grid","sort":"recent"}');
const vidCache={};
function savePrefs(){localStorage.setItem('prefs',JSON.stringify(prefs))}
function st(t){$('st').textContent=t||''}
async function api(url,opt={}){if(!token||Date.now()>tokenExp)await auth('');const r=await fetch(url,{...opt,headers:{Authorization:'Bearer '+token,...(opt.headers||{})}});if(r.status===401){token=null;return api(url,opt)}if(!r.ok)throw new Error(r.status+' '+await r.text());return r.status===204?null:r.json()}
function auth(prompt){return new Promise((res,rej)=>{client.callback=r=>{if(r.error)return rej(r);token=r.access_token;tokenExp=Date.now()+(r.expires_in-60)*1000;localStorage.setItem('signedIn','1');res()};client.requestAccessToken({prompt})})}
// ---- Drive appDataFolder sync ----
let fileId=null,saveT;
async function loadRemote(){const r=await api('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27folders.json%27&fields=files(id)');
 if(r.files.length){fileId=r.files[0].id;const d=await api(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);if(d&&d.updated>=S.updated){S=d;localStorage.setItem('state',JSON.stringify(S))}else saveRemote()}else saveRemote()}
function save(){S.updated=Date.now();localStorage.setItem('state',JSON.stringify(S));clearTimeout(saveT);saveT=setTimeout(saveRemote,800)}
async function saveRemote(){const meta={name:'folders.json',mimeType:'application/json'};if(!fileId)meta.parents=['appDataFolder'];
 const b='xx'+Math.random().toString(36).slice(2),body=`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(fileId?{}:meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(S)}\r\n--${b}--`;
 const r=await api(fileId?`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:fileId?'PATCH':'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body});fileId=r.id}
// ---- YouTube ----
async function loadSubs(){subs=[];let pt='';do{const r=await api(`${YT}subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical${pt?'&pageToken='+pt:''}`);
 subs.push(...r.items.map(i=>({id:i.snippet.resourceId.channelId,title:i.snippet.title,thumb:i.snippet.thumbnails.default.url})));pt=r.nextPageToken}while(pt)}
const iso=s=>{const m=s.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)||[];return(+m[1]||0)*86400+(+m[2]||0)*3600+(+m[3]||0)*60+(+m[4]||0)};
const fmt=s=>{const h=s/3600|0,m=(s%3600)/60|0,x=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${x}`:`${m}:${x}`};
const num=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':n;
const ago=d=>{const s=(Date.now()-new Date(d))/1000;return s<3600?(s/60|0)+'m':s<86400?(s/3600|0)+'h':(s/86400|0)+'d'};
async function folderVideos(chIds){const ids=[];
 await Promise.all(chIds.map(async c=>{try{const r=await api(`${YT}playlistItems?part=contentDetails&maxResults=50&playlistId=UU${c.slice(2)}`);r.items.forEach(i=>ids.push(i.contentDetails.videoId))}catch(e){}}));
 const need=ids.filter(i=>!vidCache[i]);for(let i=0;i<need.length;i+=50){const r=await api(`${YT}videos?part=snippet,contentDetails,statistics&id=${need.slice(i,i+50).join(',')}`);
  r.items.forEach(v=>{vidCache[v.id]={id:v.id,title:v.snippet.title,ch:v.snippet.channelTitle,cid:v.snippet.channelId,date:v.snippet.publishedAt,thumb:(v.snippet.thumbnails.medium||v.snippet.thumbnails.default).url,dur:iso(v.contentDetails.duration||''),views:+(v.statistics.viewCount||0),live:v.snippet.liveBroadcastContent!=='none'}})}
 return ids.map(i=>vidCache[i]).filter(Boolean)}
const isShort=v=>(v.dur>0&&v.dur<=180)||/#shorts?\b/i.test(v.title);
// ---- UI ----
function tabs(){const names=Object.keys(S.folders);if(!names.includes(cur))cur=names[0]||null;
 $('tabs').innerHTML=names.map(n=>`<button class="${n===cur?'on':''}" data-f="${encodeURIComponent(n)}">${esc(n)}</button>`).join('')||'<span class="m">No folders yet — tap Folders</span>'}
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let renderId=0;async function render(){tabs();const id=++renderId;$('feed').innerHTML='';if(!cur||!token){$('chf').style.display='none';return}const ch=S.folders[cur]||[];const sel=$('chf');sel.style.display='';if(chFilter&&!ch.includes(chFilter))chFilter='';
 sel.innerHTML='<option value="">All channels</option>'+ch.map(c=>`<option value="${c}" ${c===chFilter?'selected':''}>${esc(nm(c))}</option>`).join('');
 if(!ch.length)return st('Folder is empty');
 st('Loading…');let vs=await folderVideos(chFilter?[chFilter]:ch);if(id!==renderId)return;if(!prefs.shorts)vs=vs.filter(v=>!isShort(v));
 vs.sort(prefs.sort==='popular'?(a,b)=>b.views-a.views:(a,b)=>new Date(b.date)-new Date(a.date));st('');
 $('feed').innerHTML=vs.map(v=>`<a class="v" href="https://www.youtube.com/watch?v=${v.id}" target="_blank"><div class="t"><img loading="lazy" src="${v.thumb}"><span class="d">${v.live?'LIVE':fmt(v.dur)}</span></div><div class="ti">${esc(v.title)}</div><div class="m">${esc(nm(v.cid,v.ch))} · ${num(v.views)} · ${ago(v.date)}</div></a>`).join('')}
const nm=(id,orig)=>(S.names&&S.names[id])||orig||(subs.find(x=>x.id===id)||{}).title||id;
const chUrl=id=>`https://www.youtube.com/channel/${id}/videos`;
function manager(){const names=Object.keys(S.folders),where=c=>names.find(n=>S.folders[n].includes(c))||'';
 const fv=names.map(n=>`<details class="fd"><summary>${esc(n)} <span class="m">(${S.folders[n].length})</span></summary>${S.folders[n].map(c=>`<a class="cl" href="${chUrl(c)}" target="_blank">${esc(nm(c))}</a>`).join('')||'<div class="m cl">empty</div>'}</details>`).join('');
 $('allv').innerHTML=fv||'<div class="m">No folders yet</div>';
 $('mgr').innerHTML=`<div class="bar"><button id="nf">+ New folder</button>${cur?'<button id="rf">Rename</button><button id="df">Delete</button>':''}</div>`+
 
 subs.map(s=>{const cn=S.names&&S.names[s.id];return `<div class="ch"><img src="${s.thumb}"><a class="cn" href="${chUrl(s.id)}" target="_blank">${esc(nm(s.id,s.title))}${cn?' <span class="m">✎</span>':''}</a><button class="rn" data-c="${s.id}" title="Rename">✎</button>${cn?`<button class="rs" data-c="${s.id}" title="Reset">↺</button>`:''}<select data-c="${s.id}"><option value="">—</option>${names.map(n=>`<option ${where(s.id)===n?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`}).join('');
 $('nf').onclick=()=>{const n=prompt('Folder name');if(n&&!S.folders[n]){S.folders[n]=[];cur=n;save();tabs();manager()}};
 if(cur){$('rf').onclick=()=>{const n=prompt('Rename',cur);if(n&&!S.folders[n]){S.folders[n]=S.folders[cur];delete S.folders[cur];cur=n;save();tabs();manager()}};
  $('df').onclick=()=>{if(confirm('Delete '+cur+'?')){delete S.folders[cur];cur=null;save();tabs();manager()}}}
 $('mgr').querySelectorAll('.rn').forEach(b=>b.onclick=()=>{const c=b.dataset.c,o=(subs.find(x=>x.id===c)||{}).title;const n=prompt('Channel name (blank = original: '+o+')',nm(c,o));if(n===null)return;S.names=S.names||{};const t=n.trim();if(t&&t!==o)S.names[c]=t;else delete S.names[c];save();manager()});
 $('mgr').querySelectorAll('.rs').forEach(b=>b.onclick=()=>{delete S.names[b.dataset.c];save();manager()});
 $('mgr').querySelectorAll('select').forEach(sel=>sel.onchange=()=>{const c=sel.dataset.c;for(const n in S.folders)S.folders[n]=S.folders[n].filter(x=>x!==c);if(sel.value)S.folders[sel.value].push(c);save();manager()})}
function syncBtns(){$('shorts').classList.toggle('on',prefs.shorts);$('view').textContent=prefs.view==='grid'?'List':'Grid';$('feed').className=prefs.view;$('sort').value=prefs.sort}
$('tabs').onclick=e=>{const f=e.target.dataset.f;if(f!=null){cur=decodeURIComponent(f);chFilter='';closeViews();render()}};
$('chf').onchange=e=>{chFilter=e.target.value;render()};
$('sort').onchange=e=>{prefs.sort=e.target.value;savePrefs();render()};
$('shorts').onclick=()=>{prefs.shorts=!prefs.shorts;savePrefs();syncBtns();render()};
$('view').onclick=()=>{prefs.view=prefs.view==='grid'?'list':'grid';savePrefs();syncBtns()};
function closeViews(){$('mgr').classList.remove('show');$('allv').classList.remove('show');document.body.classList.remove('ov')}
function openView(id){const was=$(id).classList.contains('show');closeViews();if(was)return render();$(id).classList.add('show');document.body.classList.add('ov');manager()}
$('manage').onclick=()=>openView('mgr');$('all').onclick=()=>openView('allv');
$('login').onclick=start;
async function start(){try{st('Signing in…');await auth(localStorage.getItem('signedIn')?'':'consent');$('login').style.display='none';await loadRemote();await loadSubs();render()}catch(e){st('Error: '+(e.message||e.error||e))}}
syncBtns();tabs();
window.addEventListener('load',()=>{if(window.APP_CONFIG.CLIENT_ID.startsWith('YOUR_'))return st('Set CLIENT_ID in config.js');
 client=google.accounts.oauth2.initTokenClient({client_id:APP_CONFIG.CLIENT_ID,scope:SCOPES,callback:()=>{}});st('Tap Sign in')});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
if(localStorage.getItem('narrow')==='1')document.documentElement.classList.add('narrow');
$('narrow').onclick=()=>localStorage.setItem('narrow',document.documentElement.classList.toggle('narrow')?'1':'0');
function themeBtn(){const l=document.documentElement.classList.contains('light');$('theme').textContent=l?'☾':'☀';document.querySelector('meta[name=theme-color]').content=l?'#ffffff':'#0f0f0f'}
$('theme').onclick=()=>{localStorage.setItem('theme',document.documentElement.classList.toggle('light')?'light':'dark');themeBtn()};themeBtn();
