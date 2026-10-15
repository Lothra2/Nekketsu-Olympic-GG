# Estado del pedido a PixelForja

Lo actualiza el lado del juego cuando Rick aprueba un lote. La fuente de verdad de lo entregado es `docs/olimpico/<lote>/ENTREGA.md` en `main` de PixelForja: si existe ahí, el lote está entregado aunque esta tabla esté atrasada.

Estados: `pendiente`, `en curso`, `entregado`, `aprobado`.

## Lotes

| Orden | Lote | Qué | Depende de | Estado | PR |
|---|---|---|---|---|---|
| 1 | A | Datos por cuadro, filas, atlas, retratos, vestuario por pack | Nada | aprobado, en main | [pixel_forja#7](https://github.com/Lothra2/pixel_forja/pull/7) |
| 2 | B1 + D1 | Levantar y lanzar, agarres, armas del piso | A | aprobado, en main | [pixel_forja#8](https://github.com/Lothra2/pixel_forja/pull/8) |
| 3 | C1 | Familia GG e Instituto Nekketsu | A | aprobado, en main | [pixel_forja#9](https://github.com/Lothra2/pixel_forja/pull/9) |
| 4 | G1 fuentes | Acentos del vietnamita en las fuentes | Nada | aprobado, en main | [pixel_forja#10](https://github.com/Lothra2/pixel_forja/pull/10) |
| 5 | I inicial | Kit a medida por configuración | A | aprobado, en main | [pixel_forja#11](https://github.com/Lothra2/pixel_forja/pull/11) |
| 6 | E1 | Sistema de escenarios oblicuos + `saigon_hem` | A, I, layout de `saigon_hem` | aprobado, en main | [pixel_forja#14](https://github.com/Lothra2/pixel_forja/pull/14) |
| 7 | F | Efectos (y audio por configuración) | Nada | aprobado, en main | [pixel_forja#12](https://github.com/Lothra2/pixel_forja/pull/12) |
| 8 | G1, H1 | Resto de interfaz y audio de la rebanada vertical | Nada | entregado, falta la aprobación de Rick | [pixel_forja#13](https://github.com/Lothra2/pixel_forja/pull/13) |
| 9 | B2, C2, D2, E2 | Cross Country completo y equipos nacionales | E1 | E2 en curso: fichas de arte en puerta 1, faltan las postales y el PR (rama `claude/olimpico-lote-e2`) | |
| 10 | B3, E3 | Obstáculos, Tama-wari, Kachinuki | E1 | pendiente | |
| 11 | B4, E4 | Pruebas de 1992 | E1 | pendiente | |
| 12 | G2, H2 | Envoltorio y audio completo | | G2 y H2_CORTO en el juego; falta el resto de H2 | [#48](https://github.com/Lothra2/pixel_forja/pull/48), [#49](https://github.com/Lothra2/pixel_forja/pull/49) |
| 13 | B5, E5 | Pruebas de pelota | E1 | pendiente | |
| 14 | B6, B7, C3, E6 | Tradicionales, técnicas, secretos y Barrio Nekketsu | E1 | pendiente | |
| 15 | J | Estudio | Todo | pendiente | |

## Lotes recientes, ya en el juego

| Lote | Qué | Estado | PR |
|---|---|---|---|
| G1H1 | Interfaz retro (botones, barras, banners, marcador de TV, diálogo) y audio H1 | en el juego | [pixel_forja#13](https://github.com/Lothra2/pixel_forja/pull/13) |
| D2 | Vehículos en la vista inclinada (ferry, motos, xích lô, jacintos, fruta) | en el juego | [pixel_forja#20](https://github.com/Lothra2/pixel_forja/pull/20) |
| H6, H7 | Ambientes de cada mundo y acorde de victoria de cada equipo | en el juego | [#38](https://github.com/Lothra2/pixel_forja/pull/38), [#39](https://github.com/Lothra2/pixel_forja/pull/39) |
| B4B6, B4B6 bis | vault_fail, bateo, dodge_jump, tejo_throw y el judo completo | en el juego | [#40](https://github.com/Lothra2/pixel_forja/pull/40), [#41](https://github.com/Lothra2/pixel_forja/pull/41) |
| B7H8 | 13 súper golpes y 3 ambientes | en el juego | [#42](https://github.com/Lothra2/pixel_forja/pull/42) |
| B7 | Técnicas de equipo, dodge_catch, beach_run, traffic_dodge | en el juego | [#43](https://github.com/Lothra2/pixel_forja/pull/43) |
| E4 | Las 8 canchas a 800 de ancho | en el juego | [#44](https://github.com/Lothra2/pixel_forja/pull/44) |
| D3 | Motos y xích lô a escala de atleta | en el juego | [#45](https://github.com/Lothra2/pixel_forja/pull/45) |
| rayo_cielo | El relámpago vertical | en el juego | [#46](https://github.com/Lothra2/pixel_forja/pull/46) |
| RAYO_PUNTA | El punto `impacto` en la punta de `javelin_rayo` | en el juego | [#47](https://github.com/Lothra2/pixel_forja/pull/47) |
| H2_CORTO | trueno, furro, corneta_moto y los ambientes mercado, río y estadio | en el juego | [#48](https://github.com/Lothra2/pixel_forja/pull/48) |
| G2 | El envoltorio: retratos a 96, medallas, banderas, podio, íconos, tarjetas, VS de 4 y pantallas | en el juego | [#49](https://github.com/Lothra2/pixel_forja/pull/49) |
| VS2 | marco_vs_2, el VS de 1 contra 1 | en el juego | [#50](https://github.com/Lothra2/pixel_forja/pull/50) |
| CINTA | cinta_16 y cinta_32, el cuarto puesto | en el juego | [#51](https://github.com/Lothra2/pixel_forja/pull/51) |
| GIRA | mapa_gira, la ruta del avión, mapas de región y sellos | en el juego | [#52](https://github.com/Lothra2/pixel_forja/pull/52) |
| INTRO | azotea con Kenji de espaldas, Bogotá, Maracaibo y el desayuno | en el juego | [#53](https://github.com/Lothra2/pixel_forja/pull/53) |
| AJUSTES | la rosa del mapa, la presentación de los rivales y Rick con parted2 | en el juego | [#54](https://github.com/Lothra2/pixel_forja/pull/54) |

## Lo último del lado del juego
- **AJUSTES (#54) en el juego** y el submódulo en el main de PixelForja (e69797f, con #50 a #54). #54 estaba abierto: pasó la suite completa (567 de 567) sobre main y el juego lo unió. El artifact sigue en 500.
  - La rosa del mapa en (513, 235): ya no choca con la barra del pasaporte. Nada que cambiar en el juego.
  - Bogotá y Maracaibo, cada una con sus `huecos` (en y 132): la escena, `ui_intro_presentacion`, los retratos de bloques a 1 en silueta (`setTintFill(0x14101e)`) y después revelados, el nombre corto centrado en x = hueco + 48 - 80 y en y = `nombres` (252), y en Bogotá la lluvia encima.
  - **Lo que no calzó:** la placa mide 104 y DON HERNANDO a 1,5 mide 108. El juego lo baja a 1 (cabe, pero se lee chiquito). ABUELA NERVA a 1,5 mide justo 104. Para que DON HERNANDO salga a 1,5 la placa tendría que medir 110 o más.
  - Los retratos siguen siendo los de bloques del juego; no se usan los grande_* del kit.

- **VS2, CINTA, GIRA e INTRO en el juego**, generados desde una unión local de los PR #50 a #53. **Los cuatro siguen abiertos y chocan entre sí:** salieron del mismo main (91f6d48) y cada uno suma su parte a las mismas listas (`UI_PARTS`, `PARTES_ENVOLTORIO`, el tipo `ui` de la configuración, el esquema, KIT_A_MEDIDA.md, INTERFAZ.md, el ejemplo de `kit.config.json` y los conteos de `custom.test.ts` y `ui_audio.test.ts`). Todos los choques son uniones: con los cuatro juntos la suite pasa 566 de 566. Forja los unió después en su main.
  - `kit.config.json` suma `ui.gira.paradas` (tokio, saigon, bogota, caracas) e `ui.intro.espaldas` (kenji). El artifact sigue en 500.
  - **VS de 1 contra 1:** el 1v1 y el judo usan `vs2()` con `ui_marco_vs_2` en x -80; cada retrato `grande_enojo` en su hueco menos 80, en (150, 150) y (490, 150), el de la derecha volteado; la prueba en `texto`, VS en `vs`, nombres en 246 y frases en 268. El 4v4 sigue con el de 4.
  - **Cinta:** `ui_cinta_32` en (170, y) para el cuarto de la tabla de resultados, sin círculo ni número.
  - **Mapa de la gira:** `ui_mapa_gira` en x -80 dentro del contenedor del zoom; `ui_mapa_gira_ruta` encima, destapada con una máscara que sigue al zoom; el avión vuela por `tramos[i]` menos 80. Los sellos son `ui_sellos_pasaporte` con su cuadro, el país y GIRA NEKKETSU a 1 en `texto`, con su tinta. `mapa_vietnam` y `mapa_colombia_venezuela` quedan sin conectar hasta que Rick decida el medallero en el mapa.
  - **Intro:** la azotea con `ui_intro_azotea` y Kenji de espaldas animado con su `ancla` en (380, 334), el diálogo arriba; cuando se voltea queda el sprite de frente a escala 3. El desayuno abre la toma de la Familia: fondo, los cuatro retratos y la mesa animada; Alana grita que Thor se comió su arepa (cara de susto) y Rick y Sophie se burlan. Después de la ruta, dos tomas nuevas de 1,5 s: los Rolos en Bogotá con lluvia y los Maracuchos en Maracaibo, en silueta y después de color.
  - **Rick:** su ficha (`data/fichas/rick.ficha.json`) pasa del peinado `swept_back` (sale de `high_and_tight`, con los lados rapados) a `parted2`, con pelo a los lados. Lo pidió Rick.
  - **Lo que no calzó (para Forja):**
    1. La rosa de los vientos de `mapa_gira` está en (512, 297) del 800 y la barra del pasaporte del juego empieza en y 311: la mitad de abajo de la rosa queda tapada. Subirla a y 270 o menos, o moverla a la esquina de arriba a la derecha.
    2. `intro_maracaibo` no trae `huecos`: el juego usa los de `intro_bogota` (188, 296, 404 y 512, en y 150). Hace falta `huecos` propios, o sprites en `malecon`.
    3. En `intro_bogota` los huecos (y 150 a 246) caen sobre el techo de la buseta (y 236): los retratos, cortados en el pecho, quedan flotando. Igual en Maracaibo sobre la baranda. Un marco o una franja detrás de cada hueco lo resolvería.
  - **Retratos grandes en pixel otra vez:** a Rick no le gustan los redibujados a 96 de G2 y prefiere los de bloques. El juego los rehace al cargar (`retratosPixel` en `src/core/kit.ts`): cada grande es su chico de 40 recortado a 32 x 32 desde (4, 1) y agrandado x3 a bloques, que es exactamente como salían antes (cero pixeles distintos contra la hoja vieja). Vale con cualquier kit. Con eso también se fue la boca de enojo que parecía bigote.
  - Probado con `scripts/prueba-intro2.mjs`.

- **RAYO_PUNTA, H2_CORTO y G2 en el juego** (pixel_forja `main` en 91f6d48: #47 a #49). `equipos.json` lleva `bandera` y `escudo` en los 6 equipos; el kit suma `trueno`, `furro` y `corneta_moto` y los ambientes `mercado`, `rio` y `estadio`. El artifact queda en 500 archivos: los 6 audios son lo único nuevo, todo G2 va en `ui/paquete.wasm`.
  - **RAYO_PUNTA:** `puntaJabalina()` usa `puntoDe('impacto')` de `javelin_rayo`; sin el punto, la mano más 16 como antes.
  - **H2_CORTO:** el trueno en el cuadro 2 de `rayo_cielo`, en la jabalina y en Maracaibo (`relampago()` solo truena si no hay `rayo_cielo`); el furro en el `impacto` de `play_drum`; la corneta cuando la moto pasa a `corneta`, nunca dos antes de 0,55 s. En el Cross, `mercado` en `saigon_benthanh`, `rio` en `saigon_rio` y `estadio` en `saigon_estadio`; el hẻm y las azoteas siguen con `trafico_saigon`. Al cambiar de tramo se calla el ambiente anterior.
  - **G2:**
    - Selección: `ui_tarjeta_<equipo>` en lugar del rectángulo, el nombre corto en `texto` y las 4 caras de 40 en x 12, 52, 92 y 132, y 36. Sin bandera chiquita: viene pintada. La elegida lleva un borde blanco.
    - Menú de pruebas: el ícono de 32 de la prueba elegida junto al lugar (la opción b). Las peleas sueltas llevan `pelea`, la final `kachinuki`; ATRÁS va sin ícono.
    - Medallas: `medallas_16` en cada prueba ganada del medallero, `medallas_32` en la tabla de resultados (el cuarto sigue con su círculo gris y su número) y dos `medallas_64` meciéndose a los lados del marcador de la final.
    - Podio: `ui_podio` en x -80 en lugar de Caracas y su azotea, los atletas donde estaban, y tres `bandera_<bandera del campeón>_32_ondea` subiendo por `mastiles` de `abajo` a `arriba` (x - 80), el tercero primero y el primero de último.
    - VS: `ui_marco_vs_4` en x -80, `grande_enojo` en los 4 `huecos`. En el 4v4, los dos primeros de cada equipo; en el 1v1 y el judo, el que pelea y el siguiente de su equipo. VS en `vs`, la prueba en `texto` (KACHINUKI CARACAS, KACHINUKI FINAL, JUDO Y VOVINAM o PELEA CALLEJERA) y los nombres bajo cada hueco en y 246. Las frases en 268, una por lado.
    - Pantallas en x -80: la pausa tramada en lugar del velo, SE ACABÓ LA VAINA bajo la lluvia y, 1,8 s después, ¿OTRA PARTIDITA? aparte en su pantalla de arcade con la cuenta grande. En la gira no hay otra partidita: el +20 sale sobre la lluvia.
  - **Lo que se ve raro en el arte:** nada que bloquee. En la tarjeta, el rectángulo `texto` de 104 no le cabe a RỒNG SÀI GÒN ni a MARACUCHOS con la letra a 2: el juego los pone a 1,5, que se lee bien.
  - **Nombres que se salían, del lado del juego:** CHAMO TOTO, SEÑORA CARMEN, DON HERNANDO y KENJI SAKAMOTO van en dos renglones en su tarjeta; el VS, los resultados y el marcador usan el nombre corto con su tratamiento (SEÑORA CARMEN, no SEÑORA); la técnica se centra entre el retrato y el borde de lo que se ve y baja a 1 si no cabe; el medallero corre la medalla para que quepa el nombre. `scripts/prueba-nombres.mjs` mide los 24 en cada pantalla.
  - Probado con `scripts/prueba-g2.mjs`.

- **B7, E4, D3 y rayo_cielo en el juego** (pixel_forja `main` en 884c143: #43 a #46). Estaban como PR abiertos; el juego los probó juntos (526 de 526) y los unió en orden.
  - **E4:** los 8 layouts de las canchas (Margarita, Đà Lạt, Tao Đàn, Maracaibo, Barranquilla, el liceo, la Candelaria y Hội An) a 800 con `margen` 80. `pintarEscenario` corre todo lo pintado el margen y la paralaje va con `scrollX + margen`. La cámara va de -80 a 720, sin el acercamiento de antes, centrada en la cancha de 640 en las pruebas que no siguen la pelota. El Tama-wari resta el margen a sus postes y ahora también monta el arte con la cámara y la paralaje.
  - **D3:** motos y xích lô a escala 1. El atropello usa la huella (`|dx| < w/2`, `|dy| < d/2 + 4`) y la sombra es del ancho de la huella.
  - **rayo_cielo:** en la jabalina baja a la punta (la mano cercana 16 px más arriba a 48) en los cuadros 2 y 3 de `javelin_rayo`, carga repitiendo del 3 al 6 y se apaga en el 7 al soltar. En Maracaibo cae al aro o al tablero, con el destello en el cuadro 2 y la x corrida unos pixeles cada vez.
  - **B7:** la técnica de cada equipo con la barra llena (`tecnica_<equipo>`, como la burla), con el arma en la mano por su dato `arma`, lo que vuela en cada `suelta` (la silla y la última chancleta tumban), el golpe en el `impacto` y la ciclovía con `bike_charged` arrancando junto. El Furrazo, el Batazo de Jonrón y el Copetazo se acercan al rival mientras preparan el golpe. `dodge_catch` en el Quemado (espera con los brazos adelante y abraza en el `atrapa`), `beach_run` en el Vóley con polvo de arena en cada `paso`, y `traffic_dodge` en el Cross cuando una moto pasa rozando.
  - **Lo que se ve raro en el arte:** nada que bloquee. Ver la entrega del juego al final de esta tanda.


- **Los nueve lotes ya están en el juego** (pixel_forja `main` en 8eda3a1: #26 a #34). El juego mismo unió los PR en orden y resolvió los choques (alias junto a los packs en forma de objeto, `frase` junto a `bote` y `atrapa`, las cuentas de PNG). Antes de unir, la suite completa pasó sobre el resultado final: 428 de 428. El submódulo apunta a main y el kit y los escenarios salen de ahí.
  - **Escenarios (E3c, E4a, E5):** 15 con arte, todos con 9 de 9 pruebas. Tama-wari en `hoian` (el poste del arte, la bola en el gancho), el judo en `judo_hanoi`, Đá cầu en `tao_dan`, el tejo en `candelaria` (la caja y el bocín del arte, las mechas y los tejos encima en `PISO + 1`), Vóley en `margarita`, Tenis en `dalat`, Fútbol en `barranquilla` (los arcos del arte en dos piezas, sin los de código) y Básquet en `cancha_maracaibo` (sin el relleno azul y naranja; el tablero y el relámpago siguen siendo del juego). Sin el arte, cada prueba vuelve a su fondo pintado por código.
  - **Sin pelota (SP y SP2):** vóley (`vb_ready`, `vb_bump`, `vb_set`, `spike`, `block`, `serve`), fútbol (`shot`, `pass`, `slide`, `header`), arquero (`keeper_ready`, `keeper_dive` hacia la cámara o hacia el fondo según adónde se tira, y `keeper_catch` con el balón en `objetos`), básquet (`dribble` con el balón en `objetos` y `rebote_balon` en cada `bote`, `shoot`, y `dunk` desde el `despegue`), tenis (las 6, y la raqueta de código se esconde mientras suena una del pack), Đá cầu (`volley`, `trap` y `chilena`), Chapita (`pitch` con la chapa en `objetos`) y Quemado (`catch`). Los golpes se ven desde su cuadro de contacto, porque el juego ya resolvió el golpe en ese instante. Las pelotas sueltas del kit reemplazan a las de código, a escala 1.
  - **Burlas (C5):** en la pelea, el Instituto se burla con `burla_instituto_nekketsu` cuando te tumba y la Familia que maneja la máquina con `burla_familia_gg` cuando tumba a uno del Instituto. El globo sale en el evento `frase`, con la frase del equipo.
  - **Perro y gato (C7c):** en la Comuna 13 los tres perros dormidos son `perro_calle_1`: al pisarlo, `wake`, y embiste con `pounce` hacia el que lo pisó; tumba en el `impacto` si alcanza. `gato_1` espera al pie de techos bajos dentro de `muro_min` y `muro_max` y, si alguien se acerca, sube con `jump_wall` y `subida * alto`.
  - **Audio (H2 y H3):** el tema de cada mundo con `bucle()` (Saigón, Comuna 13, Hội An, Bogotá, Margarita, Đà Lạt, Barranquilla, Maracaibo, Caracas en Chapita, Quemado y el 1 contra 1, y el tema del Instituto en el 4 contra 4), y `gallo`, `aleteo`, `mecha_tejo`, `toque_cau`, `caida_tatami`, `pitazo_largo`, `red_voley`, `rebote_balon`, `aro_basket`, `aro_fallo`, `chapa` y `chancleta`. Los sintetizados de antes quedan de respaldo.
  - **Todavía sin conectar:** los vehículos de D2 y los paneles de interfaz de G1 (ya conectados después: ver la tabla de lotes recientes).

- **H5 ([pixel_forja#37](https://github.com/Lothra2/pixel_forja/pull/37)) en el juego** (main en 5a2e391, suite 458 de 458): `salida_natacion` en el ¡YA! de Natación, `chapuzon` en el `impacto` del `dive`, `brazada` en el evento `brazada` de los nados, solo de la persona (o, si ya llegó, del que va más cerca de la cámara), y `garrocha` en el clavado de Azoteas. Probado: los cuatro suenan.

- **E6 ([pixel_forja#36](https://github.com/Lothra2/pixel_forja/pull/36)) en el juego** (main en f499292, suite 451 de 451): `cartagena` en Azoteas (el techo de enfrente y el carrito son los objetos del arte, movidos por ronda, y la palenquera del kit pregona y reclama), `liceo_patio` en Quemado, `barrio_caracas` en Chapita (la casa y la ventana rota del arte), `cocora` en Vallas, `halong` en Natación y `llanos_apure` en Jabalina. Las 16 pruebas y la pelea ya usan escenarios de PixelForja; los fondos de código quedan solo de respaldo.

- **H4 ([pixel_forja#35](https://github.com/Lothra2/pixel_forja/pull/35)) en el juego** (main en 74b0558, suite 436 de 436): `champeta_murallas` en Azoteas, `cafe_neblina` en Vallas, `halong_remos` en Natación y `pajarillo_llano` en Jabalina, con `bucle()`. Probado: los cuatro cargan y suenan. Solo el judo y el entrenamiento de la pelea siguen con la pelea del chip.

- **Pruebas nuevas: Quemado Nekketsu y Chapita**, con lo que ya trae el kit (el balón de goma, las chapas, el palo de escoba, la chancleta, `weapon_throw`, `weapon_swing` con su `arma` por cuadro, `fight_block` para atrapar). Lo que les falta en arte, para un lote siguiente:
  - Quemado: `catch` (atrapar el balón contra el pecho) y `dodge_jump`. Hoy atrapa con `fight_block` y esquiva con el salto normal. El patio del liceo (`liceo_patio`, techado, vista inclinada como la pelea) está pintado por código.
  - Chapita: `bat_stance`, `bat_swing` con el palo a dos manos y `pitch` de lado. Hoy usa `weapon_swing` y `weapon_throw` con el palo y la chapa en la mano. La señora Carmen (rulos y bata) sería un NPC con `asomarse`, `regañar` y `tirar_chancleta`. El barrio (`barrio_caracas`, de lado) y la casa del vecino con la ventana, más su versión rota, están pintados por código.

- **Prueba nueva: Azoteas de Cartagena** (salto con garrocha entre techos, al atardecer). Usa `pole_vault` del motor que ya está en main, sumado al pack `atletismo` (las demás animaciones del pack quedan iguales), con su `elevacion` y el `despegue`/`aterriza` en los cuadros 3 y 11. Lo que le falta en arte:
  - `vault_fail` (del pedido): hoy el que no llega cae con `jump_fall` y aterriza con `land_flat`.
  - El escenario `cartagena` (E4): hoy son fachadas pintadas por código, de lado. Hay balcón con buganvillas, carrito de frutas y una palenquera dibujada a mano que sería un NPC con `regañar`.
- **La Olimpiada Express sortea 5 de las 16 pruebas** en cada gira (al menos una de Vietnam y una de Colombia), más la final del Kachinuki.

- **Listo para C7b, el gallo y la paloma ([pixel_forja#25](https://github.com/Lothra2/pixel_forja/pull/25)).** Probado con el kit de la rama C7b generado en local (`--solo animales`), sobre el arte de E3a y del hẻm.
  - Las aves se cargan como tira (`ave_<id>`) cuando `animales.<id>.tipo` es `"ave"`, con una animación por tramo (`ave_<id>_<anim>`). Los demás animales siguen en atlas.
  - Origen en el ancla. Para la izquierda, espejo y el origen en `w - ancla[0]`, así las patas quedan en el mismo pixel.
  - Los eventos del kit suenan: `canto` (un kikirikí sintetizado mientras llega el audio) y `aleteo`.
  - El gallo del techo de zinc (x 2200, y 20): canta al arrancar la carrera y, si está a la vista, cada tanto. Entre medio `idle` o `picotear`. Si alguien pasa a menos de 40 px por el techo, `asustarse` en su sitio.
  - Las palomas, en el layout como `animal: "paloma"`: seis en el hẻm (tres en el arranque y tres pasando el canal) y tres en la plaza de Bến Thành. Picotean, caminan, y a menos de 40 px `despegar`, `volar` lejos del que viene, `volar` de vuelta y `aterrizar` donde estaban. La sombra se queda en el piso.
  - Sin las aves en el kit, el gallo gris de antes y ninguna paloma.
  - `scripts/prueba-aves.mjs`: las palomas despegan y vuelven, y el gallo canta y se asusta.
- **E3b ajustado probado:** la Cruz del Ávila se ve debajo del marcador con el zoom de la pelea, y el vacío de 128 se repite solo (el juego usa el tamaño de la textura).

- **Pedido para el próximo lote de motor: exportar un pack sin la pelota pintada.** Las animaciones de vóley (`vb_bump`, `vb_set`, `spike`, `block`, `serve`, `vb_dive`) y de fútbol (`trap`, `header`, `volley`, `chilena`) traen la pelota dibujada en los cuadros. En el juego la pelota la mueve la física, así que se verían dos. Propuesta: en `kit.config.json`, por pack, `"sin_props": true`. El pack sale sin la pelota en los cuadros y la posición de la pelota de cada cuadro va en los datos por cuadro (`objetos`, como el arma en la mano). Con eso entran Vóley Playa Margarita y Fútbol Callejero, y Đá cầu usa `volley`, `header` y `chilena` de verdad.
- **Pruebas nuevas en el juego, con fondos pintados por código mientras llega el arte:** Tama-wari Hội An (usa el layout `hoian` y la bola `bola_tama` del kit, con una copia azul para la Familia) y Đá cầu en el parque Tao Đàn.

- **Listo para E3b, la azotea de Caracas ([pixel_forja#24](https://github.com/Lothra2/pixel_forja/pull/24)).** Probado con el arte de la rama E3b generado en local: 9 de 9 pruebas, la pelea 1 contra 1 y 4 contra 4, el Kachinuki completo y el borde hasta x 420.
  - La pelea pinta el escenario de PixelForja cuando está (si no, el fondo de antes), con la vista inclinada de 0.35 en los atletas, las armas y cada efecto del piso (chispas, polvo, arepas, sombras, textos).
  - Con el arte, la cámara se acerca menos (1.35 en 1 contra 1, 1.25 en 4 contra 4): los neones, las torres y el Ávila se ven enteros debajo del marcador.
  - Thor en x 40, y 2, delante de los tanques.
  - El borde que avanza: `borde_vacio` repetido desde el canto inclinado y `borde_filo` que se desmorona a cada trozo. Las antenas que quedan del otro lado se caen con el pedazo.
  - Las luces con `parpadeo` prenden y apagan con ese período, con un brillo redondo suave en vez de un disco plano.
  - `helicoptero_reflector`, `publico` y `fuegos_artificiales` en la vida del layout. Los fuegos del escenario esperan a que la escena los pida; en la pelea salen al ganar, dentro de lo que ve la cámara.

- **Listo para C6a, la gente de la Comuna 13 ([pixel_forja#23](https://github.com/Lothra2/pixel_forja/pull/23)).** Probado con el kit de la rama C6a generado en local, sobre el arte de E3a.
  - Las 9 fichas en `npc/` y la sección `npc` en `kit.config.json`, copiadas del ejemplo.
  - Cada NPC es una tira (`npc_<id>`) con una animación por tramo (`npc_<id>_<anim>`), con el ancla en los pies en el (x, y) de su entidad y ordenado como los atletas, también sobre una caja.
  - Bailarines: uno con el molino y dos con toprock, en ronda. El que atropellan reclama.
  - Pelados: cada `cada` segundos uno patea y la pelota del kit sale en el `impacto` de `eventos.patear`. Si la pelota tumba a alguien, los dos piden perdón.
  - Grafitero, músicos y vendedor: lo suyo en bucle y su reacción cuando pasa alguien a menos de 40 px (mirar, animar, ofrecer).
  - Sin la sección `npc` en el kit, siguen los monitos grises de antes.

- **Listo para E3a (Comuna 13, [pixel_forja#22](https://github.com/Lothra2/pixel_forja/pull/22)) y H1b (audio comprimido, [pixel_forja#21](https://github.com/Lothra2/pixel_forja/pull/21)).** Probado con el arte de la rama E3a generado en local: 9 de 9 pruebas, la carrera de punta a punta sin atascos.
  - Vida en la capa `lejos` (el metrocable): pegada a lejos.png, con su paralaje, repetida cada su ancho y moviéndose por su `recorrido`.
  - Vida en la capa `objeto` (los peldaños que corren, la bandera): `setDepth(FT + orden)`.
  - Quien se para en una caja encima de otra (tanque, aire, letras) va en `FT + ordenCaja + 0.5`, con la misma cuenta que `ordenCaja()`. La silueta de quien queda tapado usa el mismo orden.
  - El cielo y la ciudad lejana cubren la pantalla ancha (hasta 800): se repiten a lo ancho.
  - `medellin_c13`: el asta del mirador baja a `alto: 30`.
  - Audio: `archivo` puede ser texto o lista. Los efectos se cargan al arrancar y la música y los ambientes recién cuando una escena los toca (`bucle()` en `src/core/kit.ts`), en bucle con el marcador de `muestras / frecuencia`. `kit.config.json` ya pide `"formato": "comprimido"`.
  - El arte de la Comuna 13 entra al repo cuando Rick apruebe y E2 y E3a estén en `main`. Hasta entonces la Comuna 13 se ve en gris en el juego.

- **Vista inclinada de verdad en el gris** (`src/events/CrossCountry.ts`). Es la misma proyección del piso de la pelea: `px = x + 0.35 * y`, y lo del fondo queda a la izquierda.
  - Cajas como volúmenes (techo, frente y la cara izquierda).
  - Escalones con su contrahuella, escaleras eléctricas con pasamanos y huecos con sus paredes.
  - El bordillo de adelante.
  - Los atletas, los efectos y los vehículos van proyectados.
  - Capturas de referencia en `referencias/gris_inclinado/`.
  - El juego lee `inclinacion` de `escenario.json` cuando el arte la traiga. Sin el campo, los atletas quedan derechos sobre el arte.
  - **Esto reemplaza el punto 1 de la v1 de `NOCHE.md`** (juntas 1:2 y cara derecha), que estaba mal.
- **La pelea nueva:**
  - Agarre con rodillazos y forcejeo, guardia que se rompe y pisotón.
  - Jab, jab y gancho. Patada voladora corriendo.
  - Onomatopeyas, contador de golpes y burlas.
  - Arepa que cura. VS y K.O. grande.
  - Usa `grab`, `grab_hold`, `grabbed`, `knee_grab`, `break_free`, `guard`, `fight_block`, `stagger`, `hook`, `flying_kick`, `laugh` y `point`, ya en el kit (`kit.config.json`).
  - Lo que falta en arte está en el lote P1 de `NOCHE.md`.
- **Conceptos de los 8 mundos** en `referencias/conceptos/`, con un `LEEME.md` de qué tomar y qué ignorar en cada uno. Son la referencia de ambiente para los lotes de escenarios.
- **`NOCHE.md` v2:** el pedido completo de la noche, con la proyección exacta, la pelea como prioridad y qué cuenta como lote completo.

## Notas de lo entregado

**Lote A**, revisado del lado del juego: compila y pasan 170 de 170 pruebas en la rama. Se aceptan:
- Retrato de 96 escalado x3: sirve para los diálogos. El dibujado de verdad pasa al lote G2 (pantalla VS e intro).
- Cabecitas que se reconocen por silueta y color, no por los ojos: suficiente para el minimapa.
- Bañador como camiseta sin mangas.

Se pidió para B1: el campo `cuerpo` (hurtbox sin implementos ni efectos), porque `cajas` incluye pelotas y jabalinas.

**Lote B1, primera parte** (levantar, llevar y lanzar), revisada con los GIFs de aprobación:
- Trae `cuerpo` y un campo nuevo, `carga` `[fila][cuadro]`: dónde apoya su base lo que se levanta. Lo levantado no viene dibujado en el sprite de quien levanta. El juego dibuja encima al rival (`carried`) o el objeto, con su base en la carga, y al lanzar lo suelta desde la carga del cuadro de la `suelta`.
- Ajustes pedidos antes de seguir: las manos tienen que tocar lo que se carga (hoy el pote de Alana flota sobre su cabeza con aire en medio y sus brazos quedan abajo), lo cargado se apoya sin hueco, y un cuadro de `thrown_spin` sale cortado por el borde de la celda.

**Lote B1 + D1 completo** (PR #8), revisado del lado del juego con los GIFs de aprobación:
- Los 3 ajustes están hechos. Los brazos suben por los costados de la cabeza estirados lo justo para tocar la carga, como en los Kunio. De frente se ve muy bien. De lado, la mano visible sostiene la carga.
- Trae 26 animaciones en el pack `calle` (no va por defecto: `--deportes calle`), 19 armas del piso con `--objetos`, y los datos `cuerpo`, `carga` y `arma`.
- El arma no viene dibujada en el sprite: el juego la compone con `arma` y el atlas de objetos.
- `thrown_spin` es una bolita sin arco: la parábola la mueve el juego.

**Lote C1** (PR #9), revisado del lado del juego con los tableros y GIFs:
- Las 8 fichas y Thor están en `docs/ejemplos/nekketsu/fichas/` de PixelForja. Sophie en verde, Alana en fucsia, Steph en el rosado de su preset, Rick en azul. Alana trae además el vestuario "Mickey".
- Instituto Nekketsu: gakuran azul marino muy oscuro con brazalete rojo. Kenji robusto, Ryu alto y flaco, Tetsu bajo y flaco, Goro gigante en celda 64.
- El manifiesto trae `celda` y `pivote` por atleta, `numero` en la Familia GG y la mascota en `animales`.
- A 48 el "GG" del pecho no cabe completo: va en el HUD y en la selección de equipo.
- Pendiente de arte para un lote siguiente (no bloquea): las caras del Instituto se ven muy dulces para ser los rivales. Conviene una expresión base más "malandra" (cejas fruncidas, media sonrisa) en Kenji, Ryu y Goro.

**Lote G1 fuentes** (PR #10), revisado con el tablero:
- Las tres fuentes escriben las 146 letras del vietnamita. Se leen bien a x2 y x3, que es como las usa el juego.
- Silkscreen solo tiene mayúsculas: todo el texto del juego sale en mayúsculas. Va con el tono retro.
- Ajuste pedido: en ấ, ầ, ẩ el tono a la derecha del circunflejo agranda la letra y deja un hueco ("CẦU" se lee casi "CÂ U"). Que el tono se meta sobre las filas de marcas vacías de la letra siguiente, sin agrandar la letra, y que solo agrande si la siguiente también lleva marca.

**Lote I inicial** (PR #11), aprobado y en `main`. Lo que trae:
- Kit a medida: `npx tsx tools/pixel_forja/scripts/kit-a-medida.ts public/assets/kit --config kit.config.json`. Para arrancar se copian los ejemplos de `kit.config.json` y `equipos.json`.
- El manifiesto trae `equipos`, `equipo` por atleta, `pruebas`, y `pendiente` con lo que todavía no está hecho de lotes futuros.
- `swim_punch`, `dunked` y `swim_turn` no existen todavía: si el config los pide, el kit da error. No pedirlos hasta su lote.
- Se revisa en `visor.html`.
- Mientras no esté en `main`, el juego sigue con su puente `scripts/kit.ts` (packs propios `ngg_mov`, `ngg_golpe`, `ngg_carga`, más `atletismo` y `natacion` con vestuario de pista y bañador). Al entrar I a `main`, ese puente se reemplaza por `kit.config.json`.
- E1 no puede arrancar hasta que el juego ponga `data/stages/saigon_hem.layout.json`. Mientras tanto PixelForja sigue con F.
- Revisado del lado del juego: corrí `kit-a-medida` de la rama del PR con una configuración igual al puente del juego (los 5 packs propios, fichas con vestuario `atleta` y `banador` por pack, Thor, armas y fuentes). Sale en 18 s con `--rapido`, el vestuario por pack funciona y el manifiesto es el mismo que ya lee el juego. Solo cambian `ui.fuentes.*.alto`, que ahora es `alto_linea` más `base`, y el audio, que vuelve como pendiente. El juego se adapta a las dos cosas.
- Pedido chico para cuando toque: que `audio.sfx` acepte la lista de sonidos que el motor ya tiene (`SFX` con `encodeWav`) y los escriba en `audio/` con su entrada en el manifiesto. Así el juego deja su puente completo sin esperar al lote H.

**Del lado del juego, con lo que ya está en main:** vallas, natación y jabalina usan los packs `atletismo` y `natacion` del motor. Se aprovechan `agua` (la superficie en la fila 40 se alinea con el carril), `desplazamiento` y `elevacion` del clavado, la `suelta` de la jabalina y la jabalina dibujada en el sprite hasta ese cuadro. Funciona bien. Para lotes siguientes sería útil:
- Una carrerita de jabalina en bucle (`javelin_run`) con la jabalina al hombro. Hoy el juego reusa los primeros 3 cuadros de `javelin`.
- Un salto de valla aislado (`hurdle_clear`) sin la valla dibujada: `hurdles` trae su propia valla y el juego dibuja las suyas, que se tumban si las tocas.

**Lote F** (PR #12), aprobado y en `main`. Revisado del lado del juego: con la configuración real del juego (5 packs, vestuario por pack, Thor, armas, fuentes, `"fx": true` y 21 sonidos) el kit sale en 20 s con 56 efectos y el audio en `audio/sfx/`; `silbato`, `pistola` y `marcha_nekketsu` vuelven como aviso en `manifest.pendiente`. Los efectos se ven muy bien. Lo que trae:
- Efectos con `"fx": true` en `kit.config.json`: salen `fx/<id>.png` y `manifest.fx`, cada uno con `ancla`, `se_pega_a`, `capa`, `cuadros`, `fps` y `columnas`.
- Qué efecto va con qué evento (`paso` con polvo, `impacto` con chispa en el `punto`, `dizzy` con estrellas) y cómo cargarlos en Phaser: `docs/EFECTOS.md`.
- Audio por configuración, por ejemplo `"audio": { "sfx": ["golpe", "esquiva", "bloqueo", "paso_tierra_0"], "ambientes": ["agua"] }`. Salen WAV en `audio/sfx/` y `audio/ambiente/`, con `manifest.audio.<sección>.<nombre> = { archivo, duracion, bucle? }`. Con esto el juego deja de generar el audio en su puente.
- Nombres del lote H (`silbato`, `pistola`, `marcha_nekketsu`) se pueden pedir desde ya: se saltan con aviso en `manifest.pendiente` y aparecen solos con H1.
- Los efectos miran a la derecha: para la izquierda, `flipX` y espejar el ancla. La lluvia y el calor van con opacidad baja. La bola del Tama-wari trae un cuadro por estado de daño y el juego elige cuál.
- Del lado del juego: cuando F esté en `main`, el kit pasa del puente `scripts/kit.ts` a `kit.config.json` con `kit-a-medida`, con efectos y audio incluidos, y el juego cambia `ui.fuentes.*.alto` por `alto_linea` y lee el audio por sección.

**Layout de `saigon_hem`, listo para E1.** Está en `data/stages/saigon_hem.layout.json` y el juego ya lo juega en gris (Cross Country, tramo 1, también en el entrenamiento). Las reglas con las que se diseñó, para que el arte no cambie la jugabilidad:
- Franja de 130 de fondo (filas 200 a 330), largo 3840, salida en 40 y meta en 3790.
- Un salto sube 36 como máximo. Un escalón de hasta 6 se sube caminando. Corriendo, un salto avanza unos 85; caminando, unos 50.
- Canal 1 (x 1200 a 1258): hueco de y 0 a 100, con un puentecito adelante (y 100 a 130). Canal 2 (x 3020 a 3076): toda la franja, se salta corriendo.
- Muro bajo (z 28, toda la franja): se salta. Muro alto (z 52, y 0 a 92): se rodea por el portón de abajo (y 92 a 130) o se trepa por las cajas (z 18 y 36).
- Calle inundada (x 2400 a 2900): frena y la corriente empuja hacia atrás. Toldo (z 56) sobre la acera de x 300 a 420: el que salta debajo se golpea.
- Motos por los carriles 2 y 4, desde la derecha.
- Campos que agregó el juego y que el validador debe aceptar: `nombre` en el layout y en los huecos y el agua, `nota` en el muro alto, `tipo` en muros y sólidos, y `y0`/`y1` en `bajo` (el toldo cubre solo la acera).
- Lo que el juego todavía no usa y queda para el arte: `postes`, `ranuras_deco`, `vida` y el clima `aguacero`.

**E1 del lado del juego, listo para recibir el arte:**
- El Cross Country pasó a ZOOM 1: el escenario se ve entero y a escala 1, sin pixeles disparejos.
- `src/events/escenario.ts` carga `escenarios/<id>/` tal como lo exporta `exportar.ts` de la rama: cielo quieto, lejos con paralaje 0.25, cerca, piso y frente en trozos de 1280, objetos con `setDepth(franja.atras + orden)`, la vida (ropa, cables, palomas que se espantan cuando pasa alguien, motos al fondo), luces que laten y las partículas sin `fx`. Cuando el arte está, el juego deja de dibujar el gris.
- `npm run escenarios` genera la carpeta desde `data/stages/*.layout.json` con el PixelForja del submódulo y escribe `public/assets/escenarios/index.json`. Se probó con la rama de E1 (`--forja`): el layout valida sin errores ni avisos, sale en menos de 1 s y el juego lo corre de punta a punta sin errores. El arte no se sube al juego hasta que E1 esté en `main`.
- Las motos de los carriles 2 y 4 usan los cuadros de `motos_fondo` de `vida.png`, y quedan iguales al arte. Los objetos del piso siguen del kit (D1).
- En la calle inundada, el juego tapa los pies con una franja de agua a la altura del `nivel`.
- Cuando un atleta va encima de una caja o un muro, el juego lo dibuja delante de esa caja, para que no lo tape al pasar por arriba.
- Las partículas con `fx` (`onda_charco`, `petalo_buganvilla`) ya usan el efecto del kit.
- Todavía no usa `superficie.png`: el sonido al pisar sale del tipo de piso del layout (agua, madera o piedra), que da lo mismo en este tramo. Tampoco `piso_mojado`, porque no hay aguacero aún.
- Pedido chico para E1, hecho en el PR: el portón abierto delante del muro alto (y de 92 a 130), para que se note el camino para rodearlo.

**Lote E1** (PR #14), revisado del lado del juego con la rama:
- `scripts/escenarios.ts` ya usa solo la entrada estable `generarEscenario` de `src/engine/world/oblique`. Ya no importa `escena.ts`, `exportar.ts` ni `layout.ts`, y no filtra postales.
- Si el layout está mal o falla una de las 9 pruebas, no escribe ese escenario, muestra los errores y sale con código 1.
- Pasa los contornos de los equipos para la prueba de legibilidad. Los dos equipos usan `#1e1418`, el contorno del kit: se midió en los sprites.
- `saigon_hem` sale en 1.7 s y pasa las 9 pruebas. En legibilidad, el contraste mediano es 5.4:1 y el peor 2.3:1, en x 3800.
- El portón sale como objeto con `orden` 131, delante de todos. Se probó con los 4 atletas pasando por el hueco de abajo: el poste y la hoja tapan solo las piernas un instante, y se lee bien.
- El Cross Country corre de punta a punta con el arte nuevo, sin errores.
- `"escenarios"` en `kit.config.json` no se usa por ahora. El script aparte tarda menos de 2 s contra los 20 s del kit, falla por su cuenta y escribe el `index.json` que lee el juego.
- E1 ya está en `main`. El submódulo apunta a `main` y el arte de `saigon_hem` está en el juego (`public/assets/escenarios/saigon_hem/`). Pasan todas las pruebas del juego con el arte. El kit regenerado con `main` sale igual: solo cambia una línea de `CREDITOS.txt`.

**E2 en puerta 1** (rama `claude/olimpico-lote-e2`). Los layouts no se tocan hasta las postales y el PR. Respuestas del lado del juego:
- Los puestos de z 46 del mercado tapan del pecho para abajo al que va por el pasillo de atrás. Se comprobó jugando: con el layout tal cual, al atleta del pasillo de arriba se le ve solo el pelo.
  - La altura se queda, porque tiene que ser mayor que el salto (36 más un escalón de 6) para que los pasillos no se salten.
  - Lo resolvió el juego: quien queda tapado más de medio cuerpo detrás de algo alto se dibuja encima como silueta de color. Amarilla la persona, azul su equipo y roja el otro.
  - Para el arte: si el frente de los puestos deja ver algo (mesas con patas, toldos abiertos), mejor. No hace falta cambiar la geometría.
- El ferry, el xích lô, las motos de los carriles, los jacintos y las frutas regadas (D2) y la brazada del Cross (B2): mientras tanto, el juego sigue con lo suyo en gris.

**Layouts de E2, listos y jugados en gris.** Están en `data/stages/` y el Cross Country ya corre los cinco tramos seguidos con el tiempo sumado. Se probaron con los cuatro atletas en piloto automático, de punta a punta, sin que nadie se trabe. `npm run escenarios -- --validar` los pasa por `generarEscenario` sin escribir nada. Todos validan sin errores y pasan la prueba de camino.

Reglas comunes, iguales a `saigon_hem`:
- Franja de 130 (filas 200 a 330), carriles en 20, 50, 80 y 110. El mercado usa 12, 28, 65 y 112, uno por pasillo.
- Un salto sube 36. Un escalón de hasta 6 se sube caminando. Corriendo, un salto avanza unos 85.
- La hora va en `hora` y el clima de ese día es el primero de `clima`.

Lo de cada tramo:
- **`saigon_benthanh`** (largo 3840, `manana`):
  - La fachada del mercado tiene tres puertas, una por pasillo. Dos filas de puestos altos (z 46) arman tres pasillos: arriba y de 0 a 36, en el medio de 52 a 78 y abajo de 94 a 130.
  - Las filas se cortan cada 300 px para cambiar de pasillo y terminan en x 3040. Queda un salón antes del portón de salida, que tiene el muro en el medio (y 40 a 90).
  - En los pasillos hay puestos de frutas, cajas, sacos y cubos de flores que se saltan, y lámparas colgantes (`bajo`).
  - Afuera, motos por el carril 4 solo desde x 3260. `x0`/`x1` en el vehículo dicen en qué calle andan.
  - El juego derrama las frutas: quien cae encima de un `puesto_frutas` las riega en el pasillo, justo detrás del puesto, y el que viene se resbala. Hoy se dibujan con puntitos.
- **`saigon_rio`** (largo 3840, `mediodia`):
  - Malecón, después el río (x 1500 a 2300), después la orilla con botes de bambú, redes y un canal.
  - Atrás (y 0 a 40) van el muelle de salida (x 1400 a 1700, z 12, con un escalón de 6), el canal del ferry y el muelle de llegada (x 2200 a 2500).
  - El ferry es una entidad `vehiculo` (`x0`, `x1`, `w`, `d`, `z`, `velocidad`, `espera`). Va y viene entre los muelles y se lleva a quien esté encima.
  - Adelante (y 40 a 130) está el río hondo (`nivel` 28, `corriente` -12): se nada sin saltar, un poco más lento, y bajan jacintos que te enredan un momento.
  - Nadando se llega un poco antes que esperando el ferry, pero con riesgo.
  - Por el carril 3 pasan xích lô desde x 2500.
- **`saigon_azoteas`** (largo 3840, `tarde`, clima `aguacero`):
  - Cinco edificios con huecos `vacio` de 50, 60 y 40. El último hueco es de 70 y lo cruza una viga de metal (y 60 a 76).
  - El techo de zinc va de x 750 a 1500 (`metal`).
  - Hay tanques, aires acondicionados, mesas de café, macetas, la caseta de la escalera (z 56, se rodea por abajo), ropa tendida (`bajo`) y antenas.
  - Los charcos son `agua` de `nivel` 1. El juego los trata como charco: resbala, no frena.
  - Con aguacero, caer de un salto corriendo puede terminar en resbalón, y más en el zinc. El juego pone la lluvia que cae con el efecto `lluvia` del kit.
- **`saigon_estadio`** (largo 1920, `atardecer`): la recta final. Se entra por el portón del estadio (hueco en y 45 a 85), hay tres vallas bajas (z 14) en la pista roja (`cancha`) y la meta en x 1860.

Para las fichas de arte de E2:
- **Legibilidad.** Resuelta con el arte en la rama de E2: postes y antenas en metal claro. Los 4 layouts pasan las 9 pruebas con el contorno `#1e1418` y no hubo que mover ningún poste.
- **Tipos nuevos de caja** que hoy salen como muro:
  - `porton_mercado`, `puesto_*`, `puesto_frutas`, `sacos_arroz`, `cubos_flores`, `canastas`, `carrito_cafe`;
  - `muelle`, `escalon`, `banca`, `carrito_che`, `bote_bambu`, `cajas_pescado`;
  - `aire_acondicionado`, `macetas`, `caseta_escalera`;
  - `porton_estadio`, `valla`.
- **Para D2 y B2:**
  - El ferry, el xích lô y las motos de los carriles.
  - Jacintos flotando y frutas regadas en el piso. Pueden ir en `vida` o como efecto.
  - Una brazada de Cross, para nadar en el río sin salir del pack de pelea. Hoy el juego tapa medio cuerpo con agua.

**Layout de `caracas_azotea`, listo para E3.** Es la azotea del Kachinuki, ya con sus reglas en el juego:
- Largo 640. La franja va de 246 a 344 (98 de fondo), que es la que usa la pelea desde el principio. Es de noche, con El Ávila de fondo.
- El borde sin baranda es el hueco `vacio` de x 618 a 640. Caminando nadie se sale. Quien sale volando o lanzado por ahí queda fuera.
- A los 90 s la azotea se achica: el borde avanza hasta x 420. El juego pinta el vacío, la franja amarilla y negra del filo y el polvo con `polvo_caer_grande`. Si el arte trae un filo que se desmorona, mejor.
- Cada 30 s cae algo pesado (llanta, pote, silla) con su sombra de aviso. Para el arte, se puede pensar en un efecto de "algo que cae" o en una sombra propia.
- Thor mira sentado al fondo, en x 40 (`npc`).
- `npm run escenarios -- --validar`: la geometría valida. El arte espera el estilo `venezuela`, que PixelForja todavía no pinta.

**Layout de `medellin_c13` v2, listo para E3.** Se rehízo para que la Comuna 13 se reconozca. Es la prueba de Obstáculos, jugable en gris: los cuatro en piloto automático llegan al mirador en unos 25 s y el entrenamiento tiene 8 pasos.
- Largo 3600, la misma franja del Cross (200 a 330). Se sube por tramos con identidad, de la calle (z 0) hasta el mirador (z 144):
  1. La estación San Javier, con el carrito de paletas de mango biche y un perro dormido.
  2. La subida de los grafitis: terraza en z 24, murales, bailarines de break en rueda (si chocas con uno, te tumba) y un muro pintado que se salta con impulso.
  3. La escalera eléctrica 1, al revés y con techo naranja (`techo_escalera` en `bajo`), con escalones empinados al lado.
  4. El callejón de los perros: terraza en z 66, la pelota de los pelados que cruza de lado a lado (`pelados_futbol`), un tendedero y un tanque negro.
  5. La escalera eléctrica 2, con su techo naranja.
  6. Los techos de zinc en z 108: un hueco que se salta corriendo y una baranda que cruza el otro hueco en equilibrio (apoyada en una franja de piso, como la viga de las azoteas). Un gallo en el techo.
  7. La escalera pintada (escalones de 12) hasta el mirador.
  8. El mirador en z 144: las letras grandes "COMUNA 13" (`letras_comuna13`), la bandera de Colombia (`asta_bandera`) y los músicos.
- `ranuras_deco` y `vida` dicen qué va en cada tramo: murales, casas de ladrillo apiladas, techos de zinc, el metrocable en el valle, banderines y ropa tendida.
- El gris del juego ya pinta los murales, el metrocable cruzando el cielo, los techos naranjas y los tendederos con ropa, para que se lea el lugar mientras llega el arte.
- `npm run escenarios -- --validar`: la geometría valida. El arte espera el estilo `colombia_ladrillo` (ver `NOCHE.md`, E3).

**Layout de `hoian`, listo para E3.** Es el Tama-wari de noche en la ciudad vieja, con la misma franja que la pelea (246 a 344) y largo 640.
- Dos postes de bambú (`poste_tamawari`) en x 110 y x 530, con su bola de papel arriba (`npc` `bola_tama`, z 170, una por equipo).
- Faroles de seda colgando sobre la calle (`cuerdas_faroles` en `bajo`), el muelle del río adelante y la vendedora de faroles.
- Pasa las 9 pruebas con el estilo `vietnam` de hoy. El estilo `vietnam_hoian` de la ficha tiene que lucir las casas amarillas, los faroles, el río Thu Bồn con velitas y el puente japonés.
- El juego todavía no tiene el Tama-wari: llega con B3 (trepar el poste).

**G1 resto y H1** (PR #13), esperando la revisión de Rick. Cuando entre a `main`, el juego pide en `kit.config.json`:
- `ui.logo` y `ui.interfaz`: logo animado, diálogo 9-slice, paneles por equipo, barras, banners, controles táctiles, minimapa y números.
- El audio de H1: `silbato`, `pistola`, `marcha_nekketsu` y el resto. Con eso `manifest.pendiente` queda vacío.
- Voces en blips: cada atleta trae `voz { tono, timbre, archivos }`.
- La victoria nueva se llama `victoria_banda`. `victoria` sigue siendo la de GG Abyss.

**Kit del juego por `kit.config.json`, con I y F en `main`:**
- El puente `scripts/kit.ts` ya no existe. `npm run kit` corre `kit-a-medida` del submódulo con `kit.config.json` en la raíz del juego.
- Las fichas y los equipos son del juego: `data/fichas/*.ficha.json` (las 8 de la Familia GG y el Instituto, más Thor, con vestuario `atleta` y `banador`) y `data/equipos.json`. Salieron de `docs/ejemplos/nekketsu/` de PixelForja.
- Se comparó el arte de los personajes, objetos e interfaz con el del puente: los 54 PNG son iguales pixel a pixel.
- Efectos en el juego: polvo al correr y al caer, chispa del golpe según el daño, estrellas de mareo, aura Nekketsu en el especial, chapuzón al clavarse y al caer al canal, estela y ondas en natación, salpicaduras en la calle inundada y brillo de récord en jabalina.
- Audio del kit: los sonidos de pelea, pasos por tipo de piso (`paso_piedra`, `paso_agua`, `paso_madera`, 3 variantes cada uno), `thor_rescate` en el especial de Alana y el ambiente `agua` en natación.
- Pedidos ya en el config y esperando a H1: `silbato`, `pistola` y `marcha_nekketsu`. El juego no se rompe si no están.

## Insumos que pone el juego

Lo que PixelForja lee de este repo y todavía no existe. Cada uno lo produce una fase del juego.

| Insumo | Ruta | Lo necesita | Lo produce | Estado |
|---|---|---|---|---|
| Configuración del kit | `kit.config.json` | I, para generar el kit real | Juego F0 | listo, con fichas en `data/fichas/` |
| Equipos | `data/equipos.json` | I | Juego F0 | listo |
| Layout del tramo 1 de Saigón | `data/stages/saigon_hem.layout.json` | E1 | Juego F3 (gris jugable) | listo, jugado en gris |
| Layout de la azotea final | `data/stages/caracas_azotea.layout.json` | E3 | Juego F7 | listo, jugado en gris |
| Layout de la Comuna 13 | `data/stages/medellin_c13.layout.json` | E3 | Juego F7 | v2 lista, jugada en gris |
| Layout de Hội An | `data/stages/hoian.layout.json` | E3 | Juego F7 | listo (el Tama-wari en gris llega con B3) |
| Layouts del Cross Country completo | `data/stages/saigon_benthanh`, `saigon_rio`, `saigon_azoteas`, `saigon_estadio` (`.layout.json`) | E2 | Juego F6 | listos, jugados en gris |
| Resto de layouts | `data/stages/*.layout.json` | E3 a E6 | Juego F7 a F11 | pendiente |
| Textos | `data/dialogs/*.json` | G1 | Juego F5 | pendiente |

Los lotes A, B1 + D1, C1, G1 fuentes, I inicial, F, G1 y H1 no necesitan ningún insumo del juego. Se pueden empezar ya.
