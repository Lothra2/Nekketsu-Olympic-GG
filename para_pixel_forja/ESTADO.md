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
| 6 | E1 | Sistema de escenarios oblicuos + `saigon_hem` | A, I, layout de `saigon_hem` | en curso: ficha de arte aprobada, postales esperando a Rick (rama `claude/olimpico-lote-e1`) | |
| 7 | F | Efectos (y audio por configuración) | Nada | aprobado, en main | [pixel_forja#12](https://github.com/Lothra2/pixel_forja/pull/12) |
| 8 | G1, H1 | Resto de interfaz y audio de la rebanada vertical | Nada | pendiente | |
| 9 | B2, C2, D2, E2 | Cross Country completo y equipos nacionales | E1 | pendiente | |
| 10 | B3, E3 | Obstáculos, Tama-wari, Kachinuki | E1 | pendiente | |
| 11 | B4, E4 | Pruebas de 1992 | E1 | pendiente | |
| 12 | G2, H2 | Envoltorio y audio completo | | pendiente | |
| 13 | B5, E5 | Pruebas de pelota | E1 | pendiente | |
| 14 | B6, B7, C3, E6 | Tradicionales, técnicas, secretos y Barrio Nekketsu | E1 | pendiente | |
| 15 | J | Estudio | Todo | pendiente | |

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
- Pedido chico para E1: el muro alto se ve como una columna de ladrillo. Conviene que el arte muestre el portón abierto adelante (y de 92 a 130), porque es el camino para rodearlo y hoy no se nota.

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
| Layout de la azotea final | `data/stages/caracas_azotea.layout.json` | E3 | Juego F3 | pendiente |
| Resto de layouts | `data/stages/*.layout.json` | E2 a E6 | Juego F6 a F11 | pendiente |
| Textos | `data/dialogs/*.json` | G1 | Juego F5 | pendiente |

Los lotes A, B1 + D1, C1, G1 fuentes, I inicial, F, G1 y H1 no necesitan ningún insumo del juego. Se pueden empezar ya.
