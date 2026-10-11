# Pedido a PixelForja para Nekketsu Olympic GG

Este documento es todo lo que el juego *Nekketsu Olympic GG* necesita de PixelForja. Está escrito para pegarse tal cual en una sesión de Claude Code abierta sobre el repo `Lothra2/pixel_forja`. Es autosuficiente: no hace falta leer el plan del juego para ejecutarlo, aunque el plan vive en `Lothra2/Nekketsu-Olympic-GG/docs/PLAN.md`.

---

## 1. Cómo usar este pedido

1. Se trabaja **un lote por sesión y un PR por lote**, en el orden de la sección 15.
2. Cada lote tiene sus criterios de aceptación. Un lote no está terminado si falla uno.
3. Si algo no se puede hacer bien con el esqueleto o el render actual, PixelForja lo dice en el PR, en una sección "Límites honestos", con la alternativa propuesta. No se entrega algo roto en silencio.
4. Cada PR trae: pruebas en verde, imágenes doradas nuevas, un tablero PNG con todo lo nuevo, GIFs de las animaciones clave y la tabla de calidad actualizada.
5. Las decisiones que PixelForja tome sin preguntar van listadas en el PR, como ya se hace en `docs/PLAN.md` de PixelForja.

---

## 2. Qué es el juego

Remake espiritual de los juegos deportivos Nekketsu de Technos para NES/Famicom: *Downtown Nekketsu Kōshinkyoku* (1990) y *Crash 'n the Boys* (1992), más 7 pruebas extra.

- **Vista:** 2.5D oblicua estilo Kunio-kun. El eje x va a lo largo, y es la profundidad dentro de una franja de piso, z es la altura.
- **Motor del juego:** Phaser 3. El juego solo lee la carpeta del kit y su `manifest.json`. No importa código de PixelForja.
- **Resolución interna:** 640 x 360, escala entera.
- **Escenarios:** Vietnam, Colombia, Venezuela, más una ciudad japonesa secreta.
- **Atletas:** 6 equipos de 4 (24 atletas), celda 48. Gigantes en 64, jefe secreto en 96.
- **Pruebas (16):** Cross Country, Obstáculos, Tama-wari, Kachinuki, Vallas, Martillo, Natación, Azoteas, Judo, Fútbol, Básquet, Vóley Playa, Quemado, Chapita, Đá cầu, Tejo. Más el bonus Cruce Loco.
- **Uso:** personal. Los superhéroes de fan se pueden incluir como equipo secreto.

---

## 3. Reglas de trabajo

Las mismas de siempre en PixelForja, sin excepción:
- Sin IA y sin red. Todo sale del código.
- Determinista: la misma entrada da los mismos pixeles en Node, navegador y worker.
- Movimiento **premium** para todos los atletas: poses clave, pivote fijo, eventos, avance sin patinar.
- Todo lo nuevo pasa el control de calidad existente (no se sale de la celda, pies en el piso, sin pixeles sueltos, altura estable en ciclos, impacto en cada golpe) en 32, 48 y 64.
- Ninguna textura pasa de 4096 px.
- Créditos LPC automáticos en `CREDITOS.txt`.
- Textos en español, ids en minúsculas con guion bajo.
- El kit se niega a borrar una carpeta que no sea un kit de PixelForja.

---

## 4. Contrato del kit

### 4.1 Carpetas
```
kit/
  manifest.json
  CREDITOS.txt
  atletas/<id>/<pack>.png          atlas del pack (todas sus animaciones), JSON Hash de TexturePacker
  atletas/<id>/<pack>.json
  atletas/<id>/retratos.png        expresiones, 40x40 y 96x96
  publico/<pais>.png               hinchas en 32 px
  npc/<id>.png                     vendedores, árbitro, locutor, etc.
  animales/<id>.png
  objetos/armas.png + .json        armas del piso en atlas
  objetos/<escenario>.png + .json  objetos de cada escenario
  vehiculos/<id>.png
  escenarios/<id>/                 ver sección 9.3
  fx/<id>.png
  ui/                              paneles, íconos, logo, fuentes, mapa, cinemáticas
  audio/musica/*.wav  audio/sfx/*.wav  audio/ambiente/*.wav  audio/voz/*.wav
```

### 4.2 Filas de las hojas
El juego usa solo 5 filas y espeja la izquierda con `flipX`:
```json
"filas": ["right", "down_right", "up_right", "down", "up"]
```
Las animaciones `lateral: true` se exportan igual en las 5 filas, con la diagonal donde no se pueda de frente, como ya hace el kit deportivo.

### 4.3 manifest.json
```jsonc
{
  "juego": "Nekketsu Olympic GG", "generado_con": "PixelForja", "version": 1,
  "resolucion": [640, 360],
  "filas": ["right", "down_right", "up_right", "down", "up"],

  "equipos": {
    "familia_gg": { "nombre": "Familia GG", "pais": "venezuela", "colores": ["#2a5bd7", "#f2c230"],
                    "atletas": ["rick", "steph", "sophie", "alana"], "mascota": "thor",
                    "musica": "acorde_familia", "bandera": "ui/banderas/ve.png" }
  },

  "atletas": {
    "rick": {
      "nombre": "Rick", "equipo": "familia_gg", "celda": 48, "pivote": [24, 46],
      "retratos": { "archivo": "atletas/rick/retratos.png", "chico": 40, "grande": 96,
                    "expresiones": ["neutral", "feliz", "enojo", "triste", "susto", "cerrado", "dolor"] },
      "cabecita": "ui/cabecitas.png#rick",
      "voz": { "tono": 0.9, "timbre": "cuadrada" },
      "packs": {
        "base": {
          "atlas": "atletas/rick/base.json",
          "anims": {
            "walk": {
              "cuadros": 8, "fps": 10, "loop": true, "avance": 10.6,
              "eventos": [{ "tipo": "paso", "cuadro": 0, "pie": "cerca" }],
              "cajas":  "[fila][cuadro] = [x, y, w, h] desde el pivote",
              "manos":  "[fila][cuadro] = [[x, y] cerca, [x, y] lejos]",
              "cabeza": "[fila][cuadro] = [x, y]",
              "pies":   "[fila][cuadro] = [[x, y] cerca, [x, y] lejos]"
            }
          }
        },
        "pelea": { "...": "..." }, "natacion": { "...": "..." }
      },
      "vestuario": { "base": "calle", "natacion": "banador", "judo": "judogi", "futbol": "camiseta" }
    }
  },

  "objetos": {
    "chancleta": { "atlas": "objetos/armas.json", "w": 10, "h": 6, "agarre": [3, 3],
                   "peso": "liviano", "rota": true, "anims": { "quieto": 1, "girando": 8 } }
  },
  "vehiculos": { "moto": { "archivo": "vehiculos/moto.png", "w": 48, "h": 32, "apoyo": [24, 30],
                           "anims": { "andando": 4, "frenando": 2 }, "caja": [-20, -6, 40, 12] } },
  "escenarios": { "saigon_hem": "escenarios/saigon_hem/escenario.json" },
  "fx": { "estrellas_mareo": { "archivo": "fx/estrellas_mareo.png", "celda": 24, "cuadros": 8, "fps": 10, "loop": true } },
  "ui": { "...": "..." },
  "audio": { "...": "..." }
}
```

---

## 5. Lote A: datos y exportación

Desbloquea el motor de pelea del juego. Es el lote más chico y el primero.

| Pedido | Detalle |
|---|---|
| A1. Filtro de filas | Opción `filas` en el render y el kit para exportar solo las 5 filas |
| A2. `cajas` | Recuadro del sprite opaco por fila y cuadro, relativo al pivote. Sale del pixel, no de la pose |
| A3. `manos`, `cabeza`, `pies` | Posición de las articulaciones por fila y cuadro, relativa al pivote. Las articulaciones ya se calculan en `RenderedClip.joints`, solo hay que exportarlas para todos los cuadros, no solo en `impacto` y `suelta` |
| A4. `punto` en todas las filas | Igual que hoy, verificado en las 5 filas |
| A5. Atlas por pack | Todas las animaciones de un pack en un atlas JSON Hash de hasta 4096 px. Nombre de cuadro: `<anim>_<fila>_<cuadro>` |
| A6. Retratos con expresión | Retrato de 40x40 en las 7 expresiones (neutral, feliz, enojo, triste, susto, cerrado, dolor) usando las caras LPC. Retrato grande de 96x96 dibujado nítido. Si el motor no puede dibujarlo nítido a 96, escalado entero x2 de uno de 48 y decirlo |
| A7. Cabecitas | Cabeza de 12x12 de cada atleta para el minimapa |
| A8. Vestuario por pack | Una ficha puede tener variantes de ropa por pack. El kit renderiza cada pack con su variante |

**Aceptación del lote A:**
- Una prueba verifica que cada `manos` cae sobre pixeles opacos de la mano en su cuadro.
- Una prueba verifica que `cajas` encierra todo pixel opaco y nada más.
- El kit deportivo actual sigue saliendo igual cuando no se piden las opciones nuevas.
- `docs/KIT_DEPORTES.md` documenta los campos nuevos.

---

## 6. Lote B: animaciones

Archivo nuevo `src/engine/anim/nekketsu.ts` y los que hagan falta, con el estilo de `fight.ts` y `athletics.ts`. Todas premium, con eventos.

Columnas: nombre, cuadros aproximados, fps, bucle, eventos que tiene que traer y notas. Los cuadros son una guía, la calidad manda.

### B1. Movimientos Kunio (lo más importante del juego)
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `lift` | 6 | 12 | no | `impacto` al agarrar | Se agacha, agarra con las dos manos y sube el objeto o rival sobre la cabeza |
| `carry_idle` | 4 | 6 | sí | | Objeto sobre la cabeza. `manos` exactas |
| `carry_walk` | 8 | 10 | sí | `paso` | Más corto y pesado que `walk` |
| `carry_run` | 8 | 14 | sí | `paso` | |
| `throw_overhead` | 6 | 14 | no | `suelta` con `punto` | Lanza lo que lleva sobre la cabeza hacia adelante |
| `carried` | 4 | 6 | sí | | El rival levantado, horizontal, pataleando. Usar la diagonal si de frente no se puede |
| `thrown_spin` | 8 | 16 | sí | | Rueda en el aire |
| `land_flat` | 4 | 12 | no | `aterriza` | Cae de plano y rebota |
| `grab` | 4 | 14 | no | `impacto` | Agarra de la ropa |
| `grab_hold` | 4 | 8 | sí | | Sostiene, forcejeo leve |
| `grabbed` | 4 | 8 | sí | | El agarrado |
| `knee_grab` | 5 | 14 | no | `impacto` | Rodillazo en agarre |
| `break_free` | 5 | 14 | no | | Se suelta |
| `dizzy` | 8 | 8 | sí | | Tambaleo. `cabeza` para los pajaritos |
| `ko_bounce` | 8 | 12 | no | `aterriza` x2 | Vuela, rebota y queda tirado. Más exagerado que `knockout` |
| `taunt` | 8 | 8 | no | | Burla genérica. Ver C para las de cada equipo |
| `weapon_pick` | 4 | 12 | no | `impacto` | Recoger del piso |
| `weapon_swing` | 6 | 14 | no | `impacto` con `punto` | Bate, tubo, escoba |
| `weapon_swing_heavy` | 8 | 12 | no | `impacto` | Pote, silla plástica, a dos manos |
| `weapon_throw` | 6 | 14 | no | `suelta` | Lanzamiento de objeto liviano: chancleta, piedra, nón lá |
| `run_punch` | 6 | 16 | no | `impacto` | Puñetazo corriendo |
| `run_kick` | 8 | 14 | no | `despegue`, `impacto`, `aterriza` | Patada voladora corriendo, con `elevacion` y `desplazamiento` |
| `air_kick` | 4 | 14 | no | `impacto` | Patada en el aire desde un salto normal |
| `slip_wet` | 8 | 14 | no | `aterriza` | Resbalón en piso mojado, cae sentado |

### B2. Cross Country
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `ladder` | 8 | 10 | sí | `paso` en cada mano | Sube escalera de mano, de espaldas |
| `climb_wall` | 8 | 10 | no | `impacto` al agarrar el borde | Trepa un muro bajo |
| `ledge_hang` | 4 | 6 | sí | | Colgado de un borde |
| `pull_up` | 8 | 12 | no | | Sube al borde |
| `balance_walk` | 8 | 8 | sí | `paso` | Brazos abiertos |
| `balance_wobble` | 8 | 10 | sí | | A punto de caerse |
| `balance_fall` | 6 | 12 | no | | |
| `duck_run` | 8 | 14 | sí | `paso` | Corre agachado para pasar bajo cables y toldos |
| `ride_bike_fast` | | | | | Revisar `bike` existente: hace falta versión a mayor velocidad y `bike_crash` |
| `bike_crash` | 8 | 14 | no | `aterriza` | Sale volando de la bici |
| `skate_crash` | 8 | 14 | no | `aterriza` | |

### B3. Tama-wari, Obstáculos y Kachinuki
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `climb_pole` | 8 | 10 | sí | `paso` en cada agarre | Sube un poste vertical |
| `pole_idle` | 4 | 6 | sí | | Agarrado arriba |
| `pole_punch` | 6 | 14 | no | `impacto` con `punto` arriba | Golpea la bola sobre su cabeza con una mano agarrada |
| `pole_slide` | 4 | 12 | sí | | Se resbala hacia abajo |
| `pole_kick_down` | 6 | 14 | no | `impacto` | Desde arriba patea al que sube |
| `pole_shake` | 6 | 12 | no | `impacto` | Desde abajo, patea o sacude el poste |
| `grab_leg_up` | 6 | 12 | no | `impacto` | Agarra el pie del que trepa y jala |
| `edge_teeter` | 8 | 10 | sí | | Al borde de la azotea, a punto de caer |
| `fall_off` | 8 | 12 | no | | Cae por el borde, sale de cuadro hacia abajo |

### B4. Pruebas de 1992
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `hammer_spin` | 8 | 14 | sí | | Gira con el martillo. Partir de `whirlwind` y `spin`. Implemento `hammer` con cadena |
| `hammer_release` | 6 | 14 | no | `suelta` con `punto` | |
| `swim_punch` | 6 | 12 | no | `impacto` | Con fila `agua` |
| `dunked` | 6 | 10 | no | | Se hunde y sale escupiendo agua |
| `swim_turn` | 6 | 12 | no | `impacto` del pie en la pared | Vuelta |
| `boat_start` | 6 | 12 | no | `despegue` | Salida desde un bote, variante de `dive` |
| `vault_fail` | 10 | 12 | no | `aterriza` | La garrocha se parte o no llega: cae |
| `judo_grip` | 4 | 10 | sí | | Agarre de judogi, los dos se tocan |
| `judo_throw` | 10 | 14 | no | `impacto` al caer | Seoi nage |
| `judo_thrown` | 10 | 14 | no | `aterriza` | El proyectado |
| `vovinam_scissor` | 10 | 14 | no | `despegue`, `impacto`, `aterriza` | Patada tijera voladora de vovinam |
| `bow` | 6 | 8 | no | | Saludo de dojo |

### B5. Pruebas de pelota
Ya existen fútbol, básquet y vóley completos. Falta:
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `dodge_throw` | 6 | 14 | no | `suelta` | Lanzamiento fuerte de quemado, con balón de goma |
| `dodge_catch` | 6 | 12 | no | `impacto` | Atrapa contra el pecho |
| `dodge_hit` | 6 | 12 | no | | Quemado: el balón le pega y sale disparado |
| `beach_run` | 8 | 12 | sí | `paso` | Correr en arena, pasos que se hunden |
| `dunk_nekketsu` | 12 | 14 | no | `despegue`, `impacto`, `aterriza` | Clavada exagerada con `elevacion` alta |

### B6. Pruebas nacionales
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `chapita_pitch` | 6 | 14 | no | `suelta` | Lanzamiento de lado con la muñeca, como frisbee pequeño |
| `chapita_bat` | 6 | 14 | no | `impacto` | Swing con palo de escoba. Implemento nuevo `broomstick` |
| `dacau_juggle` | 8 | 12 | sí | `impacto` en cada toque | Toques con el borde interno del pie |
| `dacau_kick_back` | 8 | 14 | no | `impacto` | Toque de espuela por detrás |
| `tejo_throw` | 8 | 12 | no | `suelta` | Lanzamiento por debajo con paso adelante. Implemento nuevo `tejo` |
| `cross_dodge` | 6 | 14 | no | | Esquiva de una moto en el Cruce Loco |

### Aceptación del lote B (cada sub-lote)
- Todo pasa la calidad en 32, 48 y 64 y en las 5 filas.
- Imagen dorada de un cuadro clave por animación.
- Tablero PNG con todas las animaciones del sub-lote, y GIF de cada una con Rick y con Alana (el más grande y la más pequeña).
- Con chibi, los brazos no pasan la cabeza: un objeto sobre la cabeza va apoyado en las manos, encima del pelo. Si no se ve bien, decirlo con captura.
- B1 se aprueba primero con un GIF de Rick levantando a Kenji y lanzándolo, antes de hacer el resto.

---

## 7. Lote C: personajes

### C1. Equipos principales (para la rebanada vertical)
Fichas premium, chibi, en `src/engine/rpg/` o una carpeta nueva `src/engine/nekketsu/teams.ts`.

**Familia GG** (azul `#2a5bd7` y dorado `#f2c230`): Rick, Steph, Sophie, Alana desde sus presets actuales, con chándal de equipo. Thor con todas sus animaciones de mascota.

**Instituto Nekketsu** (gakuran negro, cinta roja):
| Id | Nombre | Cuerpo | Pelo | Ropa |
|---|---|---|---|---|
| `kenji` | Kenji "Toro" Sakamoto | Chibi normal | `cowlick_tall` negro, tipo pompadour | Gakuran abierto sobre camiseta blanca |
| `ryu` | Ryu Takeda | Chibi delgado | `spiked` café, `headband_tied` blanca | Gakuran cerrado |
| `goro` | Goro Iwata | Gigante, celda 64 | `buzzcut` | Gakuran sin mangas |
| `tetsu` | Tetsu Mori | Chibi normal | `flat_top_straight` | Gakuran, lentes `shades` |

### C2. Equipos de los tres países
**Rồng Sài Gòn** (rojo `#da251d` y amarillo `#ffcd00`):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `minh` | Minh | `spiked`, cinta roja | Uniforme de vovinam azul |
| `lan` | Lan | `high_ponytail` | Uniforme escolar vietnamita: camisa blanca, pañoleta roja, pantalón azul |
| `tuan` | Tuấn | `messy1` | Franela y sandalias |
| `ba_hoa` | Bà Hoa | `bob` gris, nón lá | Bộ bà ba (conjunto de seda), cuerpo más ancho |

**Parceros de Medellín** (amarillo `#fcd116`, azul `#003893`, rojo `#ce1126`):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `santi` | Santi | `parted` | Camiseta de rayas con número |
| `valen` | Valen | `high_ponytail`, gorra | Chaqueta de grafitero |
| `el_mono` | El Mono | `curly_short` rubio, sombrero vueltiao | Camisa blanca |
| `don_jairo` | Don Jairo | Bigote `walrus`, sombrero | Gigante, celda 64, poncho y carriel |

**Los Panas de Caracas** (amarillo `#ffcc00`, azul `#00247d`, rojo `#cf142b`):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `gabo` | Gabo | `buzzcut`, gorra de béisbol | Camisa de pelotero sin logos |
| `yuli` | Yuli | `curly_long` | Uniforme de liceo venezolano: chemise beige, pantalón azul |
| `toto` | Chamo Toto | `afro` | Franela grande, chancletas |
| `carmen` | Señora Carmen | Rolos | Bata de casa con flores, chancleta en mano |

### C3. Equipos secretos
- **Los del Abismo:** goblin, trol, orco con cabezas LPC existentes, y el minotauro de GG Abyss en celda 96. Ropa deportiva "a la fuerza".
- **Equipo fan:** los 6 superhéroes existentes con ropa de deporte.

### C4. Ropa y accesorios nuevos
| Pieza | Detalle |
|---|---|
| `gakuran` | Chaqueta escolar japonesa de cuello alto con botones dorados, abierta o cerrada |
| `chandal` | Chaqueta y pantalón deportivo con 2 franjas del color del equipo |
| `banador` | Traje de baño de equipo y gorra de natación |
| `judogi` | Kimono blanco o azul con cinturón de color |
| `vovinam` | Uniforme azul de vovinam con cinturón |
| `uniforme_vn` | Camisa blanca con pañoleta roja |
| `uniforme_ve` | Chemise beige o azul de liceo |
| `ba_ba` | Conjunto de seda vietnamita |
| `bata_casa` | Bata de casa con estampado de flores |
| `poncho` | Poncho antioqueño blanco con rayas y carriel |
| Sombreros nuevos | `non_la` (cónico vietnamita), `vueltiao` (colombiano), `gorra_beisbol` (sin logo, colores del equipo), `rolos` |
| Calzado | `chancletas`, `sandalias` |

### C5. Burlas por equipo
| Equipo | Burla |
|---|---|
| Familia GG | Rick se arremanga, Thor ladra al lado |
| Instituto Nekketsu | Se acomoda el pompadour con un peine |
| Rồng Sài Gòn | Pose de vovinam con saludo |
| Parceros | Hace jueguitos con la rodilla y se ríe |
| Los Panas | Se sacude los hombros y señala |
| Señora Carmen | Agita la chancleta |

### C6. NPC
| Id | Uso | Animaciones |
|---|---|---|
| `locutor` | Retratos para diálogos y comentarios | Retrato en 7 expresiones |
| `arbitro` | Silbato, banderas | `idle`, `whistle`, `point`, `walk` |
| `kenji_intro` | Intro: de espaldas con el gakuran al viento | `idle_viento` |
| `vendedora_banhmi`, `vendedora_vara` | Saigón | `idle`, `pregonar`, `asustarse` |
| `abuelos_ejercicio` | Tao Đàn | `tai_chi`, `estirar` |
| `xe_om` | Mototaxista sentado en su moto | `idle`, `llamar` |
| `palenquera` | Cartagena | `idle`, `regañar` |
| `marimonda`, `comparsa` | Barranquilla | `bailar` |
| `vendedor_tequenos`, `motorizado` | Caracas | `idle`, `pregonar` |
| `policia_transito` | Cruce Loco | `pitar`, `señalar` |
| Público | 64 hinchas por país en 32 px, camisetas y banderas de su equipo | `idle`, `cheer`, `cheer_wave`, `flag_wave` |

### C7. Animales
| Id | Base | Animaciones |
|---|---|---|
| `perro_calle` x3 | Especie `perro` con 3 paletas | `idle`, `walk`, `run`, `bark`, `sleep`, `scratch` |
| `gato` x2 | Especie `gato` | `idle`, `walk`, `jump_wall`, `sleep` |
| `chiguire` | Especie nueva sobre el esqueleto cuadrúpedo, cuerpo de barril, patas cortas | `idle`, `walk`, `run`, `eat` |
| `paloma` | Desde el cuervo, otra paleta | `quieto`, `picotear`, `volar` |
| `garza` | Ave nueva, cuello largo | `quieto`, `volar` |
| `guacamaya` | Ave nueva, roja y azul | `volar`, `posada` |
| `gallo` | Ave nueva | `idle`, `cantar` |
| `bufalo` | Solo fondo, pastando | `idle` |

### Aceptación del lote C
- Todas las fichas exportables desde el estudio con "Exportar ficha".
- Tablero de cada equipo con los 4 atletas en las 5 filas, `idle` y `run`, más sus retratos.
- Cada atleta se distingue de los demás en silueta a 48 px (prueba visual en el tablero).
- Los colores de equipo se leen sobre cualquier escenario.

---

## 8. Lote D: objetos y vehículos

### D1. Armas del piso (con el lote B1)
Implementos dibujados con código en `render/props.ts`, más su sprite suelto para el piso.

| Id | Notas |
|---|---|
| `chancleta` | Gira al lanzarla. 8 cuadros de giro |
| `silla_plastica` | Roja, azul o verde. La icónica de Vietnam. Apilable |
| `non_la` | Se lanza como frisbee |
| `coco` | Rueda |
| `bate` | Ya existe `bat` |
| `tubo` | Metal |
| `llanta` | Rueda de lado |
| `pote_basura` | Metálico con tapa que sale volando |
| `cono` | Naranja |
| `escoba` y `broomstick` | El palo de la chapita |
| `piedra` | Variantes |
| `balon_goma` | Quemado |
| `chapa` | Chapa de refresco, 3 colores, con estela |
| `tejo` | Disco de metal |
| `volante_dacau` | Volante con plumas de colores |

### D2. Vehículos (con el lote E)
| Id | Escenario | Animaciones |
|---|---|---|
| `moto` x4 colores | Saigón, Caracas | `andando`, `frenando`, `corneta` (con conductor) |
| `moto_carga` | Saigón | Moto cargada de cajas o flores |
| `xich_lo` | Saigón, Hội An | `andando` |
| `ferry` | Río Saigón | `andando` |
| `bote_bambu` | Río, Hạ Long | `meciendo` |
| `junco` | Hạ Long | Velas rojas, `meciendo` |
| `transmilenio` | Bogotá | `andando`, `parado` |
| `buseta` | Bogotá | `andando` |
| `willys` | Eje Cafetero | Cargado de café, `andando` |
| `camionetica` | Caracas | `andando`, `parada` |
| `carro` x3 | Ciudades | `andando`, `alarma` |
| `helicoptero` | Kachinuki | `volando` con reflector |
| `avion` | Intro | `volando` |

---

## 9. Lote E: escenarios

El corazón del pedido y donde menos margen de error hay. La regla: **el juego define la geometría, PixelForja pinta encima y verifica.**

### 9.1 Sistema de escenarios oblicuos (E1)
Carpeta nueva `src/engine/world/oblique/`.

| Pieza | Qué hace |
|---|---|
| `layout.ts` | Lee y valida el layout (9.2) |
| `floor.ts` | Pinta el piso en perspectiva oblicua por tipo: asfalto, acera, tierra, baldosa, madera, metal, arena, tatami, greda, cancha, pasto, agua |
| `facade.ts` | Generador de fachadas por parámetros: pisos, ventanas encendidas o no, balcones, toldos, letreros con texto real corto, cables, aires acondicionados, rejas, grafitis, plantas. Con estilos por país |
| `sky.ts` | Cielo por hora: amanecer, mañana, mediodía, tarde, atardecer, noche, nublado, aguacero |
| `skyline.ts` | Siluetas lejanas con los íconos de cada lugar |
| `foreground.ts` | Primer plano: barandas, postes, cables, plantas |
| `objects.ts` | Objetos con apoyo, sólidos y animaciones, igual que el mundo del Bosque GG |
| `life.ts` | Vida de fondo: motos que pasan, ropa con viento, faroles que se mecen |
| `weather.ts` | Capa de piso mojado con reflejos y charcos, ventanas encendidas de noche como capa aparte |
| `verify.ts` | Las pruebas de 9.4 |

### 9.2 Formato del layout (lo escribe el juego)
Todas las medidas en pixeles de mundo. x a lo largo, y profundidad dentro de la franja (0 es el fondo), z altura sobre el piso.

```jsonc
{
  "id": "saigon_hem",
  "pais": "vietnam",
  "prueba": "crosscountry", "tramo": 1,
  "largo": 3840,
  "franja": { "atras": 200, "adelante": 330 },          // en pantalla: la franja mide 130 px
  "hora": "manana",
  "clima": ["despejado", "aguacero"],                   // variantes que el juego puede activar
  "paralaje": { "cielo": "auto", "lejos": "saigon_skyline", "cerca": "hem" },

  "piso":        [{ "x0": 0, "x1": 3840, "tipo": "asfalto" },
                  { "x0": 0, "x1": 3840, "y0": 0, "y1": 24, "tipo": "acera" }],
  "huecos":      [{ "x0": 1200, "x1": 1290, "y0": 0, "y1": 130, "caida": "agua" }],
  "plataformas": [{ "x": 800, "y": 20, "w": 96, "d": 30, "z": 24, "tipo": "carro", "subible": true }],
  "muros":       [{ "x": 1500, "y": 0, "w": 16, "d": 130, "z": 64, "trepable": true }],
  "escaleras":   [{ "x": 2000, "y": 10, "z0": 0, "z1": 96, "tipo": "mano" }],
  "postes":      [{ "x": 640, "y": 40, "alto": 160, "tipo": "tama_wari" }],
  "agua":        [{ "x0": 2400, "x1": 2900, "nivel": 8, "corriente": -10 }],
  "bajo":        [{ "x0": 300, "x1": 420, "z": 28, "tipo": "cables" }],        // hay que agacharse
  "solidos":     [{ "x": 1100, "y": 0, "w": 40, "d": 20, "z": 48 }],
  "carriles":    [{ "y": 20 }, { "y": 50 }, { "y": 80 }, { "y": 110 }],          // vallas, natación, cruce

  "entidades": [
    { "tipo": "salida", "x": 40 },
    { "tipo": "meta", "x": 3800 },
    { "tipo": "objeto", "objeto": "silla_plastica", "x": 600, "y": 60 },
    { "tipo": "npc", "npc": "vendedora_banhmi", "x": 900, "y": 4 },
    { "tipo": "animal", "animal": "perro_calle", "x": 1400, "y": 90, "conducta": "perseguir" },
    { "tipo": "vehiculo", "vehiculo": "moto", "carril": 2, "cada": 4.5, "desde": "derecha" },
    { "tipo": "atajo", "x0": 1700, "x1": 2600, "nombre": "alcantarilla" }
  ],

  "ranuras_deco": [{ "x0": 0, "x1": 640, "capa": "cerca", "tema": "hem_casa_tubo" }],
  "vida": ["motos_fondo", "ropa_tendida", "palomas", "cables_viento"]
}
```

El juego entrega un layout por escenario. PixelForja **no cambia la geometría**. Si un detalle de arte necesita mover algo, lo pide en el PR.

### 9.3 Lo que devuelve PixelForja por escenario
```
escenarios/<id>/
  escenario.json            el layout validado + todo lo de abajo
  cielo_<hora>.png          se repite en x sin costura
  lejos.png                 silueta lejana, se repite sin costura
  cerca_<n>.png             fachadas en trozos de 1280 px
  piso_<n>.png              piso en trozos de 1280 px
  piso_mojado_<n>.png       capa de piso mojado (si el clima lo trae)
  noche_<n>.png             ventanas y letreros encendidos (si la hora lo trae)
  frente_<n>.png            primer plano en trozos
  objetos.png + .json       atlas de objetos del escenario con apoyo, sólido y anims
  superficie.png            por pixel de la franja: qué suena y si resbala
  colision.json             la colisión verificada, igual al layout
  luces.json                luces con color, radio, parpadeo o latido
  particulas.json           partículas sugeridas por zona
  postales/inicio.png, medio.png, final.png    640x360 exactos
  ficha_arte.md             paleta, elementos icónicos, decisiones
  verificacion.md           resultado de las 9 pruebas de 9.4
```

### 9.4 Pruebas automáticas (todas bloquean)
1. **Costuras:** los trozos pegan sin una sola línea de diferencia.
2. **Paralaje:** cada capa repetible cierra el ciclo sin salto.
3. **Piso:** ningún pixel transparente donde el layout dice piso.
4. **Apoyo:** todo objeto cae sobre piso o plataforma.
5. **Colisión:** `colision.json` es igual al layout.
6. **Camino:** desde la salida se llega a la meta con las reglas de la prueba.
7. **Legibilidad:** contraste mínimo entre el contorno de un atleta de cada equipo y el fondo en toda la franja. Se mide pegando atletas cada 64 px y calculando el contraste de luminancia.
8. **Paleta:** no más colores que los de la ficha de arte.
9. **Peso:** máximo de capas, luces y objetos animados por pantalla.

### 9.5 Puertas de aprobación por escenario
1. **Ficha de arte:** paleta de 24 colores, 8 a 12 elementos icónicos, 3 detalles de vida. Se aprueba antes de pintar.
2. **Gris:** el layout ya se jugó en el juego. PixelForja no recibe layouts sin jugar.
3. **Postales:** 3 postales a la hora elegida. Se aprueban antes de terminar.
4. **Completo:** todas las capas, las 9 pruebas en verde.
5. **Tablet:** se prueba en el juego.

### 9.6 Lista de escenarios por sub-lote
| Sub-lote | Escenarios |
|---|---|
| E1 | El sistema completo más `saigon_hem` como piloto |
| E2 | `saigon_benthanh`, `saigon_rio`, `saigon_azoteas`, `saigon_estadio` |
| E3 | `medellin_c13`, `hoian`, `caracas_azotea` |
| E4 | `cocora`, `llanos`, `halong`, `cartagena`, `hanoi_dojo` |
| E5 | `barranquilla`, `maracaibo`, `margarita`, `liceo` |
| E6 | `taodan`, `candelaria`, `caracas_barrio`, `cruce_saigon`, `cruce_bogota`, `cruce_caracas`, `nekketsu` |

### 9.7 Fichas de arte de partida
Lo que tiene que verse en cada escenario. PixelForja completa la ficha y la propone en la puerta 1.

| Id | Hora | Elementos icónicos | Vida |
|---|---|---|---|
| `saigon_hem` | Mañana | Casas tubo angostas de 3 a 5 pisos, cables enredados, motos paradas, sillas plásticas, puestos de bánh mì, altar de la tierra con incienso, rejas plegables | Motos que pasan al fondo, incienso, palomas |
| `saigon_benthanh` | Media mañana | Torre del reloj del mercado, toldos, pirámides de frutas, flores, vendedoras con nón lá | Toldos con viento, vendedoras pregonando |
| `saigon_rio` | Mediodía | Ferry, jacintos de agua, botes de bambú, puente, Landmark 81 al fondo | Agua animada, jacintos que flotan, ferry |
| `saigon_azoteas` | Tarde con aguacero | Cafés en azotea con sillitas, tanques de agua, ropa tendida, antenas, Bitexco al fondo | Lluvia, ropa con viento, charcos que crecen |
| `saigon_estadio` | Atardecer | Gradas llenas, marcador, banderas, pista roja | Público ondeando, fuegos artificiales |
| `halong` | Mañana | Islotes de piedra caliza, juncos de velas rojas, aldea flotante, boyas | Olas, juncos meciéndose, gaviotas |
| `taodan` | Amanecer | Árboles enormes, banco, abuelos haciendo ejercicio, jaulas de pájaros colgadas | Abuelos en tai chi, pájaros, rayos de luz |
| `hoian` | Noche | Faroles de seda de colores, casas amarillas, río Thu Bồn, puente japonés, velitas en el río | Faroles que se mecen, velitas flotando |
| `hanoi_dojo` | Tarde | Tatami, ventanales al lago Hoàn Kiếm, Torre de la Tortuga al fondo, caligrafía | Hojas que caen afuera, público en el borde |
| `medellin_c13` | Mañana | Escaleras eléctricas con techo naranja, grafitis de colores, casas de ladrillo apiladas, metrocable al fondo | Metrocable, músicos, perros |
| `cartagena` | Atardecer | Balcones de madera con buganvillas, fachadas de colores, Torre del Reloj, murallas, mar Caribe | Pétalos que vuelan, palenquera, coche de caballos al fondo |
| `cocora` | Mañana con neblina | Palmas de cera altísimas, cafetales, montañas verdes, pista de tierra de escuela rural, Willys | Neblina en 2 capas, colibríes |
| `candelaria` | Tarde nublada | Cancha de tejo techada de madera, mechas, banderines, casas coloniales, Monserrate por la ventana | Humo de las mechas, banderines |
| `barranquilla` | Mediodía | Calle de barrio con casas de colores, arcos de piedra, carnaval: guirnaldas, máscaras, Marimonda | Comparsas al fondo, confeti |
| `caracas_barrio` | Tarde | Casitas de bloque en el cerro, escaleras, El Ávila, tanques en los techos, cava de refrescos | Papagayos en el cielo, perros, vecinas en la ventana |
| `margarita` | Mediodía | Playa El Agua, palmeras, toldos, mar turquesa, red de vóley | Olas, toldos con viento, vendedor de empanadas |
| `llanos` | Atardecer | Sabana infinita, morichales, caney, chigüires, garzas | Garzas volando, chigüires, cielo naranja que cambia |
| `maracaibo` | Noche | Cancha de barrio, Puente Rafael Urdaneta iluminado, el Lago, relámpago del Catatumbo al fondo | Relámpagos que iluminan la cancha, luces del puente |
| `liceo` | Mañana | Patio techado, murales patrios, cantina, cancha pintada, pupitres apilados | Alumnos mirando, conserje barriendo |
| `caracas_azotea` | Noche | Azotea de Parque Central, El Ávila con la Cruz iluminada, torres con ventanas, neón, tanques | Neón que parpadea, helicóptero, fuegos artificiales al final |
| `cruce_saigon` | Hora pico | Avenida ancha, ríos de motos, xích lô, vendedoras con vara | Tráfico constante |
| `cruce_bogota` | Hora pico | Avenida con carril de TransMilenio, busetas, vendedores ambulantes, llovizna | Llovizna, paraguas |
| `cruce_caracas` | Hora pico | Autopista con cola, camioneticas por puesto, motorizados, vendedores de tequeños, El Ávila | Tráfico, vendedores caminando entre carros |
| `nekketsu` | Atardecer | Escuela japonesa, expendedoras con luz, muro de concreto junto al río, postes con cables, homenaje al Barrio de 1990 | Cuervos, expendedoras que zumban |

---

## 10. Lote F: efectos

| Id | Detalle |
|---|---|
| `polvo_correr`, `polvo_frenar`, `polvo_caer` | 3 tamaños, salen en los eventos `paso`, `aterriza` |
| `chispa_golpe_<peso>` | Liviano, medio, pesado. Ya hay chispas de pelea, extender |
| `estrellas_mareo` | Estrellas y pajaritos girando, en bucle |
| `nube_ko` | Nube de caricatura sin texto |
| `sudor`, `gota`, `lagrima_comica` | |
| `chapuzon_chico`, `chapuzon_grande`, `estela`, `ondas` | Agua |
| `confeti`, `serpentina` | |
| `bola_tama` | 4 estados de daño más la explosión de confeti y el cartel colgante |
| `mecha_tejo` | Explosión con humo |
| `estela_chapa` | |
| `ventana_rota` | |
| `pantalla_rota` | Capa de 640x360 para la intro |
| `lineas_velocidad` | Capa de 640x360 para las técnicas |
| `marco_corte` | Marco del corte de anime con el retrato |
| `fuegos_artificiales` | 4 colores |
| `lluvia`, `salpicadura_piso`, `onda_charco` | Aguacero |
| `relampago` | Rayo lejano y destello |
| `humo_moto` | |
| `petalo_buganvilla`, `hoja`, `arena` | |
| `brillo_record` | |
| `aura_nekketsu` | Medidor lleno, sobre el atleta. Ya existe `aura`, ajustar al estilo |
| `huella_mojada` | |

**Aceptación:** tablero con todos, cada uno con su celda, cuadros y fps en el manifiesto.

---

## 11. Lote G: interfaz y cinemáticas

### G1. Para la rebanada vertical
| Id | Detalle |
|---|---|
| `logo` | "NEKKETSU OLYMPIC GG" animado con brillo, con la fuente de títulos. 2 tamaños: 320x112 y 160x56 |
| Paneles por equipo | 9-slice en los 6 colores de equipo |
| Barras | Aguante y medidor Nekketsu, con estado lleno que brilla |
| Marco de retrato | Para 40 y 96 |
| Banners | Fondos para "¡LISTOS!", "¡YA!", "¡KO!", "¡META!", "¡GOL!", "¡RÉCORD!", "¡JONRÓN!". El texto lo pone el juego con la fuente |
| Controles táctiles | Base y bola de palanca, botones A, B, C y especial, pausa. Normal y presionado |
| Minimapa | Barra de carrera |
| Números | Ya existen, sumar estilo "marcador de TV" para las pelotas |

### G2. Para el envoltorio completo
| Id | Detalle |
|---|---|
| Íconos de prueba | 16 más el bonus, 32x32 |
| Banderas | Vietnam, Colombia, Venezuela, Japón, en 16 y 32 px, y animadas ondeando |
| Mapa de la gira | 640x360 con los 3 países y la ruta del avión |
| Medallas | Oro, plata y bronce, en 16, 32 y 64 |
| Moneda GG | Girando |
| Comida | 16 íconos: bánh mì, phở, cà phê sữa đá, nước mía, arepa, empanada, bandeja paisa, buñuelo, aguapanela, tequeños, cachapa, malta, papelón con limón, onigiri, ramen, chè |
| Equipo de tienda | Zapatillas, cinta, gorra de natación, guantes, rodilleras |
| Tarjeta de equipo | Para la intro y la selección: fondo con colores, escudo y bandera |
| Marco VS | Pantalla en 4 para los capitanes |
| Podio | 640x360 en el estadio |
| Pantalla de inicio | Fondo para "Toca para empezar" |
| Íconos de app | Logo con Thor, en todos los tamaños que ya exporta el kit |
| Escenas de la intro | Mapa mundial con avión y sellos, desayuno de la Familia GG en Saigón (mesa, sillas, café, arepas), Kenji en la azotea de su escuela de espaldas |

---

## 12. Lote H: audio

### H1. Para la rebanada vertical
- `marcha_nekketsu`: marcha de banda escolar a 132 bpm, trompeta en onda cuadrada, redoblante con ruido. 60 s en bucle sin corte.
- `saigon_chay`: el tema de Vietnam.
- `azotea_final`: tema de pelea.
- `victoria`, `derrota`: jingles cortos.
- Efectos: `pistola`, `silbato`, `golpe_1..3`, `golpe_pesado`, `chancleta`, `silla`, `pote`, `levantar`, `lanzar`, `caer_plano`, `mareo`, `ko`, `publico_grito`, `publico_ooh`, `blip_<tono>` x6.

### H2. Todo lo demás
| Tema | Carácter |
|---|---|
| `tema_instituto` | Rock japonés de los 80 en menor |
| `hoian_noche` | Tambores de festival y flauta |
| `parce_corra` | Cumbia chiptune, guacharaca con ruido filtrado |
| `cafe_neblina` | Bambuco acelerado |
| `pana_dale` | Joropo chiptune con arpegio tipo cuatro y maracas |
| `gaita_lago` | Gaita zuliana con furro y tambora |
| `vestuario` | Tranquilo |
| `acorde_<equipo>` | 4 compases por equipo |

Efectos: chapuzón, brazada, bola que revienta, mecha de tejo, chapa, ventana rota, megáfono, perro, moto con corneta, camionetica, gallo, chicharras, ranas, trueno, relámpago, salida de natación, garrocha, martillo girando, red de vóley, rebote de balón, aro de básquet, toque de đá cầu.

Ambientes en bucle de 12 s: `trafico_saigon`, `mercado`, `rio`, `aguacero`, `mar`, `parque_amanecer`, `comuna`, `cafetal`, `llano`, `lago_noche`, `playa`, `liceo`, `azotea_noche`, `estadio`.

**Aceptación del lote H:** las pruebas de forma actuales (duración, sin saturar, WAV válido, bucle sin corte) y un archivo `audio/escuchar.html` que toca todo con un clic, para que Rick lo escuche en la tablet y apruebe.

**Límite que hay que asumir:** no hay voz hablada sin IA. Los diálogos usan blips con tono por personaje.

---

## 13. Lote I: generador del kit y visores

| Pedido | Detalle |
|---|---|
| `src/engine/kit/olympickit.ts` | Arma todo el kit del contrato de la sección 4 |
| `scripts/olympic-kit.ts` | `npm run olimpico -- <carpeta> [--fichas <carpeta>] [--escenarios <carpeta de layouts>] [--rapido] [--solo <lote>]` |
| Packs por prueba | Cada atleta exporta solo los packs que usa cada prueba. La lista sale de `pruebas.json` del juego o de una tabla en el generador |
| Visor de escenarios | Como `visor-mundo`: abre un escenario del kit con paralaje, luces, clima, vida y un atleta caminando, con botones de hora y clima |
| Visor de atletas | Tablero navegable de todos los atletas, packs y animaciones, con cajas, manos y puntos dibujados encima |
| `docs/KIT_OLIMPICO.md` | Cómo se genera, qué trae, qué hace el juego con cada campo, con ejemplos en Phaser |
| Pruebas | Que el manifiesto cumpla el contrato, que ningún archivo referido falte, que ninguna textura pase de 4096 px, que el kit completo se genere en menos de 3 minutos |

---

## 14. Cómo me entregas cada lote

Cada PR de PixelForja trae:
1. Lo pedido, con las pruebas en verde.
2. Tablero PNG de todo lo nuevo en `docs/olimpico/<lote>/`.
3. GIFs de las animaciones clave.
4. Postales de cada escenario nuevo.
5. Tabla de calidad actualizada.
6. Sección "Decisiones que tomé sin preguntar".
7. Sección "Límites honestos" con lo que no quedó perfecto y la alternativa.

---

## 15. Orden y dependencias

| Orden | Lote | Para qué fase del juego | Depende de |
|---|---|---|---|
| 1 | **A** datos y exportación | F1 motor de pelea | Nada |
| 2 | **B1 + D1** movimientos Kunio y armas | F2 | A |
| 3 | **C1** Familia GG e Instituto Nekketsu | F4 | A |
| 4 | **E1** sistema de escenarios + `saigon_hem` | F4 | A, layout del juego |
| 5 | **F** efectos (lo de pelea y carrera primero) | F5 | Nada |
| 6 | **G1, H1** interfaz y audio de la rebanada | F5 | Nada |
| 7 | **I** generador (versión inicial) | F5 | A, B1, C1, E1 |
| 8 | **B2, C2, D2, E2** Cross Country completo y los 3 países | F6 | E1 |
| 9 | **B3, E3** Obstáculos, Tama-wari, Kachinuki | F7 | E1 |
| 10 | **B4, E4** pruebas de 1992 | F8 | E1 |
| 11 | **G2, H2** envoltorio y audio completo | F9 | |
| 12 | **B5, E5** pelotas | F10 | E1 |
| 13 | **B6, C3, E6** nacionales, secretos y Barrio Nekketsu | F11 y F12 | E1 |

---

## 16. Prompts listos

Para cada lote, abrir una sesión de Claude Code sobre `Lothra2/pixel_forja` y pegar:

**Lote A:**
> Lee el pedido de Nekketsu Olympic GG (te lo pego abajo, o está en Lothra2/Nekketsu-Olympic-GG/docs/PEDIDO_PIXEL_FORJA.md). Haz el Lote A completo: filtro de 5 filas, cajas, manos, cabeza y pies por cuadro, atlas por pack, retratos con 7 expresiones en 40 y 96, cabecitas y vestuario por pack. Cumple las reglas de la sección 3 y los criterios de aceptación del lote. Entrega según la sección 14 en un PR.

**Lote B1 + D1:**
> Del pedido de Nekketsu Olympic GG, haz el Lote B1 (movimientos Kunio) y D1 (armas del piso). Primero solo `lift`, `carry_walk`, `throw_overhead`, `carried` y `thrown_spin` con un GIF de Rick levantando a Kenji y lanzándolo, y párate para que lo apruebe. Después el resto del lote.

**Lote C1:**
> Del pedido de Nekketsu Olympic GG, haz el Lote C1: Familia GG con chándal de equipo, Thor, e Instituto Nekketsu completo, con la ropa nueva de C4 que necesiten (gakuran y chándal). Tablero por equipo y retratos.

**Lote E1:**
> Del pedido de Nekketsu Olympic GG, haz el Lote E1: el sistema de escenarios oblicuos de la sección 9.1, el formato de layout de 9.2, las salidas de 9.3 y las 9 pruebas de 9.4. Piloto: `saigon_hem` con el layout que te paso. Arranca por la ficha de arte (puerta 1) y párate para que la apruebe antes de pintar.

**Lotes siguientes:**
> Del pedido de Nekketsu Olympic GG, haz el Lote <X>. Respeta las puertas de aprobación de los escenarios y para en cada puerta.
