# Pedido de la noche (v2)

Rick quiere que PixelForja trabaje toda la noche, de corrido, y que cada lote salga **completo**. Mañana revisa todo junto y corregimos donde haga falta. Este archivo dice qué hacer, en qué orden, qué cuenta como terminado y cómo no quedarse parado.

**Esta versión reemplaza a la anterior.** El punto 1 de la v1 (juntas 1:2 hacia la derecha y cara lateral derecha) estaba mal. No lo hagas. Rick lo vio en el gris del juego y lo rechazó: "las escaleras quedaron verticales con el relleno inclinado". La inclinación tiene que ser una proyección de verdad, y es la del punto 1 de abajo.

## Reglas de la noche

1. **No te detengas en las puertas de aprobación.** Deja lo que se aprueba (ficha de arte, postales, tablero, GIFs) en `docs/olimpico/<lote>/` y sigue con tu propia propuesta como si estuviera aprobada. En `ENTREGA.md` anota "pendiente de Rick" y la lista de "Decisiones que tomé sin preguntar". Mañana Rick aprueba todo en un solo paso.
2. **Un lote, una rama y un PR** (`claude/olimpico-lote-<x>`). No mezcles nada a `main`: eso lo hace Rick.
3. **Completo o nada.** Un lote se entrega cuando cumple TODO lo de "Qué cuenta como completo", más abajo. Si no alcanza el tiempo, mejor tres lotes completos que seis a medias. Nada de "esto queda para después" sin decirlo en "Límites honestos".
4. **Si algo se traba, salta al siguiente** y deja escrito qué lo trabó y qué probaste.
5. **Antes de cada lote**, vuelve a leer `para_pixel_forja/ESTADO.md`, este archivo y los layouts de `data/stages/` en la rama `claude/sweet-albattani-6orfv8` del juego.
6. **Al final de la noche**, un resumen único en `docs/olimpico/NOCHE.md` de PixelForja: qué quedó en cada rama, qué aprobar primero, qué falta y qué decidiste sin preguntar.

## Los conceptos de cada mundo

En `para_pixel_forja/referencias/conceptos/` hay arte conceptual de los 8 escenarios (10 imágenes: tres de la Comuna 13, una de cada uno de los demás) y un `LEEME.md` que dice qué tomar y qué ignorar de cada una.

- **Son la referencia de ambiente** para todos los lotes de escenarios (1, 3 y 8): paleta, elementos que hacen reconocible el lugar, capas y densidad de detalle.
- **La perspectiva y la geometría NO salen de ahí.** Salen del punto 1 y de `referencias/gris_inclinado/`.
- **La vara:** la postal de PixelForja no puede quedar por debajo de su concepto en identidad y detalle.

## Qué cuenta como completo

Vale para todos los lotes:

- **Todos los que lo usan.** Si es de atletas, son los 8 (Rick, Steph, Sophie, Alana, Kenji, Ryu, Goro y Tetsu). Si es de escenario, son todos los layouts que la tabla nombra.
- **Todas las filas que el juego usa.** De lado, en diagonal y de frente, con la misma celda y el mismo pivote que el resto del pack.
- **Metadatos completos en cada cuadro.** Eventos (`impacto` con su `punto`, `suelta`, `aterriza`, `despegue`), `cuerpo` y `cajas`, `manos` y `cabeza`. Si un golpe pega, su `impacto` dice dónde.
- **Nada de relleno.** No van cuadros repetidos para completar, ni placeholders, ni colores planos donde el resto tiene detalle.
- **Las pruebas en verde.** Las 9 del escenario, las del kit y las de animación, con el reporte en el PR.
- **Para aprobar:** GIFs con Sophie y Alana, postales de escenario y una hoja de contacto con todo lo nuevo. Las postales de escenario van al lado de su concepto.
- **El nombre del pack y la línea de `kit.config.json`.** Así el juego lo integra en un paso.
- **"Límites honestos" en `ENTREGA.md`.** Qué no quedó como querías y por qué.

## El orden

| # | Qué | Rama | Por qué va aquí |
|---|---|---|---|
| 1 | Vista inclinada de verdad en los escenarios | `claude/olimpico-lote-e2` | Es lo que más le molesta a Rick. Toca a E1 y a E2 |
| 2 | P1: la pelea, el corazón del juego | `claude/olimpico-lote-p1` | El juego ya estrenó agarre, guardia, pisotón, combos, VS, comida y K.O. Les falta el arte |
| 3 | Cerrar E2: postales y PR | `claude/olimpico-lote-e2` | Ya está en la puerta 1. Sale con la inclinación del punto 1 |
| 4 | C2: la cara "malandra" del Instituto y los equipos nacionales | `claude/olimpico-lote-c2` | Los rivales se ven muy dulces. Es lo segundo que más se nota en la pelea |
| 5 | B2 y B3: recorridos, trepar y bordes | `claude/olimpico-lote-b2-b3` | Ya están especificadas, sin decisiones de arte grandes |
| 6 | C7: perro de la calle, gallo y gato | `claude/olimpico-lote-c7` | La Comuna 13 tiene perros dormidos. Hoy son Thor oscurecido |
| 7 | D2: vehículos | `claude/olimpico-lote-d2` | Ferry, xích lô, motos, botes y metrocable. Hoy van en gris |
| 8 | E3: `medellin_c13`, `hoian` y `caracas_azotea` | `claude/olimpico-lote-e3` | Los tres emblemáticos. Van con todo el detalle del punto 8 |

---

## 1. Vista inclinada de verdad

**Lo que dice Rick:** "¿Por qué los mundos no se ven inclinados como el de la pelea? Las escaleras también deben verse con una perspectiva inclinada. Quiero todo cuadrado."

### La proyección, exacta

La misma de la azotea de la pelea (`floorBand` en `src/gfx/backdrops.ts` del juego, `shear = 0.35`). **Lo que está más al fondo se corre a la izquierda.**

```
px = x + k * y          (k = 0.35; y = 0 al fondo de la franja, y = 130 adelante)
py = franja.atras + y - z
```

- **La geometría no cambia.** Los layouts y las colisiones tampoco. Solo el dibujo.
- **Todo lo que toca el piso se proyecta,** sin excepción: piso, juntas, agua, huecos, cajas, postes, toldos, objetos, gente de adorno, vehículos y sombras. Si un solo elemento queda derecho, se nota al tiro.
- **El ancho pintado crece** a `largo + k * 130` px, porque la fila de adelante termina 45 px más a la derecha. Los trozos de 1280 tienen que cubrir eso, y las juntas diagonales tienen que cerrar de un trozo al otro (prueba 1).
- **El fondo de la franja (y = 0) no se mueve.** Las fachadas del fondo y el paralaje quedan igual.

### Cómo se ve cada cosa (copia el gris del juego)

En `para_pixel_forja/referencias/gris_inclinado/` hay capturas del gris del juego con esta proyección. Son la referencia de geometría. El arte tiene que calzar encima pixel por pixel, con todo el detalle que el gris no tiene.

- **Piso:** cada zona es un paralelogramo. Las juntas "hacia el fondo" son diagonales `\`: bajan 1 px a la derecha cada ~3 filas. Las juntas a lo ancho son horizontales, cada vez más separadas hacia adelante.
- **Cajas como volúmenes:** el techo es un paralelogramo, el frente un rectángulo, y la cara de la **izquierda** queda a la vista: un paralelogramo entre el borde de adelante y el de atrás. La cara derecha no se ve.
- **La cara izquierda sube desde lo que tenga pegado a ese lado.** Si al lado hay otra caja más baja, solo se ve el pedazo que sobresale. En un tramo de escalones, ese pedazo es la **contrahuella**. Así la escalera se lee escalón por escalón, con su nariz iluminada arriba. **Esto es lo que Rick pidió con las escaleras: que se vean como escaleras en perspectiva, no como un rectángulo con rayas.**
- **Escaleras eléctricas:** escalones de 14 px que suben, el pasamanos de vidrio con la baranda negra a los dos lados (el del fondo detrás de los escalones y el de adelante delante) y el techo naranja ondulado como plano inclinado sobre cuatro columnas.
- **Huecos:** se ve la pared del fondo del hueco (de frente) y la pared del otro lado (la cara izquierda del piso que sigue, inclinada). Abajo, el agua del canal o el vacío. Si el hueco llega adelante, el corte se ve en el bordillo.
- **El bordillo de adelante:** la cara del piso que da a la cámara, de y = 130 hasta el borde de la pantalla, como el borde de la azotea de la pelea.
- **Vigas y barandas:** se ve el canto de 8 px, no un muro hasta el piso.
- **Sombras:** hacia la derecha, en el piso. La luz viene de la izquierda, que es la cara que se ve.

### El parámetro

- **En `generarEscenario`:** la opción `inclinacion` (0.35 por defecto desde ahora, 0 para el dibujo viejo).
- **En `escenario.json`:** escribe `"inclinacion": 0.35`. **El juego ya lo lee.** Con el campo, corre a los atletas `inclinacion * y` para que pisen el piso pintado. Sin el campo, los deja derechos.

### Entrega

- `saigon_hem` rehecho y los 4 de E2 inclinados.
- Postales de antes y después, una al lado de la otra.
- Una postal de comparación con el gris del juego encima, al 50 %, para ver que calza.

## 2. P1: la pelea

**Rick:** "La pelea es la protagonista del juego. Quiero mejoras a la pelea."

### Lo que el juego ya tiene

Ya estrenó esto con las animaciones que existen. Mira `src/fight/actor.ts`, `brain.ts` y `src/scenes/Fight.ts`:

- **Agarre:** pegarse a un rival aturdido lo agarra. Puño son rodillazos y el tercero tumba. Patada lo bota. El agarrado forcejea y se suelta (`grab`, `grab_hold`, `grabbed`, `knee_grab`, `break_free`).
- **Guardia:** se mantiene la estrella sin la barra llena. Para los golpes de frente, y tres seguidos la rompen y quedas tambaleando (`guard`, `fight_block`, `stagger`).
- **Pisotón:** patada al que está en el piso. Hoy usa `low_kick` y se ve raro.
- **El combo:** jab, jab y gancho (`hook`). Corriendo y saltando sale `flying_kick`.
- **Onomatopeyas** de cómic dibujadas con figuras (¡POW!, ¡PAF!) y el contador "3 GOLPES".
- **Burlas:** el Instituto se ríe o te señala cuando te tumba (`laugh`, `point`).
- **La arepa:** cae cada tanto y quien la pisa recupera vida. Hoy es un dibujo de figuras.
- **El VS antes de pelear** con los retratos, y el K.O. grande al final con cámara lenta.

### Lo que falta en arte

Completo, para los 8, con todas las filas:

| Qué | Para qué |
|---|---|
| `stomp` | El pisotón de verdad: pierna arriba y pisada, con `impacto` en el pie |
| `grab_throw` | Desde el agarre, lanzarlo por encima del hombro. Hoy se bota con una patada |
| `knee_hit_react` | El agarrado recibiendo el rodillazo: se dobla. Hoy no reacciona |
| `back_elbow` | Codazo hacia atrás, para cuando te rodean en 4 contra 4 |
| `dash` | Un amague rápido hacia adelante o atrás, de 6 cuadros |
| `headbutt` | Cabezazo corto, de 6 cuadros, con `impacto` en la frente |
| `eat` | Comer la comida del piso: agacharse, morder y ¡ÑAM!, de 8 cuadros |
| `taunt_<id>` | Una burla propia de cada uno. Kenji se arregla el pelo, Goro se golpea la panza, Ryu se ríe tapándose la boca, Tetsu saca la lengua. La familia: Rick hace el "pana, tranquilo", Steph se cruza de brazos, Sophie hace pistolita con los dedos y Alana llama a Thor con un silbido |
| `victory_<id>` | La victoria propia de cada uno, distinta de la de todos |
| `edge_teeter` y `fall_off` | El borde del Kachinuki: tambalearse y caer de la azotea |

**Objetos de comida** (como objeto del kit, con `peso: 'comida'` y animación de humito): `arepa`, `tequeño`, `empanada`, `banh_mi` y `pan_de_bono`. Cada uno legible a 16 px, con su sombra.

**Efectos** (lote F, con el mismo formato que los demás):

- `onomatopeya_pow`, `onomatopeya_paf`, `onomatopeya_crack` y `onomatopeya_nam`. Estallido de cómic con las letras dibujadas, de 6 cuadros, que entra con rebote.
- `ko_grande`: "K.O." de pantalla completa con estallido, rayos y astillas, de 12 cuadros.
- `bloqueo`: el destello azul de la guardia.
- `agarre`: unas líneas de esfuerzo.

**UI:**

- `vs_fondo`: la pantalla VS con los dos colores partidos en diagonal, rayos y la palabra VS grande.
- `retratos` con la expresión `grande_burla` de los 8. La usa el VS para el que se burla.

**Público para la pelea:** gente en las azoteas de al lado que celebra, abuchea y señala. Va en una capa del escenario de la azotea, con 3 estados: `quieto`, `celebra` y `abuchea`.

## 3. Cerrar E2

- Las postales y el PR, con la inclinación del punto 1.
- **Puestos del mercado:** el juego ya resolvió la tapada con siluetas de color. Si el frente de los puestos deja ver algo (mesas con patas, toldos abiertos, cajas a media altura), mejor.

## 4. C2: Instituto malandro y equipos nacionales

- **La cara "malandra" del Instituto,** que sigue anotada. Kenji, Ryu, Goro y Tetsu con cejas fruncidas y media sonrisa como expresión base, en el sprite y en los retratos. Hoy se ven muy dulces para ser los rivales.
- **Las cuatro tablas de C2 del pedido:** Rồng Sài Gòn, Rolos de Chapinero, Panas de Caracas y Maracuchos del Lago.

## 5. B2 y B3

Las tablas de las secciones B2 y B3 del pedido, completas. Lo que el juego va a usar primero:

- `ladder`, `climb_wall` y `pull_up`: trepar los muros de la Comuna 13 en vez de saltarlos.
- `balance_walk`, `balance_wobble` y `balance_fall`: la viga sobre el hueco y la baranda de los techos de zinc.
- `duck_run`: por debajo de toldos y tendederos.
- `climb_pole`, `pole_idle`, `pole_punch`, `pole_slide`, `pole_kick_down`, `pole_shake` y `grab_leg_up`: el Tama-wari de Hội An.
- `javelin_run` y `hurdle_clear`, que siguen anotados desde el lote A.

## 6. C7: animales

- **`perro_calle` x3,** con `idle`, `walk`, `run`, `bark`, `sleep` y `scratch`. En la Comuna 13 duerme en el camino. Si lo pisas, despierta, ladra, te tumba y te persigue un poco.
- **Un `sleep` que se lea dormido desde lejos:** echado, con la cola enrollada. La "Z" la pone el juego.
- **`gallo`** (`idle`, `cantar`) y **`gato`** (`idle`, `walk`, `jump_wall`, `sleep`) para los techos.

## 7. D2: vehículos

Todos inclinados con la proyección del punto 1, con la cara izquierda a la vista:

- **`ferry`** de 110 x 40 de huella y 12 de alto, con `andando` y `atracado`. La gente se para encima.
- **`xich_lo`** por el carril 3 del río, de frente a la izquierda. El pasajero va adelante y el que pedalea atrás.
- **`moto`** x4 colores, con `andando`, `frenando`, `corneta` y conductor.
- **`bote_bambu`**: el thúng chai, el bote redondo.
- **`metrocable`**: la cabina de la línea J de Medellín colgando de su cable.
- **`jacintos` y `frutas_regadas`**, como efecto o como objeto.

## 8. E3: tres escenarios emblemáticos

**Rick:** "Si vas a hacer cosas emblemáticas, que me encanta, hazlo MUY bien y significativo: detalles, assets, mundos. Esfuérzate muchísimo más."

Quien conozca estos lugares tiene que reconocerlos en una postal, sin leer el nombre. Cada uno lleva su estilo nuevo, con ficha propia, referencias reales y un elemento que lo identifique de un vistazo. Todos con la proyección del punto 1.

### `medellin_c13`, Comuna 13 de Medellín (estilo `colombia_ladrillo`, mañana)

- **Las escaleras eléctricas** al aire libre, con techo naranja ondulado sobre estructura gris, subiendo en tramos por la ladera. En perspectiva, escalón por escalón (ver `referencias/gris_inclinado/c13_escalera_electrica.png`).
- **La escalera pintada:** cada contrahuella de un color, como las de verdad. Con la proyección se ven las contrahuellas, así que es el lugar perfecto para lucirse.
- **Los grafitis:** murales enormes y llenos de color, con caras, manos, colibríes, mariposas, flores, ojos y letras. Son la identidad del barrio, no relleno.
- **Casas de ladrillo apiladas en la ladera:** remates de bloque sin pintar, varillas saliendo del techo, tanques de agua negros, rejas de colores y matas en tarros.
- **El fondo:** el metrocable con cabinas rojas y blancas, la ciudad en el valle y las montañas verdes. Arriba, el mirador con la bandera de Colombia y el letrero "COMUNA 13".
- **Vida:** bailarines de break, músicos con parlante, el vendedor de paletas de mango biche, perros dormidos, gallos en los techos, ropa tendida y banderines entre las casas.
- **Paleta:** ladrillo naranja y terracota, verdes de montaña, el naranja del techo de las escaleras y grafitis saturados (magenta, turquesa, amarillo y morado).
- **Los tramos del layout v2:** la estación San Javier, la subida de los grafitis, las escaleras eléctricas, los callejones con perros, los techos de zinc y el mirador. Cada uno con su motivo propio.

### `hoian`, Hội An de noche (estilo `vietnam_hoian`, noche)

- **Los faroles de seda** de colores en racimos sobre la calle, que brillan y se mecen.
- **Las casas amarillas** de la ciudad vieja, con tejas de barro, puertas de madera y un farol en cada puerta.
- **El río Thu Bồn** con velitas en flores de papel y botes con faroles. Al fondo, el puente japonés (Chùa Cầu) iluminado.
- **La prueba, el Tama-wari:** dos postes de bambú con una bola gigante de papel pintado arriba. El efecto `bola_tama` ya trae 4 estados de rajadura. Al romperse sale el cartel con el nombre del equipo.
- **Paleta:** el amarillo de las casas, el rojo y el dorado de los faroles, y el azul noche del río.

### `caracas_azotea`, Kachinuki en Parque Central (estilo `venezuela_ciudad`, noche)

- **Las torres de Parque Central** al lado, con sus ventanas.
- **El Ávila de noche** al fondo, con la Cruz iluminada.
- **La ciudad encendida abajo** y los cerros con lucecitas.
- **Neón:** "AREPERA LA CHAMA" y "CARACAS".
- **En la azotea:** tanques de agua, antenas, la caseta de la escalera y el borde sin baranda con su franja de peligro. El borde avanza hasta x 420 a los 90 s. Si el filo se desmorona por pedazos, mejor.
- **El público** del punto 2 en las azoteas vecinas.
- **Vida:** un helicóptero con reflector y fuegos artificiales al final.

---

## Lo que hizo el juego hoy

- **El gris con la proyección de verdad.** Piso, cajas, escalones con contrahuella, escaleras eléctricas, huecos, bordillo, ferry, motos, efectos y atletas. Todo con `px = x + 0.35 * y`. Lee `inclinacion` de `escenario.json` cuando el arte lo traiga.
- **La pelea nueva:**
  - Agarre con rodillazos y forcejeo, guardia que se rompe y pisotón.
  - Jab, jab y gancho. Patada voladora corriendo.
  - Onomatopeyas, contador de golpes y burlas del Instituto.
  - Arepa que cura. VS con frases y K.O. grande.
  - El entrenamiento enseña la guardia y el agarre. `scripts/prueba-pelea-nueva.mjs` revisa cada cosa.
- **El kit regenerado** con `grab`, `knee_grab`, `guard`, `hook`, `flying_kick`, `laugh`, `point`, `stagger` y `slip_wet`. El resbalón del Cross ya usa `slip_wet`.
- Todo queda en `data/stages/`, `ESTADO.md` y `referencias/` de la rama `claude/sweet-albattani-6orfv8`.
