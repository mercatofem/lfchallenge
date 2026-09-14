/* GENERADO — NO EDITAR AQUI.
   Copia de mercato-motor/web/base.js. Se reescribe sola cada vez que se sirve o se publica el
   sitio, asi que cualquier cambio hecho en este fichero se pierde sin avisar.
   Lo compartido se toca en el motor; lo propio de esta liga, en web/mercato.js. */
// Motor de la pagina de los Mercato.
// =====================================================================
// Todo lo que se ve igual en N1 FEM Mercato, LF2 Mercato y el que venga detras: el
// semaforo, la tabla de plantilla, la de movimientos, el masonry, los filtros,
// el plegado, la cabecera de temporada y el aviso de hasta donde se ha barrido.
//
// Se copia tal cual a <repo>/web/base.js al servir y al publicar, igual que
// base.css (mercato-motor/compartido.mjs). Esa copia esta gitignorada y NO se
// edita: el sitio para tocar esto es este.
//
// Va por COPIA y no por import del paquete porque este fichero lo ejecuta el
// NAVEGADOR: no hay empaquetador que resuelva 'mercato-motor/...', y aunque lo
// hubiera, publico/ no puede enlazar a un directorio hermano del repo.
//
// El criterio de reparto es el del CONTRATO: ¿cambiaria esta linea si la liga
// fuese otra? Si no, vive aqui. Si si, entra como DATO por `arrancar(liga)` y
// nunca como bandera: aqui dentro no hay un solo `if (liga === ...)`. Lo que una
// liga no declare, sencillamente no se pinta — una liga sin provincias no es un
// caso especial, es una clave que no viene. Y una liga de UN grupo pinta una
// rejilla por la misma razon que una de dos pinta dos: los grupos salen del
// JSON, no de una constante.
//
// Lo que trae cada liga. Todo es opcional salvo `etiqueta` y `equipo.nombre`:
//
//   etiqueta              'LF2', 'N1'. Sale en el aviso de "sin plantilla previa".
//   competicion(d)        El nombre largo, para el tooltip de la cabecera.
//   cuartoTotal(t)        [titulo, valor] de la cuarta baldosa. Las otras tres
//                         —altas, renovaciones, bajas— son de todas.
//   filtros[]             Filtros propios: { id, param, vacio, valor(e) }.
//   equipo.nombre(e)      Como se llama el equipo esta temporada. Obligatorio.
//   equipo.club(e)        El nombre estable del club, cuando es otro.
//   equipo.localidad(e)   De donde es.
//   equipo.pabellon(e)    Donde juega; sale como tooltip de la localidad.
//   equipo.ficha(e)       URL de la ficha federativa del equipo, si la hay.
//   equipo.escudo(e)      Fichero dentro de datos/escudos/.
//   clubDeFuera(club, d)  Lo que sepamos de un club que NO juega esta categoria,
//                         por el nombre con el que aparece en el anuncio:
//                         { escudo, liga }. Recibe tambien el mercato entero,
//                         porque ese catalogo suele ser dato del JSON y no
//                         codigo. Opcional.
//   equipo.tinte(e)       Color del club, en #rrggbb.
//   equipo.tinteClaro(e)  Si ese color no se distingue del panel.
//   equipo.redes(e)       { instagram, x, web, facebook } con lo que haya.
//   foto(j)               Retrato oficial de una jugadora de la plantilla.
//   fotoDelMovimiento(m)  Retrato oficial de quien protagoniza un movimiento.
//   plantilla.antes[]     Columnas propias antes de la de Jugadora, y
//   plantilla.despues[]   despues: { th, clase, celda(j) }. Es `filaDePlantilla`
//                         del CONTRATO: lo que entrega cada federacion, no una
//                         decision nuestra.
//   plantilla.ficha(j)    La linea pequeña bajo el nombre, para lo que no
//                         merece columna propia.
//   notaCuentaCompartida  Texto de la nota cuando un club anuncia dos equipos
//                         por la misma cuenta.

import { revisar, motivoDeRevision, pendienteDeMano } from './revision.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Un nombre de persona, escrito SIEMPRE igual: "Nombre Apellidos".
 *
 * Los dos sitios de los que salen no coinciden en nada. La federacion los da
 * "MARTINEZ MORENO, MARTINA" —en mayusculas y por apellidos—, y el club que
 * ficha los escribe "Ariadna Castaño", o "alma bourgarel" si ese dia escribia
 * deprisa. Mezclados en la misma columna parecen tres criterios distintos, y de
 * hecho lo son.
 *
 * Se elige "Nombre Apellidos" en minusculas con inicial —y no todo en
 * mayusculas— por dos razones: es como lo escriben los clubes, que son la
 * mayoria de las filas, y porque los nombres de club de al lado YA van en
 * mayusculas. Con la jugadora tambien gritando no se distinguia quien es el
 * sujeto de la fila.
 *
 * Es SOLO para pintar. El nombre federativo se queda intacto en el dato: es la
 * clave con la que se cruza contra el censo y con la que se buscan las
 * revisiones a mano, y tocarlo ahi rompe las dos cosas.
 *
 * Lo que NO puede arreglar: las tildes que la federacion no pone. "MARTINEZ"
 * sale "Martinez" y no "Martínez", porque inventarselas seria adivinar —hay
 * apellidos que la llevan y otros que no— y aqui no hay de donde sacarla.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'lo', 'los', 'y', 'e', 'da', 'das',
  'do', 'dos', 'van', 'von', 'di', 'der', 'den', 'el']);

const conInicial = (palabra) => palabra
  .replace(/(^|[-'’])([\p{Ll}])/gu, (_, sep, letra) => sep + letra.toLocaleUpperCase('es'));

const nombrePersona = (texto) => {
  const bruto = String(texto ?? '').trim().replace(/\s+/g, ' ');
  if (!bruto) return '';
  // "APELLIDOS, NOMBRE" -> "NOMBRE APELLIDOS". Solo la PRIMERA coma: es la que
  // separa las dos mitades, y las que vengan detras son parte del nombre.
  const coma = bruto.indexOf(',');
  const ordenado = coma > 0
    ? `${bruto.slice(coma + 1).trim()} ${bruto.slice(0, coma).trim()}`
    : bruto;
  // A minusculas primero y luego inicial: asi da igual como viniera. Las tildes
  // que ya trae se conservan, porque bajar y subir de caja no las quita.
  return ordenado.toLocaleLowerCase('es').split(' ')
    // Las particulas van en minuscula, pero nunca la primera palabra: "Ana de
    // la Cruz" se lee bien, "de la Cruz Ana" no existe.
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : conInicial(p)))
    .join(' ');
};

const fechaCorta = (iso) => {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

/**
 * El dia de hace `n` dias, en el formato del JSON (`AAAA-MM-DD`).
 *
 * A mano y no con `toISOString()`, que devuelve la fecha en UTC: a las 00:30 de
 * España eso es todavia el dia de ayer, y el corte se iria un dia entero hacia
 * atras justo cuando corren las pasadas automaticas.
 *
 * La variable se llama `dia` y no `f` por la huella: `huella-render` cuenta
 * `algo.campo` sin saber si `algo` es un movimiento o una fecha del navegador, y
 * en este fichero `f` es SIEMPRE una fuente. Con `f` aqui, `f.getDate` entraba
 * en la lista de campos leidos como si fuera un dato del JSON.
 */
const hace = (n) => {
  const dia = new Date();
  dia.setDate(dia.getDate() - n);
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
};

// Mismo criterio que en el servidor: sin tildes y en mayusculas. Aqui solo se
// usa para saber si un movimiento YA se esta viendo como pastilla en la fila de
// su jugadora, y no repetirlo debajo.
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

// El vocabulario de la liga, el mercato entero y la temporada que se esta
// mirando. Se llenan en `arrancar` y de ahi no se mueven: la pagina es un solo
// modulo y estas tres cosas las lee todo el mundo.
let L;
let d;
let t;

const ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';

// Iconos de marca, en linea para no depender de nada externo.
// Instagram manda —baja hasta donde le pidas y da fecha exacta— y X completa.
// Facebook esta aqui porque la FAB si publica algun club por ahi, pero se midio
// con numeros delante: cero movimientos aportados en 5.539 publicaciones. TikTok
// no esta a proposito, porque no expone las descripciones, y que su icono no
// exista es lo que evita darlo por soportado.
// Como se LEE cada fuente en el texto emergente. Solo las que no valen tal
// cual: "Ver en federacion" no se dice, y ademas es una ficha, no un perfil.
const COMO_SE_LEE = { federacion: "la ficha en la federación" };
const nombreDeFuente = (red) => COMO_SE_LEE[red] ?? red;

const ICONOS = {
  instagram: '<svg viewBox="0 0 24 24" data-trazo stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.4" r=".9" fill="currentColor" stroke="none"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18.2 2.3h3.4l-7.4 8.5L23 21.7h-6.8l-5.3-7-6.1 7H1.4l7.9-9.1L1 2.3h7l4.8 6.4 5.4-6.4zm-1.2 17.4h1.9L7.1 4.2H5l12 15.5z"/></svg>',
  // Este no es fuente de movimientos, solo sale en la cabecera: la web del club.
  // Dibujado a trazo como el de Instagram, para que la fila no mezcle iconos
  // rellenos con iconos de linea.
  web: '<svg viewBox="0 0 24 24" data-trazo stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 4 5.9 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-5.9-4-9.5s1.4-6.9 4-9.5z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z"/></svg>',
  // La FEDERACION es una fuente mas, y de las buenas: hay movimientos que nadie
  // anuncia y que constan en la ficha federativa con su fecha de baja. Ana
  // Moyano dejo Barakaldo el 10/02/2026 para irse al Zamarat y no hay un solo
  // post de nadie; lo dice el registro. El icono es un carnet, que es
  // literalmente lo que se enseña: una ficha, no una red social.
  federacion: '<svg viewBox="0 0 24 24" data-trazo stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><circle cx="8.5" cy="10.5" r="2.2"/><path d="M5 16.5c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4M14.5 9.5h4M14.5 13h4"/></svg>',
};

// En que orden se ofrecen las cuentas del club. Una liga que no tenga alguna
// simplemente no la trae y ese enlace no sale.
const REDES = [
  ['instagram', 'Instagram del club'],
  ['x', 'X del club'],
  ['web', 'Web del club'],
  ['facebook', 'Facebook del club'],
];

// El enlace al PERFIL de un club. Instagram y X guardan solo el handle —sin
// arroba, que es como se validan a mano— y hay que montarles la URL.
// El motor tiene esta misma funcion para el lado del build; aqui se repite
// porque este fichero lo ejecuta el navegador y no puede importar del paquete.
const enlaceRed = (red, valor) => {
  if (!valor) return null;
  if (red === 'instagram') return `https://www.instagram.com/${valor.replace(/^@/, '')}/`;
  if (red === 'x') return `https://x.com/${valor.replace(/^@/, '')}`;
  // La FEB da la web del club SIN esquema ("www.adcortegada.es"), y un href sin
  // esquema no es una URL absoluta: el navegador lo lee como ruta relativa y el
  // enlace acaba apuntando al propio sitio. En desarrollo, a localhost.
  if (/^https?:\/\//i.test(valor)) return valor;
  if (/^\/\//.test(valor)) return `https:${valor}`;
  return `https://${valor}`;
};

// Caja de foto de tamaño FIJO con la silueta debajo. Las dos capas se apilan en
// la misma celda de grid, asi que si la imagen no llega —se quita sola con el
// onerror— queda la silueta y la fila no cambia de alto.
// Es la version que hace falta donde las fotos NO estan descargadas: la FEB
// sirve el retrato desde su servidor y alguna no llega. Donde si lo estan la
// caja se comporta igual, asi que vale para las dos y no hay dos maneras de
// pintar la misma casilla.
// Sin Referer, que algunos CDN cortan por ahi.
// La `insignia` es lo que iba en una columna propia y ahora vive en la esquina
// de la foto: el dorsal en la plantilla, el semaforo en los movimientos. En un
// movil cada columna que se quita es una columna menos de scroll horizontal, y
// estas dos son un numero de dos cifras y un punto: caben de sobra encima de un
// retrato sin taparlo.
// El `faldon` es la pastilla de "cantera", montada en el BORDE INFERIOR de la
// foto. Estuvo suelta detras del nombre y ahi competia con el: en una fila donde
// el nombre ya ocupa dos lineas, la pastilla caia a una tercera y el sujeto de
// la fila se leia en tres alturas. Sobre la foto no cuesta ni una linea, y va
// donde le corresponde —dice algo de la jugadora, no de su nombre—.
const cajaFoto = (src, insignia = '', faldon = '') => `<span class="retrato">${ICONO}${src
  ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(src)}" alt="" onerror="this.remove()">`
  : ''}${insignia}${faldon}</span>`;

// Retrato oficial si la federacion lo da; si no, la foto del anuncio que ya
// tenemos bajada. Quien llega de fuera de la categoria no tiene ficha y por
// tanto tampoco retrato, asi que salia con el monigote gris aun teniendo su foto
// archivada de cuando el club anuncio su alta.
// La insignia la decide la liga porque el dato es suyo: la FAB rellena el
// dorsal casi siempre y la FEB no lo trae en LF2 —9 de 209 jugadoras—, asi que
// alli la esquina se queda vacia en vez de pintar un hueco sin numero.
// La insignia de la liga y, si su movimiento tiene alguna duda, el SEMAFORO.
//
// Faltaba, y hacia que la misma fila se leyera distinto segun donde se mirara:
// Cristina Loureiro sale en la plantilla de Cortegada como una renovacion normal
// y en la vista de Revision como "señal debil", que es lo que de verdad es —su
// movimiento va en confianza media—. Ademas el bot ya avisaba de ella, asi que
// la unica pantalla que no lo decia era justo la tarjeta de su equipo.
//
// Es el mismo fallo que se corrigio para la cronologia el 2026-08-04: el aviso
// vivia en un render y no en el otro. Aqui vuelve a pasar porque la plantilla
// pinta con `retrato` y la tabla de movimientos con `fotoAnuncio`, y solo la
// segunda llamaba al semaforo.
const retrato = (j, faldon = '') => cajaFoto(
  L.foto?.(j) ?? (j.movimiento?.imagenLocal ? `./datos/anuncios/${j.movimiento.imagenLocal}` : null),
  insignia(L.plantilla?.insignia?.(j)) + (j.movimiento ? insignia(semaforo(j.movimiento)) : ''),
  faldon,
);

/** La pastilla montada sobre la foto. Se pinta o no se pinta, sin hueco. */
// La pastilla se pinta DOS veces y la hoja de estilos enseña una u otra segun
// el ancho: sobre la foto en movil, detras del nombre en escritorio.
//
// Dos nodos y no uno movido con CSS porque no se puede: en escritorio va DENTRO
// del flujo del texto del nombre —para que caiga detras de la ultima palabra— y
// en movil va ABSOLUTA sobre la foto, que es otro elemento padre. Ningun
// `position` lleva un nodo de un padre a otro.
//
// Es el mismo patron que `.desc-linea` y `.fuentes-linea`: existen siempre en el
// HTML y se conmutan por CSS, asi no hay que medir nada desde el JS ni repintar
// la tabla al girar el movil.
const faldonCantera = (si) => (si ? '<span class="etq faldon">cantera</span>' : '');
const canteraJuntoAlNombre = (si) => (si ? '<span class="etq junto-al-nombre">cantera</span>' : '');

/** La esquinita de la foto. Vacia si no hay nada que poner, no un hueco. */
const insignia = (v) => (v === null || v === undefined || v === '' ? '' : `<b class="insignia">${v}</b>`);

// Devuelve DOS celdas: la fecha y, en columna propia, el icono de la red. Van
// separadas para que el icono quede pegado al borde derecho de la tabla; metidos
// en la misma celda, el par fecha+icono se centraba como un bloque y el icono
// caia a media columna. Siempre se emiten las dos, aunque vayan vacias, o se
// descuadraria el numero de columnas de la fila.
/**
 * Las dos celdas del anuncio —fecha e iconos— para TODAS las noticias de la fila.
 *
 * Una por línea y en el mismo orden que las pastillas de al lado, para que la
 * segunda fecha caiga a la altura de la segunda pastilla: quien ficha en julio y
 * se va en febrero tiene que poder leer de un vistazo qué fecha va con cuál.
 */
const celdasAnuncio = (...movs) => {
  const conAlgo = movs.filter((m) => m?.fecha || m?.red || m?.fuentes?.length);
  // Vacias pero CON SU CLASE. Sin ella, estas dos celdas no las alcanzaba el
  // `display: none` de estrecho y mantenian vivas las dos columnas: 16px de
  // relleno cada una, o sea 32px de tabla que ninguna fila usaba. Basta con que
  // UNA fila deje la celda sin clase para que la columna siga ahi.
  if (!conAlgo.length) return '<td class="anuncio"></td><td class="col-fuente"></td>';
  const piezas = conAlgo.map(piezasDeUnAnuncio);
  // Con una sola noticia -el caso de casi todas- se pinta tal cual, sin envolver
  // nada: no hay nada que apilar y un span de mas es un span de mas en cada fila
  // de cada equipo.
  if (piezas.length === 1) {
    return `<td class="anuncio">${piezas[0].fecha}</td><td class="col-fuente">${piezas[0].icono}</td>`;
  }
  const apilar = (trozos) => trozos.map((x) => `<span class="linea">${x}</span>`).join('');
  return `<td class="anuncio">${apilar(piezas.map((p) => p.fecha))}</td>`
    + `<td class="col-fuente">${apilar(piezas.map((p) => p.icono))}</td>`;
};

/** Las dos PIEZAS de un anuncio —fecha e iconos—, sin las celdas. */
// Devuelve las piezas y no el `<td>` porque hay filas con dos noticias y las dos
// van dentro de la MISMA celda, una debajo de otra. Se probo montando el td aqui
// y volviendolo a abrir con una expresion regular para meter la segunda: leer el
// propio marcado para desarmarlo es el tipo de cosa que funciona hasta que
// alguien añade un espacio.
const piezasDeUnAnuncio = (mov) => {
  // Un icono por CADA red que lo anuncio, no solo por la que gano el desempate:
  // si sale en Instagram y en X, se ven los dos y cada uno lleva a su
  // publicacion. Vienen ya ordenados por prioridad.
  const fuentes = (mov.fuentes?.length ? mov.fuentes : [{ red: mov.red, url: mov.url }])
    .filter((f) => f?.red && ICONOS[f.red]);
  // La fecha entra tambien en el title del icono. En movil la columna de fecha
  // se esconde para que la tabla quepa, y sin esto el dato desapareceria: asi
  // sigue estando a un toque largo, y en escritorio no estorba.
  const cuando = mov.fecha ? ` · ${fechaCorta(mov.fecha)}` : '';
  const icono = fuentes.map((f) => (f.url
    ? `<a class="fuente" href="${esc(f.url)}" target="_blank" rel="noopener" title="Ver ${esc(nombreDeFuente(f.red))}${esc(cuando)}">${ICONOS[f.red]}</a>`
    : `<span class="fuente" title="${esc(f.red)}${esc(cuando)}">${ICONOS[f.red]}</span>`)).join('');
  return { fecha: esc(fechaCorta(mov.fecha)), icono };
};

/**
 * Los mismos iconos, para pintarlos DEBAJO del nombre.
 *
 * En estrecho la columna de fuentes se esconde y estos ocupan su sitio: el
 * nombre necesita 150px para no partirse en cuatro lineas, y con la columna
 * puesta eso obligaba a scroll horizontal. Debajo del nombre no cuestan ancho,
 * solo unos pixeles de alto en las filas que ademas tienen algo que enlazar.
 *
 * Se emiten SIEMPRE y se enseña uno u otro por CSS, no por JavaScript: la
 * pagina no sabe -ni debe- el ancho al que la van a mirar, y una tarjeta puede
 * ser estrecha en una pantalla ancha.
 */
const fuentesBajoNombre = (mov) => {
  // La MISMA lista que usa la columna de fuentes, y no una version propia.
  //
  // Aqui se caia a `{ red: mov.red, url: mov.url }`, y esos dos campos NO
  // existen en un movimiento: la fuente vive en `mov.fuente`. Con una sola
  // fuente —que es el caso normal— el filtro de abajo lo tiraba todo y esta
  // linea salia vacia, asi que en estrecho solo se veian los iconos de los
  // movimientos anunciados en DOS redes, que son los unicos con `fuentes`.
  // Llevaba asi desde que existe, tapado porque solo se ve por debajo del corte.
  const fuentes = (mov?.fuentes?.length ? mov.fuentes : [mov?.fuente])
    .filter((f) => f?.red && ICONOS[f.red]);
  if (!fuentes.length) return '';
  const cuando = mov.fecha ? ` · ${fechaCorta(mov.fecha)}` : '';
  return `<span class="fuentes-linea">${fuentes.map((f) => (f.url
    ? `<a class="fuente" href="${esc(f.url)}" target="_blank" rel="noopener" title="Ver ${esc(nombreDeFuente(f.red))}${esc(cuando)}">${ICONOS[f.red]}</a>`
    : `<span class="fuente" title="${esc(f.red)}${esc(cuando)}">${ICONOS[f.red]}</span>`)).join('')}</span>`;
};

/**
 * Las noticias de una fila, en orden cronológico y siempre como lista.
 *
 * Casi todas tienen una. Quien ficha o renueva en verano y se va en febrero
 * tiene DOS, y hasta hoy la fila enseñaba solo la última: la primera existía en
 * el JSON y no se veía en ninguna parte. Lo pone el motor en `movimientos`
 * -ver `anotarSegundosMovimientos`- y solo cuando de verdad hay más de una, así
 * que aquí se cae a la de siempre.
 */
const movimientosDeLaFila = (j) => (j.movimientos?.length ? j.movimientos : [j.movimiento].filter(Boolean));
const estado = (mov) => {
  // "TBC" y no "sin noticia": en una tabla estrecha son tres caracteres en vez
  // de once, y dice lo mismo — que de esa jugadora no sabemos nada TODAVIA, no
  // que se quede ni que se vaya.
  if (!mov) return '<span class="pill p-nada" title="Sin noticia todavía">TBC</span>';
  // El MISMO mapa que la cronologia: ver `ETIQUETA_TIPO`. En el dato las listas
  // se siguen llamando `altas` y `bajas` —eso es el nombre del campo y no cambia—
  // pero lo que se lee es un fichaje y una baja.
  const etiqueta = ETIQUETA_TIPO[mov.tipo] ?? mov.tipo;
  // El color dice QUE pasa (rojo se va, azul alta, verde renueva). La confianza
  // NO se pinta con color: se probo y lo confirmado salia morado y se comia el
  // tipo —una baja confirmada dejaba de verse como baja—, que es justo el dato
  // que se viene a buscar. Se dice al pasar el raton, junto al destino.
  //
  // Adonde se va: el dato existe —lo sabemos porque el propio anuncio lo nombra,
  // o porque otro club la ha anunciado— y sin esto habia que ir a buscarlo a la
  // tarjeta del destino. `destino` es como lo escribe el club que la ficha y
  // `vaA` como lo cierra el cruce contra el censo; manda el primero que haya.
  //
  // La fila de la plantilla TAMBIEN los lleva desde el 2026-08-04. Antes no, y
  // aqui ponia que "no pasa nada": si pasaba. La pastilla es lo primero que se
  // mira, y se quedaba muda justo en los clubes que habian anunciado la
  // despedida, que son los que mas informacion dan.
  //
  // Se dice con el nombre del EQUIPO, como en la columna de procedencia: en el
  // dato va el club —el nombre estable— y en la pagina manda el del equipo.
  const clubDestino = mov.destino ?? mov.vaA?.club ?? null;
  const equipoDestino = clubDestino
    ? (equipoDelClub(mov.vaA?.club) ?? equipoDelClub(clubDestino))
    : null;
  const adonde = equipoDestino ? L.equipo.nombre(equipoDestino) : clubDestino;
  const pistas = [
    adonde ? `Se va a ${adonde}` : null,
    mov.confianza === 'confirmada' ? 'Confirmada' : null,
  ].filter(Boolean).join(' · ');
  const pista = pistas ? ` title="${esc(pistas)}"` : '';
  return `<span class="pill p-${mov.tipo}${pista ? ' con-pista' : ''}"${pista}>${esc(etiqueta)}</span>`;
};

/**
 * Todas las pastillas de una fila, apiladas y en orden cronológico.
 *
 * Quien ficha o renueva en verano y se va en febrero enseña las DOS: arriba lo
 * que pasó primero y debajo la baja. Antes solo se veía la última, así que su
 * fichaje desaparecía de la tarjeta del equipo aunque siguiera en la tabla de
 * movimientos — la plantilla mentía por omisión.
 *
 * Sin envoltorio cuando hay una sola, que es el caso de casi todas: la fila
 * queda byte a byte como estaba y esto no le cuesta nada al 99%.
 */
const pastillasDeLaFila = (j) => {
  const movs = movimientosDeLaFila(j);
  if (movs.length < 2) return estado(movs[0] ?? null);
  return `<span class="pills">${movs.map(estado).join('')}</span>`;
};

/**
 * Como se lee cada tipo. UNA sola vez, para las dos vistas.
 *
 * Aqui vivian DOS mapas, y con un motivo escrito: en una tarjeta la pastilla
 * hablaba del club que se esta mirando —"alta" es lo que ese club apunta, "se
 * va" quien lo deja— y en la cronologia el sujeto es la jugadora, asi que
 * pasaban a "fichaje" y "baja". El razonamiento se sostiene solo si nunca ves
 * las dos vistas seguidas; en la practica se ven, y lo que queda es la misma
 * cosa llamada de dos maneras en la misma pagina. Luismi lo señalo en dos pasos
 * —primero "alta" contra "fichaje", luego "se va" contra "baja"— y con los dos
 * corregidos los mapas eran ya identicos.
 *
 * Se juntan en vez de dejarlos iguales por duplicado: hoy mismo ha mordido dos
 * veces lo de tener la misma regla escrita en dos sitios, y dos mapas que hoy
 * coinciden es solo cuestion de tiempo que dejen de hacerlo.
 *
 * "renueva" y no "renovación": en la pestaña vertical del borde la palabra ocupa
 * el ALTO de la fila, y "renovación" son diez caracteres que no caben en una fila
 * corta. Ademas casa con las otras dos, que se leen como lo que PASA y no como el
 * nombre del tramite.
 *
 * Los colores no dependen de la vista —verde ficha, azul renueva, rojo baja— porque
 * son el mismo dato.
 */
const ETIQUETA_TIPO = { alta: 'fichaje', renovacion: 'renueva', baja: 'baja' };
const tipoCronologia = (m) => {
  const pista = m.confianza === 'confirmada' ? ' title="Confirmada"' : '';
  return `<span class="pill p-${m.tipo}"${pista}>${esc(ETIQUETA_TIPO[m.tipo] ?? m.tipo)}</span>`;
};

/**
 * Un club DENTRO de una frase: su escudo y su nombre, pegados.
 *
 * `inline-flex` y no dos elementos sueltos para que el escudo nunca se quede
 * solo al final de una linea con el nombre en la siguiente.
 *
 * Se busca el EQUIPO por el club para dos cosas: el escudo, que cuelga de el, y
 * el nombre, que es el que se conoce —"EL PLANTEL GMASB" y no "AGRUPACION
 * DEPORTIVA..."—. Cuando no lo encontramos se pinta el texto tal cual: se ficha
 * constantemente de fuera de la categoria, y ahi lo que escribio el club es
 * todo lo que hay.
 */
/**
 * El escudo de repuesto para quien no tiene el suyo.
 *
 * Dibujado y neutro a proposito: no es el escudo de nadie, es el HUECO de un
 * escudo. Un generico con pinta de emblema haria creer que ese es su escudo.
 * Lo llevan los clubes que no jugaron la categoria el año anterior, que es de
 * donde salen los escudos, y sin nada ahi la columna bailaba: unas filas
 * empezaban con imagen y otras con texto.
 */
const ESCUDO_GENERICO = `<svg class="escudito escudito-vacio" viewBox="0 0 24 24" aria-hidden="true"
  data-trazo stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19 5.6v6c0 4-2.9 7.4-7 9.2-4.1-1.8-7-5.2-7-9.2v-6z"/></svg>`;

/**
 * El escudito de un club, o el generico si no lo tenemos.
 *
 * Vive suelto porque lo pintan DOS vistas: la frase de la cronologia y la
 * columna de Procedencia de las tarjetas. Estaba solo en la primera, y la
 * segunda salia con el nombre a secas teniendo el escudo bajado — dos vistas
 * del mismo dato con distinto aspecto, que es lo que este fichero lleva todo el
 * dia corrigiendo.
 *
 * El generico SOLO cuando no hay fichero. Antes iban los dos, uno encima del
 * otro, para que al fallar la imagen quedara el hueco debajo; pero los escudos
 * con fondo transparente —los de la FEB lo son— dejaban ver el monigote gris POR
 * DETRAS. Un respaldo que se ve a traves del titular no es un respaldo. Si la
 * imagen no llega, `this.remove()` la quita y debajo ya esta el hueco dibujado.
 */
const escudito = (fichero) => (fichero
  ? `<img class="escudito" src="./datos/escudos/${esc(fichero)}" alt="" loading="lazy" onerror="this.remove()">`
  : ESCUDO_GENERICO);

/**
 * El catalogo de clubes de fuera, probando los DOS nombres que puede tener.
 *
 * Un club se escribe de dos formas y las dos son legitimas: la comercial —la que
 * usa el anuncio y la que trae la ficha federativa, «ACEITES ABRIL ADBA SANFER
 * ART-CHIVO»— y la estable del club, «AGRUPACION DEPORTIVA BALONCESTO AVILES».
 * El catalogo tiene unas por un lado y otras por el otro: de las 19 procedencias
 * que salieron de la FEB, 12 casan por el nombre comercial y 9 por el del club,
 * y ninguno de los dos solo llega a 14. Con una sola pregunta se perdian
 * escudos que estaban bajados.
 */
const fichaDeFuera = (texto, clubEstable) => L.clubDeFuera?.(texto, d)
  ?? (clubEstable && clubEstable !== texto ? L.clubDeFuera?.(clubEstable, d) : null);

const clubEnFrase = (equipo, texto, donde = '', ligaDicha = null, clubEstable = null) => {
  const nombre = equipo ? L.equipo.nombre(equipo) : texto;
  if (!nombre) return '';
  // Del EQUIPO sale su escudo cuando lo conocemos. Cuando no —un club de fuera
  // de la categoria— la liga puede tener ficha suya en su catalogo, con el
  // escudo Y la competicion en la que juega. Se le pasa el mercato entero
  // porque ese catalogo es DATO, no codigo: vive en el JSON y lo llena un
  // importador. Escrito en el vocabulario, añadir un escudo seria tocar un
  // fichero de JavaScript.
  const fichero = equipo ? L.equipo.escudo?.(equipo) : fichaDeFuera(texto, clubEstable)?.escudo;
  // La competicion la decide QUIEN LLAMA, no esto. Aqui se consultaba tambien al
  // catalogo, y entonces no habia forma de callarla desde fuera: la fila de
  // Carla Catalan seguia diciendo "(LF CHALLENGE)" aunque venga de la CANTERA de
  // ese club. Con una sola voz decidiendo, el caso raro se resuelve donde se
  // conoce.
  const liga = ligaDicha;
  // El generico va SIEMPRE, y el de verdad encima: los dos ocupan la misma
  // celda de la caja. Asi el respaldo no se escribe dos veces ni hay que
  // reconstruir HTML dentro de un `onerror` —que ademas es como se colaba un
  // `">` suelto debajo de cada escudo: la comilla doble del SVG cerraba el
  // atributo antes de tiempo—. Si la imagen no llega, `this.remove()` la quita
  // y debajo ya estaba el hueco dibujado.
  // El generico SOLO cuando no hay fichero. Antes iban los dos, uno encima del
  // otro, para que al fallar la imagen quedara el hueco debajo; pero los escudos
  // con fondo transparente —los de la FEB lo son— dejaban ver el monigote gris
  // POR DETRAS. Un respaldo que se ve a traves del titular no es un respaldo.
  const escudo = escudito(fichero);
  // La competicion, detras y en pequeño. Solo cuando NO es la nuestra: aqui
  // todo es N1 salvo aviso, asi que ponerselo a los 28 seria repetir 28 veces
  // el titulo de la pagina. Contesta lo que deja colgando una baja hacia fuera:
  // no es que la jugadora desaparezca, es que se va a otra categoria.
  const donde2 = liga ? `<span class="liga-club">(${esc(liga)})</span>` : '';
  // El escudo va FUERA del nombre, como hermano flex.
  //
  // Estuvo dentro, y por un motivo real: fuera, al partirse el nombre en dos
  // lineas, el bloque de texto se quedaba con todo su ancho maximo y —alineado
  // a la derecha— dejaba al escudo solo en el extremo opuesto de la celda. Pero
  // dentro tiene un precio peor: siendo un `inline-block` en el flujo del texto,
  // la SEGUNDA linea del nombre arranca en el borde izquierdo de la caja, o sea
  // POR DEBAJO del escudo.
  //
  // Se arregla donde estaba el fallo, que no era el sitio del escudo sino el
  // ancho del texto: con `width: fit-content` el bloque mide lo que su linea mas
  // larga y ya no hay extremo opuesto del que separarse. Ver `.club-frase` en
  // base.css.
  //
  // Y el nombre va en `<span>`, no en `<b>`: el CSS le quitaba la negrita al
  // origen (`font-weight: 500`) para devolversela solo al destino, o sea que el
  // elemento decia una cosa y el estilo la contraria. Quien manda es `.destino`.
  // El nombre va en su PROPIO span dentro de `.nom`, que es un flex de dos:
  // escudo y texto. Es lo que permite las tres cosas a la vez —escudo pegado al
  // texto, centrado contra el bloque entero y ninguna linea por debajo de el—,
  // y no se llego a ella razonando sino midiendo: con el escudo suelto dentro
  // del texto la caja del nombre mide siempre su `max-width` y el sobrante cae
  // en el lado de la alineacion, asi que en la columna de origen el escudo se
  // quedaba a 43px de media del texto. Con el texto en su propia caja, el hueco
  // es de 6px en los tres lados.
  // La competicion y la pastilla de cantera van FUERA de `.txt`, de hermanas.
  // Se probo meterlas dentro para que no se descolgaran a su propia linea —de
  // hermanas, cuando el nombre ocupa dos lineas, "(LFCh)" cae debajo del ESCUDO
  // en vez de seguir al nombre— y sale peor: `.txt` lleva `overflow-wrap:
  // anywhere` en estrecho, y al subir su contenido minimo empieza a partir
  // palabras por la mitad ("SANTFELIUEN / C", "CANT / ERA"). Un nombre partido
  // es peor que una etiqueta descolgada, asi que se queda como estaba.
  return `<span class="club-frase${donde}"><span class="nom">${escudo}<span class="txt">${esc(nombre)}</span></span>${donde2}</span>`;
};

/**
 * La flecha que une los dos clubes.
 *
 * SVG y no el caracter "→": el tipografico depende de la fuente que acabe
 * usando el sistema —cambia de grosor, de tamaño y de altura sobre la linea— y
 * aqui no es puntuacion, es el simbolo que cuenta la noticia. Dibujada se
 * controla, escala con el texto y toma el color del acento por `currentColor`.
 */
const FLECHA = `<svg class="flecha" viewBox="0 0 24 24" aria-hidden="true" data-trazo
  stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h16m0 0-6-6m6 6-6 6"/></svg>`;

/**
 * El movimiento contado como una frase, que es la columna que sustituye a las
 * tres de antes —Que, Club y Procedencia—.
 *
 * Con dos clubes se unen con una FLECHA en vez de con "procedente de": la
 * flecha ocupa un caracter, se entiende sin leerla y dice la direccion, que es
 * justo lo que el texto tardaba una linea en decir. Origen a la izquierda y
 * destino a la derecha SIEMPRE, tanto si la noticia la da el club que ficha
 * como el que pierde: lo que manda es hacia donde va la jugadora, no de quien
 * es la tarjeta. El tooltip lo dice con palabras, por si la flecha sola no
 * basta.
 *
 * Con un solo club se usa el verbo, porque una flecha con un extremo vacio no
 * significa nada: "Renueva por X", "Ficha por X", "Deja el X".
 *
 * "Deja el X" a secas solo le toca a las bajas que NO casan con ningun alta
 * nuestra: las que casan son derivadas y no llegan hasta aqui —las descarta el
 * filtro de la tabla— porque son el reverso de un fichaje que ya esta en la
 * lista, no una noticia aparte.
 */
const frase = (m) => {
  const esBaja = m.tipo === 'baja';
  const otroClub = esBaja ? (m.destino ?? m.vaA?.club) : (m.procedencia ?? m.vieneDe?.club);
  const resuelto = esBaja ? m.vaA?.club : m.vieneDe?.club;
  // El DESTINO en negrita: es la respuesta a "¿y ahora dónde juega?", que es a
  // lo que se viene. En un fichaje el destino es el club que da la noticia; en
  // una baja es el otro. Y cuando solo hay un club, ese: no hay con quien
  // compararlo, asi que no destacarlo solo lo dejaria mas flojo que sus vecinos.
  const suyo = clubEnFrase(m.equipo, m.equipo.club, esBaja && otroClub ? '' : ' destino');
  // El equipo se busca por el nombre que SE VA A ESCRIBIR, y solo si ese no
  // aparece se cae al resuelto. Estaba al reves y contaba dos cosas distintas en
  // la misma fila: `otroClub` ya prefiere la procedencia puesta a mano —que es la
  // que manda— pero `resuelto` sigue siendo la deducida del censo, asi que
  // cuando una persona corrige el origen se escribia el club nuevo con el ESCUDO
  // y la ficha del viejo.
  //
  // Paso con Laura Rey Gonzalez: corregida a Ciudad de Huelva, la fila seguia
  // enseñando Baloncesto Sevilla. La correccion parecia no haber hecho nada.
  //
  // El orden nuevo no rompe el caso normal: la procedencia es texto libre del
  // anuncio -"NBF Castello"- y cuando no casa con ningun club `equipoDelClub`
  // devuelve null y se usa el resuelto, que es para lo que estaba.
  //
  // Y NO se resuelve contra los nuestros cuando el origen es de OTRA LIGA. Hay
  // clubes con equipo en las dos —Maristas juega LF Challenge esta temporada y
  // jugaba LF2 la pasada— y buscar por el club a secas encuentra el de aqui: la
  // fila decia que Sofia Arcos venia de "Sparking Truth Maristas", el nombre del
  // equipo del que en realidad se acaba de ir su club. Mismo club, otra liga y
  // otro nombre; lo que hay que escribir es el de alli, con su competicion
  // detras. Lo pidio Luismi: «viene de Maristas Coruña (LF2), ese es su origen».
  //
  // Cual es "otra liga" lo decide el MOTOR, no esto: `ligaProcedencia` ya viene
  // vacia cuando la ficha es de esta misma liga en la temporada pasada —el censo
  // compartido tambien la incluye— y ahi el club SI es de los nuestros y tiene
  // que resolver con su escudo y su enlace, como cualquier otro.
  const deOtraLiga = !esBaja && (m.procedenciaDeOtraLiga || m.fichaDeOtraLiga)
    ? (m.ligaProcedencia ?? null) : null;
  const otroEquipo = otroClub && !deOtraLiga ? (equipoDelClub(otroClub) ?? equipoDelClub(resuelto)) : null;
  // La competicion del otro club solo se pinta si NO es de los nuestros: si lo
  // encontramos en el censo es que juega esta liga, y decirlo seria repetir el
  // titulo de la pagina en cada fila.
  // Y NO se dice la competicion del club de origen cuando la fichada viene de su
  // CANTERA: estaba en su junior, no en la liga en la que compite su primer
  // equipo. Poner "(LF CHALLENGE)" detras sugiere que jugaba ahi, que es
  // justo lo contrario de lo que cuenta el anuncio. En una baja no aplica: ahi
  // la liga es la del club al que se va, y va a su primer equipo.
  const deSuCantera = !esBaja && esCantera(m);
  // LA COMPETICION ES DE LA JUGADORA, NO DEL CLUB. Y el catalogo solo sabe de
  // clubes, asi que aqui no se le pregunta.
  //
  // Mandaba el catalogo, con este argumento escrito: «sale de la ficha
  // federativa del propio equipo, que es comprobable». No sale de ahi. Sale de
  // `visto[0].liga` del indice compartido de escudos, que es **que liga subio
  // ese escudo primero**. Que N1 tenga el escudo del CAB Estepona significa que
  // el club mete un equipo en N1; no dice nada de en cual jugaba la fichada.
  //
  // Lo pregunto Luismi con la fila delante —«¿por que piensas que el origen es
  // CAB Estepona (N1)?»—. El origen si era Estepona, y no de deduccion: lo dice
  // el anuncio con todas las letras, «llega procedente del CAB ESTEPONA». Lo que
  // no era de nadie era el «(N1)», y el propio post lo desmiente en la linea
  // siguiente: «varios ascensos a Liga Femenina Endesa, este ultimo con Cab
  // Estepona». Del equipo que subio a LF Endesa, nunca del de N1.
  //
  // Es el CLUB != EQUIPO de siempre, y no tiene arreglo por el lado del club:
  // Barakaldo, Leganes, Valencia, Joventut y Estepona meten equipo en dos
  // competiciones a la vez, asi que ningun dato de club puede contestar por cual
  // paso una persona. Solo lo saben las fuentes que miran a la PERSONA: la
  // licencia federativa (`justoAntes.categoria`), el cruce con el censo de otra
  // liga, o quien lo anoto a mano revisando.
  //
  // Precio medido: 38 filas se quedan sin etiqueta entre las dos ligas y 80 la
  // conservan. De las que se caen, las 5 de Estepona eran falsas y las de
  // Valencia, Joventut y Unicaja SD, un cara o cruz. No se publica lo que no es
  // fiable.
  //
  // El ESCUDO se le sigue pidiendo al catalogo, que para eso si es la fuente
  // buena: un escudo es del club, y ahi club y equipo no se contradicen.
  // El nombre ESTABLE del club, cuando el dato lo trae aparte: las bajas y las
  // procedencias que salen de la ficha federativa guardan los dos nombres.
  const clubEstable = esBaja ? m.clubDestino : m.clubProcedencia;
  const ligaOtro = otroEquipo || deSuCantera ? null
    : (esBaja ? m.ligaDestino : m.ligaProcedencia) ?? null;
  const otro = otroClub
    ? clubEnFrase(otroEquipo, otroClub, esBaja ? ' destino' : '', ligaOtro, clubEstable)
    : '';

  // Quien llega de la cantera de OTRO club no es canterana de este, asi que la
  // etiqueta va pegada al club de origen y no al nombre. Pegada al nombre decia
  // justo lo contrario de lo que pasaba.
  const deCantera = !esBaja && m.canteraEnOrigen === true ? '<span class="etq">cantera</span>' : '';

  // La duda del cruce no se pierde al desaparecer la columna de Procedencia:
  // vive donde faltaria el dato, que es al final de la frase. Es una marca de
  // TALLER —se poda al publicar— pero en local es donde se revisa.
  // Dos dudas distintas con la misma pastilla: la del CRUCE —no se de donde
  // viene— y la de la DETECCION —el texto se contradice y no se si esto es un
  // movimiento—. Para quien revisa es la misma tarea; el tooltip dice cual es.
  // A QUIEN SUBE DE LA CANTERA NO SE LE BUSCA ORIGEN, y por tanto tampoco se le
  // avisa de que el origen es dudoso: viene de casa. Es la misma regla que ya
  // aplica `faltaElOtroExtremo` en `web/revision.js` —«la cantera NO cuenta:
  // ahi la procedencia es el propio club y ya se dice»— y que aqui faltaba.
  //
  // El caso: Maria Isabel Alemany, canterana del CD Basico La Salle que sube al
  // N1. La fila ya dice «Sube al N1» y lleva su pastilla de cantera, y debajo
  // avisaba «procedencia: se parece a una del censo pero no encaja del todo:
  // CASTILLO DIAZ, MARIA (Amigos de Baloncesto Linares)». Esa candidata esta
  // construida con SUS PROPIOS trozos —CASTILLO es su segundo apellido y MARIA
  // parte de su nombre—, o sea que el aviso pedia revisar un origen que no
  // existe, con un parecido que sale de ella misma.
  //
  // Segunda vez hoy con la misma forma: antes fue el ambar de Lucia Gajete
  // diciendo «lo anuncia como fichaje pero ya figuraba en su plantilla», que
  // para una canterana que sube es lo normal y no una contradiccion.
  const deCasa = m.cantera === true || Boolean(m.procedeDeCantera);
  const porQueRevisar = m.dudaDeteccion
    ?? (!otro && !deCasa && m.origenDudoso
      ? (m.origenCandidatas?.length ? `${m.origenDudoso}: ${m.origenCandidatas.join(' · ')}` : m.origenDudoso)
      : null);
  const revisar = porQueRevisar
    ? `<span class="pill p-revisar" title="${esc(porQueRevisar)}">revisar</span>`
    : '';

  // Los trozos van envueltos en `lado` porque la celda los coloca en REJILLA
  // —izquierda, flecha, derecha— y una rejilla cuenta hijos: la pastilla de
  // cantera suelta al lado del club seria un cuarto hijo y descuadraria la
  // columna entera. Cada lado es uno, lleve lo que lleve dentro.
  // SUBIR NO ES FICHAR. Cuando la que llega al primer equipo es una junior del
  // propio club, "Ficha por X" cuenta mal lo que pasa: no ha cambiado de club,
  // ha cambiado de equipo dentro del mismo. Y es de lo mas frecuente en estas
  // categorias, donde media plantilla sale de la cantera de casa.
  //
  // Se reconoce por dos cosas a la vez: que este marcada como canterana y que
  // NO haya otro club en el movimiento. Lo segundo es lo que distingue a la de
  // casa de la que llega del junior de otro club —esa si es un fichaje, y su
  // etiqueta de cantera va pegada al club de ORIGEN, no al nombre—.
  //
  // "CANTERA" como procedencia es la misma situacion escrita a mano: se pone
  // cuando sube alguien del club y no hay censo donde encontrarla. Como club
  // daba "CANTERA -> CB EL PALO", que se lee como un traspaso entre entidades.
  const desdeSuCantera = String(otroClub ?? '').toUpperCase() === 'CANTERA';
  // `subeAlPrimerEquipo: false` es el caso raro que hay que poder decir: sigue
  // siendo canterana y NO sube a este equipo. Viladecans anuncio a cinco juniors
  // que "s'incorporen al Senior de 1a Catalana" —otro equipo del club—, y la
  // fila decia "Sube al LF2", que es sencillamente falso. `cantera: false` no
  // sirve para arreglarlo: apagaria tambien la etiqueta, y canterana lo es.
  // Renueva con el club; lo que no hace es subir aqui.
  const sube = m.subeAlPrimerEquipo !== false;
  // Y LA QUE YA ESTABA AQUI EL AÑO PASADO TAMPOCO SUBE (10-09-2026).
  //
  // El KB lo dice desde el 15-08: «la pastilla "Sube al X" solo con
  // `procedeDeCantera`; ni por identidad ("nuestra canterana") ni porque
  // ascienda el equipo». Esta condicion la pintaba justo por IDENTIDAD
  // —`esCantera(m)`, o sea "es canterana"—, que es lo que el KB prohibe.
  //
  // Lo canto Luismi con el post del ADBA Sanfer, que anuncia a ocho canteranas
  // que "estaran en dinamica del primer equipo" y termina, literalmente, con
  // «La cantera NO SUBE al primer equipo. La cantera FORMA el primer equipo»:
  // «eso NO son fichajes y nadie sube al primer equipo, van a entrenar y puede
  // que jugar, pero ya». Cinco de las ocho ya habian jugado la 25/26 en LF2, y
  // su fila decia "Sube al LF2".
  //
  // `venaDeLaPlantilla` es la respuesta y es un dato duro, no una heuristica:
  // el motor la puso porque la encontro en la plantilla del año pasado DE ESTE
  // MISMO CLUB, y por eso mismo reclasifico el movimiento a renovacion. Si ya
  // estaba, no sube: sigue. Es la decision de Andrea Outon, del 15-08, con la
  // unica diferencia de que ella tenia ficha y estas no —canteranas—; y la
  // ficha nunca fue lo que decidia, sino haber estado.
  //
  // Comprobado antes de tocar nada: de 79 filas con `venaDeLaPlantilla` que se
  // pueden cruzar contra la plantilla 25/26 de su club, las 79 estan. Cero
  // falsos.
  //
  // SOLO en renovaciones, y esto no es una cautela de adorno: un `alta` que
  // cayera de esta rama diria "Ficha por X", que para una canterana de la casa
  // es PEOR que decir que sube —afirma que llega de fuera—. Son 11 en las tres
  // ligas y siguen como estaban; que un alta traiga `venaDeLaPlantilla` es otra
  // cosa que arreglar, y no esta.
  const yaEstabaAqui = m.tipo === 'renovacion' && m.venaDeLaPlantilla === true;
  // Y la subida HACIA ARRIBA, que es la misma idea un piso mas alla: no sube de
  // la cantera a este equipo, sube de este equipo al de la categoria superior
  // del mismo club.
  //
  // Sigue siendo una RENOVACION y no una baja: renueva con el club, lo que
  // cambia es en que equipo suyo juega. Por eso solo se cambia la frase y no el
  // tipo -la pastilla sigue diciendo RENUEVA-, que es justo lo que ha pasado.
  if (m.subeA) {
    return {
      html: `<span class="sola"><span class="verbo">Sube al ${esc(m.subeA)}</span>${suyo}</span>`,
      pista: `Sigue en el club: pasa a su equipo de ${m.subeA}`,
    };
  }
  // La VINCULADA sube igual, aunque su ficha sea de otro club: es una subida, no
  // un fichaje. Quien lo dice es una persona en la revision; no hay forma de
  // deducirlo del anuncio, que la presenta como una mas.
  if (!esBaja && sube && (desdeSuCantera || m.vinculadaA || (!otroClub && esCantera(m) && !yaEstabaAqui))) {
    // Al primer equipo, y se dice a que categoria sube: es la informacion que
    // convierte "sube" en un dato. La etiqueta corta la pone cada liga.
    const categoria = d?.ligaEtiqueta ? ` al ${esc(d.ligaEtiqueta)}` : '';
    // La etiqueta solo si el nombre no la lleva ya. Cuando la lleva —que es lo
    // normal— repetirla deja la fila diciendo "cantera" dos veces en la misma
    // linea. Se queda para las que suben por marca a mano, donde el nombre no
    // la tiene porque no hay censo del que deducirla.
    const marca = esCantera(m) ? '' : '<span class="etq">cantera</span>';
    // Y de QUE club es la ficha, cuando no es de este. Sin decirlo, la fila de
    // una vinculada es indistinguible de la de una junior de casa.
    if (m.vinculadaA) {
      return {
        html: `<span class="sola"><span class="verbo">Sube${categoria}</span>${suyo}<span class="etq">vinculada · ${esc(m.vinculadaA)}</span></span>`,
        pista: `Tiene ficha del ${m.vinculadaA} y puede subir con este equipo`,
      };
    }
    return {
      html: `<span class="sola"><span class="verbo">Sube${categoria}</span>${suyo}${marca}</span>`,
      pista: 'Sube de la cantera del propio club al primer equipo',
    };
  }
  if (m.tipo === 'renovacion') {
    return { html: `<span class="sola"><span class="verbo">Renueva por</span>${suyo}</span>`, pista: '' };
  }
  if (!otro) {
    // "Deja" y no "Deja el": el articulo tendria que concordar con el nombre del
    // club, y estos van en los dos generos —el CB Ciudad de Moguer, la SD
    // Candray—. Un articulo fijo se equivoca en la mitad de las filas, y es el
    // mismo tropiezo que "Altas anunciados". Los otros dos verbos no lo tienen
    // porque llevan preposicion: "Ficha por", "Renueva por".
    // Quien se RETIRA no deja el club por otro: deja de jugar. Es la unica baja
    // en la que "no sabemos a donde va" no es un hueco sino la respuesta, y por
    // eso se dice con todas las letras en vez de dejarla como una baja a medias.
    // Lo marca una persona en la revision; no hay forma de deducirlo.
    if (esBaja && m.retirada) {
      return {
        html: `<span class="sola"><span class="verbo">Se retira</span>${suyo}${revisar}</span>`,
        pista: 'Deja el baloncesto en activo',
      };
    }
    // Y el simetrico por el otro lado: la que VUELVE no llega de otro club, sino
    // de un tiempo sin jugar —un Erasmus, una lesion larga, una maternidad—. Con
    // el verbo normal la fila decia "Ficha por" y debajo pedia una procedencia
    // que no existe; asi dice lo que pasa y deja de pedirla. Igual que "Se
    // retira", lo marca una persona: el anuncio de una que vuelve se parece al
    // de cualquier fichaje.
    if (m.tipo === 'alta' && m.regresa && !otroClub) {
      return {
        html: `<span class="sola"><span class="verbo">Regresa a</span>${suyo}${revisar}</span>`,
        pista: 'Vuelve tras un tiempo sin jugar; no llega de otro club',
      };
    }
    const verbo = esBaja ? 'Deja' : 'Ficha por';
    return { html: `<span class="sola"><span class="verbo">${verbo}</span>${suyo}${revisar}</span>`, pista: '' };
  }
  const [origen, destino] = esBaja ? [suyo, otro] : [`${otro}${deCantera}`, suyo];
  const [de, a] = esBaja
    ? [L.equipo.nombre(m.equipo), otroClub]
    : [otroClub, L.equipo.nombre(m.equipo)];
  return {
    // La pastilla va DENTRO del lado derecho, no suelta: la celda es una rejilla
    // de tres y un cuarto hijo le descuadra las columnas a esa fila.
    html: `<span class="lado izq">${origen}</span>${FLECHA}<span class="lado dcha">${destino}${revisar}</span>`,
    pista: `Deja ${de} y ficha por ${a}`,
  };
};


// Solo se pinta el AMBAR. El verde era el estado por defecto -"fiable"- y salia
// en casi todas las filas, o sea que no decia nada: un punto que esta siempre
// deja de leerse, y de paso tapaba al que si informa. Ahora la ausencia de punto
// es "todo bien", que es lo normal, y el punto significa "mira esto".
const semaforo = (m) => {
  const motivo = revisar(m);
  return motivo ? `<span class="semaforo s-ambar" title="${esc(motivo)}"></span>` : '';
};

// Canterana: o lo dice el censo federativo, o lo dice el propio anuncio ("en su
// ultimo año de junior"). Lo segundo se detectaba desde siempre en
// `procedeDeCantera` pero no se pintaba, asi que quien subia del junior con el
// club escrito salia sin la etiqueta.
// Donde el censo ES la lista de licencias de la categoria, `cantera` vale
// siempre false y esto se queda con la segunda mitad. No es un caso especial: es
// el mismo codigo con un censo que no distingue.
const esCantera = (m) => m.cantera === true || Boolean(m.procedeDeCantera);

/**
 * Cual de dos anuncios del MISMO DIA se publico antes.
 *
 * La fecha se guarda sin hora, asi que sin esto el orden dentro de un dia es el
 * que traiga el archivo. El identificador de cada red ya lleva la hora dentro:
 * los ids de X son snowflakes crecientes —de ahi que baste comparar el numero— y
 * los codigos de Instagram son un contador en base64url, cuyo alfabeto NO es el
 * orden ASCII: alli van primero los digitos y aqui van los ultimos.
 *
 * Solo se comparan codigos de la MISMA red. Un shortcode de Instagram y un id de
 * X no viven en la misma escala y compararlos seria inventarse un orden.
 * Devuelve <0 si `a` es anterior.
 */
const ALFABETO_IG = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const codigoDe = (m, red) => {
  const f = (m.fuentes ?? [m.fuente]).find((x) => x?.red === red && x.url);
  if (!f) return null;
  return red === 'x'
    ? (String(f.url).match(/status\/(\d+)/)?.[1] ?? null)
    : (String(f.url).match(/\/p\/([^/]+)/)?.[1] ?? null);
};
const enElMismoDia = (a, b) => {
  for (const red of ['x', 'instagram']) {
    const ka = codigoDe(a, red);
    const kb = codigoDe(b, red);
    if (!ka || !kb || ka === kb) continue;
    // Numeros de distinta longitud: manda la longitud (10 < 9999).
    if (ka.length !== kb.length) return ka.length - kb.length;
    if (red === 'x') return ka < kb ? -1 : 1;
    for (let i = 0; i < ka.length; i += 1) {
      const d = ALFABETO_IG.indexOf(ka[i]) - ALFABETO_IG.indexOf(kb[i]);
      if (d) return d;
    }
  }
  return 0;
};

const celdas = (columnas, j) => columnas
  .map((c) => `<td${c.clase ? ` class="${c.clase}"` : ''}>${c.celda(j)}</td>`).join('');
const cabeceras = (columnas) => columnas
  .map((c) => `<th${c.clase ? ` class="${c.clase}"` : ''}>${esc(c.th ?? '')}</th>`).join('');

// Las filas van en el orden en que la federacion lista la plantilla y no se
// reordenan: inventar un orden alfabetico haria que la tabla no se pareciera a la
// ficha oficial, que es contra lo que se compara a mano.
//
// Que columnas hay lo dice cada liga (`filaDePlantilla` del CONTRATO): la FEB
// entrega altura, nacionalidad y nacimiento y la FAB partidos, puntos y minutos.
// Lo que falta simplemente no se escribe: una columna vacia en 200 filas es una
// tabla rota, y llenarla de guiones es peor porque el guion parece un dato.
const tablaPlantilla = (e) => {
  const antes = L.plantilla?.antes ?? [];
  const despues = L.plantilla?.despues ?? [];
  const columnas = antes.length + despues.length + 4;

  const fila = (j) => {
    const ficha = L.plantilla?.ficha?.(j);
    // El nombre enlaza a su ficha en la federacion, si la liga sabe construirla.
    // `enlace` y no `ficha`, que ya estaba cogido por la linea de datos de
    // debajo -dorsal, puesto, altura- y son dos cosas distintas.
    const url = L.plantilla?.enlace?.(j, e);
    const conEnlace = (txt) => (url
      ? `<a class="a-federacion" href="${esc(url)}" target="_blank" rel="noopener" title="Ficha en la federación">${txt}</a>`
      : txt);
    // Una sola pregunta para las tres vistas: `motivoDeRevision`.
    //
    // Habia DOS criterios conviviendo. El punto ambar y la vista de Revision
    // preguntaban por `revisar()`; el TINTE de la fila miraba cuatro banderas a
    // mano —ambiguo, ambiguoNombre, origenDudoso, dudaDeteccion— que no son lo
    // mismo: dejan fuera la "señal debil", que es la duda mas comun. Medido en
    // LF2: 5 filas tintadas contra 18 con punto, o sea 13 que se leian distinto
    // segun donde miraras. Cristina Loureiro era una de ellas.
    const duda = j.movimiento ? motivoDeRevision(j.movimiento) : null;
    const clase = j.movimiento
      ? (duda ? ' class="dudoso"' : '')
      : ' class="sin-noticia"';
    return `<tr${clase}>
    ${celdas(antes, j)}
    <td class="jug"><span class="jugadora">${retrato(j, faldonCantera(j.cantera === true))}<span class="nombre">${conEnlace(esc(nombrePersona(j.jugadora)))}${canteraJuntoAlNombre(j.cantera === true)}
      ${duda ? `<small class="aclara">${esc(duda)}</small>` : ''}${ficha ? `<small class="ficha">${ficha}</small>` : ''}${movimientosDeLaFila(j).map(fuentesBajoNombre).join('')}</span></span></td>
    ${celdas(despues, j)}
    <td>${pastillasDeLaFila(j)}</td>
    ${celdasAnuncio(...movimientosDeLaFila(j))}
  </tr>`;
  };

  // Con ficha arriba y canteranas debajo, en la MISMA tabla y separadas por una
  // fila de titulo. Son dos cosas distintas —una tenia licencia del equipo y la
  // otra subia con la de su categoria— y mezcladas se leian como una plantilla
  // de veinte jugadoras que ningun club tiene. Separarlas en dos tablas era
  // peor: las columnas dejarian de alinearse y se lee peor de un vistazo.
  //
  // Donde la federacion no distingue las dos cosas no hay `cantera === true` en
  // ninguna fila, el segundo grupo sale vacio y la tabla queda como siempre.
  const conFicha = e.plantilla.filter((j) => j.cantera !== true);
  const deCantera = e.plantilla.filter((j) => j.cantera === true);

  // El aviso de "aqui no queda nadie" va FUERA de la tabla, no como una fila
  // mas: dentro no se podria esconder el <thead>, y con el filtro puesto la
  // plantilla de un club sin un solo anuncio se quedaba en una cabecera de
  // columnas flotando sobre nada. Quien lo enseña y quien esconde la tabla es el
  // CSS, porque el filtro tambien es CSS y aqui no se sabe si esta puesto.
  return `
<div class="scroll"><table>
  <thead><tr>${cabeceras(antes)}<th class="jug">Jugadora</th>${cabeceras(despues)}<th>Estado</th><th class="anuncio">Anuncio</th><th class="col-fuente"></th></tr></thead>
  <tbody>${conFicha.map(fila).join('')}${deCantera.length ? `
    <tr class="grupo-filas"><td colspan="${columnas}">Canteranas · jugaron sin ficha del equipo</td></tr>
    ${deCantera.map(fila).join('')}` : ''}</tbody>
</table></div>
<div class="vacio caja-nota nadie-con-anuncio"><b>Ninguna con anuncio todavía.</b>
  De las ${e.plantilla.length} de la plantilla no se ha leído nada aún.</div>`;
};

// El nombre tal y como lo escribe el club, no el del censo federativo: la ficha
// de "Mila Fernandez" pone FERNANDEZ LOPEZ, MARIA DE LOS MILAGROS, y en la tabla
// de movimientos manda como la llaman.
// El censo entra solo si lo citado viene en minusculas, que es como lo deja el
// emparejador cuando reconocio a la jugadora dentro de su propio club.
const comoLaLlamaElClub = (m) => {
  // Una correccion a mano gana a todo: es alguien que ha mirado como se escribe
  // de verdad ese nombre. Viaja en su propio campo porque `citadoComo` es la
  // clave con la que se reconoce a la misma jugadora en dos publicaciones.
  if (m.nombreCorregido) return m.nombreCorregido;
  const citado = m.citadoComo;
  if (citado && /[A-ZÁÉÍÓÚÑ]/.test(citado)) return citado;
  return m.jugadora ?? citado ?? '¿?';
};

/**
 * El texto contra el que busca el buscador de la tabla.
 *
 * Se calcula al PINTAR y viaja en `data-buscar`, no se saca del HTML de la fila
 * al teclear. Dos razones, y la segunda es la de peso:
 *
 *  1. Leer `textContent` de 200 filas en cada pulsacion es trabajo repetido para
 *     un dato que no cambia mientras la tabla siga siendo la misma.
 *  2. El texto pintado no es el dato. La fila enseña el nombre del EQUIPO —«Sparking
 *     Truth Maristas»— y quien busca puede teclear el del club —«Maristas Coruña»—,
 *     o al reves. Buscar por lo que se ve deja fuera la mitad de los nombres que
 *     una persona tiene en la cabeza para el mismo club.
 *
 * Entran los tres que pidio Luismi —jugadora, origen y destino— y de cada club
 * TODOS sus nombres: clave, etiqueta federativa y etiqueta corta. Es el mismo
 * problema de CLUB != EQUIPO que ya obligo a indexar `equipoDelClub` por nombre.
 *
 * Origen y destino son la misma pareja mirada desde los dos lados: en un alta el
 * equipo que da la noticia es el destino y el otro club el origen; en una baja,
 * al reves. Se meten los dos sin distinguir cual es cual, porque quien teclea
 * «Cortegada» quiere las filas donde aparezca Cortegada, no un lado concreto.
 *
 * DE LA JUGADORA, SOLO EL NOMBRE QUE SE PINTA. Y esta es la excepcion a todo lo
 * de arriba, a proposito.
 *
 * Llevaba tambien el de la ficha federativa, que suele traer los dos apellidos, y
 * eso daba coincidencias que la fila no podia explicar: buscar «valen» sacaba a
 * «María Sánchez» —es Maria Sanchez VALENZUELA— sin nada en pantalla que lo
 * justificara. Lo canto Luismi: «o en la celda ponemos el nombre completo o
 * tecleando valen no mostramos ese resultado, pero ahora mismo no tiene sentido».
 *
 * De las dos salidas se toma la segunda, y lo que decide es el dato: en N1 la
 * ficha federativa guarda «RAMOS BOLAÑOS, GEMMA» —apellidos delante y con coma—,
 * asi que enseñarla en la celda no es una opcion. Ademas el nombre que se pinta
 * es el que eligio el club y eso esta decidido en `comoLaLlamaElClub`.
 *
 * Precio medido: de 408 filas en LF2 hay 41 con apellido de mas en la ficha —34
 * de 361 en LFCh, 11 de 159 en N1—. Esas dejan de encontrarse por el apellido que
 * NO sale en ningun sitio de la web, que es un apellido que nadie tiene motivo
 * para teclear aqui.
 *
 * Los clubes SI conservan todos sus nombres, y no es incoherente: el nombre del
 * club sale en la web —en pequeño encima del equipo, en las tarjetas— y ademas
 * casi siempre comparte palabras con el del equipo. El apellido de mas no salia
 * en ninguna parte.
 */
const claveDeBusqueda = (m) => {
  const esBaja = m.tipo === 'baja';
  const otroClub = esBaja ? (m.destino ?? m.vaA?.club) : (m.procedencia ?? m.vieneDe?.club);
  const nombresDe = (e) => (e
    ? [L.equipo?.nombre?.(e), e.club, e.etiquetaFEB, e.etiquetaFAB, e.etiquetaCorta]
    : []);
  return norm([
    nombrePersona(comoLaLlamaElClub(m)),
    ...nombresDe(m.equipo),
    otroClub, esBaja ? m.clubDestino : m.clubProcedencia,
    ...nombresDe(otroClub ? equipoDelClub(otroClub) : null),
  ].filter(Boolean).join(' · '));
};

// De donde viene si es un alta, adonde va si es una baja: es la misma columna
// porque es la misma pregunta —el otro club del movimiento— y desdoblarla dejaba
// una de las dos siempre vacia.
//
// Manda lo que dijo el anuncio y no el cruce contra el censo: el club sabe de
// donde viene su fichaje mejor que nosotros, y ademas lo escribe como lo conoce
// su gente ("Mariscos Antón Cortegada" y no "A.D. CORTEGADA"). El censo entra
// cuando el anuncio no dijo nada, que es justo para lo que se cruza.
// Indice club -> equipo, para poder llamar a las cosas como se llaman.
//
// CLUB y EQUIPO no son lo mismo: el club es la entidad federada —A.D.
// CORTEGADA— y el equipo es lo que inscribe en la competicion, con el nombre
// del patrocinador delante —MARISCOS ANTON CORTEGADA—. En toda la pagina manda
// el del EQUIPO, que es como se le conoce; el del club sale en pequeño encima.
//
// La temporada en curso va primero por si un club cambio de patrocinador: el
// nombre que manda es el de la que se esta mirando. Y detras las demas, que es
// donde viven los salientes —El Plantel, Maristas— de los que tambien se ficha.
//
// Se rehace al cambiar de temporada porque el orden de arriba depende de cual
// sea la actual.
// Y SE BUSCA TAMBIEN POR EL NOMBRE QUE LA PAGINA ENSEÑA, no solo por la clave.
//
// Esto era un `Map.get` exacto contra `e.club`, o sea contra la clave —que es el
// nombre de la INSTITUCION: «CD JEREZ F.S.2014», «ASOC. CULTURAL Y DEPORTIVA EL
// TOYO-RETAMAR»—. Pero lo que la pagina PINTA es la etiqueta: «XEREZ CLUB
// DEPORTIVO», «EL TOYO». Asi que quien corrige una procedencia a mano copia lo
// que ve, escribe «EL TOYO»… y deja de resolver: la fila sale con el nombre en
// texto pelado, sin escudo y sin enlace, teniendo el club en nuestros datos.
//
// Medido en N1 el 19-08: 11 de 66 procedencias publicadas. Cuatro clubes, y los
// cuatro escritos con su etiqueta corta —la de la propia web—.
//
// El arreglo es aceptar de entrada lo mismo que se saca por pantalla. Es
// aditivo: lo que resolvia por clave sigue resolviendo por clave, y la clave
// sigue siendo la clave —no se renombra nada, que es el fallo de CLUB != EQUIPO
// y huerfana filas sin dar error—.
//
// El segundo indice se consulta SOLO si el primero falla, para que una etiqueta
// repetida no le quite nunca el sitio a una clave buena.
const claveDeNombre = (s) => String(s ?? '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
let indiceClubes = { id: null, mapa: null, porNombre: null };
const equipoDelClub = (club) => {
  if (indiceClubes.id !== t.id) {
    const mapa = new Map();
    const porNombre = new Map();
    for (const temp of [t, ...d.temporadas]) {
      for (const e of temp.equipos) {
        if (!mapa.has(e.club)) mapa.set(e.club, e);
        // Las DOS etiquetas de federacion, no solo la de la FAB. Este indice nacio
        // en N1 y listaba `etiquetaFAB`; en LF2 y LFCh el campo se llama
        // `etiquetaFEB` y sin el el arreglo no hacia casi nada alli: medido el
        // 19-08, recuperaba 1 de 41 filas en LF2 (9 de 9 en LFCh, que caian por
        // `etiquetaCorta`). Con las dos, 41 y 9.
        //
        // Van las dos a pelo, y no `L.equipo.nombre(e)`, porque el vocabulario
        // devuelve el nombre ELEGIDO y aqui hacen falta todos los candidatos: un
        // club con `etiquetaCorta` -MAGEC TIAS- dejaria su etiqueta larga fuera,
        // y esa es justo con la que estaba escrita la procedencia.
        //
        // Comprobado antes de ampliar: 0 choques de nombre en las tres ligas
        // (65, 25 y 56 nombres indexados). Un nombre nunca apunta a otro club.
        for (const n of [e.club, e.etiquetaFAB, e.etiquetaFEB, e.etiquetaCorta]) {
          const k = claveDeNombre(n);
          if (k && !porNombre.has(k)) porNombre.set(k, e);
        }
      }
    }
    indiceClubes = { id: t.id, mapa, porNombre };
  }
  return indiceClubes.mapa.get(club)
    ?? (club ? indiceClubes.porNombre.get(claveDeNombre(club)) : undefined);
};

const clubDelMovimiento = (m) => {
  const esBaja = m.tipo === 'baja';
  const [texto, pista] = esBaja
    ? [m.destino ?? m.vaA?.club, 'Se va a']
    : [m.procedencia ?? m.vieneDe?.club, 'Viene de'];

  // Sin procedencia hay DOS situaciones que no son la misma, y con un guion
  // para las dos no habia forma de distinguirlas mirando la pagina:
  //
  //   - llega de fuera de la categoria: no hay a quien cruzarla y no falta
  //     nada por decidir. Solo falta que alguien escriba de donde viene.
  //   - el cruce DUDO: habia candidatas en el censo y no se atrevio a elegir.
  //     Eso pide un par de ojos, y calladito se queda ahi para siempre.
  //
  // La segunda se pinta como lo que es: una tarea pendiente, en su sitio.
  if (!texto) {
    if (!m.origenDudoso) return '—';
    // Las candidatas, UNA POR LINEA y con lo que las distingue. El nombre solo
    // no sirve para buscar y en el caso que motivo esto era inutil del todo:
    // las dos se llaman PAULA GARCIA GARCIA. Lo que separa a una de otra es el
    // club del que viene y su numero de ficha, que ademas es por donde se busca
    // en la web de la federacion.
    const lista = (m.origenCandidatas ?? []).map((c) => {
      if (typeof c === 'string') return c;
      const donde = [c.club, c.ficha ? `ficha ${c.ficha}` : null].filter(Boolean).join(' · ');
      return donde ? `${c.nombre} — ${donde}` : c.nombre;
    });
    const detalle = lista.length ? `${m.origenDudoso}:\n${lista.join('\n')}` : m.origenDudoso;
    return `<span class="pill p-revisar" title="${esc(detalle)}">revisar</span>`;
  }

  // Lo que se pinta es el nombre del EQUIPO siempre que sepamos de quien
  // hablamos. Antes salia lo primero que hubiera y las dos cosas se mezclaban en
  // la misma columna: "EL PLANTEL GMASB" (equipo) al lado de "AGRUPACION
  // DEPORTIVA BALONCESTO AVILES" (club), que es el mismo tipo de dato escrito de
  // dos maneras. Pasaba porque el texto libre del anuncio gana, y cuando no lo
  // hay se cae al nombre canonico del club.
  //
  // Se busca por el club RESUELTO —el del enlace entre movimientos, que es un
  // dato nuestro y no una frase— y si no lo hay, por lo que diga el anuncio, que
  // a veces ya trae el nombre del club. Si no cae ninguno, se respeta el texto:
  // se ficha constantemente de fuera de la categoria y de fuera de España, y
  // ahi lo que escribio el club es todo lo que tenemos.
  const resuelto = esBaja ? m.vaA?.club : m.vieneDe?.club;
  const equipo = equipoDelClub(resuelto) ?? equipoDelClub(texto);
  const nombre = equipo ? L.equipo.nombre(equipo) : texto;
  // El club no se pierde: va al tooltip cuando no es el nombre que se pinta.
  const detalle = equipo && equipo.club !== nombre ? `${nombre} (${equipo.club})` : nombre;

  // La etiqueta de cantera, CUANDO HABLA DEL ORIGEN, va aqui y no junto al
  // nombre: quien llega de la cantera de otro club no es canterana de este.
  // Pegada al nombre decia justo lo contrario de lo que pasaba.
  const deCantera = !esBaja && m.canteraEnOrigen === true
    ? '<span class="etq">cantera</span>' : '';

  // Con ESCUDO, igual que en la cronologia. Lo pidio Luismi y tiene razon: los
  // escudos ya estaban bajados y resueltos —esta columna los usa para nada—, y
  // el mismo club salia con escudo en una vista y en texto pelado en la otra.
  // Se pinta con el mismo ayudante, no con una copia del <img>.
  const fichero = equipo ? L.equipo.escudo?.(equipo)
    : fichaDeFuera(texto, esBaja ? m.clubDestino : m.clubProcedencia)?.escudo;

  // Sin <b>: el club de origen es CONTEXTO, no el sujeto. En negrita pesaba mas
  // que el nombre de la jugadora, que es de quien habla la fila, y la vista
  // leia primero el equipo. Quien manda va en `.nombre`.
  // La pastilla va DENTRO de `.txt`, no detras de `.club-proc`.
  //
  // Fuera era hermana de un `inline-flex` que empieza por el escudo, asi que al
  // no caber se iba a la linea siguiente y aterrizaba DEBAJO DEL ESCUDO, separada
  // del nombre al que acompaña. Dentro del texto fluye como una palabra mas: si
  // baja de linea, baja alineada con el nombre. Lo vio Luismi en Candela Tinoco.
  return `<span class="club-proc" title="${esc(pista)} ${esc(detalle)}">${escudito(fichero)}<span class="txt">${esc(nombre)}${deCantera}</span></span>`;
};

const fotoAnuncio = (m, faldon = '') => {
  // MANDA EL CARTEL DEL ANUNCIO; el retrato de la ficha es la RESERVA.
  //
  // Lo fijo Luismi, y de paso corrigio como estaba: *«si tenemos el cartel del
  // movimiento genial, si no, pues tenemos la de la FEB o en este caso el
  // snapshot. Pensaba que lo habia formulado asi en LF2»*.
  //
  // Estaba al reves —el retrato ganaba siempre— y el argumento de entonces era
  // bueno pero incompleto: si, el retrato dice QUIEN ES y no como la vistio el
  // club que la anuncia. Pero el cartel dice mas cosas sobre ESTE movimiento:
  // lo diseña el propio club, y en muchos aparece con la camiseta de su club
  // ANTERIOR, que es hoy la pista de procedencia mas fiable que tenemos —los
  // textos describen como juega, no de donde llega—.
  //
  // Asi que el orden es: lo que ilustra ESTE movimiento primero, y quien es ella
  // cuando eso falta. El retrato no caduca, y por eso es la reserva perfecta:
  // el dia que una URL firmada muera, la fila no se queda sin cara.
  //
  // Medido al invertirlo: en N1 cambian 4 filas y en LF2 y LFCh las que tenian
  // las dos. Ninguna se queda sin foto — solo cambia cual se ve.
  const marca = insignia(semaforo(m));
  // Manda la copia local sobre la del CDN: esa va firmada y caduca sola en unos
  // dias; si falla se quita sola y queda el nombre, que es lo que importa.
  // El cartel manda, PERO solo la copia local, que es la que sabemos que existe.
  //
  // La del CDN va firmada y caduca sola en unos dias, y una URL muerta gana
  // igual: `src` sale no vacio, el retrato no llega a consultarse y el navegador
  // se come un 403 —con `onerror` la imagen se quita y queda el monigote gris—.
  // O sea que el cartel muerto TAPA al retrato bueno, que es justo lo que se
  // acababa de arreglar: medido, 41 movimientos de LFCh y 0 de LF2, y son los
  // mismos que se rescataron por ficha el 13-08.
  //
  // Orden, entonces: la copia local del cartel -ilustra ESTE movimiento-, el
  // retrato de su ficha -no caduca- y la url remota como ultimo recurso, que
  // para quien no tiene ficha es la unica que hay.
  const local = m.imagenLocal ? `./datos/anuncios/${m.imagenLocal}` : '';
  const suyo = local ? null : L.fotoDelMovimiento?.(m);
  if (suyo) return cajaFoto(suyo, marca, faldon);
  const src = local || (m.imagen ?? '');
  // Sin foto se pinta la caja vacia igual, y no nada: la insignia es el semaforo
  // y tiene que verse SIEMPRE. Antes vivia en su propia columna y daba igual que
  // la fila tuviera imagen o no; al mudarlo a la esquina, devolver '' aqui
  // dejaba sin señal justo a las filas que menos sabemos.
  if (!src) return cajaFoto(null, marca, faldon);
  // La MISMA caja que la plantilla, envuelta en el enlace al anuncio.
  //
  // Antes esto pintaba un <img> suelto con `onerror="this.closest('a').remove()"`,
  // y ese borrado se llevaba la fila entera por delante: si la imagen no cargaba
  // —una URL del CDN caducada, que es lo normal en cuanto pasan unos dias— no
  // quedaba silueta NI semaforo, solo un hueco. Justo en las filas de las que
  // menos sabemos, que son las que mas necesitan la señal.
  //
  // `cajaFoto` ya resuelve eso apilando silueta e imagen en la misma celda: si
  // la imagen se cae, se quita ella sola y debajo estaba el monigote. Es lo que
  // hace Equipos desde siempre y no habia razon para que la cronologia lo
  // hiciera de otra manera.
  return `<a class="foto-anuncio" href="${esc((m.fuentes?.[0] ?? m.fuente)?.url ?? m.imagen)}" target="_blank" rel="noopener" title="Ver el anuncio">${cajaFoto(src, marca, faldon)}</a>`;
};

// Lo que se anuncia y NO se ve ya en la plantilla. Una renovacion o una baja de
// alguien del censo sale como pastilla en su propia fila, asi que repetirla aqui
// seria decir lo mismo dos veces. Pero de los equipos que llegan de fuera de la
// categoria no hay plantilla en la que apoyarse: si esta tabla solo listara
// altas, una baja suya no se veria en ninguna parte.
const movimientosSueltos = (e) => {
  const yaEnPlantilla = new Set(e.plantilla.filter((j) => j.movimiento).map((j) => norm(j.jugadora)));
  return [...e.altas, ...e.renovaciones, ...e.bajas]
    .filter((m) => !m.jugadora || !yaEnPlantilla.has(norm(m.jugadora)))
    .sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')));
};

// Los tipos distintos que hay en la tabla. Cuando solo hay uno, la columna
// "Que" repite la misma pastilla en todas las filas y el titulo puede decirlo
// una vez. En la practica es SIEMPRE altas —las renovaciones y las bajas son de
// jugadoras que ya tienen fila en la plantilla y se ven alli, asi que aqui solo
// caen las que llegan de fuera— pero no se da por hecho: el dia que aparezca
// una baja de alguien sin ficha, la columna y el titulo vuelven solos.

// La frase ENTERA y no solo el plural: "Altas" es femenino y "Movimientos"
// masculino, asi que pegarle " anunciados" a lo que salga daba "Altas
// anunciados". El titulo se lee en la pagina y tiene que estar bien escrito.
const TITULO = {
  alta: 'Fichajes anunciados',
  baja: 'Bajas anunciadas',
  renovacion: 'Renovaciones anunciadas',
};

// El orden en que se leen: quien llega, quien se queda, quien se va.
const ORDEN_DE_TIPOS = ['alta', 'renovacion', 'baja'];

/**
 * Una tabla POR TIPO, cada una con su titulo, en vez de una mezclada.
 *
 * Antes: si un club solo tenia altas, la tabla se titulaba "Altas anunciadas" y
 * no hacia falta decir de que tipo era cada fila; si tenia altas Y renovaciones,
 * pasaba a "Movimientos anunciados" y aparecia una columna "Que" con la pastilla
 * en cada fila. O sea que el ancho de la tabla dependia de la mezcla, y la
 * columna de Procedencia salia estrecha justo en los clubes con mas que contar.
 *
 * Partiendo por tipo, la columna "Que" no hace falta NUNCA —el titulo ya lo
 * dice, una vez, en vez de repetirlo fila a fila— y todas las tarjetas tienen la
 * misma tabla. Lo propuso Luismi para no tener que ensanchar Procedencia con casos
 * particulares, y de paso quita la unica pastilla que era pura redundancia.
 *
 * Y una vez separadas se ve la segunda: la tabla de RENOVACIONES no lleva
 * columna de Procedencia. No es que suela venir vacia — es que **en una
 * renovacion la procedencia es, por definicion, el mismo equipo**, asi que la
 * pregunta no existe. Se comprobo igualmente antes de quitarla, por si tapaba
 * un fallo de deteccion: 0 de 184 renovaciones entre LF2 y N1 traian alguna.
 * Una columna que solo puede decir "—" no es un hueco, es una pregunta mal
 * hecha.
 */
const bloquesDeMovimientos = (movs) => ORDEN_DE_TIPOS
  .filter((tipo) => movs.some((m) => m.tipo === tipo))
  .map((tipo) => `<div class="bloque">
      <div class="titulo-bloque"><h4>${TITULO[tipo]}</h4></div>
      ${tablaMovimientos(movs.filter((m) => m.tipo === tipo), tipo)}</div>`)
  .join('');

const tablaMovimientos = (movs, tipo) => {
  const conProcedencia = tipo !== 'renovacion';
  // Y EN LAS BAJAS ESA COLUMNA NO ES LA PROCEDENCIA: es el DESTINO.
  //
  // La cabecera decia «Procedencia» en las tres tablas mientras la celda ya
  // pintaba lo correcto —`clubDelMovimiento` mira `m.destino` cuando es baja—,
  // asi que la columna llevaba el nombre de la pregunta contraria. En una baja
  // la procedencia es el propio club, igual que en una renovacion: la pregunta
  // no existe.
  //
  // Lo dijo Luismi cerrando Maristas: «en las Bajas anunciadas no deberiamos
  // tener columna de procedencia». Se renombra en vez de quitarla porque el dato
  // que hay debajo SI vale y es de los que mas se cuidan: 40 bajas de LF2 y 27 de
  // LFCh dicen adonde va la jugadora, y de las que no, el hueco es justo lo que
  // pide la vista de revision. Quitando la columna se perderian las dos cosas.
  const cabecera = tipo === 'baja' ? 'Destino' : 'Procedencia';
  return `
<div class="scroll"><table>
  <thead><tr><th class="jug">Jugadora</th>${conProcedencia ? `<th class="proc-cab">${cabecera}</th>` : ''}<th class="anuncio">Anuncio</th><th class="col-fuente"></th></tr></thead>
  <tbody>${movs.map((m) => `<tr${motivoDeRevision(m) ? ' class="dudoso"' : ''}>
    <td class="jug"><span class="jugadora">${fotoAnuncio(m, faldonCantera(esCantera(m)))}<span class="nombre">${esc(nombrePersona(comoLaLlamaElClub(m)))}${canteraJuntoAlNombre(esCantera(m))}
      ${revisar(m) ? `<small class="aclara">${esc(revisar(m))}</small>` : ''}${fuentesBajoNombre({ fecha: m.fecha, url: m.fuente?.url, red: m.fuente?.red, fuentes: m.fuentes })}</span></span></td>
    ${conProcedencia ? `<td class="proc">${clubDelMovimiento(m)}</td>` : ''}
    ${celdasAnuncio({ fecha: m.fecha, url: m.fuente?.url, red: m.fuente?.red, fuentes: m.fuentes })}
  </tr>`).join('')}</tbody>
</table></div>`;
};

// Los que llegan de fuera de la categoria no tienen plantilla con la que
// comparar: se listan igual y se dice por que, en vez de mostrar una tabla vacia
// sin explicacion. El motivo exacto que anoto el registro va en el title; el
// texto visible no lo repite porque hoy todos dicen lo mismo.
const avisoSinPlantilla = (e) => `<div class="vacio caja-nota"${e.motivoSinPlantilla ? ` title="${esc(e.motivoSinPlantilla)}"` : ''}>
  <b>Sin plantilla previa.</b> No jugó ${esc(L.etiqueta)} en ${esc(d.temporadas[0].id)}, así que no está en el
  censo de la categoría y no hay nada con lo que comparar. Su ficha se irá llenando
  solo con lo que anuncie.</div>`;

// Un club que mete dos equipos y los anuncia por la MISMA cuenta. No se puede
// resolver por nombre —los dos equipos se llaman igual— asi que se avisa en la
// propia tarjeta y lo dudoso se decide a mano. Cada liga puede decir cual es ese
// otro equipo; si no lo dice, se avisa igual sin nombrarlo.
const NOTA_CUENTA_COMPARTIDA = 'Este club también tiene otro equipo y lo anuncia todo desde la misma cuenta: un movimiento de aquí abajo puede ser de ese otro equipo. Lo dudoso va marcado en ámbar y se revisa a mano.';
const avisoCuentaCompartida = () => `<p class="nota-equipo">
  <b>Cuenta compartida.</b> ${L.notaCuentaCompartida ?? NOTA_CUENTA_COMPARTIDA}</p>`;

// Cuanto se sabe de este equipo, que es lo que separa "no ha fichado a nadie" de
// "no hemos mirado su cuenta". Las dos se ven igual y no son lo mismo.
//
// Cuantas jugadoras hay con las que comparar depende del CENSO de cada
// federacion, no de una decision de diseño: donde el censo es la lista de
// licencias de la categoria cuentan todas, y donde recoge tambien a las
// canteranas que suben a partidos sueltos, lo que informa son las que tienen
// FICHA. Por eso `jugadorasConFicha` manda cuando existe, y con el la cobertura
// que le corresponde.
const cifrasDeEquipo = (e) => {
  const r = e.resumen;
  const movimientos = r.altas + r.renovaciones + r.bajas;
  if (!e.archivado) return '<div class="cifras"><p class="sub">sin escanear todavía</p></div>';
  if (e.sinPlantilla) {
    return `<div class="cifras">
         <p class="sub">${e.publicacionesEnVentana ?? e.publicacionesArchivadas} publicaciones</p>
         <p class="sub">${movimientos} ${movimientos === 1 ? 'movimiento' : 'movimientos'}</p>
       </div>`;
  }
  const cobertura = r.coberturaConFicha ?? r.cobertura ?? null;
  const cuantas = r.coberturaConFicha != null && r.jugadorasConFicha != null
    ? `${r.jugadorasConFicha} fichas`
    : `${e.plantillaAnterior} jugadoras`;
  // Las publicaciones DE ESTA TEMPORADA, no las del archivo entero.
  //
  // La tarjeta es de una temporada y el archivo es de siempre, asi que el
  // numero decia una cosa y parecia otra: la ficha 25/26 de Maristas ponia «45
  // publicaciones» con 0 movimientos —se lee como «hemos mirado 45 anuncios
  // suyos y no habia nada»— cuando ninguna de las 45 era de esa temporada. Eran
  // de la 26/27, ya en la categoria a la que se fue.
  return `<div class="cifras">
       <p class="sub">${e.publicacionesEnVentana ?? e.publicacionesArchivadas} publicaciones · ${cuantas}</p>
       ${cobertura == null ? '' : `<div class="barra"><i style="width:${cobertura}%"></i></div>
       <p class="sub">${cobertura}% con noticia</p>`}
     </div>`;
};

const seccion = (e, vt) => {
  // Tres lineas, y en este orden a proposito:
  //   1. Grupo · Club (Localidad)   — quien es y de donde
  //   2. Nombre del equipo          — como se le conoce esta temporada
  //   3. Enlaces                    — a donde ir a comprobarlo
  //
  // El CLUB va arriba porque es el nombre estable, el que manda para cruzar
  // datos entre temporadas. El EQUIPO va grande debajo porque es el que la gente
  // reconoce: nadie dice "Agrupacion Deportiva Baloncesto Aviles", dice "Aceites
  // Abril ADBA Sanfer". Y el patrocinador cambia cada año. Donde el equipo se
  // llama como el club, esa primera linea se queda solo con el grupo.
  const nombre = L.equipo.nombre(e);
  const club = L.equipo.club?.(e) ?? null;
  const localidad = L.equipo.localidad?.(e) ?? null;
  const pabellon = L.equipo.pabellon?.(e) ?? null;
  const clubYLugar = [
    club && club !== nombre ? esc(club) : null,
    localidad ? `(${esc(localidad)})` : null,
  ].filter(Boolean).join(' ');

  // Fichero local. No lo tienen todos: los que no jugaron la categoria el año
  // anterior se quedan sin el, que es mas honesto que ponerles el generico y
  // aparentar que todos tienen uno.
  const fichero = L.equipo.escudo?.(e) ?? null;
  const escudo = fichero
    ? `<img class="escudo" src="./datos/escudos/${esc(fichero)}" alt="" loading="lazy"
         onerror="this.remove()">`
    : '';

  // El color del club. Se valida aunque venga de nuestro propio JSON: acaba
  // dentro de un atributo style, y ahi lo que no se comprueba se ejecuta.
  const color = L.equipo.tinte?.(e) ?? null;
  const tinte = /^#[0-9a-f]{6}$/i.test(String(color ?? '')) ? color : null;

  // Tercera linea: donde ir a comprobarlo. Las redes del club son las MISMAS
  // que vigila el escaneo, asi que estos enlaces llevan justo a las cuentas de
  // las que sale todo lo de la tarjeta.
  const cuentas = L.equipo.redes?.(e) ?? null;
  const enlaces = REDES
    .map(([red, titulo]) => [red, enlaceRed(red, cuentas?.[red]), titulo])
    .filter(([, url]) => url);
  const linkeria = enlaces.length
    ? `<span class="enlaces">${enlaces.map(([red, url, titulo]) => `<a href="${esc(url)}" target="_blank" rel="noopener" title="${esc(titulo)}">${ICONOS[red] ?? ''}</a>`).join('')}</span>`
    : '';

  // La ficha federativa del equipo, cuando la federacion la publica: el nombre
  // ES el enlace, porque es lo que esa ficha nombra y un icono inventado para
  // una federacion no dice nada.
  const urlFicha = L.equipo.ficha?.(e) ?? null;

  // El segundo bloque solo se calla cuando la temporada esta CERRADA y no queda
  // nada que contar: alli la plantilla ya es el resultado y cada movimiento sale
  // marcado en su fila. Si queda alguno suelto —de alguien que no esta en el
  // censo— se pinta igual, o desapareceria sin que nadie se entere.
  const movs = movimientosSueltos(e);
  const hayQueContar = !t.cerrada || movs.length > 0;

  // La plantilla se pinta siempre: no depende del escaneo, ya la tenemos del
  // censo. Lo unico que aporta el escaneo son los movimientos.
  return `
  <section class="equipo${e.revisionManual ? ' con-nota' : ''}${L.equipo.tinteClaro?.(e) ? ' tinte-claro' : ''}" style="--vt:eq-${vt}${tinte ? `;--tinte:${tinte}` : ''}">
  <div class="cab">
    ${escudo}
    <span class="identidad"><span>
      <span class="linea-sup">${hayGrupos(d) ? `<span class="grupo">Grupo ${esc(e.grupo)}</span>` : ''}${clubYLugar
    ? `<span class="club-lugar"${pabellon ? ` title="Juega en ${esc(pabellon)}"` : ''}>${clubYLugar}</span>` : ''}</span>
      <h3 class="nombre-club">${urlFicha
    ? `<a href="${esc(urlFicha)}" target="_blank" rel="noopener" title="Ficha del equipo en la federación">${esc(nombre)}</a>`
    : esc(nombre)}</h3>
      ${linkeria}
    </span></span>
    <!-- En estrecho las cifras no caben en la cabecera sin partir el nombre del
         club en cuatro lineas, asi que se esconden detras de este boton y salen
         en un globo. En ancho el boton no existe y las cifras van a la derecha,
         como siempre: es la MISMA marca, no una version movil aparte. -->
    <button type="button" class="info-equipo" aria-expanded="false"
            aria-label="Ver cuánto se sabe de este equipo" title="Cuánto se sabe de este equipo">
      <svg viewBox="0 0 24 24" aria-hidden="true" data-trazo stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/></svg>
    </button>
    ${cifrasDeEquipo(e)}
  </div>
  ${e.revisionManual ? avisoCuentaCompartida() : ''}
  <div class="par">
    <div class="bloque">
      <div class="titulo-bloque">
        <h4>${t.cerrada ? `Plantilla final ${esc(t.id)}` : `Plantilla ${esc(d.temporadas[0].id)}`}${e.plantillaDeLaVecina
    // De un club que CAMBIA DE CATEGORIA, la plantilla que se enseña no es de
    // esta liga: es la de aquella en la que jugo. Decirlo no es un detalle —sin
    // esto, quince jugadoras aparecen de la nada en un equipo que no jugo aqui—
    // y en el caso de la FAB explica ademas por que esas filas no enlazan ficha.
    //
    // Va con el NOMBRE LARGO de la liga y entre parentesis, pegado al titulo:
    // "Plantilla 2025/26 (Liga Femenina Challenge)" se lee de corrido y no hace
    // falta saberse las abreviaturas de la casa.
    ? ` <span class="pista">(${esc(e.plantillaDeLaVecina.liga)})</span>` : ''}</h4>
      </div>
      ${e.sinPlantilla ? avisoSinPlantilla(e) : tablaPlantilla(e)}</div>
    ${hayQueContar ? (!e.archivado || !movs.length
    // Sin nada que listar sigue haciendo falta UN bloque con titulo: el hueco
    // vacio y sin encabezado no se distingue de un fallo de carga.
    ? `<div class="bloque">
      <div class="titulo-bloque"><h4>Movimientos anunciados</h4></div>
      <div class="vacio">${e.archivado ? 'Ningún movimiento detectado todavía.' : 'Pendiente de escanear sus redes.'}</div></div>`
    : bloquesDeMovimientos(movs)) : ''}
  </div>
  </section>`;
};

// Los grupos salen de los propios EQUIPOS y no de una constante: una liga de dos
// grupos pinta dos rejillas y una de uno pinta una, con el mismo codigo y sin un
// caso especial en ninguna parte.
//
// Se derivan aqui y no vienen hechos del JSON, aunque tenerlos hechos parezca
// mas comodo: emitirlos DUPLICA el fichero entero —el de N1 FEM Mercato paso de
// 629 KB a 1,3 MB, porque cada equipo aparecia dos veces— y eso lo paga quien
// abre la pagina, cada vez. Repartir 28 objetos por una clave es gratis.
//
// Si el JSON los trae igualmente (de una version anterior), se usan: asi no hace
// falta regenerar nada para que la pagina siga funcionando.
// Sin los huecos. Un equipo que no pertenece a ningun grupo -los salientes de
// una temporada anterior llevan una raya- no crea un grupo llamado "—": con esa
// raya dentro, una liga de grupo unico parecia tener dos y seguia pintando
// "Grupo A" en cada tarjeta.
const SIN_GRUPO = new Set(['', '-', '—', '–', null, undefined]);
const gruposDe = (temporada) => [...(temporada.grupos
  ? Object.keys(temporada.grupos)
  : new Set(temporada.equipos.map((e) => e.grupo)))]
  .filter((g) => !SIN_GRUPO.has(g)).sort();

/** ¿Esta liga distingue grupos? Con uno solo, la palabra no separa a nadie. */
const hayGrupos = (d) => d.temporadas.some((t) => gruposDe(t).length > 1);
const equiposDelGrupo = (temporada, g) => temporada.grupos?.[g]
  ?? temporada.equipos.filter((e) => e.grupo === g);

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const rango = (x) => `${MES[Number(x.desde.slice(5, 7)) - 1]} ${x.desde.slice(0, 4)} – ${MES[Number(x.hasta.slice(5, 7)) - 1]} ${x.hasta.slice(0, 4)}`;

// Filtra por tener ALGUN movimiento, no por estar escaneado: todos los clubes
// con redes acaban teniendo archivo, asi que "solo escaneados" no descarta a
// nadie. Con esto se pasa de 28 tarjetas a las pocas donde ha pasado algo.
const tieneMovimientos = (e) => (e.resumen.altas + e.resumen.renovaciones + e.resumen.bajas) > 0;

// Masonry: cada tarjeta ocupa tantas filas de 1px como mide, mas el hueco. El
// hueco tiene que valer lo mismo que el column-gap de .rejilla en el CSS: son
// dos numeros que hay que mover a la vez.
const HUECO = 16;

let huellas = new WeakMap();
let pendienteDeAjuste = null;
let enTransicion = false;

// Cada tarjeta va a la columna que en ese momento va MAS CORTA. Eso es lo que
// hace que sea masonry de verdad y no dos listas independientes.
//
// El CSS solo no llega: ni `columns` ni la colocacion automatica de grid miran
// que columna va mas corta. `columns` reparte por reglas de flujo y grid coloca
// por orden —1 y 3 a la izquierda, 2 y 4 a la derecha—, asi que al encoger una
// tarjeta las de la otra columna no se enteran. Medido antes de esto: 1.306px
// de desequilibrio con solo cinco tarjetas.
//
// Se coloca con `grid-row-start` explicito, en filas de 1px, para poder decir
// exactamente donde empieza cada una.
//
// Hay UNA rejilla por grupo, asi que cada una se equilibra por su cuenta y la
// huella con la que se decide si hace falta recolocar va por rejilla, no global:
// si no, mover el grupo A obligaria a rehacer el B.
function ajustarRejilla(rejilla) {
  // Cuantas columnas hay lo dice el CSS por `--columnas`, y no se deduce
  // midiendo `grid-template-columns`. Esa medida esta contaminada por el propio
  // reparto: a las tarjetas se les escribe `grid-column: 2`, lo que crea una
  // columna implicita, y entonces una rejilla de UNA columna se mide como de
  // dos. Como la condicion para volver al modo de una columna es justo esa
  // medida, ya no se cumplia nunca: al estrechar la ventana las tarjetas se
  // quedaban con su posicion de dos columnas y se amontonaban unas sobre otras.
  const columnas = Number(getComputedStyle(rejilla).getPropertyValue('--columnas')) || 1;
  const tarjetas = [...rejilla.querySelectorAll('.equipo')];
  if (!tarjetas.length) return;

  // Una sola columna: no hay nada que repartir y sobra el posicionamiento.
  if (columnas < 2) {
    for (const tarjeta of tarjetas) {
      tarjeta.style.gridColumn = '';
      tarjeta.style.gridRow = '';
    }
    huellas.set(rejilla, `1|${tarjetas.length}`);
    return;
  }

  // Si nada ha cambiado de alto, no se recoloca. Sin esta comprobacion el
  // observador se realimentaba: `observe()` dispara el callback nada mas
  // observar, el callback recolocaba, y al recolocar se volvia a observar. Medido
  // antes del arreglo: 248 recolocaciones en 2 segundos con la pagina quieta, que
  // es lo que hacia rebotar el scroll al llegar abajo.
  const huella = `${columnas}|${tarjetas.map((x) => Math.round(x.getBoundingClientRect().height)).join(',')}`;
  if (huella === huellas.get(rejilla)) return;
  huellas.set(rejilla, huella);

  const finDeColumna = new Array(columnas).fill(0);
  for (const tarjeta of tarjetas) {
    // Se limpia antes de medir: con la colocacion anterior puesta, el ancho
    // podria no ser el que le toca.
    tarjeta.style.gridRow = '';
    const alto = Math.ceil(tarjeta.getBoundingClientRect().height);
    const corta = finDeColumna.indexOf(Math.min(...finDeColumna));
    tarjeta.style.gridColumn = String(corta + 1);
    tarjeta.style.gridRow = `${finDeColumna[corta] + 1} / span ${alto}`;
    finDeColumna[corta] += alto + HUECO;
  }
}

/**
 * Reparte el rayado entre las filas que SE VEN.
 *
 * `nth-child(even)` cuenta las escondidas, asi que al filtrar salian dos
 * blancas seguidas, dos grises seguidas o una tabla empezando en gris. CSS no
 * tiene forma de contar solo lo visible, asi que la clase se pone aqui.
 *
 * La visibilidad se pregunta con `offsetParent`, que es null cuando el
 * elemento -o un ancestro- esta en `display: none`. Se podria deducir de las
 * clases que hoy esconden filas, pero eso ataria esta funcion a QUE filtro
 * existe hoy: el dia que se añada otro, el rayado se descuadraria sin dar un
 * error. Preguntar al navegador vale para cualquiera.
 */
function rayarVisibles() {
  for (const cuerpo of document.querySelectorAll('#equipos tbody')) {
    let n = 0;
    for (const fila of cuerpo.rows) {
      if (fila.offsetParent === null) { fila.classList.remove('fila-par'); continue; }
      n += 1;
      fila.classList.toggle('fila-par', n % 2 === 0);
    }
  }
}

/* ------------------------------------------------------------------ *
 *  La tabla con buscador y paginas
 * ------------------------------------------------------------------ */

/**
 * Buscador arriba, recuento a la derecha, filas por pagina y paginacion abajo.
 *
 * Por que hacia falta: la cronologia de una temporada son ~200 anuncios en LF2 y
 * ~190 en LFCh, todos en una sola tabla. Para llegar a una fila concreta no habia
 * mas herramienta que el scroll y el Ctrl+F del navegador —que busca en lo que se
 * ve, y aqui lo que se ve no es todo lo que hay que mirar—.
 *
 * Se pagina ESCONDIENDO filas, no repintando la tabla. La tabla ya se construye
 * entera de una vez en `tablaCronologica`, asi que las filas existen; hacerlas
 * aparecer y desaparecer es cambiar un atributo, y ademas deja intacto todo lo que
 * ya cuelga de ellas —fotos cargadas, `title`s, enlaces—. Repintar significaria
 * volver a resolver clubes y volver a pedir las imagenes en cada cambio de pagina.
 *
 * Y el rayado NO se pinta desde aqui: `rayarVisibles` ya sabe hacerlo mirando
 * cuales estan a la vista, que es exactamente esta pregunta. Se le llama al final
 * de cada refresco y las cebras siguen alternando dentro de cada pagina.
 */

// El cero es "todas". Es un valor y no un caso aparte: `filasPorPagina || casan.length`
// lo convierte en "una pagina con todo", y asi la paginacion no necesita saber que
// existe una opcion especial.
const TAMANOS = [10, 25, 50, 0];
// 25 y no 10: con ~200 anuncios, 10 son veinte paginas y esta vista se lee de
// corrido —"que ha pasado esta semana"— no se consulta fila a fila. Con 25 son ocho,
// que es un numero por el que se puede pasar.
const TAMANO_POR_DEFECTO = 25;
const CLAVE_TAMANO = 'mercato.filas';

// El tamaño se recuerda entre visitas porque es una preferencia de la PERSONA, no
// del enlace: quien revisa a diario y prefiere "todas" no tiene por que volver a
// decirlo cada mañana. Por eso no va en la direccion, que es para compartir lo que
// se esta mirando y no como se mira.
// En try/catch las dos: hay contextos donde el propio acceso a `localStorage` lanza
// —ventana privada, cookies bloqueadas— y quedarse sin memoria es aceptable; que la
// tabla no arranque, no.
// El `=== null` va ANTES de convertir, y no es una comprobacion de mas: sin clave
// guardada `getItem` devuelve null, `Number(null)` es 0, y 0 es una opcion VALIDA
// de esta lista —es "Todas"—. Asi que la comprobacion de rango daba por bueno el
// cero y todo el mundo estrenaba la tabla sin paginar. Se vio con la tabla
// delante: 211 filas y ninguna pagina.
const leerTamano = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_TAMANO);
    if (guardado === null) return TAMANO_POR_DEFECTO;
    const v = Number(guardado);
    return TAMANOS.includes(v) ? v : TAMANO_POR_DEFECTO;
  } catch { return TAMANO_POR_DEFECTO; }
};

// Fuera del montaje a proposito: la tabla se repinta entera al tocar la temporada o
// los dias, y con el estado dentro se perdia lo tecleado en cada cambio. Quien esta
// siguiendo a una jugadora y cambia de temporada quiere seguir siguiendola.
let filasPorPagina = leerTamano();
let busquedaTabla = '';

/**
 * Las flechas de la paginacion, en SVG.
 *
 * Eran los caracteres tipograficos « ‹ › », y se veian pixelados y pequeños: son
 * GLIFOS DE UNA FUENTE DE TEXTO, asi que el navegador los rasteriza como una letra
 * de 13px —con hinting y todo— y ademas cada fuente los dibuja a su manera y a su
 * tamaño. Un trazo vectorial se pinta limpio a cualquier tamaño y mide lo que se le
 * diga. Es ademas lo que ya usaba el paso de temporada de la cabecera, asi que las
 * dos flechas de la pagina pasan a ser la misma flecha.
 */
const CHEVRON = {
  izq: '<polyline points="15 18 9 12 15 6"/>',
  der: '<polyline points="9 18 15 12 9 6"/>',
  izq2: '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>',
  der2: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
};
const flechaPag = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">${CHEVRON[d]}</svg>`;

/** Los mandos, en HTML, para meterlos alrededor de la tabla al construirla. */
const mandosDeTabla = (leyenda = '') => ({
  // El buscador va en su PROPIA tarjeta, encima de la de la tabla y separada de
  // ella. Dentro era una banda mas entre la cabecera de la pagina y el `thead`, y
  // con tres bandas seguidas no se distinguia cual era cual —«no se ve bien en
  // ninguna web, especialmente en LF2», con la captura delante—. Fuera y con
  // relleno de acento se lee de un golpe: esto son los mandos, debajo esta la
  // tabla.
  arriba: `<div class="card tabla-mandos tabla-jefe">
  <label class="campo tabla-buscar"><input type="search" placeholder="Buscar"
    autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Buscar por jugadora, equipo de origen o destino">
    <button type="button" class="borrar-buscar" aria-label="Borrar la búsqueda" title="Borrar" hidden><svg width="16" height="16"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
      aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></label>
  <span class="tabla-cuenta" aria-live="polite"${leyenda ? ` title="${esc(leyenda)}"` : ''}></span>
</div>`,
  // La SEGUNDA paginacion, encima del `thead`.
  //
  // Con 19 paginas, tener los mandos solo al pie es una trampa: cada salto sube la
  // tabla al principio -que es lo correcto, si no te deja mirando el final de la
  // pagina nueva- y para dar el siguiente hay que volver a bajar la tabla ENTERA.
  // Lo dijo Luismi: «no puedo ir a la proxima hasta que no baje del todo». Con la
  // paginacion tambien arriba, el salto te deja justo encima de ella.
  sobreTabla: `<div class="tabla-mandos sobre">
  <span class="tabla-rango" aria-live="polite"></span>
  <nav class="tabla-paginas" aria-label="Paginación"></nav>
</div>`,
  abajo: `<div class="tabla-mandos abajo">
  <label class="campo tabla-porpagina"><select aria-label="Filas por página">${TAMANOS
    .map((n) => `<option value="${n}"${n === filasPorPagina ? ' selected' : ''}>${n || 'Todas'}</option>`)
    .join('')}</select><span>por página</span></label>
  <nav class="tabla-paginas" aria-label="Paginación"></nav>
</div>`,
});

/**
 * Engancha los mandos a una tabla ya pintada.
 *
 * `sustantivo` es como se llama lo que hay en las filas —«anuncio»/«anuncios»—:
 * la misma tabla cuenta anuncios en Cronologia y cosas por revisar en Revision, y
 * un recuento que dice "de 12" sin decir de que son los doce no dice nada.
 */
function montarTabla(caja, sustantivo) {
  const cuerpo = caja?.querySelector('tbody');
  const entrada = caja?.querySelector('.tabla-buscar input');
  const cuenta = caja?.querySelector('.tabla-cuenta');
  const rango = caja?.querySelector('.tabla-rango');
  const selector = caja?.querySelector('.tabla-porpagina select');
  // DOS zonas de paginacion —encima del `thead` y al pie— y las dos con el mismo
  // contenido. Se pintan a la vez y se pulsan igual: quien decide es un solo
  // `pagina`, asi que no pueden separarse.
  const zonasPaginas = [...(caja?.querySelectorAll('.tabla-paginas') ?? [])];
  // El pie es OPCIONAL: una tabla que cabe entera en la pagina mas corta no lo
  // lleva, porque no hay ninguna eleccion que ofrecer. El buscador si va siempre.
  if (!cuerpo || !entrada || !cuenta) return;

  const filas = [...cuerpo.rows];
  const total = filas.length;

  // Una busqueda sin resultados tiene que DECIRLO. Sin esto la tabla se queda con
  // la cabecera flotando sobre nada y no se distingue de un fallo.
  // Se añade una sola vez, al montar, y vive dentro del <tbody> para que herede la
  // retícula: un cartel fuera de la tabla se descuadra con el scroll horizontal.
  const vacia = document.createElement('tr');
  vacia.className = 'sin-resultado';
  vacia.hidden = true;
  vacia.innerHTML = `<td colspan="${caja.querySelector('thead tr')?.cells.length ?? 1}"></td>`;
  cuerpo.append(vacia);

  let pagina = 1;
  // La ultima pagina, guardada: la necesitan el gesto lateral y `irA`, que corren
  // fuera de `refrescar` y no pueden recalcularla.
  let ultimaPagina = 1;
  entrada.value = busquedaTabla;

  // `extremo` marca los dos que se van en estrecho —primera y ultima—: son el
  // mismo salto que pulsar el «1» o el numero del final, que no se van nunca.
  const salto = (signo, destino, apagado, titulo, extremo = false) => `<button type="button"
    class="pag salto${extremo ? ' extremo' : ''}" data-pagina="${destino}"${apagado ? ' disabled' : ''}
    title="${titulo}" aria-label="${titulo}">${flechaPag(signo)}</button>`;

  const pintarPaginas = (ultima) => {
    if (!zonasPaginas.length) return;
    // Con una sola pagina no hay nada que elegir, y una paginacion de un solo
    // boton solo sirve para que alguien lo pulse y no pase nada.
    if (ultima <= 1) { zonasPaginas.forEach((z) => { z.innerHTML = ''; }); return; }
    // La primera, la ultima y las vecinas de donde estamos. Con siete o menos
    // caben todas y los puntos suspensivos solo estorbarian.
    const cerca = new Set([1, ultima, pagina - 1, pagina, pagina + 1]);
    if (ultima <= 7) for (let n = 1; n <= ultima; n += 1) cerca.add(n);
    const nums = [...cerca].filter((n) => n >= 1 && n <= ultima).sort((a, b) => a - b);
    const trozos = [salto('izq2', 1, pagina === 1, 'Primera', true), salto('izq', pagina - 1, pagina === 1, 'Anterior'),
      // «5 / 9», la paginacion de MOVIL. Se pinta siempre y la hoja decide cual de
      // las dos se ve, como el recuento de arriba.
      //
      // En un movil la lista de numeros no cabe junto al desplegable: en la pagina 1
      // si —«‹ 1 2 … 9 ›»— pero en la 5 son nueve piezas y el pie se parte en dos
      // filas. Medido a 390px: 257px de botones contra 333 de sitio, con el
      // desplegable ya dentro.
      //
      // Y encogerlos no lo arregla, solo lo aplaza: a 360px no cabe ni con botones
      // de 24px, que ademas ya no se pueden pulsar. Lo que sobra no es el tamaño, es
      // la LISTA: en un telefono se pasa pagina a pagina con las flechas, y saltar a
      // la 7 de 9 pulsando un objetivo de 24px no es algo que nadie haga.
      // Con «‹ 5 / 9 ›» son tres piezas, 114px, y cabe en cualquier telefono.
      `<span class="pag-de">${pagina} / ${ultima}</span>`];
    let previo = 0;
    for (const n of nums) {
      if (n - previo > 1) trozos.push('<span class="hueco">…</span>');
      trozos.push(`<button type="button" class="pag${n === pagina ? ' aqui' : ''}" data-pagina="${n}"${n === pagina ? ' aria-current="page"' : ''}>${n}</button>`);
      previo = n;
    }
    trozos.push(salto('der', pagina + 1, pagina === ultima, 'Siguiente'), salto('der2', ultima, pagina === ultima, 'Última', true));
    const html = trozos.join('');
    zonasPaginas.forEach((z) => { z.innerHTML = html; });
  };

  const pie = caja.querySelector('.tabla-mandos.abajo');
  // La cruz de borrar. Es NUESTRA y no la nativa de `type=search`: la del navegador
  // solo existe en WebKit, se pinta con su propio color —casi invisible en tema
  // oscuro— y no hay forma de tocarle ni el tamaño ni el sitio. Esta se ve igual en
  // los tres navegadores y se apaga cuando no hay nada que borrar, que es lo que
  // evita una cruz permanente que no hace nada.
  const cruz = caja.querySelector('.borrar-buscar');
  cruz?.addEventListener('click', (ev) => {
    // El boton vive DENTRO del <label>, asi que su click tambien dispara el del
    // label; sin esto el navegador vuelve a mandar el foco al input por su cuenta y
    // se pelea con el `focus()` de aqui.
    ev.preventDefault();
    busquedaTabla = '';
    entrada.value = '';
    pagina = 1;
    refrescar();
    entrada.focus();
  });

  const refrescar = () => {
    const q = norm(busquedaTabla);
    const casan = q ? filas.filter((f) => f.dataset.buscar?.includes(q)) : filas;
    const tam = filasPorPagina || casan.length || 1;

    // EL PIE ENTERO SE VA cuando lo que queda cabe de una vez: ni paginacion ni
    // desplegable. Antes solo desaparecia la paginacion —que se vacia sola al haber
    // una sola pagina— y quedaba un «25 por página» colgado debajo de tres filas,
    // que es un mando que no hace nada e invita a pulsarlo. Lo pidio Luismi con esa
    // pantalla delante: «si hay menos de 25 resultados, los mostramos todos y
    // ocultamos el footer al completo».
    //
    // Se mide contra lo que CASA y no contra el total, que es lo que estaba mal: la
    // pregunta es cuantas filas quedan despues de buscar, no cuantas habia.
    //
    // Con "Todas" puesto se mide contra el tamaño MAS CORTO —el 0 no es un limite,
    // es la ausencia de limite— o el pie no volveria a aparecer nunca y no habria
    // forma de salir de "Todas".
    if (pie) pie.hidden = casan.length <= (filasPorPagina || TAMANOS[0]);
    const ultima = Math.max(1, Math.ceil(casan.length / tam));
    // Al teclear o al agrandar la pagina, la que se estaba mirando puede dejar de
    // existir. Sin esto la tabla se quedaba en blanco estando llena.
    pagina = Math.min(pagina, ultima);
    const desde = (pagina - 1) * tam;
    const hasta = Math.min(desde + tam, casan.length);
    const dentro = new Set(casan.slice(desde, hasta));
    for (const f of filas) f.hidden = !dentro.has(f);

    ultimaPagina = ultima;
    if (cruz) cruz.hidden = !busquedaTabla;
    vacia.hidden = casan.length > 0;
    vacia.firstElementChild.textContent = `Ninguna fila con «${busquedaTabla}».`;
    // El "(filtrados de N)" solo cuando se ha filtrado. Puesto siempre, la frase
    // repite el mismo numero dos veces y deja de leerse.
    // DOS redacciones del mismo recuento, y quien elige es el CSS.
    //
    // «Mostrando 1–25 de 27 anuncios por revisar (filtrados de 211)» no cabe en un
    // movil al lado del buscador, y partirlo en dos lineas gasta una linea entera de
    // pantalla en un dato de apoyo. En estrecho basta con los numeros, que es lo
    // unico que cambia al pasar de pagina.
    //
    // Se pintan las dos y la hoja esconde una, que es como ya se resuelven la fecha
    // de la cronologia y el nombre de la competicion en la cabecera: asi no hay que
    // medir nada desde aqui ni repintar al girar el movil.
    // DOS recuentos, y no son el mismo dato:
    //   la tarjeta dice CUANTOS HAY   -> «211 anuncios» / «3 de 211 anuncios»
    //   la barra dice CUALES SE VEN   -> «Mostrando 1–25 de 211»
    // Juntos contestan las dos preguntas que se hacen delante de una tabla paginada,
    // y separados no se pisan: el total no cambia al pasar de pagina y el rango si.
    const nombre = (n) => (n === 1 ? sustantivo.uno : sustantivo.varios);
    const dos = (largo, corto) => `<span class="cuenta-larga">${esc(largo)}</span><span class="cuenta-corta">${esc(corto)}</span>`;
    // En estrecho el sustantivo se acorta pero NO se cae: un «211» suelto al lado
    // del buscador no dice de que son los 211. «Anuncios» cabe; «anuncios por
    // revisar» no, y por eso la vista de Revision trae las dos formas.
    cuenta.innerHTML = q
      ? dos(`${casan.length} de ${total} ${nombre(total)}`, `${casan.length} de ${total} ${sustantivo.corto}`)
      : dos(`${total} ${nombre(total)}`, `${total} ${sustantivo.corto}`);
    if (rango) {
      rango.innerHTML = casan.length
        ? dos(`Mostrando ${desde + 1}–${hasta} de ${casan.length}`, `${desde + 1}–${hasta} de ${casan.length}`)
        : dos(`Ningún ${sustantivo.uno}`, '0');
    }
    pintarPaginas(ultima);
    rayarVisibles();
  };

  entrada.addEventListener('input', () => {
    busquedaTabla = entrada.value.trim();
    pagina = 1;
    refrescar();
  });
  selector?.addEventListener('change', () => {
    filasPorPagina = Number(selector.value);
    try { localStorage.setItem(CLAVE_TAMANO, String(filasPorPagina)); } catch { /* sin memoria, pero funcionando */ }
    pagina = 1;
    refrescar();
  });
  // Volver ARRIBA de la tabla al saltar. Sin esto se cambia de pagina y se sigue
  // mirando el final de la nueva, que es la unica parte que no ha cambiado de sitio
  // en la pantalla. Con la paginacion tambien arriba, el salto deja los botones a
  // mano para dar el siguiente.
  const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const subir = () => caja.scrollIntoView({ block: 'start', behavior: sinMovimiento() ? 'auto' : 'smooth' });

  /**
   * EL DESLIZAMIENTO. La tabla se va por un lado y la nueva entra por el otro.
   *
   * Hace falta porque sin el no hay forma de saber que ha pasado: se pulsa y la
   * pantalla cambia de golpe, con las mismas columnas y el mismo aspecto. El
   * movimiento es lo que dice «has avanzado» y en que sentido, y con el gesto del
   * dedo ademas cierra el circulo: empujas y la tabla se va hacia donde empujaste.
   *
   * La pagina nueva ENTRA corrida desde el lado del que viene. Se anima `.scroll`
   * —la caja de la tabla— y no las filas: las filas no se mueven,
   * se esconden y se enseñan, asi que no hay nada que animar en ellas. Y el recorte
   * lo pone `.bloque.cronologia`, que ya era `overflow: hidden`, asi que la tabla se
   * va por debajo del borde de la tarjeta sin asomar por fuera ni crear scroll.
   *
   * Un 12% del ancho y no un 100%: con el recorrido entero la tabla desaparece del
   * todo y lo que se ve es un parpadeo blanco de media pantalla. Un empujon corto
   * con desvanecido se lee igual de bien como direccion y no marea al pasar cinco
   * paginas seguidas.
   *
   * Y la barra de arriba NO se mueve —es hermana, no hija—: los botones se quedan
   * quietos debajo del dedo, que es lo que hace falta para pulsar dos veces seguidas.
   *
   * `sentido` es +1 hacia adelante y -1 hacia atras. Con `prefers-reduced-motion` no
   * se anima nada y el cambio es seco, que es justo lo que pide esa preferencia.
   */
  let animacion = null;
  const deslizar = (sentido, hacer) => {
    // EL DATO CAMBIA PRIMERO Y SIEMPRE. La animacion es decoracion y va detras.
    //
    // Estuvo al reves —sacar la tabla, y al TERMINAR esa animacion cambiar de
    // pagina— y es un error de los que no se ven en el sitio donde estan: si la
    // animacion no corre, la promesa no se cumple y **la pagina no cambia nunca**.
    // Paso en el navegador de pruebas, que las tiene congeladas: se pulsaba
    // «siguiente» y la tabla se quedaba igual, sin un solo error en consola.
    //
    // Y no es solo el banco de pruebas: una pestaña en segundo plano, un motor que
    // las estrangula o un `prefers-reduced-motion` que cambia a media sesion dan lo
    // mismo. Colgar un cambio de estado de que termine una animacion es apostar el
    // funcionamiento a un adorno.
    //
    // Asi que ahora entra sola: la tabla nueva aparece corrida hacia el lado del que
    // viene y se coloca. Se pierde la salida de la vieja, que ademas nadie echa de
    // menos: lo que dice «has avanzado, y hacia alla» es la entrada.
    hacer();
    const lienzo = caja.querySelector('.scroll');
    if (!lienzo || sinMovimiento() || typeof lienzo.animate !== 'function') return;
    // Si habia otra a medias se corta: encadenar cinco saltos rapidos dejaria la
    // tabla acumulando desplazamientos y terminando torcida.
    animacion?.cancel();
    // Un 12% del ancho y no el 100%: con el recorrido entero la tabla desaparece del
    // todo y lo que se ve es un parpadeo blanco de media pantalla. Un empujon corto
    // se lee igual de bien como direccion y no marea al pasar cinco seguidas.
    const paso = Math.round(lienzo.getBoundingClientRect().width * 0.12);
    animacion = lienzo.animate(
      [{ transform: `translateX(${sentido > 0 ? paso : -paso}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' },
    );
  };

  const irA = (n) => {
    if (n < 1 || n > ultimaPagina || n === pagina) return;
    const sentido = n > pagina ? 1 : -1;
    pagina = n;
    deslizar(sentido, () => { refrescar(); subir(); });
  };

  // Delegado en la caja entera: hay DOS paginaciones y se repintan en cada refresco,
  // asi que enganchar boton a boton obligaria a re-enganchar en cada salto.
  caja.addEventListener('click', (ev) => {
    const boton = ev.target.closest('.tabla-paginas button[data-pagina]');
    if (!boton || boton.disabled) return;
    irA(Number(boton.dataset.pagina));
  });

  // PASAR PAGINA CON EL DEDO, como un carrusel. Sale casi gratis porque en estrecho
  // la tabla NO se desplaza a lo ancho -medido: 357px de contenido en 357 de caja-
  // asi que el gesto lateral esta libre.
  //
  // Aun asi se comprueba EN CADA GESTO y no una vez al arrancar: en una tableta o
  // con la letra muy grande la tabla si puede desbordar, y ahi el desplazamiento de
  // la tabla manda. Un gesto robado es peor que un gesto que falta.
  //
  // `passive` en los dos: esto no cancela nada, solo mira. Sin ello el navegador no
  // puede adelantar el desplazamiento y se nota al arrastrar.
  const zonaDedo = caja.querySelector('.scroll');
  let dedoX = null;
  let dedoY = null;
  zonaDedo?.addEventListener('touchstart', (ev) => {
    if (ev.touches.length !== 1) { dedoX = null; return; }
    dedoX = ev.touches[0].clientX;
    dedoY = ev.touches[0].clientY;
  }, { passive: true });
  zonaDedo?.addEventListener('touchend', (ev) => {
    if (dedoX === null) return;
    const t = ev.changedTouches[0];
    const dx = t.clientX - dedoX;
    const dy = t.clientY - dedoY;
    dedoX = null;
    if (zonaDedo.scrollWidth > zonaDedo.clientWidth + 1) return;
    // 60px de recorrido y que el gesto sea CLARAMENTE lateral: bajando por una lista
    // con el pulgar uno se va de lado sin querer, y pasar de pagina por eso seria
    // peor que no tener gesto.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    irA(pagina + (dx < 0 ? 1 : -1));
  }, { passive: true });

  refrescar();
}

/**
 * Publica el alto real de la cabecera en `--alto-barra`.
 *
 * Lo usan los titulos de grupo, que en estrecho se quedan pegados JUSTO debajo.
 * No vale un numero fijo: la barra cambia de alto al abrir los filtros, al
 * girar el movil o si el nombre de la liga se parte en dos lineas, y un `top`
 * escrito a mano la solaparia o dejaria una franja de contenido colandose.
 */
function medirBarra() {
  const barra = document.querySelector('.barra-sup');
  if (!barra) return;
  document.documentElement.style.setProperty('--alto-barra', `${Math.round(barra.getBoundingClientRect().height)}px`);
}

// El observador de titulos pegados. Se guarda para desmontarlo: sus margenes
// dependen del alto de la barra, asi que cuando esa cambia hay que rehacerlo.
let vigilaPegados = null;

/**
 * Marca con `.pegado` el titulo de grupo que esta tocando la cabecera.
 *
 * CSS no tiene forma de saber si un `position: sticky` esta pegado o suelto
 * —no hay `:stuck`— asi que se deduce: se observa el propio titulo con el
 * borde superior del area de observacion bajado hasta justo debajo de la
 * cabecera. Mientras se ve ENTERO (ratio 1) esta suelto; en cuanto empieza a
 * quedarse fuera por arriba, es que se ha pegado.
 *
 * El pixel de mas en el margen es lo que evita que el ratio se quede oscilando
 * en 0,999 y la clase parpadee mientras se arrastra.
 */
function vigilarTitulosPegados() {
  vigilaPegados?.disconnect();
  const titulos = document.querySelectorAll('.titulo-grupo');
  if (!titulos.length || !('IntersectionObserver' in window)) return;
  const alto = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--alto-barra'), 10) || 56;
  vigilaPegados = new IntersectionObserver((entradas) => {
    for (const e of entradas) e.target.classList.toggle('pegado', e.intersectionRatio < 1);
  }, { threshold: [1], rootMargin: `-${alto + 1}px 0px 0px 0px` });
  for (const t of titulos) vigilaPegados.observe(t);
}

function ajustarMasonry() {
  for (const rejilla of document.querySelectorAll('#equipos .rejilla')) ajustarRejilla(rejilla);
}

// Recolocar cuando cambie el alto de una tarjeta (filtrar filas, cargar fotos) o
// el ancho de la ventana. Asi no hay que acordarse de llamarlo desde cada sitio,
// que es justo lo que se olvida.
const vigilante = new ResizeObserver(() => {
  clearTimeout(pendienteDeAjuste);
  pendienteDeAjuste = setTimeout(ajustarMasonry, 60);
});

// Observar es cosa aparte de colocar: se hace UNA vez por repintado, no en cada
// recolocacion, que es lo que montaba el bucle.
function observarTarjetas() {
  vigilante.disconnect();
  huellas = new WeakMap();
  for (const tarjeta of document.querySelectorAll('#equipos .equipo')) vigilante.observe(tarjeta);
}

/**
 * Monta la pagina. Se llama una sola vez desde el mercato.js de cada repo, que
 * es lo unico que sabe de que liga se trata.
 */
export async function arrancar(liga) {
  L = liga;

  // El service worker, que es lo que hace el sitio instalable. Registrarlo aqui
  // no bloquea nada: la promesa no se espera.
  //
  // La condicion es que la PAGINA DECLARE UN MANIFIESTO, y no un try/catch: una
  // liga que no quiera PWA no pone el <link rel="manifest"> y aqui no se
  // intenta nada. Con `register()` a pelo, LF2 —que no tiene sw.js— pedia un
  // fichero que no existe y el 404 salia en su consola en cada carga: el
  // `.catch` calla la promesa, pero el navegador registra el error igual.
  // Sin https tampoco existe `serviceWorker`, asi que en una LAN por IP no se
  // instala y la pagina va igual. Que la web funcione NO depende de esto.
  if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Los datos van SIEMPRE en su fichero, igual en local que publicado. Se probo
  // empotrarlos en la pagina y se descarto: no protegia nada —en una web
  // estatica lo que se pinta esta al alcance de quien mire el fuente— y a cambio
  // obligaba a resubir el HTML entero en cada actualizacion. Asi solo viaja el
  // JSON, y la pagina se queda quieta y cacheable.
  // El no-store es a proposito: los datos cambian cada hora y el HTML no.
  d = await (await fetch('./datos/mercato.json', { cache: 'no-store' })).json();

  // Los filtros viven en la URL para que al recargar siga viendose lo mismo. Se
  // leen ANTES de montar nada, porque de la temporada dependen los equipos y de
  // los equipos dependen los grupos y los filtros propios de cada liga.
  const paramsUrl = new URLSearchParams(location.search);

  // La mas reciente es lo normal, asi que es la que se asume cuando la URL no
  // dice nada. En la URL la barra se escribe con guion ("2026-27") para no
  // acabar con un %2F, y al leer se aceptan las dos formas.
  const enUrl = (id) => id.replace('/', '-');
  const PORDEFECTO = d.temporadas[d.temporadas.length - 1];
  const pedida = paramsUrl.get('temporada');
  t = d.temporadas.find((x) => x.id === pedida || enUrl(x.id) === pedida) ?? PORDEFECTO;

  const fTemporada = document.getElementById('fTemporada');
  const fGrupo = document.getElementById('fGrupo');
  const fMovimientos = document.getElementById('fMovimientos');
  // Este no decide QUE equipos se ven sino que filas de sus plantillas: esconde
  // a las jugadoras de las que todavia no se sabe nada.
  const fSolo = document.getElementById('fSoloAnuncios');
  // Opcional: la liga que no lo declare en su HTML se queda con la vista de
  // tarjetas y aqui no pasa nada.
  const fVista = document.getElementById('fVista');
  // `cronologia` y `revisar` son la MISMA vista con distinto filtro: una tabla a
  // todo lo ancho, ordenada por fecha, con los desplegables de equipo escondidos
  // y la ventana de dias a la vista. Todo lo que preguntaba "¿es la cronologia?"
  // pregunta esto, para que la vista nueva no se quede fuera de nada por olvido.
  const esVistaDeTabla = () => fVista?.value === 'cronologia' || fVista?.value === 'revision';
  const soloRevisar = () => fVista?.value === 'revision';

  /**
   * ¿Se esta viendo esto desde el taller? Loopback y red local: nada de eso
   * puede ser el sitio publicado, que vive en un hosting.
   */
  const enElTaller = () => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
    || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);

  /**
   * La vista REVISAR se ofrece sola, y solo en el taller.
   *
   * No se declara en el `index.html` de cada liga como las otras dos: asi la
   * tienen las tres sin tocarles nada, y no depende de que nadie se acuerde de
   * quitarla de una.
   *
   * **Se miro primero si bastaba con el DATO**, que es lo que manda la casa
   * —`armarSitio` poda las marcas al construir `publico/`, y esconder por
   * `hostname` lo que sigue estando en el fuente es justo lo que alli se dice
   * que no se haga—. **No basta, y esta medido**: de 21 movimientos marcados en
   * LF2, en `publico/` sobreviven 14. Lo que se poda es `origenDudoso` y sus
   * candidatas; `confianza`, `genero` y `reclasificadoContraElAnuncio` se
   * quedan, porque son los que pintan la pastilla ambar, y esa SI es publica
   * por decision anterior. Colgar la opcion del dato la habria enseñado a todo
   * el mundo.
   *
   * Y aqui la regla de la casa no aplica, aunque lo parezca: alli se hablaba de
   * esconder un DATO que se sigue sirviendo. Esta vista no enseña ni un dato que
   * no estuviera ya en la pagina —las mismas filas, en ambar, en la cronologia—;
   * lo unico que añade es la comodidad de verlas juntas, que es una herramienta
   * de trabajo y no tiene por que salir en la web.
   *
   * Se pide ADEMAS que haya algo marcado: un desplegable con una opcion que
   * siempre sale vacia es ruido.
   *
   * Se llama ANTES de restaurar la URL, para que `?vista=revisar` funcione: esa
   * restauracion comprueba que la opcion exista y si no, se cae a la de siempre.
   */
  const ofrecerRevisar = () => {
    if (!fVista || !enElTaller() || [...fVista.options].some((o) => o.value === 'revision')) return;
    // En TODAS las temporadas, no solo en la que se este viendo: si la marca
    // esta en la 25/26 y arrancas en la 26/27, la opcion tiene que estar ahi
    // para poder cambiar de temporada y encontrarla.
    //
    // Y `sinPersona` cuenta IGUAL que un movimiento marcado. Sin esto la opcion
    // no salia en N1 —que no tiene ni un movimiento pendiente de mano— y sus
    // seis publicaciones del Careba seguian sin sitio donde verse, que es el
    // fallo que se venia a arreglar. La lista de trabajo son las dos cosas.
    const hay = (d.temporadas ?? []).some((x) => (x.sinPersona ?? []).length
      || (x.equipos ?? []).some((e) => ['altas', 'bajas', 'renovaciones']
        .some((k) => (e[k] ?? []).some((m) => pendienteDeMano(m, { cerrada: x.cerrada })))));
    if (!hay) return;
    const op = document.createElement('option');
    op.value = 'revision';
    // 'Revisión' y no 'Revisar': las otras dos opciones nombran una VISTA
    // -Equipos, Cronología- y no una accion. El desplegable se lee "Vista:
    // Revisión", que es lo que es.
    op.textContent = 'Revisión';
    fVista.append(op);
  };
  // Cual es la de por defecto lo dice el HTML, no el motor: la PRIMERA <option>,
  // que es a la que cae un <select> al que nadie ha tocado. Se leia igual cuando
  // se marcaba con `selected`, y se quito: una marca que hay que ver para
  // entender el orden, cuando el orden ya lo dice todo.
  // Se guarda ANTES de tocar nada para que la URL solo tenga que escribir la
  // vista cuando NO es esa, igual que con la temporada.
  const vistaPorDefecto = fVista?.value ?? null;
  // Va con el anterior: los dos son la vista cronologica. Si falta, la
  // cronologia sale entera, que es lo mismo que este puesto a cero.
  const fDias = document.getElementById('fDias');
  // Desplegable propio de Equipo. Expone `.value` igual que un <select>, asi que
  // pintar(), guardarEnUrl() y la restauracion desde la URL siguen sin cambios.
  const comboBtn = document.getElementById('fEquipoBtn');
  const comboLista = document.getElementById('fEquipoLista');
  const fEquipo = { value: '' };

  // Filtros propios de una liga: la N1 andaluza es regional y la provincia dice
  // algo, la LF2 es estatal y no declara ninguno. Clave opcional, no caso
  // especial. Se ignora en silencio el que no tenga su <select> en el HTML.
  const propios = (L.filtros ?? [])
    .map((filtro) => ({ ...filtro, campo: document.getElementById(filtro.id) }))
    .filter((filtro) => filtro.campo);

  const cerrarCombo = () => {
    comboLista.hidden = true;
    // Se limpia el ajuste: si no, el desplazamiento calculado para una posicion se
    // arrastra a la siguiente apertura, y la barra puede haberse reorganizado.
    comboLista.style.left = '';
    comboLista.style.right = '';
    comboBtn.setAttribute('aria-expanded', 'false');
    comboLista.querySelectorAll('.activo').forEach((x) => x.classList.remove('activo'));
  };
  /**
   * Mete la lista DENTRO de la pantalla si se sale por algun lado.
   *
   * La hoja la ancla por la derecha —`right: 0`— para que crezca hacia dentro y no
   * se salga por el borde derecho, que es de donde cuelga en escritorio. Pero en
   * estrecho el campo Equipo se va a la izquierda de la barra, y anclada por la
   * derecha la lista crece hacia FUERA: en LFCh se salia y los nombres aparecian
   * cortados por la mitad —«ZERES EXTREMADURA», «SEVILLA FEMENINO»—. Lo vio Luismi.
   *
   * No se arregla en la hoja porque depende de DONDE haya caido el campo, y eso lo
   * decide el reparto de la barra al envolverse. Se mide despues de enseñarla, que
   * es el unico momento en que la respuesta existe.
   *
   * Se toca `left` con `right: auto` y no `transform`: el desplazamiento tiene que
   * contar para el proximo calculo, y una transformacion no cambia la caja.
   */
  const meterEnPantalla = () => {
    comboLista.style.left = '';
    comboLista.style.right = '';
    const margen = 8;
    const caja = comboLista.getBoundingClientRect();
    const ancho = document.documentElement.clientWidth;
    if (caja.left >= margen && caja.right <= ancho - margen) return;
    // Del borde de la lista al del campo, que es contra quien esta posicionada.
    const ancla = comboLista.offsetParent?.getBoundingClientRect() ?? caja;
    const izquierdaQueQuiero = Math.min(
      Math.max(margen, caja.left),
      Math.max(margen, ancho - margen - caja.width),
    );
    comboLista.style.right = 'auto';
    comboLista.style.left = `${izquierdaQueQuiero - ancla.left}px`;
  };

  const abrirCombo = () => {
    comboLista.hidden = false;
    comboBtn.setAttribute('aria-expanded', 'true');
    meterEnPantalla();
    const sel = comboLista.querySelector('.sel') ?? comboLista.firstElementChild;
    sel?.classList.add('activo');
    sel?.scrollIntoView({ block: 'nearest' });
  };

  const elegirEquipo = (valor) => {
    fEquipo.value = valor;
    cerrarCombo();
    poblarEquipos();
    pintar();
    comboBtn.focus();
  };

  comboBtn.addEventListener('click', () => (comboLista.hidden ? abrirCombo() : cerrarCombo()));
  comboLista.addEventListener('click', (ev) => {
    const li = ev.target.closest('li');
    if (li) elegirEquipo(li.dataset.valor);
  });
  // Clic fuera y Escape: sin esto una lista abierta se queda flotando.
  document.addEventListener('click', (ev) => {
    if (!comboLista.hidden && !ev.target.closest('.combo')) cerrarCombo();
  });
  comboBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirCombo(); comboLista.focus?.(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (comboLista.hidden) return;
    if (ev.key === 'Escape') { cerrarCombo(); comboBtn.focus(); return; }
    const items = [...comboLista.children];
    const i = items.findIndex((x) => x.classList.contains('activo'));
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const sig = items[Math.min(items.length - 1, Math.max(0, i + (ev.key === 'ArrowDown' ? 1 : -1)))];
      items[i]?.classList.remove('activo');
      sig?.classList.add('activo');
      sig?.scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter' && i >= 0) {
      ev.preventDefault();
      elegirEquipo(items[i].dataset.valor);
    }
  });

  fTemporada.innerHTML = d.temporadas
    .map((x) => `<option${x.id === t.id ? ' selected' : ''}>${esc(x.id)}</option>`).join('');

  /**
   * VISTA y TEMPORADA fuera de la barra de filtros.
   *
   * Son los dos unicos controles visibles en las tres vistas, y no son un
   * filtro mas: son DONDE ESTAS. Metidos en la barra plegable habia que
   * desplegar para saber si mirabas Cronologia o Revision, y otra vez para
   * cambiarlo. Ahora la vista vive abajo en una isla siempre visible y la
   * temporada arriba, donde ya estaba escrita.
   *
   * ── Por que NO se rewirea nada ──
   *
   * Los dos `<select>` de siempre siguen siendo la fuente de verdad: esto solo
   * les cambia el valor y dispara su `change`. Con eso, la URL, `aplicarVista`,
   * `soloRevisar`, los filtros propios y todo lo demas siguen funcionando sin
   * enterarse. Y si un dia estorba, basta con no llamar a esto.
   *
   * Sale en las TRES ligas sin tocar un solo `index.html`: las tres cabeceras
   * tienen la misma forma —`.marca-texto`, `#sub`, `#fVista`, `#fTemporada`—
   * y todo se construye leyendo las opciones que ya hay.
   */
  const ICONO_VISTA = {
    cronologia: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    revision: '<path d="M4 21V4h11l-1 3h6v9h-8l-1-3H6"/>',
    equipos: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  };
  const dibujo = (v) => (ICONO_VISTA[v]
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO_VISTA[v]}</svg>`
    : '');

  let isla = null;

  /** El paso de temporada, donde antes iba «Temporada 2026/27 · en curso». */
  function pintaPaso(donde) {
    const ids = [...fTemporada.options].map((o) => o.value);
    const i = ids.indexOf(fTemporada.value);
    const flecha = (d) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${d < 0 ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}"/></svg>`;
    donde.innerHTML = `<span class="paso-temporada">
      <button type="button" data-temp="-1"${i <= 0 ? ' disabled' : ''} aria-label="Temporada anterior">${flecha(-1)}</button>
      <span class="val" aria-live="polite">${esc(fTemporada.value)}</span>
      <button type="button" data-temp="1"${i >= ids.length - 1 ? ' disabled' : ''} aria-label="Temporada siguiente">${flecha(1)}</button>
    </span>`;
    donde.querySelectorAll('[data-temp]').forEach((b) => b.addEventListener('click', () => {
      const n = ids.indexOf(fTemporada.value) + Number(b.dataset.temp);
      if (n < 0 || n >= ids.length) return;
      fTemporada.value = ids[n];
      fTemporada.dispatchEvent(new Event('change', { bubbles: true }));
    }));
  }

  /** La isla de vistas, y el nombre de la activa pegado al titulo. */
  function pintaIsla() {
    if (!fVista) return;
    const ops = [...fVista.options];
    if (!isla) {
      isla = document.createElement('nav');
      isla.className = 'isla-vistas';
      isla.setAttribute('aria-label', 'Vista');
      document.body.append(isla);
      document.body.classList.add('con-isla');
    }
    isla.innerHTML = ops.map((o) => `<button type="button" data-vista="${esc(o.value)}"
      aria-pressed="${o.value === fVista.value}" aria-label="${esc(o.text)}">${dibujo(o.value)}<span>${esc(o.text)}</span></button>`).join('');
    isla.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
      fVista.value = b.dataset.vista;
      fVista.dispatchEvent(new Event('change', { bubbles: true }));
    }));
    // El texto se cae por ANCHO y no por dispositivo: se mide lo que ocuparia
    // con palabras contra lo que hay. Asi en un movil con las DOS vistas del
    // publico las palabras siguen ahi, y solo desaparecen cuando no caben.
    isla.classList.remove('solo-iconos');
    if (isla.scrollWidth > document.documentElement.clientWidth - 24) isla.classList.add('solo-iconos');
    // El nombre de la vista NO se repite en el titulo.
    //
    // Estuvo un rato: la isla iba a ser de iconos y hacia falta una etiqueta que
    // dijera donde estabas. Al caber el texto en los botones dejo de hacer falta
    // y se quito -lo pidio Luismi- para que la cabecera vuelva a decir solo
    // «LF2 Mercato». Repetir en dos sitios lo que ya se lee en uno es ruido.
    //
    // Queda un hueco conocido: cuando la isla se queda en iconos por falta de
    // ancho, el nombre no esta en ninguna parte. Ahi lo dice el boton pulsado y
    // su `aria-label`, que es lo que lee un lector de pantalla.
    // Y los dos desplegables de origen dejan de ofrecerse en la barra: ya no son
    // el mando. `inservible` para que `aplicarVista` no los resucite.
    for (const campo of [fVista.closest('.campo'), fTemporada.closest('.campo')]) {
      if (!campo) continue;
      campo.dataset.inservible = '1';
      campo.hidden = true;
    }
    // Y con esos dos fuera puede que la barra se quede sin nada. Ver `ajustarChevron`.
    ajustarChevron();
  }

  const cabeceraTemporada = () => {
    // El rango real de la temporada no cabe en la cabecera —y no es el que uno
    // espera: va de marzo a febrero o de junio a mayo segun la federacion— pero
    // se conserva como tooltip para no perderlo.
    const linea = document.getElementById('sub');
    // Partido en trozos con clase propia para que en un movil se pueda dejar
    // solo "Temp. 2026/27", que es lo unico que cambia y hay que ver. Con el
    // texto de una pieza no habria forma: el CSS no puede recortar una frase.
    // El año tambien se abrevia: "2026/27" -> "26/27". Las dos cifras de delante
    // no distinguen nada —no hay dos temporadas que empiecen por 20 distintas—
    // y en la cabecera estrecha cada caracter cuenta.
    // El subtitulo ya no es texto: es el PASO de temporada. Ver `pintaPaso`.
    // Y sin «en curso»: el bloque baja de dos renglones a uno y la cabecera
    // pierde 14px de alto, que en movil se notan. Lo pidio Luismi.
    pintaPaso(linea);
    linea.title = [L.competicion?.(d), rango(t)].filter(Boolean).join(' · ');
    document.getElementById('totales').innerHTML = [
      ['Altas', t.total.altas], ['Renovaciones', t.total.renovaciones], ['Bajas', t.total.bajas],
      L.cuartoTotal?.(t),
    ].filter(Boolean).map(([k, v]) => `<div class="card tile"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');

    // El aviso solo aparece cuando hay algo que avisar. Barrida la temporada, la
    // linea "Barrido hasta el X" no le dice nada a quien viene a mirar fichajes:
    // es contabilidad nuestra.
    //
    // Lo que NO se quita es el aviso de cuando esta a medias, y no es lo mismo
    // aunque lo pinte el mismo elemento. Ese existe porque el silencio se lee
    // como dato: una tabla vacia porque no hay fichajes y otra vacia porque no
    // hemos mirado se ven igual, y no lo son. Mientras `sueloReal` sea null la
    // pagina lo sigue diciendo en primera persona.
    // Cuelga de `cobertura`, que trae la MISMA cuenta que publica ESTADO.md
    // —margen del vigilante incluido—, y no de `sueloReal`, que era un campo a
    // mano. Con el campo a mano el aviso se quedo encendido despues de que la
    // 26/27 quedara barrida entera: la pagina decia «no se ha barrido entera
    // todavia» con las 27 cuentas cerradas y las 24 de X tambien. Un aviso que
    // miente hacia arriba se termina ignorando, y entonces tampoco avisa el dia
    // que dice la verdad.
    // `sueloReal` se conserva como respaldo para una temporada sin cobertura
    // calculada: mejor avisar de mas que callar un hueco.
    const barrido = document.getElementById('barrido');
    const completa = t.cobertura ? t.cobertura.completa : Boolean(t.sueloReal);
    barrido.hidden = completa;
    barrido.className = 'barrido incompleto';
    // Y se dice CUANTO falta, no solo que falta. "No se ha barrido entera" es
    // verdad tanto con un club pendiente como con veinte, y son dos cosas muy
    // distintas para quien lee la tabla.
    // Con el nombre de la red como se escribe y no como se guarda: la clave
    // interna es `x` e `instagram`, en minusculas, y salia tal cual en la pagina
    // -«Faltan 3 de 24 en x»-. Lo vio Luismi.
    const NOMBRE_DE_RED = { x: 'X', instagram: 'Instagram', facebook: 'Facebook' };
    // Y CON LOS CLUBES, que es lo unico accionable. «3 de 24» es verdad y no
    // sirve para nada: no dice a quien hay que ir a mirar ni si es cosa de un
    // dia o de un mes. Se dicen los nombres y el retraso, y a partir de cuatro
    // se corta -el aviso tiene que caber en una linea-.
    const falta = t.cobertura
      ? Object.entries(t.cobertura.porRed)
        .filter(([, r]) => r.cerrados < r.total)
        .map(([red, r]) => {
          const nombre = NOMBRE_DE_RED[red] ?? red;
          const quienes = (r.pendientes ?? []).slice(0, 3).map((p) => p.club);
          const dias = Math.max(0, ...(r.pendientes ?? []).map((p) => p.dias ?? 0));
          const cola = r.pendientes?.length > 3 ? ` y ${r.pendientes.length - 3} más` : '';
          const detalle = quienes.length ? ` (${quienes.join(', ')}${cola}${dias ? `: ${dias} días` : ''})` : '';
          return `${r.total - r.cerrados} de ${r.total} en ${nombre}${detalle}`;
        })
        .join(' y ')
      : '';
    barrido.innerHTML = completa ? ''
      : `<b>Esta temporada no se ha barrido entera todavía.</b> ${falta ? `Faltan ${falta}. ` : ''}`
        + `Lo que no aparece puede ser que no exista o que aún no se haya mirado. `
        + `${t.publicaciones} publicaciones archivadas dentro de la temporada.`;

    // El aviso de "informacion no oficial" es de la temporada EN CURSO. Ahi los
    // movimientos se publican segun los anuncia cada club, antes de que existan
    // las licencias, y pueden cambiar o no llegar a concretarse: hay que
    // decirlo.
    //
    // En una temporada CERRADA ya no aplica, y no por antiguedad sino porque el
    // dato ha pasado por otro sitio: con las plantillas oficiales en la mano,
    // el motor descarta el anuncio que no case con ninguna ficha —es lo que
    // significa `cerrada`—. Lo que queda ahi ha sido contrastado contra la
    // federacion, asi que advertir de que "puede no llegar a concretarse" sobre
    // una temporada ya jugada es avisar de un riesgo que ya no existe.
    const aviso = document.getElementById('avisoFuentes');
    if (aviso) aviso.hidden = Boolean(t.cerrada);
  };

  // Solo se escriben los filtros que estan puestos: con todo en "Todos" la URL
  // queda limpia.
  //
  // HISTORIAL: la VISTA empuja entrada, los filtros no.
  //
  // Aqui ponia que todo iba con `replaceState` "para que cambiar de filtro no
  // llene el boton de atras de pasos intermedios", y para los filtros sigue
  // siendo verdad: escribir "7" en los dias son dos pulsaciones y serian dos
  // entradas. Pero cambiar de vista NO es afinar un filtro, es ir a otro sitio,
  // y sin entrada el boton de atras del movil se sale de la web —que es donde
  // hace falta, porque alli no hay pestañas ni barra de direcciones a mano—.
  //
  // Con `pushState` hay que escuchar `popstate` a la fuerza: al volver, el
  // navegador cambia la URL pero no repinta nada, y la pagina se quedaria
  // enseñando la vista de la que acabas de salir con la direccion de la otra.
  const guardarEnUrl = () => {
    const p = new URLSearchParams();
    const cronologica = esVistaDeTabla();
    // La temporada solo se escribe si NO es la de por defecto: mirar la actual
    // es el caso comun y no tiene por que ensuciar la URL. Vale para las dos
    // vistas, que es el unico filtro que sobrevive a las dos.
    if (fTemporada.value && fTemporada.value !== PORDEFECTO.id) p.set('temporada', enUrl(fTemporada.value));
    // La vista, solo si NO es la de por defecto de esta liga. Con la cronologia
    // de arranque, la direccion limpia es la cronologia y `?vista=equipos` la
    // otra: la URL dice en que se DIFERENCIA lo que estas viendo de lo normal.
    if (fVista && fVista.value !== vistaPorDefecto) p.set('vista', fVista.value);
    if (cronologica) {
      if (diasPedidos()) p.set('dias', String(diasPedidos()));
    } else {
      // Y aqui SOLO los de esta vista. En la cronologia estos filtros ni se ven
      // ni se aplican, asi que dejarlos en la direccion la convierte en una
      // promesa falsa: quien la comparta —o la guarde— estara mandando un
      // enlace que dice "grupo A, equipo tal" y no enseña nada de eso.
      if (fGrupo.value) p.set('grupo', fGrupo.value);
      for (const filtro of propios) if (filtro.campo.value) p.set(filtro.param, filtro.campo.value);
      if (fEquipo.value) p.set('equipo', fEquipo.value);
      if (fMovimientos.checked) p.set('movimientos', '1');
      if (fSolo.checked) p.set('anuncios', '1');
    }
    const q = p.toString();
    const destino = q ? `?${q}` : location.pathname;
    if (destino === `${location.search || location.pathname}`) return;
    // Solo cuenta como navegacion el cambio de VISTA. Se compara contra lo que
    // habia en la direccion, no contra una variable aparte: asi no hay dos
    // verdades que puedan separarse.
    const vistaAnterior = new URLSearchParams(location.search).get('vista') ?? vistaPorDefecto;
    const vistaAhora = fVista?.value ?? vistaPorDefecto;
    if (vistaAhora !== vistaAnterior) history.pushState(null, '', destino);
    else history.replaceState(null, '', destino);
  };

  // Volver atras tiene que REPINTAR. Sin esto, `pushState` deja la direccion
  // cambiada y la pagina igual, que es peor que no tener historial.
  addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search);
    const pedida = p.get('vista') ?? vistaPorDefecto;
    if (fVista && [...fVista.options].some((o) => o.value === pedida)) fVista.value = pedida;
    const temp = p.get('temporada');
    const cual = d.temporadas.find((x) => x.id === temp || enUrl(x.id) === temp);
    if (cual) { t = cual; fTemporada.value = cual.id; }
    if (fDias) fDias.value = p.get('dias') ?? '';
    if (fGrupo) fGrupo.value = p.get('grupo') ?? '';
    for (const filtro of propios) filtro.campo.value = p.get(filtro.param) ?? '';
    if (fMovimientos) fMovimientos.checked = p.get('movimientos') === '1';
    if (fSolo) fSolo.checked = p.get('anuncios') === '1';
    pintar();
  });

  const pasaFiltros = (e) => propios.every((filtro) => !filtro.campo.value || filtro.valor(e) === filtro.campo.value)
    && (!fEquipo.value || L.equipo.nombre(e) === fEquipo.value)
    && (!fMovimientos.checked || tieneMovimientos(e));

  /**
   * Por que la cuenta de la cronologia no cuadra con los totales de arriba.
   *
   * No es un descuadre, son dos unidades: arriba se cuentan MOVIMIENTOS y aqui
   * ANUNCIOS. Un traspaso dentro de la liga son dos movimientos —el alta de
   * quien ficha y la baja derivada de quien la pierde— y un solo anuncio, asi
   * que la baja derivada no entra: nadie la publico, se dedujo. Sin decirlo, la
   * resta no sale y parece que falten filas.
   */
  const leyendaDeAnuncios = () => {
    const movimientos = t.total.altas + t.total.bajas + t.total.renovaciones;
    const derivadas = t.equipos.reduce((n, e) => n + e.bajas.filter((m) => m.vaA).length, 0);
    const partes = [`${movimientos} movimientos en la temporada`];
    if (derivadas) {
      partes.push(`${derivadas} ${derivadas === 1
        ? 'es una baja deducida del fichaje de otro club, y no se anunció por separado'
        : 'son bajas deducidas del fichaje de otro club, y no se anunciaron por separado'}`);
    }
    partes.push('Aquí solo salen los anuncios, con su fecha y su enlace');
    return `${partes.join('. ')}.`;
  };

  /** Cuantos dias hacia atras pide la cronologia. 0 —o sin campo— es todo. */
  const diasPedidos = () => {
    const n = Math.trunc(Number(fDias?.value));
    if (!Number.isFinite(n) || n <= 0) return 0;
    // El tope sale del propio <input>, que es donde esta escrito, en vez de
    // repetir el 30 aqui: cambiarlo en el HTML basta. Se recorta y no se ignora
    // porque el `max` del navegador no impide teclear 900 ni llegar por la URL.
    return Math.min(n, Number(fDias.max) || n);
  };

  /**
   * Que controles tienen sentido en cada vista.
   *
   * En la cronologia sobran los que eligen EQUIPOS —grupo, provincia, el propio
   * equipo, "solo con movimientos"— porque alli no se pintan equipos sino
   * anuncios sueltos, y "solo con anuncio" no filtra nada: la lista ya es solo
   * anuncios. Quedan los dos que sirven: la temporada y la ventana de dias.
   *
   * Se esconden Y dejan de aplicarse, las dos cosas. Esconder un filtro que
   * sigue recortando es peor que dejarlo a la vista: la lista sale corta y no
   * hay nada en pantalla que explique por que.
   *
   * La lista de los que SOBREVIVEN se saca de los tres controles conocidos, no
   * de una lista escrita a mano de los que se esconden: asi el filtro que una
   * liga añada mañana —o el que se invente en el motor— se esconde solo, sin
   * que nadie tenga que acordarse de venir aqui.
   */
  /**
   * El chevron y su caja, fuera cuando no queda ni un filtro que enseñar.
   *
   * Va aparte de `aplicarVista` porque hay DOS momentos que cambian la respuesta y
   * no ocurren a la vez: `aplicarVista` reparte los `hidden` de la vista, y
   * `pintaIsla` marca Vista y Temporada como inservibles —se mudaron a la isla y a
   * la cabecera— y eso pasa DESPUES del primer pintado. Con la cuenta hecha solo
   * dentro de `aplicarVista`, el primer pintado la hacia con los dos todavia
   * visibles y el chevron se quedaba puesto para siempre abriendo una barra vacia.
   * Se vio contando: siete campos, cero visibles, y el boton ahi.
   */
  const ajustarChevron = () => {
    const alguno = [...document.querySelectorAll('.filtros .campo, .filtros .interruptor')]
      .some((c) => !c.hidden);
    btnFiltros.hidden = !alguno;
    cajaFiltros.hidden = !alguno;
  };

  const aplicarVista = (cronologica) => {
    // `fDias` ya NO esta entre los que sobreviven a la cronologia: era el ultimo
    // filtro de esa vista y Luismi lo mando quitar. Con eso queda escondido en las
    // dos vistas, o sea muerto.
    const suyos = [fVista, fTemporada].filter(Boolean).map((c) => c.closest('.campo'));
    const campoDias = fDias?.closest('.campo');
    // Y ESCONDIDO SIGNIFICA VACIO. Un `?dias=7` en la direccion seguiria recortando
    // la lista desde un campo que ya no se ve, que es la peor clase de filtro y
    // esta escrito asi en el comentario de `tablaCronologica`. Se limpia una sola
    // vez, cuando aun tiene algo: `pintar` lee `diasPedidos()` despues de esto.
    if (fDias && fDias.value) fDias.value = '';
    for (const campo of document.querySelectorAll('.filtros .campo, .filtros .interruptor')) {
      // En la cronologia sobrevive lo suyo; en las tarjetas sobrevive todo
      // MENOS los dias, que alli no significan nada.
      // `inservible` primero, y no es un caso especial: es que hay DOS dueños de
      // este `hidden` y hasta hoy ganaba el ultimo en correr.
      //
      // `poblarGrupos` esconde el desplegable de grupo cuando la liga tiene uno
      // solo -en LF Challenge, «A» y nada mas- y aqui se volvia a mostrar, porque
      // en la vista de tarjetas esta linea decia «visible todo menos los dias».
      // Lo vio Luismi: «quita el desplegable de grupo, que es unico y no tiene
      // sentido en esa Liga». Estaba quitado… y esta linea lo resucitaba al
      // cambiar de vista.
      //
      // Un filtro que se declara inservible lo es en TODAS las vistas: no depende
      // de lo que se pinte sino de lo que traiga el JSON. Se marca en el propio
      // elemento para que esto no tenga que saber cuales existen, igual que la
      // lista de los que sobreviven se saca de los controles y no a mano.
      campo.hidden = campo.dataset.inservible === '1'
        || (cronologica ? !suyos.includes(campo) : campo === campoDias);
    }
    // Y EL CHEVRON, cuando no queda ni un filtro que enseñar.
    //
    // En Cronologia y Revision los dos unicos mandos son Vista y Temporada, y esos
    // se mudaron a la isla de abajo y a la cabecera; el de dias se acaba de quitar.
    // Asi que la caja queda vacia y el chevron abre una barra en blanco. Lo pidio
    // Luismi junto con lo de los dias: «y el chevron porque ya no habra nada para
    // expandir».
    //
    // Se pregunta por lo que hay A LA VISTA en vez de listar las vistas que no
    // tienen filtros: asi una liga que declare un filtro nuevo en su HTML recupera
    // el chevron sola, sin que esto tenga que enterarse.
    ajustarChevron();
    // El desplegable de equipo puede quedarse abierto al cambiar de vista, y su
    // lista flota por encima de la pagina: escondida la caja, seguiria ahi.
    if (cronologica) cerrarCombo();
  };

  // Una rejilla POR GRUPO, cada una con su titulo fuera de las tarjetas. Con los
  // 28 seguidos no se sabe donde acaba uno y empieza el otro, y la clasificacion
  // —que es contra lo que se lee esto— va por grupo.
  /**
   * La vista CRONOLOGICA: una sola tabla con todos los anuncios, el mas
   * reciente arriba.
   *
   * La de tarjetas responde a "que ha hecho este club"; esta responde a "que ha
   * pasado esta semana", que es otra pregunta y no se puede contestar mirando
   * 28 tarjetas a la vez.
   *
   * Solo entran ANUNCIOS: movimientos con enlace y no derivados. Una baja
   * derivada no la anuncio nadie —se dedujo del fichaje de otro club— asi que
   * en una lista de anuncios seria una linea que no existio. En las tarjetas si
   * esta, porque alli la pregunta es por el club.
   *
   * Aqui NO se filtra por grupo, provincia ni equipo: esos desplegables se
   * esconden en esta vista (ver `aplicarVista`), y un filtro escondido que
   * sigue recortando la lista es la peor clase de filtro. Lo unico que la
   * recorta es la temporada y el numero de dias, que son los dos controles que
   * quedan a la vista.
   */
  // `cerrada` viaja porque decide QUE se echa en falta: en la temporada en curso
  // una baja sin destino no es un hueco, es que aun no ha fichado. Ver
  // `faltaElOtroExtremo`.
  /**
   * Las publicaciones con señal de fichaje en las que no se reconocio a NADIE.
   *
   * Van debajo de la tabla y en su propio bloque, no mezcladas con ella, porque
   * no son lo mismo: la tabla lleva movimientos con una duda encima y esto son
   * anuncios de los que no salio ni una fila. Meterlas dentro obligaria a
   * inventarles jugadora y tipo, que es justo lo que no se ha podido decidir.
   *
   * Solo en la vista REVISAR y solo en el taller, como el resto de la vista:
   * `armarSitio` las poda de `publico/` antes de publicar.
   *
   * Lo pidio Luismi al no encontrar las seis del Careba —«no aparecen en ningun
   * sitio»—, y tenia razon: existian en `datos/revisar.json` y no las leia nadie.
   */
  const bloqueSinPersona = (t) => {
    const lista = t.sinPersona ?? [];
    if (!lista.length) return '';
    const icono = (p) => {
      const red = p.url?.includes('instagram.com') ? 'instagram' : (p.url?.includes('x.com') || p.url?.includes('twitter.com') ? 'x' : null);
      if (!p.url || !red || !ICONOS[red]) return '';
      return `<a class="fuente" href="${esc(p.url)}" target="_blank" rel="noopener" title="Ver ${esc(nombreDeFuente(red))}">${ICONOS[red]}</a>`;
    };
    // EL CARTEL, delante de quien revisa.
    //
    // Estas filas enseñaban solo el texto, y el texto es justo lo que ha fallado
    // aqui: por eso no hay nadie reconocido. El cartel suele traer lo que le
    // falta —el nombre rotulado, un «FICHAJE» o un «RENOVADA», o la camiseta del
    // club anterior—, y sin verlo hay que abrir el post uno a uno.
    //
    // Medido el 14-08 abriendo doce de la cola: la mitad se resolvia mirando la
    // imagen. Las seis del Careba fueron el caso tipo —el texto decia «¡Andrea
    // jugará en el Senior Femenino Nacional!» y el apellido estaba rotulado—.
    //
    // La MISMA `cajaFoto` que la plantilla y la tabla de movimientos: si no hay
    // cartel se pinta la silueta y no un hueco, y si la imagen se cae se quita
    // ella sola. Sin insignia, que aqui no hay movimiento del que dar semaforo.
    // Dentro de la celda del club y con `.jugadora`/`.foto-anuncio`, que es
    // EXACTAMENTE como la pinta la tabla de movimientos. Ni columna nueva ni CSS
    // nuevo: la hoja de estilos ya sabe apilar retrato y nombre, y en movil ya
    // sabe encogerlo. Sin insignia, que aqui no hay movimiento del que dar
    // semaforo.
    const cartel = (p) => {
      const caja = cajaFoto(p.imagenLocal ? `./datos/anuncios/${p.imagenLocal}` : null);
      return p.url ? `<a class="foto-anuncio" href="${esc(p.url)}" target="_blank" rel="noopener" title="Ver el anuncio">${caja}</a>` : caja;
    };
    const conCartel = lista.filter((p) => p.imagenLocal).length;
    return `<div class="titulo-bloque">
  <h4>Con señal y sin reconocer a nadie <span class="pista">(${lista.length}, no son dato: se anotan en revisiones.json o se dejan${conCartel ? `; ${conCartel} con cartel, míralo antes de dejarla` : ''})</span></h4>
</div>
<div class="card bloque cronologia sin-persona">
<div class="scroll"><table>
  <thead><tr><th class="jug">Club</th><th class="desc">Anuncio</th><th class="cuando">Fecha</th><th class="col-fuente"></th></tr></thead>
  <tbody>${lista.map((p) => `<tr>
    <td class="jug"><span class="jugadora">${cartel(p)}<span class="nombre">${esc(p.club ?? '—')}</span></span></td>
    <td class="desc">${esc(p.texto ?? '')}<span class="cuando-linea">${esc(fechaCorta(p.fecha))}</span></td>
    <td class="cuando">${esc(fechaCorta(p.fecha))}</td>
    <td class="col-fuente">${icono(p)}</td>
  </tr>`).join('')}</tbody>
</table></div></div>`;
  };

  // `silenciarVacio`: no cantar "nada pendiente" cuando DEBAJO va el bloque de
  // publicaciones sin nadie. Las dos cosas juntas se contradicen en la misma
  // pantalla —"nada pendiente" encima de seis cosas pendientes— y la que sobra
  // es la de arriba, porque habla solo de los movimientos.
  const tablaCronologica = (equipos, { soloRevisar = false, cerrada = true, silenciarVacio = false } = {}) => {
    const todos = equipos.flatMap((e) => [
      ...e.altas.map((m) => ({ ...m, tipo: 'alta', equipo: e })),
      ...e.bajas.map((m) => ({ ...m, tipo: 'baja', equipo: e })),
      ...e.renovaciones.map((m) => ({ ...m, tipo: 'renovacion', equipo: e })),
    ])
      .filter((m) => m.fecha && !m.vaA && (m.fuentes ?? [m.fuente]).some((f) => f?.url))
      // La vista REVISAR es esta misma lista con un filtro mas. No se le quita
      // el de arriba a proposito: para juzgar una fila hay que poder abrir el
      // anuncio, y una derivada no tiene ninguno que abrir.
      //
      // Filtra por `pendienteDeMano` y no por `motivoDeRevision`: aqui entran
      // tambien las que estan BIEN pero incompletas —un fichaje del que nadie
      // dijo de donde viene—, que no llevan ambar y no se podan de `publico/`
      // pero son justo lo que queda por hacer. Sin ellas la vista decia "nada
      // pendiente" con 62 altas sin procedencia sin sitio donde trabajarlas.
      .filter((m) => !soloRevisar || pendienteDeMano(m, { cerrada }))
      // Y dentro del MISMO DIA, por el codigo de la publicacion.
      //
      // La fecha se guarda sin hora, asi que dos anuncios del mismo dia
      // quedaban en el orden en que salieron del archivo — o sea, en ninguno: la
      // renovacion de Lucia Cruzado salia por encima de la de Eva de Meyer
      // siendo anterior, en LF2 y en N1. Y no hace falta guardar la hora,
      // porque el identificador de cada red ya la lleva dentro: los ids de X son
      // snowflakes crecientes y los codigos de Instagram son un contador en
      // base64url. Se comparan los de la MISMA red, que son los unicos
      // comparables entre si.
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || enElMismoDia(b, a));

    // La ventana cuenta HACIA ATRAS desde hoy e incluye hoy: 1 dia es hoy, 7 son
    // esta semana. Cero es "todo", que es como arranca.
    const dias = diasPedidos();
    const corte = dias ? hace(dias - 1) : null;
    const filas = corte ? todos.filter((m) => m.fecha >= corte) : todos;

    if (!filas.length) {
      // Una lista vacia por una ventana corta no es lo mismo que una vacia
      // porque no hay nada, y con el numero puesto arriba las dos se ven igual.
      // Si hay anuncios fuera de la ventana se dice cual es el ultimo: eso
      // contesta "¿no hay nada nuevo?" sin tener que ir probando numeros.
      if (corte && todos.length) {
        return `<div class="card vacio">Ningún anuncio en ${dias === 1 ? 'el último día' : `los últimos ${dias} días`}.
          El más reciente es del <b>${esc(fechaCorta(todos[0].fecha))}</b>.</div>`;
      }
      if (soloRevisar) return silenciarVacio ? '' : '<div class="card vacio">Nada pendiente de revisar con estos filtros.</div>';
      return '<div class="card vacio">Ningún anuncio con estos filtros.</div>';
    }

    // La frase se pinta DOS veces a proposito: en su columna y bajo el nombre.
    // En estrecho no caben cinco columnas, asi que la columna se esconde y la
    // linea de debajo ocupa su sitio; en ancho, al reves. Quien decide cual se
    // ve es el CSS, y asi no hay que medir nada desde aqui ni repintar al girar
    // el movil. Es el mismo truco que la linea de iconos de fuentes.
    // El pie se pinta SIEMPRE y lo esconde `refrescar` cuando no hace falta; ver
    // alli. Decidirlo aqui no vale: aqui solo se sabe cuantas filas hay en total y
    // la pregunta es cuantas quedan DESPUES de buscar.
    const mandos = mandosDeTabla(leyendaDeAnuncios());
    // La envoltura existe para que las DOS tarjetas —la de mandos y la de la
    // tabla— sigan siendo una sola cosa para `montarTabla`, que busca el buscador
    // y el cuerpo dentro de una misma caja. Sin ella habria que pasarle dos raices
    // y emparejarlas por fuera.
    return `<div class="tabla-envoltura">
${mandos.arriba}
<div class="card bloque cronologia">
${mandos.sobreTabla}
<div class="scroll"><table>
  <thead><tr><th class="jug">Jugadora</th><th class="desc">Descripción</th><th class="tipo">Movimiento</th><th class="cuando">Fecha</th><th class="col-fuente"></th></tr></thead>
  <tbody>${filas.map((m) => {
    const cuenta = frase(m);
    const dice = cuenta.pista ? ` title="${esc(cuenta.pista)}"` : '';
    // La fila dudosa va en ambar aqui tambien. Se marcaba solo en las tarjetas,
    // asi que la MISMA fila salia señalada en una vista y normal en la otra: la
    // pastilla "revisar" aparecia suelta, sin el fondo que la acompaña, y no se
    // entendia de que hablaba.
    return `<tr${motivoDeRevision(m) ? ' class="dudoso"' : ''} data-buscar="${esc(claveDeBusqueda(m))}">
    <td class="jug"><span class="jugadora">${fotoAnuncio(m, faldonCantera(esCantera(m)))}<span class="nombre">${esc(nombrePersona(comoLaLlamaElClub(m)))}${canteraJuntoAlNombre(esCantera(m))}
      <span class="desc-linea"${dice}>${cuenta.html}</span><span class="estado-linea">${tipoCronologia(m)}<span class="estado-fecha">${esc(fechaCorta(m.fecha))}</span></span>${fuentesBajoNombre(m)}</span></span></td>
    <td class="desc"${dice}><span class="frase-rejilla">${cuenta.html}</span>${soloRevisar
      // El motivo, VISIBLE. En la cronologia vive en el `title` del semaforo, que
      // vale para "ojo con esta" pero no para revisarla: hay que pasar el raton
      // fila a fila para saber cual es cual, y en movil no hay raton.
      ? `<span class="motivo-revisar">${esc(pendienteDeMano(m, { cerrada }))}</span>` : ''}</td>
    <td class="tipo">${tipoCronologia(m)}<span class="cuando-linea">${esc(fechaCorta(m.fecha))}</span></td>
    <td class="cuando">${esc(fechaCorta(m.fecha))}</td>
    <td class="col-fuente">${(m.fuentes ?? [m.fuente]).filter((f) => f?.red && ICONOS[f.red]).map((f) => (f.url
    ? `<a class="fuente" href="${esc(f.url)}" target="_blank" rel="noopener" title="Ver ${esc(nombreDeFuente(f.red))}">${ICONOS[f.red]}</a>`
    : '')).join('')}</td>
  </tr>`;
  }).join('')}</tbody>
</table></div>
${mandos.abajo}</div></div>`;
  };

  const pintar = () => {
    // La vista cronologica solo existe donde la liga la declare en su HTML: sin
    // el <select> no hay nada que elegir y se pinta la de siempre. Es la misma
    // regla que el resto —lo que una liga no declara, no se pinta— y evita
    // tener que tocar el index.html de las tres a la vez.
    const cronologica = esVistaDeTabla();
    aplicarVista(cronologica);
    guardarEnUrl();
    const contenedor = document.getElementById('equipos');
    contenedor.classList.toggle('en-cronologia', cronologica);
    // La vista de Revision es la cronologia con otro filtro, asi que comparte
    // `en-cronologia`; esta clase suya es para lo poco que difiere. Ver el fondo
    // ambar en la hoja: alli TODAS las filas estan por revisar y el fondo deja
    // de distinguir nada.
    contenedor.classList.toggle('en-revision', soloRevisar());

    if (cronologica) {
      // Sin `pasaFiltros` ni `fGrupo`: en esta vista esos desplegables no se
      // ven, y lo que no se ve no puede recortar. La temporada entera.
      const sinNadie = soloRevisar() ? bloqueSinPersona(t) : '';
      contenedor.innerHTML = tablaCronologica(t.equipos, {
        soloRevisar: soloRevisar(), cerrada: t.cerrada, silenciarVacio: Boolean(sinNadie),
      }) + sinNadie;
      // Sin el bloque de abajo: aqui se cuentan MOVIMIENTOS, y las publicaciones
      // que no reconocieron a nadie no lo son. Van aparte en el mismo renglon
      // para no sumar peras con manzanas.
      // El recuento se MUDA a la tabla, y con el la explicacion de por que no
      // cuadra con los totales de arriba —`leyendaDeAnuncios`, que viaja como
      // `title` de la etiqueta nueva—.
      //
      // Estaba en la barra superior, y alli tenia dos problemas. Uno: en estrecho
      // no se veia, porque la hoja lo esconde por debajo de 560px para que no se
      // coma una linea entera de la cabecera. Y dos: hablaba de una tabla que ahora
      // se filtra y se pagina, asi que un numero suelto —"197 anuncios"— dejaria de
      // contestar la pregunta que se hace de verdad, que es cuantos de esos se
      // estan viendo ahora mismo.
      //
      // La cuenta de "sin reconocer a nadie" no se pierde: la lleva el titulo de su
      // propio bloque, que es donde estan las filas de las que habla.
      const cuenta = document.getElementById('cuenta');
      cuenta.textContent = '';
      cuenta.title = '';
      // `corto` es el nombre para pantallas estrechas: el largo dice de que va la
      // vista y ahi no cabe, pero el numero solo no dice de que son.
      montarTabla(contenedor.querySelector('.tabla-envoltura'), soloRevisar()
        ? { uno: 'anuncio por revisar', varios: 'anuncios por revisar', corto: 'por revisar' }
        : { uno: 'anuncio', varios: 'anuncios', corto: 'anuncios' });
    } else {
      const visibles = gruposDe(t).filter((g) => !fGrupo.value || g === fGrupo.value);
      let mostrados = 0;
      contenedor.innerHTML = visibles.map((g) => {
        const lista = equiposDelGrupo(t, g).filter(pasaFiltros);
        mostrados += lista.length;
        // Con un solo grupo no hay titulo: no hay nada que distinguir de nada, y
        // "Grupo A" encabezando la unica rejilla de la pagina solo ocupa sitio.
        // El recuento no se pierde, lo lleva `#cuenta`.
        const titulo = visibles.length > 1
          ? `<h2 class="titulo-grupo">Grupo ${esc(g)} <span>${lista.length} ${lista.length === 1 ? 'equipo' : 'equipos'}</span></h2>`
          : '';
        return lista.length
          ? `${titulo}<div class="rejilla">${lista.map((e, i) => seccion(e, `${g}-${i}`)).join('')}</div>`
          : `${titulo}<div class="card vacio">${visibles.length > 1
            ? `Ningún equipo del grupo ${esc(g)} pasa estos filtros.`
            : 'Ningún equipo pasa estos filtros.'}</div>`;
      }).join('');
      document.getElementById('cuenta').textContent = `${mostrados} de ${t.equipos.length} equipos`;
    }
    // Las tarjetas son nuevas: hay que rayarlas, medirlas y volver a vigilarlas.
    // El rayado va PRIMERO porque el filtro de "solo con anuncio" puede seguir
    // puesto de antes: las filas se pintan y se esconden en el mismo golpe.
    rayarVisibles();
    medirBarra();
    vigilarTitulosPegados();
    ajustarMasonry();
    observarTarjetas();
  };

  // El desplegable de grupo tambien sale del JSON. Asi una liga de un solo grupo
  // no tiene que retocar su index.html, y un grupo que desaparece de una
  // temporada no se queda ofreciendose.
  const poblarGrupos = () => {
    const previo = fGrupo.value;
    const gs = gruposDe(t);
    fGrupo.innerHTML = `<option value="">Todos</option>${gs
      .map((g) => `<option value="${esc(g)}"${g === previo ? ' selected' : ''}>Grupo ${esc(g)}</option>`).join('')}`;
    if (previo && !gs.includes(previo)) fGrupo.value = '';
    // Con UN solo grupo la palabra "grupo" no significa nada: no separa a nadie
    // de nadie. El desplegable se esconde entero -no vacio- y con el su etiqueta,
    // porque un filtro con una sola opcion es ruido que ademas invita a pulsarlo.
    // Sale del JSON, asi que una liga no tiene que declarar que no tiene grupos:
    // le basta con traer uno.
    const unico = gs.length <= 1;
    const caja = fGrupo.closest('label, .filtro, div');
    // Se marca ADEMAS de esconderlo: `aplicarVista` reparte el `hidden` de todos
    // los filtros al cambiar de vista y sin la marca deshacia esto. Ver alli.
    if (caja) {
      caja.toggleAttribute('hidden', unico);
      if (unico) caja.dataset.inservible = '1'; else delete caja.dataset.inservible;
    }
    if (unico) fGrupo.value = '';
  };

  const poblarPropios = () => {
    for (const filtro of propios) {
      const previo = filtro.campo.value;
      const valores = [...new Set(t.equipos.map((e) => filtro.valor(e)).filter(Boolean))].sort();
      filtro.campo.innerHTML = `<option value="">${esc(filtro.vacio ?? 'Todos')}</option>${valores
        .map((v) => `<option${v === previo ? ' selected' : ''}>${esc(v)}</option>`).join('')}`;
    }
  };

  function poblarEquipos() {
    // Por el nombre del EQUIPO, igual que la cabecera de la tarjeta: si el
    // desplegable dijera "Agrupacion Deportiva Baloncesto Aviles" y la tarjeta
    // "Aceites Abril ADBA Sanfer", nadie relacionaria una cosa con la otra.
    const nombres = t.equipos
      .filter((e) => (!fGrupo.value || e.grupo === fGrupo.value)
        && propios.every((filtro) => !filtro.campo.value || filtro.valor(e) === filtro.campo.value))
      .map((e) => L.equipo.nombre(e)).sort();
    // Si el equipo elegido ya no esta en la lista —porque cambio el grupo, la
    // temporada o un filtro propio— se vuelve a "Todos" en vez de dejar un
    // filtro invisible puesto.
    if (fEquipo.value && !nombres.includes(fEquipo.value)) fEquipo.value = '';
    comboLista.innerHTML = ['', ...nombres].map((n) => {
      const sel = n === fEquipo.value;
      return `<li role="option" data-valor="${esc(n)}" aria-selected="${sel}"${sel ? ' class="sel"' : ''}>${esc(n || 'Todos')}</li>`;
    }).join('');
    comboBtn.textContent = fEquipo.value || 'Todos';
    comboBtn.title = fEquipo.value || '';
  }

  fTemporada.addEventListener('change', () => {
    t = d.temporadas.find((x) => x.id === fTemporada.value) ?? t;
    cabeceraTemporada(); poblarGrupos(); poblarPropios(); poblarEquipos(); pintar();
  });
  fGrupo.addEventListener('change', () => { poblarEquipos(); pintar(); });
  for (const filtro of propios) filtro.campo.addEventListener('change', () => { poblarEquipos(); pintar(); });
  fMovimientos.addEventListener('change', pintar);
  fVista?.addEventListener('change', () => { pintar(); pintaIsla(); });
  // `input` y no `change`: con `change` el numero no surte efecto hasta salir
  // del campo, y uno se queda mirando una lista que no le hace caso. El respiro
  // es para no repintar la tabla entera tres veces al teclear "15" o al dejar
  // pulsada la flechita.
  let pendienteDeDias;
  fDias?.addEventListener('input', () => {
    clearTimeout(pendienteDeDias);
    pendienteDeDias = setTimeout(pintar, 150);
  });

  window.addEventListener('resize', () => {
    clearTimeout(pendienteDeAjuste);
    pendienteDeAjuste = setTimeout(() => { medirBarra(); vigilarTitulosPegados(); ajustarMasonry(); }, 120);
  });

  // "Ver solo anuncios" es UNO para toda la pagina, no uno por tarjeta. Con
  // media liga anunciando, ir marcandolo equipo por equipo era una pesadilla: lo
  // que uno quiere ver es quien se mueve, en todas partes a la vez.
  //
  // La marca va en el CONTENEDOR y no en cada bloque a proposito: `pintar()`
  // rehace el HTML de dentro con cada filtro, asi que una marca puesta en las
  // tarjetas se perderia en el siguiente repintado y habria que volver a
  // ponerla. El contenedor no lo toca nadie.
  //
  // El cambio va envuelto en una transicion de vista para que las tarjetas se
  // recoloquen deslizandose en vez de saltar. Donde la API no exista, el cambio
  // es instantaneo y todo sigue funcionando.
  const aplicarSolo = () => {
    const hazlo = () => {
      document.getElementById('equipos').classList.toggle('solo-activo', fSolo.checked);
      rayarVisibles();
      ajustarMasonry();
    };
    // Una transicion a la vez: si se pulsa varias veces seguidas, la anterior se
    // cancela y el navegador avisa por consola. Con una en marcha el cambio se
    // aplica directo, que es lo que iba a acabar pasando igualmente.
    if (document.startViewTransition && !enTransicion) {
      enTransicion = true;
      document.startViewTransition(hazlo).finished
        .catch(() => {})
        .finally(() => { enTransicion = false; });
    } else hazlo();
  };
  fSolo.addEventListener('change', () => { aplicarSolo(); guardarEnUrl(); });

  // El chevron pliega y despliega los filtros. Arranca PLEGADO salvo que la URL
  // traiga alguno puesto: si hay filtros activos hay que verlos, o uno se queda
  // mirando una lista recortada sin saber por que.
  const cajaFiltros = document.getElementById('cajaFiltros');
  const btnFiltros = document.getElementById('verFiltros');

  // ¿Esta el panel en su modo FLOTANTE? Es la unica pregunta que separa el
  // comportamiento de movil del de escritorio, y no se contesta con un ancho
  // repetido aqui: se mira si la container query de la hoja lo ha sacado del
  // flujo. Asi el punto de corte vive en un solo sitio.
  //
  // Se guarda en vez de preguntarlo cada vez porque quien lo consulta es el
  // scroll, y un `getComputedStyle` por evento de scroll obliga al navegador a
  // recalcular el diseño en el peor momento. Se refresca al cambiar de tamaño,
  // que es lo unico que puede cambiar la respuesta.
  let flota = false;
  const miraSiFlota = () => { flota = getComputedStyle(cajaFiltros).position === 'absolute'; };

  /**
   * Como tiene que estar el panel cuando NADIE lo ha tocado todavia.
   *
   * Donde flota, plegado siempre: abrirlo al cargar es tapar los equipos justo
   * cuando uno llega a verlos.
   *
   * Donde no flota, plegado TAMBIEN, salvo que la direccion traiga algun filtro
   * puesto. Ahi si hay que abrirlo, porque si no uno se queda mirando una lista
   * recortada sin nada en pantalla que diga por que.
   *
   * `vista` NO cuenta como filtro, y esa es la unica sutileza: elegir COMO se
   * lee la lista —tarjetas o cronologia— no recorta nada. Un enlace a la
   * cronologia enseña todo lo que hay, asi que no tiene nada que explicar y no
   * hay motivo para abrir la barra. Lo mismo vale para cualquier parametro que
   * se invente mañana y no filtre: la lista de aqui abajo dice quien SI.
   *
   * Se mira `location.search` en vivo y no los parametros de la carga porque
   * `guardarEnUrl` la reescribe en canonico: la temporada por defecto, por
   * ejemplo, se borra sola, y con razon —no filtra nada—.
   */
  /**
   * Plegado SOLO donde el panel flota, o sea en movil.
   *
   * Antes se plegaba tambien en tablet y en escritorio —hasta 1024px siempre, y
   * por encima salvo que la URL trajera un filtro—. La idea era no comerse la
   * primera pantalla, pero el precio lo puso Luismi:
   *
   *   «asi es dificil saber si estamos en Cronologia o en Revision, y para
   *    cambiar hay que expandir y seleccionar»
   *
   * Y tiene razon: la barra no es solo para FILTRAR, es donde se lee EN QUE
   * VISTA estas. Plegada, el estado de la pagina deja de estar en la pagina y
   * hay que abrir un panel para averiguarlo. Dos clics para algo que deberia
   * verse.
   *
   * Donde flota —por debajo de 560— se sigue plegando, y ahi el argumento
   * original sigue valiendo entero: alli el panel se pone ENCIMA de los equipos,
   * asi que abrirlo al llegar es tapar justo lo que uno viene a ver.
   *
   * Con esto se van `hayFiltroEnUrl` y `FILTRAN`: existian para abrir la barra
   * en escritorio cuando la lista salia recortada y no habia nada que lo
   * explicara. Si la barra esta siempre abierta, el filtro puesto se ve solo.
   */
  const comoArranca = () => flota;

  // Al cambiar de modo —girar una tableta, arrastrar el borde de la ventana— el
  // panel vuelve a como arrancaria en el modo nuevo. Solo en el CAMBIO: dentro
  // de un mismo modo manda lo que haya hecho el chevron, y volver a plegarlo en
  // cada pixel de arrastre seria pelearse con quien lo abrio.
  //
  // Hace falta en los dos sentidos. Pasar a estrecho con el panel abierto deja
  // un panel flotando encima de los equipos; pasar a ancho con el plegado puede
  // dejar escondido el filtro que explica lo que se esta viendo.
  window.addEventListener('resize', () => {
    const antes = flota;
    miraSiFlota();
    // Un solo umbral otra vez, el de flotar: es el unico del que depende ahora
    // como arranca. Volvio a uno al quitar el plegado de tablet y escritorio.
    if (flota !== antes) plegarFiltros(comoArranca());
  });

  const plegarFiltros = (plegado) => {
    cajaFiltros.classList.toggle('plegado', plegado);
    btnFiltros.setAttribute('aria-expanded', String(!plegado));
    // La barra cambia de alto al plegar y desplegar; los titulos pegajosos se
    // apoyan en ese alto, asi que hay que volver a medirlo Y rehacer el
    // observador, cuyos margenes salen de esa misma medida.
    medirBarra();
    vigilarTitulosPegados();
  };
  btnFiltros.addEventListener('click', () => plegarFiltros(!cajaFiltros.classList.contains('plegado')));

  // Y se pliega solo al bajar o al tocar fuera, PERO SOLO DONDE FLOTA. Ahi
  // abierto TAPA el contenido, asi que dejarlo abierto mientras se navega es
  // tener media pantalla inutil, y el gesto natural para "ya he elegido" es
  // ponerse a mirar la lista, no volver a buscar el chevron.
  //
  // En escritorio no tapa nada: es una linea mas de la barra, con sitio de
  // sobra. Ahi plegarse solo no resuelve ningun problema y crea uno —los
  // filtros desaparecen sin que nadie los haya cerrado, y para volver a tocar
  // uno hay que ir a buscar el chevron— asi que se queda quieto. El chevron
  // sigue plegandolo a mano en las dos.
  const plegaSolo = () => {
    if (flota && !cajaFiltros.classList.contains('plegado')) plegarFiltros(true);
  };

  // `passive` porque esto no cancela el scroll: solo mira. Sin ello el navegador
  // no puede adelantar el desplazamiento y se nota al arrastrar.
  // El umbral evita que el propio salto de la pagina al plegarse -el contenido
  // sube unos pixeles- cuente como "el usuario ha bajado" en pantallas donde el
  // panel si empuja.
  let desde = window.scrollY;
  window.addEventListener('scroll', () => {
    if (Math.abs(window.scrollY - desde) > 24) plegaSolo();
    desde = window.scrollY;
  }, { passive: true });

  // Fuera de la barra ENTERA, no solo fuera del panel: el chevron vive en la
  // barra y contarlo como "fuera" plegaria y desplegaria en el mismo gesto.
  // `pointerdown` y no `click`: se cierra en cuanto el dedo toca, sin esperar a
  // que levante, que es lo que hace que parezca inmediato.
  document.addEventListener('pointerdown', (ev) => {
    if (!ev.target.closest('.barra-sup')) plegaSolo();
  });

  // El panel "Informacion": los totales y los dos avisos. En una pantalla ancha
  // se ve entero; en un movil ocupaba la pantalla ENTERA, asi que al cargar lo
  // unico que se veia era el resumen y no habia ni rastro de los equipos, que
  // son a lo que viene uno.
  //
  // Es un <dialog>, y donde se ve de una forma o de otra lo decide ENTERO el
  // CSS: en ancho, un bloque mas de la pagina; en estrecho, un modal que abre la
  // linea "Informacion". Aqui no se mide ningun ancho —si se midiera habria dos
  // umbrales que mantener de acuerdo— solo se abre y se cierra.
  const cajaInfo = document.getElementById('cajaInfo');
  const btnInfo = document.getElementById('verInfo');
  if (cajaInfo && btnInfo) {
    // La cabecera del modal la pone el JS y no el HTML de cada liga: es parte
    // del mecanismo y no del contenido, asi que las dos webs no pueden
    // desviarse una de otra sin querer.
    const cabInfo = document.createElement('div');
    cabInfo.className = 'cab-info';
    cabInfo.innerHTML = `<span>Información</span>
      <button type="button" class="cerrar-info" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" aria-hidden="true" data-trazo stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>`;
    cajaInfo.prepend(cabInfo);
    cabInfo.querySelector('.cerrar-info').addEventListener('click', () => cajaInfo.close());

    btnInfo.addEventListener('click', () => cajaInfo.showModal());
    // Pulsar FUERA de la hoja tambien cierra. El ::backdrop no recibe clicks
    // propios —llegan al <dialog>— asi que hay que mirar dos cosas: que lo
    // pulsado sea el dialogo y no algo de dentro, y que el punto caiga fuera de
    // su caja. Lo segundo a solas cerraria tambien al activar el boton con el
    // teclado, que llega como un click en el (0,0).
    cajaInfo.addEventListener('click', (ev) => {
      if (ev.target !== cajaInfo) return;
      const c = cajaInfo.getBoundingClientRect();
      const fuera = ev.clientX < c.left || ev.clientX > c.right
        || ev.clientY < c.top || ev.clientY > c.bottom;
      if (fuera) cajaInfo.close();
    });
  }

  // El globo de cifras de cada tarjeta. Un solo oyente delegado en el contenedor
  // y no uno por tarjeta: las tarjetas se repintan enteras con cada filtro, asi
  // que los oyentes propios habria que volver a colgarlos cada vez.
  const equiposEl = document.getElementById('equipos');
  const cerrarCifras = () => equiposEl.querySelectorAll('.cifras.abierta')
    .forEach((c) => {
      c.classList.remove('abierta');
      c.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  equiposEl.addEventListener('click', (ev) => {
    const boton = ev.target.closest('.info-equipo');
    if (!boton) { if (!ev.target.closest('.cifras')) cerrarCifras(); return; }
    const cifras = boton.nextElementSibling;
    const abierto = cifras?.classList.contains('abierta');
    cerrarCifras();
    if (!abierto) {
      cifras?.classList.add('abierta');
      boton.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', (ev) => { if (!ev.target.closest('.cab')) cerrarCifras(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarCifras(); });

  // Restaurar en el mismo orden en que se encadenan: el grupo y los filtros
  // propios deciden que equipos hay, asi que hay que ponerlos ANTES de poblar el
  // desplegable de equipos. Un valor que ya no exista —un grupo o una provincia
  // sin equipos en esa temporada— se cae solo a "Todos", que es la caida
  // correcta.
  ofrecerRevisar();
  cabeceraTemporada();
  poblarGrupos();
  fGrupo.value = paramsUrl.get('grupo') ?? '';
  poblarPropios();
  for (const filtro of propios) filtro.campo.value = paramsUrl.get(filtro.param) ?? '';
  fMovimientos.checked = paramsUrl.get('movimientos') === '1';
  // Sin transicion de vista: en el primer pintado no hay nada de lo que salir.
  fSolo.checked = paramsUrl.get('anuncios') === '1';
  // La vista de arranque NO se decide aqui: es la PRIMERA <option> que declare
  // la liga en su HTML. El motor solo la pisa si la direccion pide otra, y solo
  // si esa otra existe en el desplegable —por la URL entra cualquier cosa, y un
  // valor inventado dejaria el <select> en blanco—.
  if (fVista && paramsUrl.has('vista')) {
    const pedida = paramsUrl.get('vista');
    if ([...fVista.options].some((o) => o.value === pedida)) fVista.value = pedida;
  }
  // Recortado al rango del propio <input>: por la URL entra cualquier cosa, y un
  // "dias=900" o un "dias=-3" dejarian el campo enseñando un numero que la lista
  // no obedece.
  if (fDias) {
    const pedidos = Math.trunc(Number(paramsUrl.get('dias')));
    // Vacio y no "0": asi se ve el `placeholder`, que dice "todo" con palabras.
    // Un 0 a secas al lado de "ULTIMOS DIAS" se lee como "cero dias", que es lo
    // contrario de lo que hace.
    fDias.value = Number.isFinite(pedidos) && pedidos > 0
      ? String(Math.min(pedidos, Number(fDias.max) || pedidos)) : '';
  }
  document.getElementById('equipos').classList.toggle('solo-activo', fSolo.checked);
  fEquipo.value = paramsUrl.get('equipo') ?? '';
  poblarEquipos();
  pintar();
  // Al final: la transicion no debe correr en el primer pintado.
  cajaFiltros.style.transition = 'none';
  // Va despues de `pintar()` porque `miraSiFlota` necesita la barra ya maquetada
  // para preguntarle su `position`. Antes decia ademas que `comoArranca` leia la
  // URL en canonico; ya no la lee —solo mira si el panel flota— asi que ese
  // motivo se fue con `hayFiltroEnUrl`.
  miraSiFlota();
  plegarFiltros(comoArranca());
  // Al final del arranque: aqui `fVista` ya tiene su valor definitivo y, en el
  // taller, ya se le ha añadido la opcion de Revision. Antes la isla saldria
  // con una opcion de menos.
  pintaIsla();
  requestAnimationFrame(() => { cajaFiltros.style.transition = ''; });
}
