// Página: rede primeiro, cache se offline. Áudio: só do cache quando o usuário tocou em "salvar offline".
const SHELL = 'cgu-shell-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-512.png']))) });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (new URL(req.url).pathname.includes('/audio/')) return e.respondWith(audio(req));
  // trechos curtos da esteira: guarda cada um na primeira vez que toca, para a revisão funcionar offline depois
  if (new URL(req.url).pathname.includes('/voz/')) return e.respondWith(audio(req, 'cgu-voz', true));
  if (req.mode === 'navigate') e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(s => s.put('./', c)); return r }).catch(() => caches.match('./')));
});
// Safari pede o áudio em pedaços (Range): responde 206 fatiando o arquivo salvo. store: baixa inteiro e guarda na primeira vez
async function audio(req, cache = 'cgu-audio', store = false) {
  const c = await caches.open(cache);
  let hit = await c.match(req.url);
  if (!hit && store) { const r = await fetch(req.url).catch(() => null); if (r?.ok) { await c.put(req.url, r.clone()); hit = r } }
  if (!hit) return fetch(req);
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = +m[1] || 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}` } });
}
