# Pedido a PixelForja para Nekketsu Olympic GG (v2)

Este documento es todo lo que el juego *Nekketsu Olympic GG* necesita de PixelForja. Lo lee una sesión de Claude Code abierta sobre `Lothra2/pixel_forja`, siguiendo el protocolo de [LEEME.md](LEEME.md). El estado de cada lote está en [ESTADO.md](ESTADO.md) y el plan del juego en [../docs/PLAN.md](../docs/PLAN.md).

Tiene dos metas al mismo tiempo:
1. Darle al juego todo lo que necesita.
2. Dejar a PixelForja mejor para cualquier juego futuro. Nada de lo que se pide queda atado a este juego.

---

## 1. Cómo usar este pedido

El protocolo completo está en [LEEME.md](LEEME.md). En corto:
1. **Un lote por sesión y un PR por lote contra `main` de PixelForja**, en el orden de la sección 16.
2. Cada lote tiene criterios de aceptación. Un lote no está terminado si falla uno.
3. Si algo no se puede hacer bien con el esqueleto o el render actual, se dice en "Límites honestos", con la alternativa propuesta. No se entrega nada roto en silencio.
4. Donde un lote dice **"párate para aprobar"**, la sesión se detiene, muestra el resultado y espera el visto bueno de Rick.

## 2. Qué es el juego

Remake espiritual de los juegos deportivos Nekketsu de Technos para NES/Famicom: *Downtown Nekketsu Kōshinkyoku* (1990) y *Crash 'n the Boys* (1992), más 7 pruebas extra.

- **Vista:** 2.5D oblicua estilo Kunio-kun. x va a lo largo, y es la profundidad dentro de una franja de piso, z es la altura.
- **Motor del juego:** Phaser 3. Solo lee la carpeta del kit y su `manifest.json`. No importa código de PixelForja.
- **Resolución interna:** 640 x 360, escala entera.
- **Escenarios:** Vietnam, Colombia, Venezuela y una ciudad japonesa secreta.
- **Equipos:** Familia GG (caraqueña viviendo en Saigón), Dragones de Saigón, Rolos de Chapinero (Bogotá), Panas de Caracas, Maracuchos del Lago e Instituto Nekketsu. Más 2 secretos. 6 equipos de 4 en celda 48, gigantes en 64, jefe secreto en 96.
- **Pruebas (16):** Cross Country, Obstáculos, Tama-wari, Kachinuki, Vallas, Martillo, Natación, Azoteas, Judo, Fútbol, Básquet, Vóley Playa, Quemado, Chapita, Đá cầu, Tejo. Más el bonus Cruce Loco.
- **Tono:** caricatura retro de los 90, con modismos de cada país. KO con estrellas y pajaritos, nunca sangre.
- **Uso:** personal. Los superhéroes de fan pueden ir como equipo secreto.

---

## 3. Reglas de trabajo

### 3.1 Principio: todo lo que se pide es del motor
- **Prohibido el código atado al juego.** Nada de `if (juego === 'nekketsu')`. Cada pieza nueva es una capacidad general: una animación más en su pack, una prenda más en el catálogo, un tipo de piso más, un generador de escenarios oblicuos que sirve para cualquier beat 'em up.
- **Lo propio del juego es configuración.** Los equipos, los layouts de escenarios y la lista de qué animaciones lleva cada prueba vienen en archivos de configuración que el juego le pasa a PixelForja. En PixelForja quedan solo como ejemplo en `docs/ejemplos/nekketsu/`.
- **Todo lo nuevo se ve en el estudio.** Cada animación nueva aparece en el paso Animar, cada prenda y sombrero en Estilo, cada animal en su paso, en español e inglés. Si no se puede usar desde el estudio, no está terminado.
- **Todo lo nuevo se documenta** en los docs de PixelForja, como ya se hace con el kit deportivo y el de GG Abyss.

### 3.2 Las reglas de siempre
- Sin IA y sin red. Todo sale del código.
- Determinista: la misma entrada da los mismos pixeles en Node, navegador y worker.
- Movimiento **premium** para todos los atletas: poses clave, pivote fijo, eventos, avance sin patinar.
- Todo pasa el control de calidad existente (no se sale de la celda, pies en el piso, sin pixeles sueltos, altura estable en ciclos, impacto en cada golpe) en 32, 48 y 64.
- Ninguna textura pasa de 4096 px.
- Créditos LPC automáticos.
- El kit se niega a borrar una carpeta que no sea un kit de PixelForja.

---

## 4. Contrato del kit

### 4.1 Carpetas
```
kit/
  manifest.json
  CREDITOS.txt
  atletas/<id>/<pack>.png + .json   atlas del pack, JSON Hash de TexturePacker
  atletas/<id>/retratos.png         7 expresiones en 40x40 y 96x96
  publico/<pais>.png                hinchas en 32 px
  npc/<id>.png
  animales/<id>.png
  objetos/armas.png + .json
  objetos/<escenario>.png + .json
  vehiculos/<id>.png
  escenarios/<id>/                  ver sección 10.3
  fx/<id>.png
  ui/                               paneles, íconos, logo, fuentes, mapa, cinemáticas
  audio/musica/  audio/sfx/  audio/ambiente/  audio/voz/
```

### 4.2 Filas de las hojas
El juego usa 5 filas y espeja la izquierda con `flipX`:
```json
"filas": ["right", "down_right", "up_right", "down", "up"]
```
Las animaciones `lateral: true` usan la diagonal donde no se puedan de frente, como ya hace el kit deportivo.

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
      "vestuario": { "base": "calle", "natacion": "banador", "judo": "judogi", "futbol": "camiseta" },
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
        }
      }
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

Desbloquea el motor de pelea del juego. Es el más chico y va primero.

| Pedido | Detalle |
|---|---|
| A1. Filtro de filas | Opción `filas` en el render y en los kits para exportar solo las filas pedidas |
| A2. `cajas` | Recuadro del sprite opaco por fila y cuadro, relativo al pivote. Sale del pixel, no de la pose |
| A3. `manos`, `cabeza`, `pies` | Articulaciones por fila y cuadro, relativas al pivote. Ya se calculan en `RenderedClip.joints`: exportarlas en todos los cuadros, no solo en `impacto` y `suelta` |
| A4. `punto` en todas las filas | Verificado en las filas pedidas |
| A5. Atlas por pack | Todas las animaciones de un pack en un atlas de hasta 4096 px. Cuadro: `<anim>_<fila>_<cuadro>` |
| A6. Retratos con expresión | 40x40 en 7 expresiones (neutral, feliz, enojo, triste, susto, cerrado, dolor) con las caras LPC. Retrato grande de 96x96 dibujado nítido. Si a 96 no sale nítido, escalado entero x2 y decirlo |
| A7. Cabecitas | 12x12 por atleta |
| A8. Vestuario por pack | Una ficha puede tener variantes de ropa por pack, y el kit renderiza cada pack con su variante. En el estudio, la ficha muestra sus variantes |

**Aceptación:**
- Prueba: cada `manos` cae sobre pixeles opacos de la mano.
- Prueba: `cajas` encierra todo pixel opaco y nada más.
- El kit deportivo y el de GG Abyss salen igual que antes si no se piden las opciones nuevas.
- El estudio dibuja cajas, manos y puntos encima del personaje con un interruptor "Ver datos".
- `docs/KIT_DEPORTES.md` documenta los campos nuevos.

---

## 6. Lote B: animaciones

En packs nuevos o existentes según corresponda (por ejemplo `brawl` para los movimientos de beat 'em up, `climb`, `traditional` para los deportes de cada país), con el estilo de `fight.ts` y `athletics.ts`. Todas premium, con eventos, visibles en el estudio.

Columnas: nombre, cuadros aproximados, fps, bucle, eventos que tiene que traer y notas. Los cuadros son una guía, manda la calidad.

### B1. Movimientos de beat 'em up (lo más importante del juego)
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `lift` | 6 | 12 | no | `impacto` al agarrar | Se agacha, agarra con las dos manos y sube el objeto o rival sobre la cabeza |
| `carry_idle` | 4 | 6 | sí | | Objeto sobre la cabeza. `manos` exactas |
| `carry_walk` | 8 | 10 | sí | `paso` | Más corto y pesado que `walk` |
| `carry_run` | 8 | 14 | sí | `paso` | |
| `throw_overhead` | 6 | 14 | no | `suelta` con `punto` | Lanza lo que lleva sobre la cabeza |
| `carried` | 4 | 6 | sí | | El levantado, horizontal, pataleando. Diagonal si de frente no se puede |
| `thrown_spin` | 8 | 16 | sí | | Rueda en el aire |
| `land_flat` | 4 | 12 | no | `aterriza` | Cae de plano y rebota |
| `grab` | 4 | 14 | no | `impacto` | Agarra de la ropa |
| `grab_hold` | 4 | 8 | sí | | Forcejeo leve |
| `grabbed` | 4 | 8 | sí | | |
| `knee_grab` | 5 | 14 | no | `impacto` | Rodillazo en agarre |
| `break_free` | 5 | 14 | no | | |
| `dizzy` | 8 | 8 | sí | | Tambaleo. `cabeza` para los pajaritos |
| `ko_bounce` | 8 | 12 | no | `aterriza` x2 | Vuela, rebota y queda tirado. Más exagerado que `knockout` |
| `taunt` | 8 | 8 | no | | Burla genérica |
| `weapon_pick` | 4 | 12 | no | `impacto` | Recoger del piso |
| `weapon_swing` | 6 | 14 | no | `impacto` con `punto` | Bate, tubo, escoba, paraguas cerrado |
| `weapon_swing_heavy` | 8 | 12 | no | `impacto` | Pote, silla plástica, a dos manos |
| `weapon_throw` | 6 | 14 | no | `suelta` | Chancleta, piedra, nón lá, termo |
| `umbrella_block` | 4 | 12 | no | | Abre el paraguas adelante como escudo |
| `fan_gust` | 6 | 12 | no | `suelta` | Abanicazo hacia adelante |
| `run_punch` | 6 | 16 | no | `impacto` | Puñetazo corriendo |
| `run_kick` | 8 | 14 | no | `despegue`, `impacto`, `aterriza` | Patada voladora corriendo, con `elevacion` y `desplazamiento` |
| `air_kick` | 4 | 14 | no | `impacto` | Patada en el aire desde un salto normal |
| `slip_wet` | 8 | 14 | no | `aterriza` | Resbalón en piso mojado |

**Campo nuevo `cuerpo`** (pedido después del lote A): igual que `cajas` pero solo con el cuerpo, sin implementos, pelotas ni efectos. Es el hurtbox del juego. Sale en el kit con `--datos` junto a los demás.

**Párate para aprobar:** primero solo `lift`, `carry_walk`, `throw_overhead`, `carried` y `thrown_spin`, con un GIF de Rick levantando a Steph y lanzándola (Kenji todavía no existe, llega en C1), y otro de Alana levantando un pote. Con chibi los brazos no pasan la cabeza: lo levantado va apoyado en las manos, encima del pelo.

### B2. Recorridos (Cross Country y obstáculos)
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `ladder` | 8 | 10 | sí | `paso` en cada mano | Escalera de mano, de espaldas |
| `climb_wall` | 8 | 10 | no | `impacto` al agarrar el borde | Muro bajo |
| `ledge_hang` | 4 | 6 | sí | | |
| `pull_up` | 8 | 12 | no | | |
| `balance_walk` | 8 | 8 | sí | `paso` | Brazos abiertos |
| `balance_wobble` | 8 | 10 | sí | | |
| `balance_fall` | 6 | 12 | no | | |
| `duck_run` | 8 | 14 | sí | `paso` | Agachado bajo cables y toldos |
| `bike_fast` | 8 | 14 | sí | | Variante rápida de `bike` |
| `bike_crash` | 8 | 14 | no | `aterriza` | |
| `skate_crash` | 8 | 14 | no | `aterriza` | |

### B3. Trepar y azoteas
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `climb_pole` | 8 | 10 | sí | `paso` en cada agarre | Poste vertical |
| `pole_idle` | 4 | 6 | sí | | |
| `pole_punch` | 6 | 14 | no | `impacto` con `punto` arriba | Golpea sobre su cabeza con una mano agarrada |
| `pole_slide` | 4 | 12 | sí | | |
| `pole_kick_down` | 6 | 14 | no | `impacto` | |
| `pole_shake` | 6 | 12 | no | `impacto` | Desde abajo sacude el poste |
| `grab_leg_up` | 6 | 12 | no | `impacto` | Jala del pie al que trepa |
| `edge_teeter` | 8 | 10 | sí | | Al borde, a punto de caer |
| `fall_off` | 8 | 12 | no | | Cae por el borde |

### B4. Atletismo, agua y combate deportivo
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `hammer_spin` | 8 | 14 | sí | | Partir de `whirlwind` y `spin`. Implemento `hammer` de atletismo, con cadena |
| `hammer_release` | 6 | 14 | no | `suelta` con `punto` | |
| `swim_punch` | 6 | 12 | no | `impacto` | Con fila `agua` |
| `dunked` | 6 | 10 | no | | Se hunde y sale escupiendo agua |
| `swim_turn` | 6 | 12 | no | `impacto` del pie en la pared | |
| `boat_start` | 6 | 12 | no | `despegue` | Salida desde un bote |
| `vault_fail` | 10 | 12 | no | `aterriza` | La garrocha no llega |
| `judo_grip` | 4 | 10 | sí | | |
| `judo_throw` | 10 | 14 | no | `impacto` al caer | Seoi nage |
| `judo_thrown` | 10 | 14 | no | `aterriza` | |
| `vovinam_scissor` | 10 | 14 | no | `despegue`, `impacto`, `aterriza` | Patada tijera voladora |
| `bow` | 6 | 8 | no | | Saludo de dojo |

### B5. Pelota
Fútbol, básquet y vóley ya existen completos. Falta:
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `dodge_throw` | 6 | 14 | no | `suelta` | Quemado |
| `dodge_catch` | 6 | 12 | no | `impacto` | Atrapa contra el pecho |
| `dodge_hit` | 6 | 12 | no | | El quemado sale disparado |
| `beach_run` | 8 | 12 | sí | `paso` | Arena, pasos que se hunden |
| `dunk_big` | 12 | 14 | no | `despegue`, `impacto`, `aterriza` | Clavada exagerada con `elevacion` alta |

### B6. Deportes tradicionales
| Animación | Cuadros | fps | Bucle | Eventos | Notas |
|---|---|---|---|---|---|
| `cap_pitch` | 6 | 14 | no | `suelta` | Chapita: lanzamiento de lado con la muñeca |
| `cap_bat` | 6 | 14 | no | `impacto` | Swing con palo de escoba |
| `shuttle_juggle` | 8 | 12 | sí | `impacto` en cada toque | Đá cầu, con el borde interno del pie |
| `shuttle_kick_back` | 8 | 14 | no | `impacto` | Toque de espuela |
| `tejo_throw` | 8 | 12 | no | `suelta` | Lanzamiento por debajo con paso adelante |
| `traffic_dodge` | 6 | 14 | no | | Esquiva de una moto |

### B7. Técnicas de equipo
Lo que necesitan las técnicas especiales que no salen de animaciones existentes:
| Animación | Para | Notas |
|---|---|---|
| `play_drum` | Furrazo de Ender | Toca un furro con las dos manos. Implemento nuevo `furro` |
| `bike_charge` | Ciclovía Infernal de Camila | Embestida en bici con `impacto` |
| `cap_bat_power` | Batazo de Jonrón de Gabo | `cap_bat` exagerado |
| `chair_spin_throw` | Silla Plástica Voladora de Bà Hoa | Gira y lanza una silla |
| `slipper_storm` | Chancletazo Supremo de la Señora Carmen | Lanza 3 chancletas seguidas |
| `comb_hair` | Burla del Instituto Nekketsu | Se peina el pompadour |

### Aceptación de cada sub-lote
- Calidad en 32, 48 y 64, en las 5 filas.
- Imagen dorada de un cuadro clave por animación.
- Tablero y GIF de cada animación con Rick (el más grande) y con Alana (la más pequeña).
- Visibles en el paso Animar del estudio.

---

## 7. Lote C: personajes

Las fichas de los equipos van como ejemplo en `docs/ejemplos/nekketsu/fichas/` y se pueden abrir y editar en el estudio. Las prendas, sombreros y animales nuevos entran al catálogo general.

### C1. Para la rebanada vertical
**Familia GG.** Rick, Steph, Sophie y Alana desde sus presets actuales, con su look de pixel art. Cada uno con su color personal: **Sophie en verde, Alana en rosado**, Rick en azul, Steph con el de su preset. El dorado `#f2c230` del "GG" en el pecho y el número los une como equipo. Thor con todas sus animaciones de mascota.

**Instituto Nekketsu** (gakuran negro, cinta roja):
| Id | Nombre | Cuerpo | Pelo | Ropa |
|---|---|---|---|---|
| `kenji` | Kenji "Toro" Sakamoto | Chibi normal | `cowlick_tall` negro, tipo pompadour | Gakuran abierto sobre camiseta blanca |
| `ryu` | Ryu Takeda | Chibi delgado | `spiked` café, `headband_tied` blanca | Gakuran cerrado |
| `goro` | Goro Iwata | Gigante, celda 64 | `buzzcut` | Gakuran sin mangas |
| `tetsu` | Tetsu Mori | Chibi normal | `flat_top_straight` | Gakuran, lentes `shades` |

### C2. Equipos nacionales
**Rồng Sài Gòn** (rojo `#da251d` y amarillo `#ffcd00`):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `minh` | Minh | `spiked`, cinta roja | Uniforme de vovinam azul |
| `lan` | Lan | `high_ponytail` | Uniforme escolar vietnamita: camisa blanca, pañoleta roja, pantalón azul |
| `tuan` | Tuấn | `messy1` | Franela y sandalias |
| `ba_hoa` | Bà Hoa | `bob` gris, nón lá | Bộ bà ba de seda, cuerpo más ancho |

**Rolos de Chapinero** (amarillo `#ffd700` y rojo `#c8102e` de Bogotá):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `andres` | Andrés "El Doctor" | `parted` | Ruana gris, bufanda, paraguas negro |
| `camila` | Camila "Sumercé" | `high_ponytail` | Casco de ciclista, chaqueta impermeable |
| `pipe` | Pipe | `messy2` | Camiseta de fútbol azul sin escudo, bufanda |
| `don_hernando` | Don Hernando | Bigote `chevron` | Gigante, celda 64, saco de paño, termo de tinto |

**Los Panas de Caracas** (amarillo `#ffcc00`, azul `#00247d`, rojo `#cf142b`):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `gabo` | Gabo | `buzzcut`, gorra de béisbol | Camisa de pelotero sin logos |
| `yuli` | Yuli | `curly_long` | Uniforme de liceo: chemise beige, pantalón azul |
| `toto` | Chamo Toto | `afro` | Franela grande, chancletas |
| `carmen` | Señora Carmen | Rolos | Bata de casa con flores, chancleta en mano |

**Maracuchos del Lago** (azul `#0055a4`, amarillo `#ffd100`, negro):
| Id | Nombre | Pelo | Ropa |
|---|---|---|---|
| `ender` | Ender "El Primo" | Bigote `basic`, sombrero de gaitero | Guayabera blanca, furro |
| `yusmary` | Yusmary | `curly_long` recogido | Camiseta de básquet sin mangas |
| `jhonder` | Jhonder | `shorthawk` | Franela de rayas, short |
| `abuela_nerva` | Abuela Nerva | `bob` gris | Bata fresca, abanico |

### C3. Equipos secretos
- **Los del Abismo:** goblin, trol y orco con cabezas LPC existentes, y el minotauro de GG Abyss en celda 96. Ropa deportiva "a la fuerza".
- **Equipo fan:** los 6 superhéroes existentes con ropa de deporte.

### C4. Catálogo nuevo de ropa y accesorios
| Pieza | Detalle |
|---|---|
| `gakuran` | Chaqueta escolar japonesa de cuello alto con botones dorados, abierta o cerrada |
| `chandal` | Chaqueta y pantalón deportivo con 2 franjas |
| `banador` | Traje de baño y gorra de natación |
| `judogi` | Kimono blanco o azul con cinturón de color |
| `vovinam` | Uniforme azul con cinturón |
| `uniforme_vn` | Camisa blanca con pañoleta roja |
| `uniforme_ve` | Chemise de liceo, beige o azul |
| `ba_ba` | Conjunto de seda vietnamita |
| `bata_casa` | Bata con estampado de flores |
| `ruana` | Ruana boyacense, con o sin bufanda |
| `saco_pano` | Saco de paño con chaleco |
| `guayabera` | Camisa guayabera |
| `impermeable` | Chaqueta impermeable de ciclista |
| `poncho` | Poncho antioqueño con carriel, para NPC paisas |
| Sombreros | `non_la`, `vueltiao`, `gorra_beisbol`, `casco_ciclista`, `sombrero_gaitero`, `rolos` |
| Calzado | `chancletas`, `sandalias` |

### C5. Burlas por equipo
| Equipo | Burla |
|---|---|
| Familia GG | Rick se arremanga, Thor ladra al lado |
| Instituto Nekketsu | `comb_hair`: se acomoda el pompadour |
| Dragones de Saigón | Pose de vovinam con saludo |
| Rolos de Chapinero | Abre el paraguas con elegancia y se sacude la ruana |
| Panas de Caracas | Se sacude los hombros y señala |
| Maracuchos del Lago | Se abanica y señala el cielo: "¡qué calor, primo!" |

### C6. NPC
| Id | Uso | Animaciones |
|---|---|---|
| `locutor` | Retratos para comentarios | Retrato en 7 expresiones |
| `arbitro` | Silbato, banderas | `idle`, `whistle`, `point`, `walk` |
| `kenji_intro` | Intro: de espaldas con el gakuran al viento | `idle_viento` |
| `vendedora_banhmi`, `vendedora_vara` | Saigón | `idle`, `pregonar`, `asustarse` |
| `abuelos_ejercicio` | Tao Đàn | `tai_chi`, `estirar` |
| `xe_om` | Mototaxista sentado en su moto | `idle`, `llamar` |
| `vendedor_ambulante_bog` | Bogotá | `idle`, `pregonar` |
| `palenquera` | Cartagena | `idle`, `regañar` |
| `marimonda`, `comparsa` | Barranquilla | `bailar` |
| `gaiteros` | Maracaibo, conjunto de 4 | `tocar` |
| `vendedor_tequenos`, `motorizado` | Caracas | `idle`, `pregonar` |
| `conserje` | Liceo | `barrer` |
| `policia_transito` | Cruce Loco | `pitar`, `señalar` |
| Público | 64 hinchas por país en 32 px, con camisetas y banderas | `idle`, `cheer`, `cheer_wave`, `flag_wave` |

### C7. Animales
| Id | Base | Animaciones |
|---|---|---|
| `perro_calle` x3 | Especie `perro` con 3 paletas | `idle`, `walk`, `run`, `bark`, `sleep`, `scratch` |
| `gato` x2 | Especie `gato` | `idle`, `walk`, `jump_wall`, `sleep` |
| `chiguire` | Especie nueva sobre el esqueleto cuadrúpedo: barril, patas cortas, sin cola | `idle`, `walk`, `run`, `eat` |
| `paloma` | Desde el cuervo, otra paleta | `quieto`, `picotear`, `volar` |
| `garza` | Ave nueva, cuello largo | `quieto`, `volar` |
| `guacamaya` | Ave nueva | `volar`, `posada` |
| `gallo` | Ave nueva | `idle`, `cantar` |
| `colibri` | Ave nueva, muy pequeña | `volar` |
| `bufalo` | Solo fondo | `idle` |

Las especies nuevas quedan en el catálogo del estudio para cualquier juego.

### Aceptación del lote C
- Todas las fichas se abren y exportan desde el estudio.
- Tablero por equipo con los 4 atletas en las 5 filas, `idle` y `run`, y sus retratos.
- Cada atleta se distingue en silueta a 48 px.
- Los colores de equipo se leen sobre cualquier escenario.
- **Párate para aprobar** el tablero de cada equipo antes de exportar sus packs completos.

---

## 8. Lote D: objetos y vehículos

### D1. Armas del piso (con B1)
Implementos dibujados con código en `render/props.ts`, más su sprite suelto para el piso. Quedan en el catálogo de implementos.

| Id | Notas |
|---|---|
| `chancleta` | Gira al lanzarla, 8 cuadros |
| `silla_plastica` | Roja, azul o verde. Apilable |
| `non_la` | Vuela como frisbee |
| `coco` | Rueda |
| `tubo`, `llanta`, `pote_basura`, `cono`, `escoba`, `piedra` | Básicos de calle. El pote suelta la tapa al pegar |
| `paraguas` | Cerrado y abierto |
| `abanico` | Abierto y cerrado |
| `termo` | Termo de tinto con vapor |
| `furro` | Tambor de gaita |
| `broomstick` | Palo de la chapita |
| `balon_goma` | Quemado |
| `chapa` | 3 colores, con estela |
| `tejo` | Disco de metal |
| `volante_dacau` | Volante con plumas de colores |

### D2. Vehículos (con E)
| Id | Escenario | Animaciones |
|---|---|---|
| `moto` x4 colores | Saigón, Caracas | `andando`, `frenando`, `corneta`, con conductor |
| `moto_carga` | Saigón | Cargada de cajas o flores |
| `xich_lo` | Saigón, Hội An | `andando` |
| `ferry`, `bote_bambu`, `junco` | Río y Hạ Long | `andando` o `meciendo` |
| `transmilenio`, `buseta` | Bogotá | `andando`, `parado` |
| `willys` | Eje Cafetero | Cargado de café |
| `camionetica` | Caracas | `andando`, `parada` |
| `carro` x3 | Ciudades | `andando`, `alarma` |
| `helicoptero` | Kachinuki | Con reflector |
| `avion` | Intro | `volando` |

---

## 9. Lote I: kit a medida (generador general)

Va antes de los escenarios en este documento porque define cómo el juego le pasa su configuración a PixelForja. Se construye en dos tiempos: versión inicial con la rebanada vertical y completa al final.

En vez de un script solo para este juego, PixelForja gana un **generador de kits por configuración** que sirve para cualquier juego futuro:

```bash
npm run kit-a-medida -- <carpeta de salida> --config <juego>/kit.config.json
```

```jsonc
// kit.config.json (vive en el repo del juego)
{
  "juego": "Nekketsu Olympic GG",
  "celda": 48,
  "filas": ["right", "down_right", "up_right", "down", "up"],
  "datos_por_cuadro": ["cajas", "manos", "cabeza", "pies"],
  "fichas": "fichas/",                       // carpeta con *.ficha.json
  "equipos": "data/teams.json",
  "packs": {                                  // qué animaciones lleva cada pack
    "base": ["idle", "walk", "run", "jump", "hit", "fall_getup", "celebrate", "sad", "taunt"],
    "pelea": ["jab", "punch", "kick_martial", "run_kick", "lift", "carry_walk", "throw_overhead", "..."],
    "natacion": ["swim", "swim_breast", "swim_fly", "swim_back", "dive", "swim_punch", "dunked", "swim_turn"]
  },
  "pruebas": { "crosscountry": ["base", "pelea", "recorrido", "natacion"], "swim": ["natacion"] },
  "escenarios": "data/stages/",              // *.layout.json
  "publico": { "paises": ["vietnam", "colombia", "venezuela", "japon"], "variantes": 64 },
  "npc": ["locutor", "arbitro", "..."],
  "animales": ["perro_calle", "chiguire", "..."],
  "objetos": ["chancleta", "paraguas", "..."],
  "vehiculos": ["moto", "transmilenio", "..."],
  "fx": ["estrellas_mareo", "..."],
  "ui": { "logo": { "texto": "NEKKETSU OLYMPIC GG" }, "fuentes": { "idiomas": ["es", "en", "vi"] } },
  "audio": { "musica": ["marcha_nekketsu", "..."], "sfx": ["..."], "ambientes": ["..."] }
}
```

| Pedido | Detalle |
|---|---|
| `src/engine/kit/custom.ts` | `buildCustomKit(config)` arma el kit del contrato de la sección 4 desde la configuración |
| `scripts/kit-a-medida.ts` | La línea de comandos, con `--rapido` y `--solo <parte>` |
| Esquema | `docs/kit-a-medida.schema.json` para validar la configuración, con mensajes de error claros |
| Compatibilidad | El kit deportivo y el de GG Abyss se pueden expresar como configuraciones de ejemplo |
| Ejemplo | `docs/ejemplos/nekketsu/kit.config.json` |
| Visor de atletas | Tablero navegable de atletas, packs y animaciones, con cajas, manos y puntos dibujados |
| Docs | `docs/KIT_A_MEDIDA.md` con ejemplos en Phaser |
| Pruebas | Que el manifiesto cumpla el contrato, que no falte ningún archivo referido, que nada pase de 4096 px, que el kit completo se genere en menos de 3 minutos |

---

## 10. Lote E: escenarios oblicuos

El corazón del pedido y donde menos margen de error hay. La regla: **el juego define la geometría, PixelForja pinta encima y verifica.** Queda como un sistema general de escenarios para beat 'em ups y juegos de deportes en vista oblicua.

### 10.1 Sistema (E1)
Carpeta nueva `src/engine/world/oblique/`.

| Pieza | Qué hace |
|---|---|
| `layout.ts` | Lee y valida el layout (10.2) |
| `floor.ts` | Piso en perspectiva oblicua por tipo: asfalto, acera, tierra, baldosa, madera, metal, arena, tatami, greda, cancha, pasto, agua |
| `facade.ts` | Fachadas por parámetros: pisos, ventanas encendidas o no, balcones, toldos, letreros con texto real corto, cables, aires acondicionados, rejas, grafitis, plantas. Estilos: `vietnam`, `colombia_colonial`, `colombia_ladrillo`, `venezuela_barrio`, `venezuela_ciudad`, `japon_80s` |
| `sky.ts` | Cielo por hora: amanecer, mañana, mediodía, tarde, atardecer, noche, nublado, aguacero |
| `skyline.ts` | Siluetas lejanas con los íconos de cada lugar |
| `foreground.ts` | Barandas, postes, cables, plantas |
| `objects.ts` | Objetos con apoyo, sólidos y animaciones, como el Bosque GG |
| `life.ts` | Vida de fondo: motos que pasan, ropa con viento, faroles que se mecen |
| `weather.ts` | Capa de piso mojado con reflejos y charcos, capa de noche con ventanas y letreros encendidos, calor que deforma el aire |
| `verify.ts` | Las pruebas de 10.4 |
| Estudio | Paso nuevo **Escena**: abre un layout, muestra el escenario con paralaje, hora, clima y vida, y pone al personaje del estudio a caminar encima |

### 10.2 Formato del layout (lo escribe el juego)
Medidas en pixeles de mundo. x a lo largo, y profundidad dentro de la franja (0 es el fondo), z altura sobre el piso.

```jsonc
{
  "id": "saigon_hem",
  "pais": "vietnam",
  "prueba": "crosscountry", "tramo": 1,
  "largo": 3840,
  "franja": { "atras": 200, "adelante": 330 },
  "hora": "manana",
  "clima": ["despejado", "aguacero"],
  "paralaje": { "cielo": "auto", "lejos": "saigon_skyline", "cerca": "hem" },

  "piso":        [{ "x0": 0, "x1": 3840, "tipo": "asfalto" },
                  { "x0": 0, "x1": 3840, "y0": 0, "y1": 24, "tipo": "acera" }],
  "huecos":      [{ "x0": 1200, "x1": 1290, "y0": 0, "y1": 130, "caida": "agua" }],
  "plataformas": [{ "x": 800, "y": 20, "w": 96, "d": 30, "z": 24, "tipo": "carro", "subible": true }],
  "muros":       [{ "x": 1500, "y": 0, "w": 16, "d": 130, "z": 64, "trepable": true }],
  "escaleras":   [{ "x": 2000, "y": 10, "z0": 0, "z1": 96, "tipo": "mano" }],
  "postes":      [{ "x": 640, "y": 40, "alto": 160, "tipo": "tama_wari" }],
  "agua":        [{ "x0": 2400, "x1": 2900, "nivel": 8, "corriente": -10 }],
  "bajo":        [{ "x0": 300, "x1": 420, "z": 28, "tipo": "cables" }],
  "solidos":     [{ "x": 1100, "y": 0, "w": 40, "d": 20, "z": 48 }],
  "carriles":    [{ "y": 20 }, { "y": 50 }, { "y": 80 }, { "y": 110 }],

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

PixelForja **no cambia la geometría**. Si un detalle de arte necesita mover algo, lo pide en el PR.

### 10.3 Lo que devuelve PixelForja por escenario
```
escenarios/<id>/
  escenario.json            layout validado + todo lo de abajo
  cielo_<hora>.png          se repite en x sin costura
  lejos.png                 silueta lejana, se repite sin costura
  cerca_<n>.png             fachadas en trozos de 1280 px
  piso_<n>.png              piso en trozos de 1280 px
  piso_mojado_<n>.png       si el clima lo trae
  noche_<n>.png             ventanas y letreros encendidos, si la hora lo trae
  frente_<n>.png            primer plano en trozos
  objetos.png + .json       objetos del escenario con apoyo, sólido y anims
  superficie.png            por pixel de la franja: qué suena y si resbala
  colision.json             colisión verificada, igual al layout
  luces.json                color, radio, parpadeo o latido
  particulas.json           partículas sugeridas por zona
  postales/inicio.png, medio.png, final.png    640x360 exactos
  ficha_arte.md             paleta, elementos icónicos, decisiones
  verificacion.md           resultado de las 9 pruebas
```

### 10.4 Pruebas automáticas (todas bloquean)
1. **Costuras:** los trozos pegan sin una sola línea de diferencia.
2. **Paralaje:** cada capa repetible cierra el ciclo sin salto.
3. **Piso:** ningún pixel transparente donde el layout dice piso.
4. **Apoyo:** todo objeto cae sobre piso o plataforma.
5. **Colisión:** `colision.json` es igual al layout.
6. **Camino:** desde la salida se llega a la meta con las reglas de la prueba.
7. **Legibilidad:** contraste mínimo entre el contorno de un atleta de cada equipo y el fondo en toda la franja, pegando atletas cada 64 px.
8. **Paleta:** no más colores que los de la ficha de arte.
9. **Peso:** máximo de capas, luces y objetos animados por pantalla.

### 10.5 Puertas de aprobación por escenario
1. **Ficha de arte:** paleta de 24 colores, 8 a 12 elementos icónicos, 3 detalles de vida. **Párate para aprobar.**
2. **Gris:** el layout ya se jugó en el juego. PixelForja no recibe layouts sin jugar.
3. **Postales:** 3 postales a la hora elegida. **Párate para aprobar.**
4. **Completo:** todas las capas y las 9 pruebas en verde.
5. **Tablet:** se prueba en el juego.

### 10.6 Escenarios por sub-lote
| Sub-lote | Escenarios |
|---|---|
| E1 | El sistema completo, el paso Escena del estudio y `saigon_hem` como piloto |
| E2 | `saigon_benthanh`, `saigon_rio`, `saigon_azoteas`, `saigon_estadio` |
| E3 | `medellin_c13`, `hoian`, `caracas_azotea` |
| E4 | `cocora`, `llanos`, `halong`, `cartagena`, `hanoi_dojo` |
| E5 | `barranquilla`, `maracaibo`, `margarita`, `liceo` |
| E6 | `taodan`, `candelaria`, `caracas_barrio`, `cruce_saigon`, `cruce_bogota`, `cruce_caracas`, `nekketsu` |

### 10.7 Fichas de arte de partida
PixelForja completa cada ficha y la propone en la puerta 1.

| Id | Hora | Elementos icónicos | Vida |
|---|---|---|---|
| `saigon_hem` | Mañana | Casas tubo angostas de 3 a 5 pisos, cables enredados, motos paradas, sillas plásticas, puestos de bánh mì, altar de la tierra con incienso, rejas plegables | Motos al fondo, incienso, palomas |
| `saigon_benthanh` | Media mañana | Torre del reloj del mercado, toldos, pirámides de frutas, flores, vendedoras con nón lá | Toldos con viento, vendedoras pregonando |
| `saigon_rio` | Mediodía | Ferry, jacintos de agua, botes de bambú, puente, Landmark 81 al fondo | Agua animada, jacintos flotando, ferry |
| `saigon_azoteas` | Tarde con aguacero | Cafés en azotea, tanques de agua, ropa tendida, antenas, Bitexco al fondo | Lluvia, ropa con viento, charcos que crecen |
| `saigon_estadio` | Atardecer | Gradas llenas, marcador, banderas, pista roja | Público ondeando, fuegos artificiales |
| `halong` | Mañana | Islotes de piedra caliza, juncos de velas rojas, aldea flotante, boyas | Olas, juncos, gaviotas |
| `taodan` | Amanecer | Árboles enormes, bancos, abuelos haciendo ejercicio, jaulas de pájaros colgadas | Tai chi, pájaros, rayos de luz |
| `hoian` | Noche | Faroles de seda de colores, casas amarillas, río Thu Bồn, puente japonés, velitas en el río | Faroles meciéndose, velitas flotando |
| `hanoi_dojo` | Tarde | Tatami, ventanales al lago Hoàn Kiếm, Torre de la Tortuga, caligrafía | Hojas cayendo afuera, público al borde |
| `medellin_c13` | Mañana | Escaleras eléctricas con techo naranja, grafitis, casas de ladrillo apiladas, metrocable al fondo | Metrocable, músicos, perros |
| `cartagena` | Atardecer | Balcones de madera con buganvillas, fachadas de colores, Torre del Reloj, murallas, mar Caribe | Pétalos, palenquera, coche de caballos al fondo |
| `cocora` | Mañana con neblina | Palmas de cera altísimas, cafetales, montañas verdes, pista de tierra de escuela rural, Willys | Neblina en 2 capas, colibríes |
| `candelaria` | Tarde nublada | Cancha de tejo techada de madera, mechas, banderines, casas coloniales, Monserrate por la ventana, llovizna afuera | Humo de mechas, banderines, gente con ruana |
| `barranquilla` | Mediodía | Calle con casas de colores, arcos de piedra, carnaval: guirnaldas, máscaras, Marimonda | Comparsas, confeti |
| `caracas_barrio` | Tarde | Casitas de bloque en el cerro, escaleras, El Ávila, tanques en los techos, cava de refrescos | Papagayos en el cielo, perros, vecinas en la ventana |
| `margarita` | Mediodía | Playa El Agua, palmeras, toldos, mar turquesa, red de vóley | Olas, toldos, vendedor de empanadas |
| `llanos` | Atardecer | Sabana, morichales, caney, chigüires, garzas | Garzas volando, chigüires, cielo que cambia |
| `maracaibo` | Noche | Cancha de barrio, Puente Rafael Urdaneta iluminado, el Lago, relámpago del Catatumbo al fondo | Relámpagos que iluminan la cancha, gaiteros, calor en el aire |
| `liceo` | Mañana | Liceo en el centro de Caracas: patio techado, murales patrios, cantina, cancha pintada, pupitres apilados, El Ávila detrás del techo | Alumnos mirando, conserje barriendo |
| `caracas_azotea` | Noche | Azotea de Parque Central, El Ávila con la Cruz iluminada, torres con ventanas, neón, tanques | Neón parpadeando, helicóptero, fuegos artificiales al final |
| `cruce_saigon` | Hora pico | Avenida ancha, ríos de motos, xích lô, vendedoras con vara | Tráfico constante |
| `cruce_bogota` | Hora pico | Carril de TransMilenio, busetas, vendedores ambulantes, llovizna, cerros orientales | Llovizna, paraguas |
| `cruce_caracas` | Hora pico | Autopista con cola, camioneticas por puesto, motorizados, vendedores de tequeños, El Ávila | Tráfico, vendedores entre los carros |
| `nekketsu` | Atardecer | Escuela japonesa, expendedoras con luz, muro de concreto junto al río, postes con cables, homenaje al Barrio de 1990 | Cuervos, expendedoras que zumban |

---

## 11. Lote F: efectos

Quedan en el catálogo general de efectos.

| Id | Detalle |
|---|---|
| `polvo_correr`, `polvo_frenar`, `polvo_caer` | 3 tamaños, para `paso` y `aterriza` |
| `chispa_golpe_<peso>` | Liviano, medio, pesado |
| `estrellas_mareo` | Estrellas y pajaritos girando |
| `nube_ko` | Nube de caricatura sin texto |
| Reacciones de anime | `vena_enojo`, `gota_nervios`, `sonrojo`, `exclamacion`, `interrogacion`, `lagrima_comica`, `sudor` |
| Agua | `chapuzon_chico`, `chapuzon_grande`, `estela`, `ondas` |
| Fiesta | `confeti`, `serpentina`, `fuegos_artificiales` en 4 colores |
| `bola_tama` | 4 estados de daño, la explosión de confeti y el cartel colgante |
| `mecha_tejo` | Explosión con humo |
| `estela_chapa`, `ventana_rota` | |
| Pantalla completa | `pantalla_rota`, `lineas_velocidad`, `marco_corte` para el corte de anime |
| Clima | `lluvia`, `salpicadura_piso`, `onda_charco`, `relampago`, `calor` |
| Técnicas | `rayo_catatumbo`, `onda_furro`, `rafaga_abanico`, `vapor_termo`, `aura_nekketsu` |
| Ambiente | `humo_moto`, `petalo_buganvilla`, `hoja`, `arena`, `brillo_record`, `huella_mojada` |

**Aceptación:** tablero con todos, cada uno con celda, cuadros y fps en el manifiesto.

---

## 12. Lote G: interfaz, fuentes y cinemáticas

### G1. Para la rebanada vertical
| Id | Detalle |
|---|---|
| **Fuentes con vietnamita** | Las fuentes bitmap actuales no tienen los acentos del vietnamita. Hace falta: ă, â, ê, ô, ơ, ư, đ, Đ y los 5 tonos sobre todas las vocales, en mayúscula y minúscula, en `fuente_ui` y las de título. Se pueden componer pegando las marcas dibujadas sobre las letras base. Prueba: "Rồng Sài Gòn", "Đá cầu", "Bà Hoa", "Tuấn", "Trời ơi" se leen a 8 px |
| Caja de diálogo retro | 9-slice estilo NES con flecha que titila y lugar para el retrato |
| `logo` | "NEKKETSU OLYMPIC GG" animado con brillo, en 320x112 y 160x56. El texto sale de la configuración, así sirve para cualquier juego |
| Paneles por equipo | 9-slice en los 6 colores |
| Barras | Aguante y medidor Nekketsu, con estado lleno que brilla |
| Marco de retrato | 40 y 96 |
| Banners | Fondos para "¡LISTOS!", "¡YA!", "¡CHAO, PESCAO!", "¡META!", "¡GOL!", "¡RÉCORD!", "¡JONRÓN!". El texto lo pone el juego |
| Controles táctiles | Palanca, A, B, C, especial y pausa, normal y presionado |
| Minimapa | Barra de carrera |
| Números | Sumar estilo "marcador de TV" |

### G2. Para el envoltorio completo
| Id | Detalle |
|---|---|
| Retrato grande dibujado | El lote A entregó el retrato de 96 como escalado x3 del sprite. Para la pantalla VS y la intro hace falta un dibujante de cabezas grandes de verdad: sellos de ojos y bocas a ese tamaño, las 7 expresiones |
| Íconos de prueba | 16 más el bonus, 32x32 |
| Banderas | Vietnam, Colombia, Venezuela, Japón, Bogotá y Zulia, en 16 y 32 px, quietas y ondeando |
| Mapa de la gira | 640x360 con los 3 países y la ruta del avión |
| Medallas | Oro, plata y bronce en 16, 32 y 64 |
| Moneda GG | Girando |
| Comida | 18 íconos: bánh mì, phở, cà phê sữa đá, nước mía, chè, arepa colombiana, arepa venezolana, empanada, bandeja paisa, ajiaco, tinto, aguapanela, tequeños, cachapa, patacón maracucho, malta, papelón con limón, onigiri |
| Equipo de tienda | Zapatillas, cinta, gorra de natación, guantes, rodilleras |
| Tarjeta de equipo | Fondo con colores, escudo y bandera |
| Marco VS | Pantalla en 4 |
| Podio | 640x360 en el estadio |
| Pantallas retro | Fondos para "SE ACABÓ LA VAINA", "¿OTRA PARTIDITA?" y la pausa |
| Pantalla de inicio | Fondo para "Toca para empezar" |
| Íconos de app | Logo con Thor, en todos los tamaños que ya exporta el kit |
| Escenas de la intro | Mapa mundial con avión y sellos, Kenji en la azotea de espaldas, Bogotá con lluvia y buseta, Maracaibo con calor, desayuno de la Familia GG en Saigón (mesa, café sữa đá, arepas) |

---

## 13. Lote H: audio

### H1. Para la rebanada vertical
- `marcha_nekketsu`: marcha de banda escolar a 132 bpm, trompeta en onda cuadrada, redoblante con ruido. 60 s en bucle sin corte.
- `saigon_chay`: tema de Vietnam, pentatónica con sonido tipo đàn tranh.
- `azotea_final`: tema de pelea.
- `victoria`, `derrota`.
- Efectos: `pistola`, `silbato`, `golpe_1..3`, `golpe_pesado`, `chancleta`, `silla`, `pote`, `levantar`, `lanzar`, `caer_plano`, `mareo`, `ko`, `publico_grito`, `publico_ooh`.
- **Voces en blips:** generador de blips con tono y timbre por personaje, para los 24 atletas, el locutor y los NPC.

### H2. Todo lo demás
| Tema | Carácter |
|---|---|
| `tema_instituto` | Rock japonés de los 80 en menor |
| `hoian_noche` | Tambores de festival y flauta |
| `ajiaco_rock` | Rock en español bogotano de los 90 en chiptune |
| `parce_corra` | Cumbia chiptune, guacharaca con ruido filtrado |
| `cafe_neblina` | Bambuco acelerado |
| `pana_dale` | Joropo chiptune con arpegio tipo cuatro y maracas |
| `gaita_lago` | Gaita zuliana con furro y tambora |
| `vestuario` | Tranquilo |
| `acorde_<equipo>` | 4 compases por cada uno de los 6 equipos |

Efectos: chapuzón, brazada, bola que revienta, mecha de tejo, chapa, ventana rota, megáfono, perro, moto con corneta, camionetica, buseta, gallo, chicharras, ranas, trueno, paraguas que se abre, abanico, furro, salida de natación, garrocha, martillo girando, red de vóley, rebote de balón, aro de básquet, toque de đá cầu.

Ambientes en bucle de 12 s: `trafico_saigon`, `mercado`, `rio`, `aguacero`, `llovizna_bogota`, `mar`, `parque_amanecer`, `comuna`, `cafetal`, `llano`, `lago_noche`, `playa`, `liceo`, `azotea_noche`, `estadio`.

**Aceptación:** las pruebas de forma actuales y un `audio/escuchar.html` que toca todo con un clic, para que Rick lo apruebe en la tablet.

**Límite que se asume:** no hay voz hablada sin IA. Los diálogos usan blips.

---

## 14. Lote J: el estudio

Lo que cada lote suma al estudio va dentro de ese lote. Este lote es solo lo que queda:
- Paso **Kit**: abrir un `kit.config.json`, ver qué va a salir y generar el kit desde el navegador con un worker.
- Galería de **equipos**: agrupar fichas en equipos con colores, y exportar el equipo entero.
- Traducción completa al inglés de todo lo nuevo.
- Pruebas de Playwright del estudio para los pasos nuevos, en computadora y teléfono.

---

## 15. Cómo se entrega cada lote

Cada PR contra `main` trae:
1. Lo pedido, con las pruebas en verde.
2. Tablero PNG de lo nuevo en `docs/olimpico/<lote>/`.
3. GIFs de las animaciones clave.
4. Postales de cada escenario nuevo.
5. Tabla de calidad actualizada.
6. "Decisiones que tomé sin preguntar".
7. "Límites honestos", con lo que no quedó perfecto y la alternativa.
8. `docs/olimpico/<lote>/ENTREGA.md` con el formato de [LEEME.md](LEEME.md), sección 4. Así la siguiente sesión sabe qué está hecho.

---

## 16. Orden y dependencias

| Orden | Lote | Para qué fase del juego | Depende de |
|---|---|---|---|
| 1 | **A** datos y exportación | F1 motor de pelea | Nada |
| 2 | **B1 + D1** beat 'em up y armas | F2 | A |
| 3 | **C1** Familia GG e Instituto Nekketsu | F4 | A |
| 4 | **G1 fuentes** con vietnamita | F4 | Nada, se puede hacer en paralelo |
| 5 | **I** kit a medida, versión inicial | F4 | A |
| 6 | **E1** sistema de escenarios + `saigon_hem` | F4 | A, I, layout jugado en el juego |
| 7 | **F** efectos (los de pelea y carrera primero) | F5 | Nada |
| 8 | **G1, H1** resto de interfaz y audio de la rebanada | F5 | Nada |
| 9 | **B2, C2, D2, E2** Cross Country completo y los equipos nacionales | F6 | E1 |
| 10 | **B3, E3** Obstáculos, Tama-wari, Kachinuki | F7 | E1 |
| 11 | **B4, E4** pruebas de 1992 | F8 | E1 |
| 12 | **G2, H2** envoltorio y audio completo | F9 | |
| 13 | **B5, E5** pelotas | F10 | E1 |
| 14 | **B6, B7, C3, E6** tradicionales, técnicas, secretos y Barrio Nekketsu | F11 y F12 | E1 |
| 15 | **J** estudio | Después de F12 | Todo |

---

## 17. Cómo se arranca cada lote

Ya no hay que pegar el pedido. En una sesión nueva de Claude Code sobre `Lothra2/pixel_forja` basta con:

> Clona https://github.com/Lothra2/Nekketsu-Olympic-GG (solo lectura) y sigue para_pixel_forja/LEEME.md. Haz el siguiente lote pendiente.

O, para un lote en particular:

> Clona https://github.com/Lothra2/Nekketsu-Olympic-GG (solo lectura) y sigue para_pixel_forja/LEEME.md. Haz el lote B1.
