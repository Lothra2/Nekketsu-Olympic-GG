# Pedido de la noche

Rick quiere que PixelForja trabaje toda la noche, de corrido. Mañana revisa todo junto y corregimos donde haga falta. Este archivo dice qué hacer, en qué orden y cómo no quedarse parado.

## Reglas de la noche

1. **No te detengas en las puertas de aprobación.** Deja lo que se aprueba (ficha de arte, postales, tablero, GIFs) en `docs/olimpico/<lote>/` y sigue con tu propia propuesta como si estuviera aprobada. En `ENTREGA.md` anota "pendiente de Rick" y la lista de "Decisiones que tomé sin preguntar". Mañana Rick aprueba todo en un solo paso.
2. **Un lote, una rama y un PR** (`claude/olimpico-lote-<x>`). No mezcles nada a `main`: eso lo hace Rick.
3. **Calidad antes que cantidad.** Mejor cuatro lotes impecables que ocho a medias. Cada lote sale con sus pruebas en verde y su sección de "Límites honestos".
4. **Si algo se traba, salta al siguiente** y deja escrito qué lo trabó.
5. **Al final de la noche**, un resumen único en `docs/olimpico/NOCHE.md` de PixelForja: qué quedó en cada rama, qué aprobar primero y qué falta.
6. Antes de arrancar cada lote, vuelve a leer `para_pixel_forja/ESTADO.md` y los layouts de `data/stages/` en la rama `claude/sweet-albattani-6orfv8` del juego. Durante la noche el juego sube cosas nuevas (ver E3).

## El orden

| # | Qué | Rama | Por qué va aquí |
|---|---|---|---|
| 1 | Inclinación del dibujo en los escenarios | la de E2 | Es lo que más le molesta a Rick, y toca a E1 y E2 |
| 2 | Cerrar E2: postales y PR | `claude/olimpico-lote-e2` | Ya está en la puerta 1 |
| 3 | B2 y B3: recorridos, trepar y azoteas | `claude/olimpico-lote-b2-b3` | Ya están especificadas en el pedido, sin decisiones de arte grandes |
| 4 | C7: perro de la calle (y gallo y gato) | `claude/olimpico-lote-c7` | La Comuna 13 tiene perros dormidos; hoy el juego usa a Thor oscurecido |
| 5 | D2: vehículos | `claude/olimpico-lote-d2` | Ferry, xích lô, motos de carril, botes; hoy van en gris |
| 6 | C2: equipos nacionales y la cara "malandra" del Instituto | `claude/olimpico-lote-c2` | El pedido ya tiene las tablas |
| 7 | E3: estilos nuevos y `medellin_c13`, `hoian`, `caracas_azotea` | `claude/olimpico-lote-e3` | Va al final porque el juego rehace la Comuna 13 y escribe el layout de Hội An esta noche |

---

## 1. Inclinación del dibujo

**Lo que dice Rick:** "¿Por qué los mundos no se ven inclinados como el de la pelea? Cuando se ve todo vertical es raro."

**Qué pasa.** La azotea de la pelea (`bg_azotea`, en `src/gfx/backdrops.ts` del juego) tiene las juntas del piso en diagonal. Eso hace que el piso se lea como un plano que se va hacia atrás. En `saigon_hem` y en los de E2, el piso se pinta en bandas horizontales y todo lo demás es recto. No hay nada que cuente la profundidad, y el ojo lo lee como una pared.

**Lo que NO cambia:** la geometría. `px = x`, `py = franja.atras + y - z` siguen igual. Los layouts, las colisiones y el juego tampoco cambian. Las tapas de las cajas siguen siendo rectángulos, porque ahí se para la gente.

**Lo que cambia, todo en el dibujo:**
1. **Juntas y líneas de profundidad en diagonal, pendiente 1:2.** Hacia atrás, 1 px a la derecha por cada 2 px hacia arriba. Va en baldosas, grietas, bordillos, rayas de carril, tablas de muelle y juntas de la tapa de las cajas, igual que en la azotea de la pelea.
2. **Cara lateral de cada caja**, la derecha (al irse hacia atrás todo corre a la derecha, así que esa es la que se ve), como franja inclinada con la misma pendiente. Va por fuera de la huella, de 6 px como máximo, y más oscura que el frente.
3. **Sombras proyectadas en diagonal.** Cajas, postes, toldos y vehículos tiran su sombra hacia la izquierda y adelante, del lado contrario a la cara que se ve.
4. **Fachadas con relieve.** Balcones que salen, aleros, puertas y ventanas hundidas, callejones con su pared lateral inclinada visible.
5. **Una opción en `generarEscenario`** (por ejemplo `inclinacion: 0.5`, y 0 para el dibujo de hoy). Así se compara y se puede volver atrás.

**Entrega:**
- Postales de `saigon_hem` antes y después, una al lado de la otra.
- Los 4 de E2 ya inclinados.
- La prueba 1, de costuras, sigue en verde. Ojo con los trozos de 1280: las juntas diagonales tienen que cerrar entre un trozo y el siguiente.

El juego hace lo mismo con su gris esta noche, para que se vea igual mientras llega el arte.

## 2. Cerrar E2

- Las postales y el PR, con la inclinación del punto 1.
- **Puestos del mercado:** el juego ya resolvió la tapada con siluetas de color. Si el frente de los puestos deja ver algo (mesas con patas, toldos abiertos, cajas a media altura), mejor.

## 3. B2 y B3

Las tablas de las secciones B2 y B3 del pedido, completas. Lo que el juego va a usar primero:
- `ladder`, `climb_wall` y `pull_up`: trepar los muros de la Comuna 13 en vez de saltarlos.
- `balance_walk`, `balance_wobble` y `balance_fall`: la viga sobre el hueco y la baranda de los techos de zinc.
- `duck_run`: por debajo de toldos y tendederos.
- `edge_teeter` y `fall_off`: el borde del Kachinuki.
- `climb_pole`, `pole_idle`, `pole_punch`, `pole_slide`, `pole_kick_down`, `pole_shake` y `grab_leg_up`: el Tama-wari de Hội An.
- `javelin_run` y `hurdle_clear`, que siguen anotados desde el lote A.

Los GIFs de aprobación con Sophie y Alana.

## 4. C7: animales

- `perro_calle` x3, con `idle`, `walk`, `run`, `bark`, `sleep` y `scratch`. En la Comuna 13 duerme en el camino. Si lo pisas, despierta, ladra, te tumba y te persigue un poco.
- Hace falta un **`lie` o `sleep` que se lea dormido desde lejos**: echado, con la cola enrollada y una "Z" que el juego pone encima.
- `gallo` (`idle`, `cantar`) y `gato` (`idle`, `walk`, `jump_wall`, `sleep`), para los techos de la Comuna 13.

## 5. D2: vehículos

La tabla D2 del pedido. Lo que el juego ya usa en gris y espera reemplazar:
- **`ferry`** de 110 x 40 de huella y 12 de alto. Va y viene entre los muelles de `saigon_rio`. Con `andando` y `atracado`. La gente se para encima.
- **`xich_lo`**, por el carril 3 del río a 110 px/s, de frente a la izquierda. El pasajero adelante y el que pedalea atrás.
- **`moto`** x4 colores, por los carriles del hẻm y de la salida del mercado a 230 px/s. Con `andando`, `frenando` y `corneta`, y con conductor.
- **`bote_bambu`** (thúng chai, el bote redondo) para la orilla del río.
- **`metrocable`**: la cabina de la línea J de Medellín colgando de su cable, para el fondo de la Comuna 13.
- **`jacintos` y `frutas_regadas`**, como efecto o como objeto. Los jacintos flotan y bajan con la corriente. Las frutas son mangos, piñas, pitahayas y naranjas regadas en el piso.

## 6. C2: equipos nacionales e Instituto

- Las cuatro tablas de C2 del pedido: Rồng Sài Gòn, Rolos de Chapinero, Panas de Caracas y Maracuchos del Lago.
- **La cara "malandra" del Instituto**, que sigue anotada: Kenji, Ryu y Goro con cejas fruncidas y media sonrisa como expresión base. Hoy se ven muy dulces para ser los rivales.

## 7. E3: tres escenarios emblemáticos

**Rick:** "Si vas a hacer cosas emblemáticas, que me encanta, hazlo MUY bien y significativo: detalles, assets, mundos. Esfuérzate muchísimo más."

Estos tres son de los lugares más reconocibles de la gira. La gente que los conoce tiene que reconocerlos en una postal, sin leer el nombre. Cada uno lleva su estilo nuevo, con ficha propia, referencias reales y un elemento que lo identifique de un vistazo.

Antes de arrancar, relee los layouts. Esta noche el juego sube la **Comuna 13 v2**, rediseñada por tramos con identidad, y el layout nuevo de **Hội An**.

### `medellin_c13`, Comuna 13 de Medellín (estilo `colombia_ladrillo`, mañana)

**Lo que la hace reconocible:**
- **Las escaleras eléctricas** al aire libre, con techo naranja ondulado sobre estructura gris, subiendo en tramos por la ladera.
- **Los grafitis**: murales enormes y llenos de color en las paredes, con caras, manos, colibríes, mariposas, flores, ojos y letras. Son la identidad del barrio, no relleno.
- **Casas de ladrillo a la vista apiladas en la ladera**, unas encima de otras: ladrillo naranja, remates de bloque sin pintar, varillas saliendo del techo, tanques de agua negros, rejas de colores y matas en tarros.
- **El metrocable** cruzando el fondo, con cabinas rojas y blancas colgando.
- **La ciudad abajo en el valle** y montañas verdes alrededor. Arriba, el mirador con la bandera de Colombia y las letras grandes "COMUNA 13".
- **Vida:** bailarines de break en la calle de los grafitis, músicos con parlante, vendedor de paletas de mango biche, perros dormidos, gallos en los techos, ropa tendida y banderines de colores entre las casas.
- **Paleta:** ladrillo naranja y terracota, verdes de montaña, el naranja del techo de las escaleras, y los grafitis en colores saturados (magenta, turquesa, amarillo, morado) contra el ladrillo.
- **Tramos (los dice el layout v2):** la calle de la estación San Javier, la subida de los grafitis, las escaleras eléctricas, los callejones con perros, los techos de zinc y el mirador. Cada uno con sus murales y su propio motivo.

### `hoian`, Hội An de noche (estilo `vietnam_hoian`, noche)

**Lo que lo hace reconocible:**
- **Los faroles de seda** de colores (rojo, amarillo, morado, verde, naranja) colgando en racimos sobre la calle. Brillan y se mecen.
- **Las casas amarillas** de la ciudad vieja, con tejas de barro, puertas de madera, contraventanas y faroles en cada puerta.
- **El río Thu Bồn**, con velitas flotando en flores de papel y botes con faroles.
- **El puente japonés** (Chùa Cầu) al fondo, iluminado.
- **La prueba:** el Tama-wari. Dos postes altos de bambú, cada uno con una bola gigante de papel pintado arriba, con los colores de su equipo. La bola se raja en 4 estados, que el efecto `bola_tama` ya trae, y al romperse sale el cartel colgante con el nombre del equipo.
- **Vida:** faroles meciéndose, velitas en el río, vendedores de faroles, gente mirando la pelea.
- **Paleta:** el amarillo de las casas, el rojo y el dorado de los faroles, el azul noche del río con los reflejos de las velitas.

### `caracas_azotea`, Kachinuki en Parque Central (estilo `venezuela_ciudad`, noche)

**Lo que la hace reconocible:**
- **Las torres de Parque Central** al lado, con sus ventanas.
- **El Ávila de noche** al fondo, con la Cruz iluminada en la cima.
- **La ciudad de Caracas encendida** abajo y en los cerros, con los barrios de lucecitas.
- **Letreros de neón:** el juego ya pone "AREPERA LA CHAMA" y "CARACAS".
- **Tanques de agua, antenas, la caseta de la escalera** y el borde sin baranda a la derecha, con su franja de peligro.
- **Vida:** el neón que parpadea, un helicóptero con reflector que pasa, y fuegos artificiales al final.
- **El borde sin baranda:** el juego hace que avance hasta x 420 a los 90 s, y hoy pinta el vacío y el polvo. Si el arte trae el filo desmoronándose por pedazos, mejor.

---

## Lo que hace el juego esta noche

- Su gris con la misma inclinación (juntas diagonales y cara lateral derecha de las cajas).
- La Comuna 13 v2: tramos con identidad y mecánicas nuevas (bailarines de break, la pelota de los pelados que cruza la calle, el metrocable en el fondo).
- El layout de `hoian` para E3.
- Todo queda en `data/stages/` y en `ESTADO.md` de la rama `claude/sweet-albattani-6orfv8`.
