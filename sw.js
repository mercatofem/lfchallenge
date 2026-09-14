/* GENERADO — NO EDITAR AQUI.
   Copia de mercato-motor/web/sw.js. Se reescribe sola cada vez que se sirve o se publica el
   sitio, asi que cualquier cambio hecho en este fichero se pierde sin avisar.
   Lo compartido se toca en el motor; lo propio de esta liga, en web/mercato.js. */
// Service worker de las tres webs del mercato.
//
//
// Existe por DOS motivos, y conviene no confundirlos:
//
//   1. Sin un service worker con manejador de `fetch`, el navegador no ofrece
//      instalar el sitio. Es requisito, no adorno.
//   2. Con el, la pagina abre sin conexion con lo ultimo que se vio.
//
// ── La estrategia, y por que NO es la habitual ─────────────────────────────
//
// RED PRIMERO, cache de respaldo. Lo normal en una PWA es al reves —cache
// primero, que va instantaneo— y aqui seria un error: el valor entero de esto
// es contar el fichaje el dia que se anuncia. Un sitio que enseña el mercato de
// anteayer porque estaba en cache no vale para nada, y el usuario no tendria
// forma de saberlo: no hay error, hay datos viejos con cara de nuevos.
//
// Asi que la cache es solo la RED DE SEGURIDAD del metro sin cobertura. Cuando
// hay red, siempre gana la red.
//
// ── Sobre la version ──────────────────────────────────────────────────────
//
// Al cambiar CACHE se borran las anteriores en `activate`. Hay que subirla
// cuando cambie algo que se cachea y no queramos arrastrar lo viejo; como la
// estrategia es red primero, en la practica casi nunca hace falta.

// UN SOLO NOMBRE para las tres, y no es un descuido: la Cache Storage esta
// particionada POR ORIGEN -esquema, dominio y puerto-, asi que las tres webs
// tienen su propio almacen aunque la clave se llame igual. Vale tanto en
// produccion, que son tres dominios, como en local, que son tres puertos.
//
// Por eso este fichero puede vivir aqui y copiarse igual que `base.js`: no le
// queda nada propio de una liga. Lo pidio Luismi -«las 3 webs deberian ser
// clonicas mas alla de los colores de acento o de donde cojan los datos»- y
// esta constante era lo ultimo que lo impedia.
//
// Al subir la version se borran las anteriores en `activate`, asi que el cambio
// de nombre se limpia solo la primera vez que cada web lo instala.
const CACHE = 'mercato-v1';

// Lo minimo para que la pagina ARRANQUE sin red. Los datos no van aqui a
// proposito: se cachean solos al pedirlos, y precargarlos daria la sensacion de
// que la primera visita ya trae el mercato cuando lo que trae es el esqueleto.
const ESQUELETO = [
  './',
  './index.html',
  './base.js',
  './mercato.js',
  './estilos/tokens.css',
  './estilos/base.css',
  './estilos/liga.css',
];

self.addEventListener('install', (e) => {
  // `addAll` falla entero si UNA sola peticion falla, y entonces el worker no
  // se instala. Se piden de una en una tolerando fallos: que no haya podido
  // guardar una hoja de estilos no es motivo para quedarse sin service worker.
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(ESQUELETO.map((u) => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  // Solo GET y solo lo nuestro. Una peticion a Instagram o a Telegram no pinta
  // nada en esta cache, y meterla ademas la llenaria de respuestas firmadas que
  // caducan en dias.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Solo se guarda lo que vino bien. Cachear un 404 o un 500 es guardar el
        // error para servirlo mañana.
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r ?? caches.match('./index.html'))),
  );
});
