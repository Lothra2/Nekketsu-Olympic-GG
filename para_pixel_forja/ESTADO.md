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
| 5 | I inicial | Kit a medida por configuración | A | entregado, falta aprobación de Rick | [pixel_forja#11](https://github.com/Lothra2/pixel_forja/pull/11) |
| 6 | E1 | Sistema de escenarios oblicuos + `saigon_hem` | A, I, layout de `saigon_hem` | pendiente | |
| 7 | F | Efectos | Nada | pendiente | |
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

**Lote I inicial** (PR #11), entregado. Falta la aprobación de Rick y el merge a `main`. Lo que trae:
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

## Insumos que pone el juego

Lo que PixelForja lee de este repo y todavía no existe. Cada uno lo produce una fase del juego.

| Insumo | Ruta | Lo necesita | Lo produce | Estado |
|---|---|---|---|---|
| Configuración del kit | `kit.config.json` | I, para generar el kit real | Juego F0 (versión inicial). El lote I puede arrancar antes con su propio ejemplo en `docs/ejemplos/nekketsu/` | pendiente |
| Equipos | `data/teams.json` | I. El lote C no lo necesita: las tablas de equipos están en el pedido | Juego F0 | pendiente |
| Layout del tramo 1 de Saigón | `data/stages/saigon_hem.layout.json` | E1 | Juego F3 (gris jugable) | pendiente |
| Layout de la azotea final | `data/stages/caracas_azotea.layout.json` | E3 | Juego F3 | pendiente |
| Resto de layouts | `data/stages/*.layout.json` | E2 a E6 | Juego F6 a F11 | pendiente |
| Textos | `data/dialogs/*.json` | G1 | Juego F5 | pendiente |

Los lotes A, B1 + D1, C1, G1 fuentes, I inicial, F, G1 y H1 no necesitan ningún insumo del juego. Se pueden empezar ya.
