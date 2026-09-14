/* GENERADO — NO EDITAR AQUI.
   Copia de mercato-motor/web/revision.js. Se reescribe sola cada vez que se sirve o se publica el
   sitio, asi que cualquier cambio hecho en este fichero se pierde sin avisar.
   Lo compartido se toca en el motor; lo propio de esta liga, en web/mercato.js. */
// Quien decide si un movimiento esta VERIFICADO.
// =====================================================================
// Vive aparte de base.js porque lo necesitan los DOS lados: el navegador,
// para pintar el ambar y la vista REVISAR, y `sitio.mjs` en Node, para dejar
// fuera de `publico/` lo que no esta verificado. Escrito dos veces se
// separan, y eso ya paso hoy mismo con la cobertura: la misma cuenta en dos
// sitios, arreglada en uno.
//
// Sin una sola linea de DOM, a proposito: es la condicion para que Node lo
// pueda importar tal cual.
//
// Viaja a <repo>/web/revision.js por el mismo camino que base.css y base.js
// (compartido.mjs). Esa copia esta gitignorada y NO se edita.

// Verde = seguro, ambar = hay que mirarlo. El motivo se dice, no se deja adivinar.
// Cuando el servidor sabe POR QUE algo es ambiguo, manda su explicacion: en un
// club que comparte cuenta con su equipo de otra categoria el motivo real no es
// "encaja con varias" sino "puede no ser de este equipo".
//
// Una letra de diferencia se marca SOLO cuando es lo unico que sujeta el cruce.
// Estuvo sin marcar nunca, con este razonamiento escrito aqui: «suele ser una
// errata al dar de alta la ficha en la federacion —el censo dice DE COZAS y el
// club escribe de Cozar— y no hay nada que decidir ahi». La primera mitad es
// cierta y por eso la holgura sigue existiendo; la segunda es la que costo cara.
// Con un solo apellido y una letra bailada SI hay algo que decidir, porque
// GOMEZ y GAMEZ no son una errata: son dos apellidos distintos. Mostoles
// anuncio "FICHAJE ... ¡Bienvenida!" de Marta Gomez y salio como RENOVACION de
// Marta Gamez, con confianza alta y sin un solo aviso.
// Cuando encajan dos apellidos, o uno exacto, sigue sin marcarse: ahi la letra
// bailada es un detalle y no el cruce entero.
// Un solo nombre con letras: «Maite», «Syd». Las iniciales y los signos no cuentan.
const soloPila = (nombre) => String(nombre ?? '').trim().split(/\s+/)
  .filter((w) => w.replace(/[^\p{L}]/gu, '').length > 1).length === 1;

export const revisar = (m) => {
  if (m.revisadoManualmente || m.confianza === 'confirmada') return null;
  // Son DOS dudas distintas y el motor las separa: `ambiguo` es no saber de que
  // EQUIPO es el anuncio —solo pasa donde una cuenta lleva dos equipos— y
  // `ambiguoNombre` es saber el equipo pero no a cual de dos jugadoras cita.
  // Mientras compartieron bandera, renovaciones de clubes con un solo equipo
  // salian avisando de que podian ser "del otro equipo del club", que no existe.
  if (m.ambiguo) return m.motivoAmbiguo ?? 'no se sabe de cuál de los dos equipos del club es';
  if (m.ambiguoNombre) return 'encaja con más de una jugadora';
  // Lo unico que sujeta el cruce es un apellido con una letra cambiada. Puede
  // ser una errata de la ficha federativa —para eso existe la holgura— o puede
  // ser OTRA jugadora con un apellido parecido. Lo decide una persona.
  if (m.soloPorLetraBailada) return 'el apellido baila una letra: confirma que es ella';
  // El club anuncio un fichaje con todas las letras y el censo dice que ya
  // estaba en la plantilla. Una de las dos fuentes se equivoca, y elegir en
  // silencio es lo que dejo un "FICHAJE ¡Bienvenida!" pintado como RENOVACION.
  // ...SALVO QUE SEA DE LA CANTERA, donde eso NO es una contradiccion: es la
  // forma normal de una subida. La que sube del junior de casa lleva un año
  // figurando en la plantilla del club, y el club la presenta con las palabras
  // de un fichaje —«la incorporacion de Lucia Gajete»— porque para el primer
  // equipo es nueva. Las dos fuentes dicen la verdad y no hay nada que decidir.
  //
  // Lo vio Luismi en la vista de Revision de N1: Lucia Gajete, con su pastilla
  // de cantera y su «Sube al N1» ya pintados en la misma fila, pedia turno con
  // «el club lo anuncia como fichaje pero ya figuraba en su plantilla». La fila
  // se contradecia a si misma.
  if (m.reclasificadoContraElAnuncio && !(m.cantera === true || m.procedeDeCantera)) {
    return 'el club lo anuncia como fichaje pero ya figuraba en su plantilla';
  }
  if (m.degradadaPorRevisionManual) return 'la cuenta es compartida: puede ser del otro equipo del club';
  // ── UN NOMBRE DE PILA SUELTO NO SALE A LA WEB (13-09-2026) ────────────────
  //
  // «Maite ficha por CB Ciudad de Dos Hermanas» llego al Telegram PUBLICO. El
  // fichaje era real, pero sin apellido no se sabe quien es: no se puede cruzar
  // con nadie, no deriva la baja en su club de origen y no se distingue de
  // cualquier otra Maite. Es una duda, y las dudas se miran antes de publicar.
  //
  // La fila no se pierde: se queda en el taller, con este motivo, hasta que el
  // cartel, el cruce o una persona le pongan el apellido. Las escritas a mano y
  // las revisadas no pasan por aqui: la primera linea de `revisar` ya las deja.
  if (!m.identificada && !m.manual && soloPila(m.nombreCorregido ?? m.jugadora ?? m.citadoComo)) {
    return 'solo el nombre de pila: falta saber quién es';
  }
  if (m.genero === 'dudoso') return 'no se puede saber si es jugadora o jugador';
  if (m.confianza !== 'alta') return 'señal débil';
  return null;
};

/**
 * «(*) Movimiento por confirmar por Gemini» (Fran, 24-09-2026).
 *
 * La fila la decidieron solo las regex porque el modelo no habia leido el post
 * (cuota, 503, o el calentado no llego). NO es un motivo de revision y no se
 * poda: se publica igual, que la velocidad manda (Luismi, 11-09), pero dice que
 * falta el visto bueno del modelo. La siguiente pasada que lo lea la quita.
 *
 * Y no se marca lo que ya confirmo OTRA fuente mejor que el modelo: la
 * plantilla oficial o una revision (`confianza: 'confirmada'`), una persona
 * (`revisadoManualmente`) o un manual. Medido el 24-09: de 8 filas sin
 * veredicto en las tres ligas, 7 eran renovaciones ya confirmadas por la
 * plantilla (El Palo 25/26, Salliver); la que queda es Alexia Salvado.
 */
export const porConfirmarPorGemini = (m) => Boolean(m?.porConfirmar)
  && m.confianza !== 'confirmada' && !m.revisadoManualmente && !m.manual;

/**
 * Por que hay que mirar esta fila, en una frase, o null si no hay nada que mirar.
 *
 * Junta las DOS familias de duda, que hasta ahora vivian separadas: la del cruce
 * —de eso se encarga `revisar`— y la de la procedencia, que es saber quien ficha
 * pero no de donde viene. Las dos se revisan a mano y las dos se podan al armar
 * `publico/`, asi que para la vista REVISAR son la misma cosa.
 */
export const motivoDeRevision = (m) => revisar(m)
  // AQUI VIVIO UN TERCER MOTIVO Y DURO UNAS HORAS: «el club dice X y su ficha
  // dice Y». Se quito porque nunca hubo nada que decidir.
  //
  // Los tres unicos casos que produjo los repaso Luismi y los tres iban para el
  // mismo lado —la ficha—, cada uno por un motivo distinto: una recapitulacion
  // de carrera de la que cogimos un club del medio, un anuncio equivocado, y un
  // «procedent del Castello» que era cierto pero contaba de donde llego en
  // ENERO, no de donde venia esa renovacion. Tres formas de que una frase cierta
  // produzca una procedencia falsa, y ninguna se distingue leyendo el texto.
  //
  // Asi que `confirmarProcedenciaConLaFicha` corrige y no pregunta, y lo que
  // dijo el anuncio queda en `procedenciaSegunElAnuncio` por si hay que
  // desmentirnos. Una pregunta cuya respuesta es siempre la misma no es una
  // pregunta: es trabajo que le pasamos a una persona sin necesidad.
  //
  // Y CON LA MISMA EXCEPCION QUE `faltaElOtroExtremo`, que aqui faltaba: a quien
  // sube de la CANTERA no se le busca origen, asi que tampoco se le avisa de que
  // el origen es dudoso. Maria Isabel Alemany, canterana del La Salle, pedia
  // turno con «se parece a una del censo pero no encaja del todo: CASTILLO DIAZ,
  // MARIA» — y esa candidata esta hecha con SUS PROPIOS trozos: CASTILLO es su
  // segundo apellido y MARIA parte de su nombre. La fila ya decia «Sube al N1»
  // y llevaba su pastilla de cantera.
  ?? ((m.origenDudoso && !(m.cantera === true || m.procedeDeCantera))
    ? `procedencia: ${m.origenDudoso}` : null);

/**
 * El movimiento esta bien pero le falta el otro extremo: de donde viene un
 * fichaje, a donde se va una baja. No lo dijo el anuncio y no lo supo deducir
 * nadie, asi que se averigua a mano.
 *
 * La cantera NO cuenta: ahi la procedencia es el propio club y ya se dice.
 */
export const faltaElOtroExtremo = (m, { cerrada = true } = {}) => {
  // Quien sube de la cantera NO tiene procedencia que buscar: viene de casa.
  //
  // Y se pregunta por los DOS campos, que es como lo hace `esCantera` en la
  // pagina: `procedeDeCantera` lo deduce el detector del texto y `cantera` lo
  // dice el censo —o una persona en la revision, que es el unico camino para
  // quien sube y no figura en ningun censo—. Mirando solo el primero, Luna Liern
  // y Tamara Toledo seguian pidiendo procedencia despues de marcarlas a mano.
  const deCasa = Boolean(m.procedeDeCantera) || m.cantera === true;
  // El origen puede venir por DOS caminos y hay que mirar los dos: `procedencia`
  // es lo que dijo el anuncio y `vieneDe` lo que dedujo el cruce con el censo.
  // Son los MISMOS dos campos que mira `frase()` para pintar la fila, y tienen
  // que serlo: mirando solo el primero, la fila enseñaba "CIUDAD DE HUELVA ->
  // CD TÉCNICOS AL-ÁNDALUS" y debajo "falta la procedencia: nadie ha dicho de
  // dónde viene". Siete de las nueve que pedian turno en la vista REVISAR la
  // tenian delante.
  //
  // Y no es que el aviso sobrara en esas siete: es que pedia a mano un dato que
  // ya estaba, con lo cual la lista de pendientes deja de servir para lo que
  // esta, que es decir donde falta trabajo de verdad.
  const origen = m.procedencia ?? m.vieneDe?.club;
  // Y LA QUE VUELVE NO VIENE DE NINGUN CLUB, que es el simetrico de `retirada`
  // y faltaba.
  //
  // Lo vio Luismi el 04-09 sobre dos altas del B.F. Leon: «ambas vuelven de
  // Erasmus, asi que tecnicamente son fichajes porque no estaban el año
  // anterior, pero no vienen de ningun otro club porque simplemente han dejado
  // de jugar un año, asi que NO falta la procedencia». Y tiene razon: en esa
  // fila no hay un dato pendiente de buscar, hay una respuesta.
  //
  // La baja tenia su escape desde el principio -«quien se retira no tiene
  // destino que buscar, y esa es la respuesta»- y el alta no tenia el suyo, asi
  // que estas filas se quedaban pidiendo a mano un club que no existe. Un año de
  // Erasmus, una lesion larga, una maternidad o un año sabatico son todos el
  // mismo caso.
  //
  // No se deduce: el anuncio de una que vuelve se parece al de cualquier otro
  // fichaje. Lo marca una persona en `revisiones.json` con `regresa: true`.
  if (m.tipo === 'alta' && !origen && !deCasa && !m.regresa) return 'falta la procedencia: nadie ha dicho de dónde viene';
  // Quien se retira no tiene destino que buscar, y esa es la respuesta.
  //
  // Y el destino solo se echa en falta en una temporada CERRADA. En la que esta
  // en curso, una baja sin destino no es un hueco: es que todavia no ha fichado
  // por nadie, o su club nuevo no lo ha anunciado. En pleno verano eso son casi
  // todas, y pedirlas a mano es pedir un dato que aun no existe.
  if (!cerrada) return null;
  // Lo mismo por el otro lado: el destino lo dice el anuncio (`destino`) o lo
  // deduce el cruce cuando otro club la ficha (`vaA`).
  const salida = m.destino ?? m.vaA?.club;
  if (m.tipo === 'baja' && !salida && !m.retirada) return 'falta el destino: nadie ha dicho a dónde va';
  return null;
};

/**
 * El alta esta, la procedencia esta, pero NO SE SABE QUIEN ES: el nombre citado
 * no se cruzo con ninguna ficha del censo.
 *
 * Solo ALTAS. En una baja de la temporada en curso no saber la ficha es lo
 * normal —muchas veces la citan por el apodo al despedirla y no hay a donde
 * mirar— y ademas su destino todavia no existe, asi que pedirla a mano es pedir
 * trabajo que no se puede hacer. En un alta si: alguien acaba de fichar, hay una
 * plantilla nueva contra la que cruzar y, si no sale, se pone a mano.
 *
 * Que tenga procedencia NO la salva. Son dos datos distintos: la procedencia la
 * dice el anuncio ("llega del CB La Palma 95") y la identidad la da el censo. Se
 * puede saber de donde viene alguien y no saber quien es, y en ese estado el
 * fichaje no se puede seguir de una temporada a otra.
 *
 * Y no se pregunta cuando NO HAY DONDE MIRAR. Quien llega de la NCAA no esta en
 * ningun censo nuestro; el cruce no ha fallado, es que no existe la lista. El
 * motor lo marca con `sinCensoDondeCruzar` y aqui se calla: la fila se queda con
 * su procedencia, que es lo unico que de verdad se sabe.
 */
export const sinIdentificar = (m) => (m.tipo === 'alta' && m.identificada === false && !m.sinCensoDondeCruzar
  ? 'no se ha cruzado con ninguna ficha: confirma quién es'
  : null);

/**
 * El texto del anuncio y el censo no dicen el mismo club de origen.
 *
 * ── POR QUE PIDE TURNO Y NO SE DECIDE SOLO (01-09, N1) ─────────────────────
 *
 * Cuando los dos discrepan manda el censo, y esta bien medido: comparando texto
 * con texto salian cinco contradicciones y tres eran el nombre comercial contra
 * el oficial. Pero la decision se tomaba EN SILENCIO. El texto perdedor se
 * guardaba en `procedenciaSegunElTexto` y no lo enseñaba nadie —ni la web ni la
 * vista de Revision—, asi que el unico caso en que el censo se equivoca era
 * indistinguible de los que acierta.
 *
 * Lo pidio Luismi: «igual que tenemos "nadie dice de dónde viene", podemos tener
 * "la procedencia del texto y del censo no cuadran al 100%"».
 *
 * ── Y VA AQUI, NO EN `motivoDeRevision` ────────────────────────────────────
 *
 * Porque aquella DESPUBLICA la fila entera, y lo que esta en duda es UN CAMPO.
 * El fichaje es cierto —lo dice su club— y esconderlo por no saber de donde
 * viene seria el mismo error que ya esta escrito abajo para las altas sin
 * procedencia. Aqui la fila se publica y ademas pide turno.
 *
 * ── Y NO ES EL MOTIVO QUE SE QUITO, aunque se le parezca ───────────────────
 *
 * Arriba, en `motivoDeRevision`, esta escrito que un tercer motivo -«el club
 * dice X y su ficha dice Y»- vivio unas horas y se retiro porque «nunca hubo
 * nada que decidir»: sus tres casos iban todos para el mismo lado, la ficha.
 * Aquella pregunta comparaba el anuncio con la FICHA de la FEB; esta compara el
 * anuncio con el CRUCE DEL CENSO, que es otro mecanismo y otra fuente.
 *
 * Pero el test que la tumbo hay que pasarlo igual —«una pregunta cuya respuesta
 * es siempre la misma no es una pregunta»—, asi que se mide antes de ponerla.
 * En N1 son dos filas y van para lados DISTINTOS:
 *
 *   · «CBC Moguer» vs «CB CIUDAD DE MOGUER» -> gana el censo: es el mismo club
 *     y la comparacion por clave no lo ve («CBCMOGUER» no contiene
 *     «CBCIUDADDEMOGUER»)
 *   · «CB La Mojonera» vs «CADIZ CB GADES»  -> gana el TEXTO: lo canto Luismi
 *     mirando la web
 *
 * Dos casos, dos respuestas contrarias. Eso es una pregunta de verdad. El dia
 * que se acumulen varias y todas caigan del mismo lado, esto sobra y se quita
 * como se quito aquella.
 */
export const procedenciaEnDisputa = (m) => (m.procedenciaSegunElTexto && m.procedencia
  && m.procedenciaSegunElTexto !== m.procedencia
  ? `el anuncio dice «${m.procedenciaSegunElTexto}» y el censo «${m.procedencia}»: decide cuál`
  : null);

/**
 * Nadie ha corroborado esto NUNCA: el único apoyo es el post.
 *
 * ── POR QUE (01-09, N1) ────────────────────────────────────────────────────
 *
 * Inventariado en qué se apoya cada movimiento publicado —seis apoyos posibles:
 * cruza con el censo, lo miró una persona, sale en dos redes, dice de dónde o
 * adónde, está en la plantilla, o la confianza es `confirmada`— salió esto:
 *
 *     0 apoyos:   1        4 apoyos:  51
 *     1 apoyo :   9        5 apoyos:  26
 *     2 apoyos:  25        6 apoyos:   9
 *     3 apoyos:  81
 *
 * 192 de 202 se apoyan en DOS cosas o más. La vía de publicación no esta
 * soltando basura, y conviene decirlo porque la sospecha del dia era la
 * contraria: los dos defectos reales de hoy -«Campeonato del Mundo» y Barbara
 * Carcelen- ya estan cazados y no queda ninguno mas en ese estado.
 *
 * Pero UNA fila no tiene ningun apoyo, y ademas es del tipo que nadie mira: una
 * RENOVACION. `sinIdentificar` solo pregunta por las altas -ahi tiene sentido,
 * una renovacion de alguien del censo se cruza sola- y por eso una renovacion
 * que NO cruza con nadie se publica y no pide turno jamas.
 *
 * ── NO SE DESPUBLICA, SE PREGUNTA ──────────────────────────────────────────
 *
 * Va en `pendienteDeMano` y no en `motivoDeRevision` por el mismo motivo que la
 * procedencia en disputa: la fila es probablemente cierta —su post dice «Hoy os
 * presentamos a Laura Roldan»— y esconderla seria perder un fichaje real por no
 * tener el censo al dia. Lo que falta no es credibilidad: es que nadie lo ha
 * mirado ni una vez.
 *
 * ⚠️ LF2/LFCh: esto NO es la compuerta de esta mañana y no borra nada, solo
 * pide un vistazo. Pero medid el volumen antes de fiaros: vosotros ficháis
 * fuera, y una fichada extranjera recien llegada puede no tener ninguno de los
 * seis apoyos siendo perfectamente cierta. Si os salen decenas, el umbral
 * tendra que ser vuestro.
 */
export const sinCorroborar = (m) => {
  // ── SOLO RENOVACIONES, y el motivo NO es el volumen (01-09) ──────────────
  //
  // Lo midio LF2/LFCh con estas mismas funciones. De sus 25 filas sin ningun
  // apoyo, 8 -las altas- ya las cazaba `sinIdentificar`, como estaba previsto.
  // Pero las 5 BAJAS no, y ahi esta lo que hace falta acotar:
  //
  //   `faltaElOtroExtremo` NO pide destino en temporada abierta, y lo dice con
  //   todas las letras: «en curso, una baja sin destino no es un hueco: es que
  //   todavia no ha fichado». Es una decision tomada a proposito.
  //
  // Sin acotar, esto las volveria a pedir por la puerta de atras: la misma
  // pregunta que otra regla decidio NO hacer, colada de rebote por un motivo
  // que va de otra cosa. Una regla que reabre lo que otra cerro a proposito
  // envejece mal, y ademas convierte una decision en un accidente.
  //
  // El argumento es de LF2/LFCh y es mejor que el del numero: 17 sobre una cola
  // de 14 habria sido asumible, asi que no se acota por caber, se acota por no
  // pisar.
  //
  // Lo que queda es exactamente el hueco que nadie mira: las altas las cubre
  // `sinIdentificar`, las bajas son una decision, y las RENOVACIONES no las
  // pregunta nadie. Delta medido: N1 1 · LF2 12 · LFCh 0.
  if (m.tipo !== 'renovacion') return null;
  // Y NO SE PIDE LO QUE NO SE PUEDE RESOLVER MIRANDO.
  //
  // La misma exencion que `sinIdentificar` lleva escrita ahi arriba, que aqui
  // faltaba. Si el club no tenia plantilla el año anterior, NINGUNA de sus
  // renovaciones puede cruzar con nadie: no es que el cruce falle, es que no
  // existe la lista. Pedirle a una persona que lo «corrobore» es pedirle algo
  // que no puede hacer por mucho que mire.
  //
  // Lo destapo LF2: sus 12 eran de dos clubes que no jugaron alli en 25/26. Y en
  // N1 la unica que pedia turno era del Candray, que tampoco tuvo equipo.
  if (m.sinCensoDondeCruzar) return null;
  const apoyos = [
    m.identificada === true,
    Boolean(m.revisadoManualmente),
    (m.fuentes ?? []).length > 1,
    Boolean(m.procedencia || m.destino),
    Boolean(m.venaDeLaPlantilla),
    m.confianza === 'confirmada',
  ].filter(Boolean).length;
  return apoyos === 0 ? 'nadie lo ha corroborado: solo está el anuncio' : null;
};

/**
 * Todo lo que queda por hacer a mano en una fila. Es lo que filtra la vista
 * REVISAR, y SOLO eso.
 *
 * Deliberadamente NO es `motivoDeRevision`, aunque lo incluya, porque esa otra
 * decide ademas lo que no se publica. Un alta sin procedencia esta verificada
 * —la jugadora ficho y lo dice su club— y sale en la web como las demas: lo
 * unico que le falta es un dato secundario. Podarla seria esconder un fichaje
 * real, y son 62 en la 25/26 de LF2.
 *
 * Dicho al reves: `motivoDeRevision` es "esto puede estar MAL", y esto de aqui
 * es "esto esta pendiente", que es lo que quiere ver quien se sienta a revisar.
 */
export const pendienteDeMano = (m, opciones) => motivoDeRevision(m)
  // Una fila que ya miro una persona no vuelve a pedir turno, aunque siga
  // incompleta. A veces la respuesta ES que no se sabe: Clitan de Sousa se fue
  // de Real Canoe a un equipo de fuera de la FEB, no hay ficha federativa que lo
  // diga y a la liga no le afecta. Sin esto, lo unico que se podia hacer con esa
  // fila era dejarla en la lista para siempre.
  ?? (m.revisadoManualmente ? null : (faltaElOtroExtremo(m, opciones) ?? sinIdentificar(m) ?? procedenciaEnDisputa(m) ?? sinCorroborar(m)));

/**
 * Los campos que leen las dos funciones de arriba. Nada mas, y nada menos.
 *
 * Existe porque el movimiento viaja RECORTADO a algun sitio: la fila de
 * plantilla no lleva el objeto entero —seria duplicar el texto del anuncio por
 * cada jugadora— sino un puñado de campos elegidos a mano. Ese puñado se quedo
 * corto y no se vio: Nerea Soler y Marta Fernandez salian marcadas en la vista
 * de Revision y limpias en la tarjeta de su equipo, porque a su copia le
 * faltaba `reclasificadoContraElAnuncio`.
 *
 * Declarada AQUI, al lado de quien los usa, para que añadir una duda nueva sea
 * un solo sitio. Copiarla al recortar es responsabilidad de quien recorta.
 */
export const CAMPOS_DE_REVISION = [
  'confianza', 'revisadoManualmente', 'ambiguo', 'motivoAmbiguo', 'ambiguoNombre',
  'soloPorLetraBailada', 'reclasificadoContraElAnuncio', 'degradadaPorRevisionManual',
  'genero', 'origenDudoso',
  // Las dos de `procedenciaEnDisputa`. Sin ellas la copia recortada de la fila
  // de plantilla no puede ver el desacuerdo y la marca sale solo a medias.
  'procedencia', 'procedenciaSegunElTexto',
  // Las de `sinCorroborar`. `identificada` y `confianza` ya estaban.
  'fuentes', 'destino', 'venaDeLaPlantilla',
];
