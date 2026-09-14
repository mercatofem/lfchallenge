// Lo propio de LFChallenge Mercato en la pagina.
//
// Todo lo que pinta la web —el semaforo, las dos tablas, el masonry, los
// filtros, la cabecera de temporada— vive en `web/base.js`, que es una copia
// generada de mercato-motor/web/base.js y no se edita aqui. Este fichero solo
// dice QUE liga es, con el mismo criterio del CONTRATO: lo que cambiaria si la
// liga fuese otra entra como dato, nunca como bandera.
//
// Modulo, asi que va diferido: cuando corre, el DOM ya esta.
//
// La liga son DOS grupos de 14, y eso no es un detalle de presentacion: es como
// se lee la competicion. El JSON trae `temporadas[].grupos` ya separados y la
// pagina pinta una rejilla por grupo. De cuantos grupos hay no se entera este
// fichero: lo dice el JSON.

import { arrancar, esc } from './base.js';

// El censo de la FEB viene en mayusculas y sin tildes. Para los datos de ficha
// —puesto, pais— se baja a capitalizado, que es como se lee; el NOMBRE se deja
// tal cual porque es el identificador federativo y conviene que se note.
const capitalizar = (s) => String(s ?? '').toLocaleLowerCase('es')
  .replace(/(^|[\s\-/])([a-záéíóúüñ])/g, (_, sep, letra) => sep + letra.toLocaleUpperCase('es'));

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

// La FEB rellena dorsal y puesto en LF Challenge -al reves que en LF2, donde los
// trae 9 de 209-, asi que aqui esas dos columnas SI valen la pena.
// Por eso NO son columnas. Todo lo que se sepa de cada jugadora va en una linea
// suelta bajo el nombre, y lo que falte simplemente no se escribe: una columna
// vacia en 200 filas es una tabla rota, y llenarla de guiones es peor porque el
// guion parece un dato.
// La nacionalidad solo se dice cuando NO es española: en una liga española lo
// que informa es la extranjera.
const fichaDe = (j) => [
  j.dorsal != null ? `#${esc(j.dorsal)}` : null,
  j.puesto ? esc(capitalizar(j.puesto)) : null,
  j.altura ? `${(j.altura / 100).toFixed(2).replace('.', ',')} m` : null,
  // Viene como dd/mm/aaaa, no en ISO: del año de nacimiento se lee la edad de un
  // vistazo y el dia exacto no aporta nada en una tabla de mercado.
  j.nacimiento ? esc(String(j.nacimiento).slice(-4)) : null,
  j.nacionalidad && norm(j.nacionalidad) !== 'ESPANA' ? esc(capitalizar(j.nacionalidad)) : null,
].filter(Boolean).join(' · ');

await arrancar({
  etiqueta: 'LF Challenge',
  competicion: (d) => d.liga,

  // Cuantas fichas quedan sin una sola noticia. Aqui todos los clubes estan
  // archivados, asi que lo que informa no es cuantos se han mirado sino cuanto
  // silencio queda.
  cuartoTotal: (t) => ['Sin noticia', t.total.sinNoticias],

  // Sin filtro de provincia: LF Challenge es estatal y la provincia no agrupa nada.

  equipo: {
    // El nombre grande es el del EQUIPO inscrito, que es el que la gente
    // reconoce: nadie dice "Agrupacion Deportiva Baloncesto Aviles", dice
    // "Aceites Abril ADBA Sanfer". El del club va arriba y en pequeño porque es
    // el estable, el que cruza temporadas.
    // `etiquetaCorta` cuando la hay: la FEB inscribe a algun equipo con una
    // campaña social pegada al nombre —"MAGEC TIAS LANZAROTE CONTRA LA VIOLENCIA
    // DE GENERO", 50 caracteres— y eso no es como se le llama. Se acorta solo
    // para pintar: la oficial es con lo que se reconoce al club en un anuncio.
    nombre: (e) => e.etiquetaCorta ?? e.etiquetaFEB ?? e.club,
    club: (e) => e.club,
    localidad: (e) => e.localidad,
    pabellon: (e) => e.pabellon,
    // La ficha publica de equipo de la FEB. La FAB no tiene equivalente, asi que
    // esto es propio de las ligas FEB.
    ficha: (e) => e.urlFEB,
    // Los cinco equipos que no jugaron LFCh en 25/26 no tienen ficha de esa
    // temporada y por tanto tampoco escudo: se quedan sin el, que es mas honesto
    // que ponerles el generico y aparentar que todos tienen uno.
    // `escudoComun` PRIMERO: lo pone el catalogo compartido de las tres ligas y
    // es la ultima palabra, para que un club que juegue en dos categorias se vea
    // igual en las dos webs.
    escudo: (e) => e.escudoComun ?? e.escudo,
    // El tinte es la CAMISETA TITULAR de la ficha de club de la FEB: no hay un
    // campo "color", se lee el relleno del SVG de la camiseta.
    tinte: (e) => e.tinte,
    // Dos clubes juegan de BLANCO y un blanco sobre panel claro no se ve. El
    // dato no se toca —es su color— y el arreglo va en el CSS de esta liga.
    tinteClaro: (e) => e.tinteClaro,
    // La web del club NO viene dentro de `redes`: la FEB la da en su propio
    // campo de la ficha de club.
    redes: (e) => ({ instagram: e.redes?.instagram, x: e.redes?.x, web: e.webClub }),
  },

  // La FEB sirve el retrato por URL, pero el nuestro esta BAJADO: `fotoLocal` va
  // primero y la URL remota queda de respaldo para a quien no se le haya bajado.
  // Es la misma linea que LF2 tiene en produccion (web/mercato.js:93), y el `../`
  // no es un descuido: el punto de llamada es `base.js:243`, que en los dos repos
  // resuelve desde la pagina de equipo.
  //
  // Sin esto el build escribia `fotoLocal` en cada fila de plantilla y nadie la
  // leia: 392 retratos bajados y 392 peticiones a imagenes.feb.es por visita.
  foto: (j) => (j.fotoLocal ? `./datos/fotos/${j.fotoLocal}` : j.foto),
  // El retrato FEDERATIVO de quien protagoniza un movimiento, cuando sabemos
  // quien es.
  //
  // `m.foto` primero, que es el retrato que a veces viaja ya resuelto; y si no,
  // se construye con su FICHA, que es lo que de verdad hay: medido, 6 movimientos
  // traen `foto` en LF2 y 0 en LFCh, mientras que 43 y 32 traen `idJugadora`.
  //
  // Aqui decia «no se declara, y no es un olvido: quien llega de fuera no esta en
  // el censo y no tiene retrato federativo». Eso es cierto para quien llega de
  // fuera —y por eso se sigue cayendo a la foto del anuncio, que ademas es la
  // unica pista de su procedencia— pero NO para quien ya jugaba en la categoria.
  // Ines Vieira tiene ficha 2818816 porque jugaba en el Domusa, y salia con el
  // monigote gris: su foto de anuncio es una URL de Instagram que caduca sola, y
  // el dia que caduco no habia nada detras.
  //
  // `fotoLocal` va PRIMERO desde que los retratos se bajan a `datos/fotos/`. Lo
  // pone el build mirando si el fichero está, porque la página no puede mirar el
  // disco. Y las otras dos ramas se quedan: si un retrato no se ha bajado —la
  // FEB no tiene foto de todas— seguimos pidiéndoselo a ellos.
  fotoDelMovimiento: (m) => (m.fotoLocal ? `./datos/fotos/${m.fotoLocal}` : null)
    ?? m.foto
    ?? (m.idJugadora ? `https://imagenes.feb.es/Foto.aspx?c=${m.idJugadora}` : null),

  plantilla: {
    ficha: fichaDe,
    // El nombre enlaza a su ficha en la federacion. El patron lleva DOS ids y en
    // este orden: primero el del EQUIPO y despues el de la jugadora. Probado al
    // reves y devuelve 404, asi que no es intercambiable.
    // Sin `idJugadora` no hay enlace: quien llega de fuera de la categoria no
    // tiene ficha federativa que enseñar todavia.
    enlace: (j, e) => (j.idJugadora && e?.idEquipoAnterior
      ? `https://www.feb.es/competiciones/jugador/${e.idEquipoAnterior}/${j.idJugadora}`
      : null),
  },

  /**
   * Lo que sabemos de un club que NO juega LF2 y sale como procedencia o destino.
   *
   * Sale del catálogo compartido del motor, que junta los escudos de las tres
   * ligas: quien en LF2 es «de fuera» en LFCh o en N1 es un equipo con su escudo
   * ya bajado. El catálogo entero viaja dentro de mercato.json —añadir un club
   * es correr el importador, no tocar este fichero— porque esto se ejecuta en el
   * navegador y no puede leer del motor.
   *
   * La clave va SIN ESPACIOS, igual que en el catálogo. Con ellos, «C.B. ARXIL»
   * da `C B ARXIL` y «CB Arxil» da `CB ARXIL`: dos claves para el mismo club, y
   * el índice existe justo para que eso no pase. Las abreviaturas de club las
   * escribe cada federación como le parece.
   *
   * `alias` es imprescindible: la FEB inscribe con el patrocinador delante y los
   * clubes no lo usan —«FUSTECMA NBF CASTELLÓ» en la ficha, «NBF Castelló» en el
   * anuncio—, y la FAB lo llama de una tercera forma.
   *
   * Nada más listo que eso. Emparejar por parecido acabaría poniéndole a un club
   * el escudo de otro, y eso es peor que dejar el hueco: un escudo equivocado no
   * lo revisa nadie.
   */
  clubDeFuera: (club, d) => {
    const cat = d?.escudosDeFuera;
    if (!cat) return null;
    const clave = String(club ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z0-9]+/g, '');
    const ficha = cat.escudos?.[cat.alias?.[clave] ?? clave];
    return ficha ? { escudo: ficha.fichero, liga: ficha.liga ?? null } : null;
  },

  // C.B. Islas Canarias mete dos equipos en 26/27, uno en LF2 y otro en LF
  // Challenge, y los anuncia por la MISMA cuenta. Lo normal es que el fichaje
  // sea del de Challenge, y no se puede resolver por nombre porque los dos
  // equipos se llaman igual.
  notaCuentaCompartida: 'Este club también tiene equipo en LF Challenge y lo anuncia todo desde la misma cuenta: un movimiento de aquí abajo puede ser de ese otro equipo. Lo dudoso va marcado en ámbar y se revisa a mano.',
});
