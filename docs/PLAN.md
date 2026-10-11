# Nekketsu Olympic GG: plan maestro

Un remake espiritual de los juegos deportivos "Nekketsu" de Technos para NES/Famicom (los "Atari oyunu" que todo el mundo jugó en Turquía, Latinoamérica y Asia), hecho con PixelForja como motor de personajes, mundo, efectos, interfaz y audio.

La meta no es copiar el juego pixel por pixel. Es que se sienta igual de caótico, chistoso y adictivo, pero con animación de verdad, mundo vivo, más pruebas, tu familia adentro y controles que un niño de 4 años pueda usar.

---

## 0. Resumen en 30 segundos

| Tema | Decisión |
|---|---|
| Juego base | *Downtown Nekketsu Kōshinkyoku: Soreyuke Daiundōkai* (1990) mezclado con *Bikkuri Nekketsu Shin Kiroku* / *Crash 'n the Boys* (1992). Ver sección 1 |
| Motor de personajes | PixelForja genera todo el arte, el audio y los datos de movimiento. El juego solo lee un kit con `manifest.json` |
| Motor del juego | Phaser 3 + TypeScript + Vite. PWA en Netlify. Mismo patrón que GG Abyss |
| Vista | 2.5D oblicua estilo Kunio-kun (x de lado, y de profundidad, z de altura). No isométrica |
| Pruebas v1 | Cross Country Callejero, Carrera de Obstáculos, Tama-wari, Natación sin Reglas, Kachinuki (batalla final) |
| Pruebas v1.5 | Salto entre Azoteas, Martillo Loco |
| Bonus v2 | Dodgeball Nekketsu, en línea |
| Equipos | 4 equipos de 4 (Familia GG incluida) más un equipo secreto |
| Jugadores | 1 a 4 en el mismo equipo o pantalla. Teclado, mandos y táctil |
| Lo que lo hace mejor | Golpes con datos reales de impacto, técnicas sacadas de 75 animaciones, mundo vivo con luces y partículas, repetición instantánea, Modo Peques, tus personajes desde el estudio |

---

## 1. Qué juego estamos replicando

"Nekketsu Olympic" no es el nombre oficial de ningún juego. Con ese nombre la gente recuerda dos juegos de Technos que comparten personajes y estilo:

**Downtown Nekketsu Kōshinkyoku: Soreyuke Daiundōkai** (Famicom, 1990). El "festival deportivo" de Kunio-kun. Cuatro escuelas rivales, hasta 4 jugadores, armas tiradas en el piso y cuatro pruebas:
1. Cross country por la ciudad.
2. Carrera de obstáculos.
3. Tama-wari: trepar un poste y romper una bola gigante.
4. Kachinuki kakutō: pelea a muerte para cerrar.

**Bikkuri Nekketsu Shin Kiroku! Harukanaru Kin Medal** (Famicom, 1992), en Occidente *Crash 'n the Boys: Street Challenge*. Cinco pruebas "olímpicas sin reglas": vallas, martillo, natación, salto entre azoteas y judo.

**Mi propuesta:** tomar el esqueleto del primero (las 4 pruebas, el cross country como estrella, la pelea final) y sumarle lo mejor del segundo (natación, azoteas, martillo). Si el que tienes en la cabeza es solo uno de los dos, me dices y recorto. Esta es la primera pregunta de la sección 19.

---

## 2. Mi crítica antes de arrancar

Te compro la idea, pero hay cinco cosas que conviene discutir antes de escribir una línea.

### 2.1 Vista oblicua, no isométrica
El kit deportivo de PixelForja y su arena están pensados para isométrica 2:1. Los Kunio-kun son 2.5D oblicuos: el piso es una franja, caminar a la derecha es ir a la derecha y la profundidad se ve como subir o bajar en pantalla.

Recomiendo oblicua por tres razones:
- Es la que da el "feeling" del original. En isométrica deja de parecer Nekketsu.
- La vista lateral es la más fuerte de PixelForja. Los saltos, la garrocha, la jabalina y la natación están dibujados de lado (`lateral: true`) y de frente usan la diagonal. En oblicua casi todo se ve de lado, justo donde el motor brilla.
- La izquierda es el espejo de la derecha. Con `flipX` solo necesitamos 5 filas de las 8 (`right`, `down_right`, `up_right`, `down`, `up`). Eso baja la memoria de texturas un 37 %.

### 2.2 El alcance mata proyectos
Siete pruebas, intro cinematográfica, 4 jugadores, tienda, repeticiones y 20 personajes es un juego de un estudio de 10 personas. Por eso el plan arranca con una **rebanada vertical**: un tramo del cross country más la pelea final, con 2 equipos. Si esa rebanada no es divertida, nada de lo demás importa. Si es divertida, el resto es repetir el patrón.

### 2.3 Propiedad intelectual
Kunio-kun y sus personajes son de Arc System Works. Para uso personal no pasa nada, pero si algún día lo publicas:
- Nada de nombres originales (Kunio, Riki, Crash), ni sus canciones, ni sus sprites.
- "Nekketsu" es una palabra japonesa común (sangre caliente). El riesgo es bajo pero no cero si el título se parece mucho al de ellos.
- Los superhéroes del kit de PixelForja son versiones de fan. Quedan como equipo secreto opcional, apagado por defecto.

Todo lo de este plan es original: personajes, música, escenarios y textos.

### 2.4 Tus hijas en un juego de peleas
Sophie y Alana van a querer jugar como ellas mismas. El tono tiene que ser caricatura pura: estrellitas, polvo, caras de susto, nadie sangra, nadie llora. Los KO son "mareado con pajaritos". Así queda divertido para ellas y sigue siendo Nekketsu.

### 2.5 PixelForja no trae todo
Faltan animaciones clave del estilo Kunio: levantar y lanzar a un rival, trepar un poste, agarrar, cargar cosas, quedar mareado, girar el martillo. También falta un bioma de ciudad (hoy hay bosque, cueva e infierno). Esto se construye en PixelForja, no en el juego, y está detallado en la sección 15. Es más o menos un tercio del trabajo total.

---

## 3. Inventario real de PixelForja

Lo revisé en el código, no en el README.

### 3.1 Lo que ya sirve tal cual

| Área | Qué hay | Cómo lo usamos |
|---|---|---|
| Personajes | Ficha v2, cuerpo chibi, 86 peinados LPC (incluye `spiked`, `flat_top`, `cowlick_tall`, `shorthawk`), caras LPC con 7 expresiones, barbas, lentes, gorros, cintas (`headband_tied`), número de camiseta, patrones de equipo | Los 16 atletas, el público y los retratos con expresión |
| Familia | Presets de Rick, Steph, Sophie, Alana y Thor | Equipo Familia GG listo |
| Fotos | `colorsFromPhoto` toma piel, pelo, ojos y barba de una selfie | "Métete al juego" con tu foto |
| Atletismo | `sprint`, `sprint_start`, `hurdles`, `long_jump`, `pole_vault`, `shot_put`, `javelin` | Vallas, salto entre azoteas, base del martillo |
| Natación | `swim`, `swim_back`, `swim_breast`, `swim_fly`, `tread_water`, `dive`, `swim_exit`, con fila de agua (`agua`) | Natación y el río del cross country |
| Pelea | 14 golpes premium con `impacto` y `punto` del puño o pie | Todo el combate |
| Básicas | `idle`, `walk`, `run`, `jump` en partes, `land`, `hit`, `fall_getup`, `crawl`, `celebrate`, `sad`, `kick` | Movimiento base |
| Fútbol | `tackle`, `slide`, `header`, `chilena`, `tumble`, `stagger`, `laugh`, `point`, `dance`, `win`, `lose` y más | Técnicas especiales y reacciones (ver 7.6) |
| Otros deportes | `bat` (béisbol), raqueta de tenis, `bike`, `skate`, `throw`, `use_item`, `whirlwind`, `dodge`, `charge`, `leap` | Armas, atajos del cross country, martillo |
| Datos de movimiento | `eventos` (paso, impacto, suelta, despegue, aterriza), `avance` sin patinar, `desplazamiento`, `elevacion`, `rumbo`, pivote fijo | Hitboxes, sonidos, polvo, saltos, ritmo de pies exacto |
| Efectos | Chispas de golpe, 9 elementos x 10 tipos de efecto, polvo, partículas, luces aditivas, nubes, bruma | Golpes, técnicas, ambiente |
| Interfaz | Fuentes bitmap con ñ y tildes, logo animado con brillo, paneles 9-slice, números de daño, botones, íconos, retratos 40x40, girar tablet, íconos de app | Todo el HUD y los menús |
| Audio | Sintetizador de efectos y música en WAV, 26 efectos, 4 temas, ambientes en bucle | Base para los temas Nekketsu |
| Mundo | Pintor de terreno, objetos con apoyo y sólidos, Tiled JSON, agua animada, cuervos, árboles con viento | Base del bioma ciudad, parque y ribera |
| Calidad | Pruebas de que nada se sale de la celda, pies en el piso, sin pixeles sueltos, cada golpe con su impacto | Se extienden a las animaciones nuevas |
| Exportación | Hojas PNG por animación, manifiesto, créditos LPC automáticos, límite de 4096 px | El kit del juego |

### 3.2 Lo que falta (se construye en PixelForja)

| Falta | Para qué |
|---|---|
| `lift`, `carry_walk`, `carry_run`, `throw_overhead` | Levantar rivales caídos, botes, llantas y lanzarlos. Es EL movimiento Kunio |
| `carried`, `thrown_spin`, `land_flat` | El rival que es levantado y sale volando |
| `grab`, `grabbed`, `knee_grab`, `judo_throw` | Agarre, rodillazo en agarre, proyección de judo |
| `climb_pole`, `pole_idle`, `pole_punch`, `pole_slide`, `pole_kick_down` | Tama-wari |
| `ledge_hang`, `pull_up`, `climb_wall`, `ladder` | Cross country: muros, escaleras de incendio |
| `balance_walk`, `balance_wobble` | Vigas de la obra, cuerda floja |
| `dizzy` | Mareado con pajaritos |
| `hammer_spin`, `hammer_release` | Martillo |
| `swim_punch`, `dunked`, `swim_turn` | Natación sin reglas |
| `weapon_swing`, `weapon_swing_heavy` | Bate, tubo, palo de kendo |
| `taunt_<equipo>` | Una burla propia por equipo |
| `cheer`, `cheer_wave` en 32 px | Público |
| Bioma "ciudad" | Calles, aceras, río con muro de concreto, escuela, obra, azoteas, alcantarilla, estadio |
| Ropa nueva | Gakuran (chaqueta escolar cerrada de cuello alto), sailor fuku, chándal de equipo, gorra de natación, kimono de judo |
| Datos nuevos en el manifiesto | Caja de daño por cuadro, puntos de manos y cabeza por cuadro (ver 6.6) |
| Música y efectos | Marcha Nekketsu, temas por prueba, silbato, pistola de salida, público, chapuzón, bola que revienta |

---

## 4. Qué lo hace "mucho mejor" que el original

1. **Golpes que se sienten.** Cada golpe trae su cuadro de impacto y el punto exacto del puño. Hitstop de 2 a 4 cuadros, temblor de cámara, chispa y sonido justo donde pega. El original pegaba "más o menos por ahí".
2. **Animación de verdad.** El original tenía 2 o 3 cuadros por acción. Aquí son 8 a 13 con poses clave, pelo que se mueve y pies que no patinan a ninguna velocidad.
3. **Técnicas Nekketsu de 75 animaciones.** El torpedo humano es el clavado de natación en tierra. La chilena de fútbol es una patada aérea. La barrida es la `slide`. El motor ya las tiene: las convertimos en movimientos especiales.
4. **Medidor Nekketsu.** Se llena al pegar, al recibir y al ir perdiendo. Lleno, activas tu técnica especial con pantalla de "corte" estilo anime. Es remontada controlada: el que va atrás siempre tiene chance.
5. **Mundo vivo.** Luces de faroles al atardecer, cuervos que huyen, ropa tendida que se mueve, público generado con cientos de caras distintas, confeti, bruma en el río.
6. **Repetición instantánea.** La simulación es determinista, así que guardamos los últimos 10 segundos y repetimos el mejor KO en cámara lenta.
7. **Tú adentro.** Creas tu personaje en el estudio de PixelForja (o desde una selfie), exportas la ficha y entra al juego como atleta.
8. **Modo Peques.** Correr automático, saltos asistidos, sin machacar botones. Sophie y Alana juegan de verdad.
9. **4 jugadores en serio.** Mandos USB o Bluetooth, teclado compartido y táctil en tablet.
10. **Desafíos y fantasmas.** Medallas de oro, plata y bronce por prueba y carrera contra tu mejor tiempo.

---

## 5. Dirección de arte y ambiente

### 5.1 Resolución y escala
- Resolución interna **640 x 360**. Escala entera a la pantalla (x2 = 1280 x 720, x3 = 1920 x 1080). Nunca x1.5.
- Atletas en celda de **48**. Un chibi mide unos 44 px, el 12 % de la altura. En la NES Kunio medía el 13 %. Misma lectura, el doble de detalle.
- Gigantes (Goro, el jefe secreto) en celda **64**.
- Público en celda **32**, solo `idle`, `cheer` y `cheer_wave`.

### 5.2 Paleta y tono
- Base "Famicom extendida": colores saturados, contorno oscuro selectivo (ya lo hace el render), sombras de 2 tonos.
- Cada prueba tiene su hora del día. Mañana fresca para la salida, mediodía en la piscina, atardecer naranja en las azoteas, noche con neón para la pelea final. Se logra con un tinte de pantalla más las luces aditivas del motor.

### 5.3 La ciudad: "Barrio Nekketsu"
Una ciudad japonesa de finales de los 80, inventada:
- Calles con postes de luz y cables, máquinas expendedoras con luz, bicis paradas, gatos en los muros.
- Ribera del río con muro de concreto, puente de hierro, cañas, pescadores.
- Escuela con portón, patio de tierra, reloj en la fachada.
- Obra en construcción con vigas, sacos, grúa al fondo.
- Azoteas con tanques de agua, ropa tendida, antenas, letreros de neón.
- Alcantarilla con agua verde, tuberías y ratas (las ratas ya existen como enemigo en PixelForja).
- Estadio con gradas, marcador gigante y fuegos artificiales.

**Idea opcional:** un tramo bonus "Saigón" con motos como obstáculo, puestos de comida callejera y cables enredados. Le da un sello tuyo. Te lo dejo como pregunta.

### 5.4 Fondos en capas
Cada escenario tiene 3 capas de paralaje:
1. Cielo con nubes que se mueven y la hora del día.
2. Siluetas de edificios o montañas.
3. Fachadas cercanas.
4. El piso jugable (la franja oblicua).
5. Primer plano que tapa un poco: postes, barandas, cables. Le da profundidad de cine.

---

## 6. Arquitectura técnica

### 6.1 Repos y flujo del kit
```
Nekketsu-Olympic-GG/            el juego (este repo)
  tools/pixel_forja/            PixelForja como submódulo (solo para regenerar)
  fichas/                       personajes editados en el estudio (*.ficha.json)
  public/assets/kit/            el kit generado, SE COMMITEA
  src/                          el juego
```
- El generador vive en PixelForja: `src/engine/kit/olympickit.ts` y `scripts/olympic-kit.ts`. Así las animaciones nuevas pasan por sus pruebas de calidad.
- En el juego: `"kit": "tsx tools/pixel_forja/scripts/olympic-kit.ts public/assets/kit --fichas fichas"`.
- El kit se commitea a propósito. Netlify compila sin correr PixelForja, y si PixelForja cambia algo que no te gusta, el juego sigue igual hasta que regeneres.
- Es exactamente el patrón documentado en `docs/KIT_JUEGO.md` de PixelForja para GG Abyss. Nada nuevo que aprender.

### 6.2 Stack
| Pieza | Elección | Por qué |
|---|---|---|
| Motor | Phaser 3.90 | Escenas, cargador, entrada con mandos, audio web, tweens, RetroFont, nineslice. Ya lo usas en GG Abyss |
| Lenguaje | TypeScript estricto | Tipos del manifiesto compartidos con PixelForja |
| Build | Vite | Rápido, PWA fácil |
| Pruebas | Vitest (lógica) y Playwright (pantallas) | Igual que PixelForja |
| Publicar | Netlify, PWA instalable | Íconos de app ya salen de PixelForja |
| Móvil nativo (después) | Capacitor | Envolver Phaser es trivial. Expo no aporta aquí |

### 6.3 Estructura del código
```
src/
  main.ts                    arranque de Phaser
  config.ts                  resolución, escala, constantes de física
  core/
    kit.ts                   carga y tipos del manifest
    anim.ts                  reproductor con eventos, avance y elevación
    input.ts                 teclado, 4 mandos, táctil, asignación de jugadores
    audio.ts                 música con fundidos, efectos con variación de tono
    save.ts                  récords, medallas, opciones (localStorage con try/catch)
    rng.ts                   aleatorio con semilla (para repeticiones)
    i18n.ts                  español e inglés
    replay.ts                búfer circular de 10 s de estados
  sim/
    world.ts                 simulación a 60 Hz fija, separada del dibujo
    projection.ts            oblicua: (x, y, z) a pantalla
    collision.ts             franja jugable, sólidos, bordes, huecos
    combat.ts                hitbox, hurtbox, daño, hitstop, derribo
    items.ts                 armas y objetos del piso
  actors/
    actor.ts                 posición, velocidad, z, dirección, estado
    stats.ts                 los 9 atributos y el aguante
    states/                  una máquina de estados por familia de acciones
    brains/                  IA por prueba y por personalidad
  events/
    crosscountry/  obstacles/  tamawari/  swim/  kachinuki/  rooftop/  hammer/
  scenes/
    Boot  Preload  Intro  Title  Mode  TeamSelect  Lineup  Versus  Event
    Results  Locker  Podium  Credits  Options  Replay
  ui/
    hud.ts  dialog.ts  portrait.ts  bars.ts  menu.ts  touch.ts  banner.ts
  data/
    teams.json  events.json  stages/*.json  dialogs/*.json
```

### 6.4 Simulación determinista
- Paso fijo de 60 Hz. El dibujo interpola entre pasos.
- Todo lo aleatorio sale de `rng.ts` con semilla.
- Las entradas de cada jugador se guardan por paso.
- Con eso salen gratis: repeticiones, fantasmas de tu mejor tiempo, pruebas automáticas de "esta pelea termina igual siempre" y, algún día, juego en línea con rollback.

### 6.5 Proyección oblicua
```ts
// mundo: x a lo largo, y profundidad (0 = fondo de la franja), z altura
pantallaX = x - camX
pantallaY = pisoArriba + y - z
profundidadDeDibujo = y        // se ordena por y del pivote
sombra = elipse en (x, pisoArriba + y), escala según z
```
Elegir la fila de la hoja según la velocidad:
- Solo horizontal: `right` (o `right` con `flipX` para ir a la izquierda).
- Diagonal hacia el fondo: `up_right`. Hacia el frente: `down_right`.
- Solo profundidad (caminar): `up` o `down`.
- Pruebas de campo (saltos, lanzamientos, natación): siempre `right`. Ahí el motor está dibujado de lado y se ve perfecto.

Ritmo de pies sin patinar, en oblicua es directo porque `avance` está medido de lado:
```ts
anim.cuadro += (velocidad * dt) / avance * cuadros
```

### 6.6 Manifiesto del kit olímpico
Extiende el del kit deportivo. Lo nuevo va marcado.
```jsonc
{
  "juego": "Nekketsu Olympic GG", "generado_con": "PixelForja", "version": 1,
  "filas": ["right", "down_right", "up_right", "down", "up"],          // NUEVO: la izquierda es flipX
  "atletas": {
    "rick": {
      "nombre": "Rick", "equipo": "familia_gg", "celda": 48, "pivote": [24, 46],
      "stats": { "puno": 7, "patada": 5, "arma": 6, "lanzar": 8, "agilidad": 4,
                 "defensa": 7, "salto": 4, "velocidad": 5, "nado": 5, "aguante": 120 },  // NUEVO
      "retratos": { "neutral": "...", "feliz": "...", "enojo": "...", "triste": "...",
                    "susto": "...", "cerrado": "..." },                                    // NUEVO: caras LPC
      "tecnica": "puno_mach",                                                             // NUEVO
      "packs": {
        "base":   { "idle": { "archivo": "...", "cuadros": 6, "fps": 6, "loop": true }, "...": {} },
        "pelea":  { "jab": { "...": "...",
                    "eventos": [{ "tipo": "impacto", "cuadro": 3, "punto": [[12, -26], "..."] }],
                    "cajas": [[[-8, -40, 16, 40]], "..."],          // NUEVO: hurtbox por fila y cuadro
                    "manos": [[[10, -24], [-6, -22]], "..."],       // NUEVO: mano cercana y lejana
                    "cabeza": [[0, -38], "..."] } },                // NUEVO: para estrellas y objetos
        "atletismo": { "...": {} }, "natacion": { "...": {} }, "trepar": { "...": {} }
      }
    }
  },
  "publico": { "celda": 32, "variantes": 64, "anims": ["idle", "cheer", "cheer_wave"] },
  "escenarios": { "barrio": { "capas": ["..."], "objetos": {}, "luces": {} } },
  "objetos": { "bate": { "w": 24, "h": 8, "agarre": [4, 4], "peso": 1, "dano": 8 } },
  "fx": { "...": {} }, "ui": { "...": {} }, "audio": { "...": {} }
}
```
- `cajas` se calcula del contorno real del sprite en cada cuadro. Esquivar con `slip` de verdad baja la caja.
- `manos` sirve para que el bate, la llanta o el rival levantado queden pegados a las manos en cada cuadro.
- `cabeza` sirve para los pajaritos del mareo, el sudor y los objetos que caen encima.

### 6.7 Presupuesto de memoria
Cálculo honesto: un atleta con 45 animaciones, 10 cuadros promedio, 5 filas, celda 48 y RGBA son unos 20 MB de GPU. Por 16 atletas, 330 MB. Una tablet no lo aguanta.

Solución: **packs por prueba**. Cada prueba carga solo lo que usa (unas 12 animaciones). Quedan unos 5 MB por atleta y unos 90 MB por prueba con todo el elenco. Además:
- Atlas empaquetados de hasta 4096 px (el kit ya lo verifica).
- Público en 32 px con 3 animaciones y paleta variada en tiempo real.
- Meta: menos de 120 MB de texturas por escena y carga de menos de 4 segundos.

---

## 7. El núcleo: moverse y pelear como Kunio

### 7.1 Controles
| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Moverse | Flechas o WASD | Palanca o cruceta | Palanca virtual |
| Correr | Doble toque en dirección | Doble toque o gatillo | Doble toque o botón |
| Puño | J | X / Cuadrado | Botón A |
| Patada | K | A / Cruz | Botón B |
| Saltar | L (o J+K) | B / Círculo | Botón C |
| Agarrar, recoger, lanzar | Puño cerca de algo | Igual | Igual |
| Técnica Nekketsu | Puño + Patada con medidor lleno | Igual | Botón especial |

Combinaciones clásicas Kunio que conservamos:
- Correr + puño: puñetazo corriendo.
- Correr + patada: patada voladora.
- Saltar + patada: patada en el aire.
- Puño junto a un rival caído: levantarlo. Puño otra vez: lanzarlo.
- Puño junto a un objeto: recogerlo. Puño otra vez: golpe con arma. Patada: lanzarlo.
- Agarre por cercanía: dos puños seguidos pegado al rival. Puño en agarre: rodillazo. Atrás + puño: proyección.

### 7.2 Estados del atleta
`idle`, `walk`, `run`, `jump`, `air_attack`, `attack`, `grab`, `grabbed`, `lift`, `carry`, `throw`, `carried`, `thrown`, `hitstun`, `knockdown`, `getup`, `dizzy`, `ko`, `climb`, `hang`, `balance`, `swim`, `ride`, `taunt`, `celebrate`. Cada estado sabe qué animación usa, de qué pack y a qué estados puede saltar.

### 7.3 Datos de cuadro sacados del kit
Nada de números inventados a mano:
- **Arranque:** cuadros antes del `impacto`.
- **Activo:** el cuadro del `impacto` y el siguiente.
- **Recuperación:** el resto.
- **Hitbox:** círculo de 6 px en `punto`.
- **Hurtbox:** `cajas` del cuadro actual.
- Si el diseñador cambia una animación en PixelForja, el balance del golpe cambia solo y de forma coherente.

### 7.4 Daño y reacciones
```
daño = base_del_golpe * (1 + stat_atacante / 10) * (1 - defensa_rival / 25) * multiplicador_arma
hitstop = 2 cuadros (jab) a 4 cuadros (técnica)
```
- 3 golpes en 1 segundo: derribo.
- Golpe con arma o técnica: derribo directo, el rival vuela con `elevacion`.
- Un rival en el aire puede recibir un golpe más (malabar), máximo uno. Así no hay combos infinitos.
- Aguante a 0: mareado 3 segundos con pajaritos. Otro golpe: KO, sale de la prueba (en Kachinuki) o pierde 3 segundos (en carreras).
- Invulnerabilidad de 40 cuadros al levantarse.

### 7.5 Objetos del piso
| Objeto | Peso | Golpe | Lanzado | Especial |
|---|---|---|---|---|
| Bate | Liviano | 8 | 10 | Swing con `bat` del pack béisbol |
| Tubo | Medio | 10 | 12 | Rebota en el piso |
| Llanta | Medio | 6 | 12 | Rueda por el piso y tumba a varios |
| Bote de basura | Pesado | 12 | 16 | Lo puedes patear rodando |
| Piedra | Liviano | 4 | 10 | Muchas tiradas por el piso |
| Raqueta | Liviano | 7 | 8 | Devuelve proyectiles (exclusiva de la Academia) |
| Pelota de dodgeball | Liviano | 0 | 14 | Bonus, guiño al Dodgeball Nekketsu |
| Bici | Vehículo | 0 | 0 | Cross country: vas rápido, te tumban con un golpe |
| Patineta | Vehículo | 0 | 0 | Cross country: rápida en bajada |

Los objetos usan `manos` del cuadro actual para quedar pegados. Los lanzamientos salen del `punto` del evento `suelta`.

### 7.6 Técnicas Nekketsu (una por atleta)
Todas existen ya como animación en PixelForja. Solo cambia el contexto:

| Técnica | Animación base | Efecto |
|---|---|---|
| Puño Mach | `jab` en bucle a 2x fps | Ráfaga de 8 golpes |
| Patada Huracán | `whirlwind` + `kick_martial` | Gira y barre a todos alrededor |
| Torpedo Humano | `dive` de natación, en tierra | Cabezazo volador en línea recta |
| Rodilla Voladora | `flying_kick` con más `elevacion` | Cruza media pantalla |
| Uppercut del Dragón | `uppercut` con salto | Lanza al rival hacia arriba |
| Barrida Infernal | `slide` de fútbol | Tumba a todos en la línea |
| Cabezazo Bomba | `header` | Rebota al rival contra el borde |
| Chilena Asesina | `chilena` | Patada aérea hacia atrás |
| Tackle Locomotora | `tackle` | Atraviesa a varios rivales |
| Lluvia de Pelotas | `tennis_serve` repetido | Proyectiles de tenis |
| ¡Thor al Rescate! | Thor: `run`, `bite`, `bark` | Thor entra corriendo y tumba al más cercano |

Al activar una técnica: congelado de 30 cuadros, fondo con líneas de velocidad, retrato del personaje con cara de enojo y el nombre de la técnica con `fuente_titulo`. Puro anime de los 80.

### 7.7 Atributos
| Atributo | Afecta |
|---|---|
| Puño | Daño de puños y fuerza de agarre |
| Patada | Daño de patadas |
| Arma | Daño y velocidad con objetos |
| Lanzar | Distancia y daño de lanzamientos, martillo |
| Agilidad | Velocidad de levantarse, esquivar, trepar |
| Defensa | Reduce daño, resiste agarres |
| Salto | Altura y distancia de saltos, garrocha |
| Velocidad | Correr, carreras |
| Nado | Velocidad y aguante en el agua |
| Aguante | Vida y energía para correr |

---

## 8. Equipos y personajes

Cuatro equipos de cuatro, cada uno con identidad, uniforme, tema musical y burla propia.

### 8.1 Familia GG (azul y dorado)
| Atleta | Rol | Fuerte | Débil | Técnica |
|---|---|---|---|---|
| Rick | Capitán, potencia | Puño, Lanzar, Defensa | Agilidad | Puño Mach |
| Steph | Técnica, velocidad | Velocidad, Nado, Patada | Arma | Patada Huracán |
| Sophie | Acróbata | Salto, Agilidad | Defensa | Chilena Asesina |
| Alana | Pequeña e inesquivable | Agilidad, caja de daño chiquita | Puño | ¡Thor al Rescate! |

Thor corre por la pista animando, ladra en los récords y entra con la técnica de Alana.

### 8.2 Instituto Nekketsu (gakuran negro, cinta roja)
El homenaje directo a los rivales de siempre, con nombres originales.
| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Kenji "Toro" Sakamoto | Capitán delincuente | Pompadour (`cowlick_tall`), gakuran abierto | Uppercut del Dragón |
| Ryu Takeda | Karateka | Cinta, `spiked`, kimono | Rodilla Voladora |
| Goro Iwata | Gigante (celda 64) | `buzzcut`, sin mangas | Tackle Locomotora |
| Tetsu Mori | Lanzador | `flat_top`, lentes oscuros | Lanzamiento de bote doble |

### 8.3 Academia Kirameki (morado y plata, ricos)
| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Ayame Kirishima | Capitana, tenista | Coleta alta, falda | Lluvia de Pelotas |
| Kaito Saionji | Esgrimista | `parted`, chaqueta | Estocada (`attack_thrust`) |
| Mei Hoshino | Gimnasta | `bunches` | Barrida Infernal |
| Hideo Kudo | Estratega con lentes | `nerd` glasses | Trampa: suelta canicas |

### 8.4 Tiburones del Puerto (rojo y negro, pandilla de motos)
| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Sabu Kurogane | Capitán motero | `longhawk`, chaqueta de cuero | Embestida en moto (`bike` + `charge`) |
| Jin Arai | Peleador sucio | `spiked_porcupine`, bandana | Cabezazo Bomba |
| Taka Umino | Nadador | Gorra de natación | Torpedo Humano |
| Oda "Mamá Oda" | Luchadora pesada | `bob`, delantal | Abrazo de oso (agarre largo) |

### 8.5 Equipo secreto: Los del Abismo
Crossover con tu otro juego, GG Abyss: un goblin, un trol, un orco y el minotauro como jefe (celda 96). Las cabezas ya existen en LPC y el minotauro ya está en PixelForja. Se desbloquea ganando la Olimpiada en difícil. Es 100 % tuyo, se puede publicar.

### 8.6 Equipo fan (opcional, solo uso personal)
Los seis superhéroes del kit deportivo. Apagados por defecto, se activan en Opciones. No se publican.

### 8.7 Métete al juego
1. Abres el estudio de PixelForja, armas tu personaje o subes una selfie.
2. Exportas la ficha y la pones en `fichas/` (o la cargas desde Opciones en el juego, que la renderiza en un worker).
3. Eliges sus atributos con 40 puntos a repartir.
4. Reemplaza a un atleta de cualquier equipo o arma un quinto equipo.

---

## 9. Las pruebas

Formato fijo para cada una: reglas, escenario, controles, IA, animaciones, lo nuevo en PixelForja y criterio de "terminado".

### 9.1 Cross Country Callejero (la estrella)
**Reglas.** Los 16 atletas (4 por equipo) corren por la ciudad. Puntos por puesto de llegada de cada atleta. Vale todo: golpes, armas, atajos.

**Recorrido en 4 tramos, cada uno de 5 a 7 pantallas:**
1. **Salida en la escuela → calles del barrio.** Pistola de salida (`sprint_start`). Botes de basura, bicis paradas, perros que ladran y persiguen, un camión que pasa por la calle y tumba al que se atraviese.
2. **Ribera del río.** Dos caminos: el puente largo o cruzar nadando (más corto, pero si te golpean en el agua pierdes mucho). Usa `swim` y `swim_exit` con la fila `agua`.
3. **Obra en construcción.** Vigas de equilibrio (`balance_walk`), escalera de mano (`ladder`), sacos de arena que se pueden empujar, un atajo por la grúa para los que saltan bien.
4. **Azoteas → estadio.** Saltos entre edificios (`long_jump` con `elevacion`), ropa tendida que tapa la vista, tanques de agua. Bajada por la escalera de incendio y vuelta final en el estadio con el público de pie.

**Atajos.** Bici y patineta tiradas en el tramo 1 y 4. Alcantarilla secreta en el tramo 1 que sale en el tramo 3 (con ratas).

**Cámara.** Sigue al jugador 1. Con varios jugadores humanos sigue al punto medio. Si alguien se queda fuera de pantalla más de 2 segundos aparece en el borde con 3 segundos de penalización, para que nadie quede abandonado.

**IA.** Tres personalidades: corredor (evita peleas), peleador (busca al más cercano) y tramposo (agarra armas y toma atajos). Rubber band suave: los últimos corren un 5 % más.

**Animaciones.** `run`, `sprint`, `jump`, `long_jump`, `swim`, `swim_exit`, `balance_walk`, `ladder`, `ledge_hang`, `pull_up`, `bike`, `skate`, pelea completa, objetos.

**Nuevo en PixelForja.** Bioma ciudad completo, objetos de calle, perro callejero (cuadrúpedo existente con otra paleta), camión.

**Terminado cuando.** Se corre de punta a punta con 16 atletas a 60 fps en tablet, los 3 tipos de IA terminan la carrera, y en 10 carreras de prueba automáticas nadie queda trabado.

### 9.2 Carrera de Obstáculos
**Reglas.** 4 carriles en profundidad, 400 m con obstáculos. Te puedes cambiar de carril y pegarle al de al lado. Puntos por llegada.

**Obstáculos.** Vallas (`hurdles`), foso de agua, campo de llantas, red para pasar arrastrándose (`crawl`), muro para trepar (`climb_wall`), cuerda floja (`balance_walk`), túnel. El orden cambia en cada partida con semilla.

**Mecánica de ritmo.** Saltar la valla justo en el último `paso` antes de llegar da impulso. Saltar tarde tumba la valla y frena. Es fácil de entender y difícil de dominar.

**IA.** Calcula el cuadro ideal de salto con el `avance` del sprint. En fácil se equivoca un 30 %.

**Terminado cuando.** Con un solo botón se puede ganar, con buen ritmo se gana por mucho.

### 9.3 Tama-wari (romper la bola)
**Reglas.** Cada equipo tiene un poste con una bola gigante de papel arriba (kusudama). Hay que trepar y golpear la bola hasta romperla, mientras los rivales te bajan a patadas o rompen tu bola primero. El primer equipo en romper la bola rival gana.

**Escenario.** El patio de la escuela con el público en las gradas, banderines y el director en el podio comentando.

**Mecánica.**
- Trepar: machacar arriba (o mantener en Modo Peques). Velocidad según Agilidad.
- Arriba: `pole_punch` resta vida a la bola. La bola se va rajando en 4 estados.
- Desde abajo: patada al poste (`pole_kick_down`) sacude y puede tumbar al que trepa.
- Agarrar el pie del que trepa (`grab` hacia arriba) lo baja de un jalón.
- Al romperse: la bola se abre, sale confeti, cae un cartel con el nombre del equipo y suena la fanfarria.

**Nuevo en PixelForja.** Pack `trepar` completo, poste, bola en 4 estados más la explosión de confeti, cartel colgante.

**Terminado cuando.** Una partida dura entre 60 y 120 segundos y hay remontadas reales.

### 9.4 Natación sin Reglas
**Reglas.** Piscina de 50 m, ida y vuelta. 4 nadadores, uno por equipo. Se vale hundir al de al lado.

**Mecánica.**
- **Salida.** Se llena una barra. Saltar en la zona verde da un `dive` largo, saltar antes es salida en falso con penalización.
- **Brazada al ritmo.** Cada brazada tiene un `paso` en su evento. Apretar justo en ese cuadro da impulso. Es Track & Field con ritmo en vez de machacar.
- **Estilos.** Crol rápido pero gasta aguante. Pecho lento y estable. Mariposa con impulso fuerte pero ritmo difícil. Espalda solo para la remontada final (ves a los rivales).
- **Pelea en el agua.** `swim_punch` al de al lado. Si le pegas 3 veces se hunde 1 segundo (`dunked`).
- **Vuelta.** `swim_turn` en la pared. Patear la pared en el cuadro justo da impulso.

**Escenario.** Piscina techada con luz que entra en rayos, reflejos animados en el agua, banderines y el público con toallas.

**Ya lo tiene PixelForja.** Los 4 estilos, el clavado, la fila del agua, la espuma y las gotas.

**Terminado cuando.** Se gana con ritmo, no con machacar, y el agua se ve mejor que la arena actual.

### 9.5 Kachinuki: la batalla final
**Reglas.** Batalla campal en la azotea del edificio más alto, de noche, con neón. Todos contra todos por equipos. Sin barandas en un lado: si te tiran por el borde quedas fuera. Gana el equipo con el último en pie.

**Formato.**
- Rondas de 4 contra 4 o todos a la vez si la máquina aguanta (meta: 16 a 60 fps).
- Cada 30 segundos cae un objeto del cielo (bate, bote, llanta) con una sombra que avisa.
- A los 90 segundos el borde se acerca (la azotea se va quedando chica), para que no haya peleas eternas.
- Cada KO da puntos y llena el medidor del equipo.

**Escenario.** Tanques de agua (se rompen y mojan), letreros de neón que parpadean, helicóptero de la tele con reflector que sigue al líder, fuegos artificiales al final.

**IA.** Por personalidad, con lectura de los datos de cuadro: bloquea si el arranque del golpe rival es largo, castiga en la recuperación, busca el borde para tirar al rival.

**Terminado cuando.** Una pelea de 4 contra 4 en normal dura entre 2 y 4 minutos y la IA difícil te obliga a bloquear.

### 9.6 Salto entre Azoteas (v1.5)
**Reglas.** Carrerita, garrocha (`pole_vault`) y salto al edificio siguiente. Cada edificio está más lejos. El que cae aterriza en un toldo, en la basura o en la piscina de un vecino. Se juega por turnos con 3 intentos.

**Mecánica.** Velocidad por ritmo de pasos, momento de clavar la garrocha y ángulo con un segundo botón. Viento visible con la ropa tendida.

### 9.7 Martillo Loco (v1.5)
**Reglas.** Girar y soltar el martillo lo más lejos posible. Si lo sueltas mal sale en cualquier dirección y destruye cosas: la ventana del director, la alarma de un carro, una paloma que sale volando.

**Mecánica.** `hammer_spin` acelera al ritmo de giros (palanca en círculos o botones alternados). `hammer_release` en el ángulo correcto. Récord en metros.

### 9.8 Dodgeball Nekketsu (v2, bonus)
Guiño al primer juego de la saga. 4 contra 4 en la cancha de la escuela. Usa `throw`, `catch`, `dodge` y `vb_dive`.

---

## 10. Intro, menús y flujo completo

### 10.1 Mapa de pantallas
```
Arranque → Toca para empezar → Intro → Título → Modo
  Olimpiada → Equipo → Alineación → [Presentación VS → Prueba → Resultados → Vestuario] x N → Podio → Créditos
  Prueba libre → Prueba → Equipo → Prueba → Resultados
  Desafíos → Medallas → Prueba con fantasma
  Versus → Prueba → Equipos (2 a 4 jugadores) → Prueba → Resultados
  Opciones / Métete al juego / Récords
```

### 10.2 La intro, toma por toma (40 segundos, se salta con cualquier botón)
| Tiempo | Imagen | Sonido |
|---|---|---|
| 0:00 | Negro. Texto a máquina de escribir: "Barrio Nekketsu, 1989." | Campana de escuela sintetizada |
| 0:04 | Paneo lento por la ciudad al amanecer, 3 capas de paralaje, cuervos que cruzan | Viento y pájaros |
| 0:10 | El director en el podio del patio, megáfono. Cuadro de diálogo con su retrato: "¡Este año el Festival Deportivo será... SIN REGLAS!" | Pitido de megáfono, voz en "blips" |
| 0:16 | Corte seco. Cada capitán entra caminando desde un lado: Rick, Kenji, Ayame, Sabu. Se frenan, se presenta su tarjeta con nombre, escuela y estrella de atributos | Un acorde distinto por equipo |
| 0:30 | Los cuatro se miran. Kenji le lanza un puñetazo a la cámara. Impacto, temblor, la pantalla se raja como vidrio | Golpe crítico |
| 0:33 | El logo "NEKKETSU OLYMPIC GG" cae de golpe sobre el vidrio roto, brillo que recorre las letras (logo animado de PixelForja) | Arranca la Marcha Nekketsu |
| 0:36 | Estadio con el público ondeando, fuegos artificiales. "PRESIONA START" titilando | La marcha sigue en bucle |

**Modo demo.** Si nadie toca nada en 20 segundos, la CPU juega 30 segundos de una prueba al azar y vuelve al título. Como en las maquinitas de antes.

### 10.3 Antes de cada prueba: presentación VS
Pantalla dividida en 4 con los capitanes y su cara de enojo (retrato LPC `anger`), un diálogo de burla corto entre dos rivales y el nombre de la prueba cayendo con `fuente_titulo`. 5 segundos, se salta.

### 10.4 Resultados
- Tabla con puestos, tiempos y puntos. Los ganadores hacen `celebrate`, `win` o `dance`, los perdedores `sad` o `lose`.
- **Repetición del mejor momento:** el KO más fuerte o la llegada más apretada, en cámara lenta con la palabra "REPLAY" en la esquina.
- Puntos de la Olimpiada: 1° 10, 2° 6, 3° 4, 4° 2, más 1 por cada KO en Kachinuki.

### 10.5 Vestuario (entre pruebas)
Guiño a la tienda de River City Ransom.
- Ganas yenes por puesto, KO y récords.
- **Comida:** bentō, ramen y onigiri recuperan aguante. Lo que no recuperes se arrastra a la prueba siguiente.
- **Equipo:** zapatillas (+velocidad por una prueba), cinta (+puño), gorra de natación (+nado).
- **Alineación:** eliges quién compite en las pruebas individuales. Un atleta cansado rinde menos. Es la capa de estrategia que el original no tenía.

### 10.6 Podio y créditos
Podio con los tres primeros equipos, himno del ganador, confeti, Thor corriendo alrededor. Después los créditos con los autores de las piezas LPC (obligatorio por licencia), sobre un desfile de todos los atletas caminando.

---

## 11. Audio

### 11.1 Música (sintetizada con el motor de PixelForja, todo original)
| Tema | Dónde | Carácter |
|---|---|---|
| Marcha Nekketsu | Título y podio | Marcha de banda escolar a 132 bpm, melodía de trompeta en onda cuadrada, redoblante con ruido |
| Calles en Llamas | Cross country | Rock chiptune rápido, cambia de capa en cada tramo |
| Ritmo de Vallas | Obstáculos | Funk con el bajo marcando el paso |
| ¡Rompe la Bola! | Tama-wari | Matsuri: tambor taiko, flauta en triángulo |
| Agua Brava | Natación | Synth acuático, arpegios |
| Azotea de Neón | Kachinuki | El tema más intenso, en menor, con un puente que sube cuando quedan pocos |
| Vestuario | Entre pruebas | Tranquilo, tipo tienda |
| Victoria | Resultados | Fanfarria corta |
| Tema por equipo | Presentaciones | 4 compases que identifican a cada escuela |

Música adaptativa: en las carreras, cuando faltan 10 segundos o quedan dos peleando el primer lugar, sube el tempo un 10 % y entra una capa de percusión extra.

### 11.2 Efectos nuevos
Pistola de salida, silbato, golpes en 3 variantes con tono aleatorio, golpe con bate, llanta rodando, bote de basura, chapuzón y clavado, brazada, bola de papel que revienta, confeti, público que grita (sube cuando hay KO o récord), público que hace "ooooh", megáfono, "blip" de diálogo por personaje (tono distinto), perro ladrando, camión, alarma de carro, paloma.

### 11.3 Mezcla
- Música al 60 %, efectos al 100 %, público al 40 % de fondo y al 90 % en los picos.
- Ducking: la música baja un 30 % durante las técnicas Nekketsu y los diálogos.
- En tablets el audio arranca después del primer toque (por eso "Toca para empezar").

---

## 12. HUD e interfaz

- **Arriba:** retrato 40x40 de cada jugador humano, nombre, barra de aguante, medidor Nekketsu y puesto actual. Estilo panel 9-slice de PixelForja con el color del equipo.
- **Carreras:** minimapa lineal arriba con la cabecita de cada atleta.
- **Números de daño:** la hoja de números de PixelForja, rojo para golpes, amarillo para críticos.
- **Diálogos:** caja abajo con retrato a la izquierda que cambia de expresión, texto a máquina de escribir con "blip" por letra.
- **Banners:** "¡LISTOS!", "¡YA!", "¡KO!", "¡RÉCORD!", "¡META!" con `fuente_titulo` y zoom con rebote.
- **Táctil:** palanca a la izquierda, 3 botones más el especial a la derecha, semitransparentes, se pueden mover y escalar.
- **Pausa:** reanudar, reiniciar prueba, controles, salir.

---

## 13. Modos de juego

| Modo | Qué es | Jugadores |
|---|---|---|
| Olimpiada | Todas las pruebas seguidas con vestuario en medio, gana el equipo con más puntos | 1 a 4 en el mismo equipo |
| Prueba libre | Una prueba suelta | 1 a 4 |
| Versus | Cada jugador con su equipo | 2 a 4 |
| Desafíos | Tres medallas por prueba con metas fijas, fantasma de tu mejor tiempo | 1 |
| Historia (v2) | La Olimpiada con escenas entre pruebas y el equipo secreto al final | 1 a 4 |
| En línea (v2) | Versus con rollback gracias a la simulación determinista | 2 a 4 |

---

## 14. Modo Peques y accesibilidad

Pensado para Sophie y Alana desde el día uno, no como parche.
- **Modo Peques:** correr automático hacia adelante, saltos automáticos en vallas y huecos, trepar manteniendo en vez de machacar, IA rival suave, sin KO (solo mareos), textos grandes.
- **Sin machacar:** opción global para cambiar "machacar botón" por "mantener".
- Remapeo de todos los controles.
- Dificultad Fácil, Normal y Nekketsu.
- Indicadores de color con forma además de color (para daltonismo).
- Temblor de pantalla y destellos con interruptor.
- Español e inglés desde el inicio.

---

## 15. Trabajo en PixelForja (lista concreta)

Se hace en una sesión aparte sobre el repo de PixelForja. Esta sesión solo lo puede leer.

### 15.1 Animaciones nuevas
Archivo nuevo `src/engine/anim/nekketsu.ts`, con el mismo estilo de `fight.ts` y `athletics.ts` (poses clave, eventos, `travel`, `lateral`):

| Grupo | Animaciones | Notas |
|---|---|---|
| Cargar | `lift`, `carry_idle`, `carry_walk`, `carry_run`, `throw_overhead` | Brazos arriba. Con el chibi los brazos no pasan la cabeza: el objeto va encima de la cabeza, apoyado en las manos |
| Ser cargado | `carried`, `thrown_spin`, `land_flat` | Cuerpo horizontal: usar la diagonal como hace el motor con la plancha de vóley |
| Agarre | `grab`, `grab_hold`, `grabbed`, `knee_grab`, `judo_throw`, `break_free` | `impacto` en el rodillazo y en la caída |
| Trepar | `climb_pole`, `pole_idle`, `pole_punch`, `pole_slide`, `pole_kick_down`, `ladder`, `climb_wall`, `ledge_hang`, `pull_up` | `paso` en cada agarre de mano para el sonido |
| Equilibrio | `balance_walk`, `balance_wobble`, `balance_fall` | |
| Estados | `dizzy`, `taunt`, `cheer`, `cheer_wave`, `shocked` | `dizzy` con punto de `cabeza` para los pajaritos |
| Armas | `weapon_swing`, `weapon_swing_heavy`, `weapon_throw` | Reusar el render de implementos de `render/props.ts` |
| Martillo | `hammer_spin`, `hammer_release` | Partir de `whirlwind` |
| Agua | `swim_punch`, `dunked`, `swim_turn` | Con fila `agua` |

Pruebas: todas entran al control de calidad existente (celda, pies, pixeles sueltos, altura en ciclos, impacto en cada golpe) en 32, 48 y 64.

### 15.2 Datos nuevos por cuadro
En `src/engine/export/motion.ts`:
- `cajas`: recuadro del sprite opaco por fila y cuadro, relativo al pivote.
- `manos`: posición de mano cercana y lejana. El esqueleto ya las calcula para dibujar los implementos, solo hay que exportarlas.
- `cabeza`: centro de la cabeza.
- Filtro de filas: exportar solo las 5 filas que pide el juego.

### 15.3 Ropa nueva
En la ficha y el render humano: `gakuran` (chaqueta cerrada de cuello alto con botones dorados), `sailor` (cuello marinero con pañuelo), `chandal` (chaqueta con franjas de equipo), `kimono_judo` (con cinturón de color), gorra de natación. Los colores salen de las rampas que ya existen.

### 15.4 Bioma ciudad
Carpeta nueva `src/engine/world/city/`:
- `facades.ts`: generador de fachadas por parámetros (pisos, ventanas encendidas o no, balcones, letreros con texto real corto, persianas).
- `street.ts`: asfalto, acera, bordillo, líneas, alcantarillas, postes con cables.
- `river.ts`: muro de concreto, agua animada reusando la del bosque con otra paleta, puente de hierro.
- `rooftop.ts`: piso de azotea, tanques, antenas, ropa tendida con viento (mismo truco que los árboles), neón con parpadeo y luz aditiva.
- `school.ts`, `site.ts`, `sewer.ts`, `stadium.ts`, `pool.ts`.
- `sky.ts`: cielos por hora del día y siluetas de ciudad para el paralaje.
- Cada escenario sale como capas PNG más un JSON de Tiled con colisión, franja jugable, huecos, sólidos y puntos de entidades.

### 15.5 Público
`src/engine/kit/crowd.ts`: genera 64 hinchas distintos con la misma lógica de "sorpréndeme" (semilla fija), en 32 px, con camisetas del color de su equipo.

### 15.6 Audio
En `src/engine/audio/`: los temas de la sección 11, los efectos nuevos, y un generador de "blips" de voz por personaje.

### 15.7 Generador del kit
`src/engine/kit/olympickit.ts` y `scripts/olympic-kit.ts`:
- Lee equipos y fichas.
- Renderiza los packs por prueba solo con las animaciones que cada prueba usa.
- Empaqueta atlas de hasta 4096 px.
- Escribe el manifiesto de la sección 6.6 y `CREDITOS.txt`.
- Mismo seguro que los otros kits: no borra una carpeta que no sea un kit de PixelForja.

---

## 16. Hoja de ruta por fases

Cada fase termina con algo que se puede jugar y probar en la tablet. Ninguna fase arranca si la anterior no pasó su criterio.

| Fase | Qué se construye | Dónde | Criterio de terminado |
|---|---|---|---|
| **F0 Cimientos** | Repo con Phaser, Vite, TS, Netlify, submódulo, cargador del kit actual, proyección oblicua, un atleta caminando y corriendo sin patinar | Juego | Rick camina y corre por una franja vacía a 60 fps en la tablet, con pasos que suenan en el cuadro justo |
| **F1 Motor de pelea** | Estados, combate con datos de cuadro, hitstop, derribo, levantarse, mareo, IA peleadora básica, objetos (bate y bote) | Juego | 1 contra 1 en un cuarto vacío que da ganas de jugar otra vez |
| **F2 Animaciones Nekketsu** | Cargar, lanzar, agarre, mareo, armas, datos `cajas`, `manos`, `cabeza`, filtro de 5 filas | PixelForja | Todas pasan la calidad en 32, 48 y 64. Rick levanta a Kenji y lo tira contra otros dos |
| **F3 Ciudad, tramo 1** | Bioma ciudad: calles y escuela, paralaje, luces, objetos de calle | PixelForja + Juego | Postal del tramo 1 a 640x360 que se vea mejor que el original |
| **F4 Rebanada vertical** | Tramo 1 del cross country con 8 atletas (2 equipos) + Kachinuki en azotea simple, HUD, banners, música base | Juego | 3 personas distintas juegan 10 minutos sin explicación y piden otra |
| **F5 Cross Country completo** | Tramos 2, 3 y 4, nado, trepar, equilibrio, bici, patineta, 3 personalidades de IA, 16 atletas | Ambos | Carrera de punta a punta, 10 simulaciones automáticas sin trabarse |
| **F6 Tama-wari y Obstáculos** | Pack trepar, poste, bola, carriles, obstáculos con ritmo | Ambos | Partidas de 60 a 120 s con remontadas |
| **F7 Natación** | Piscina, salida, brazada al ritmo, pelea en el agua, vueltas | Ambos | Se gana con ritmo, no machacando |
| **F8 Kachinuki completo** | Azotea de neón, objetos del cielo, borde que se cierra, IA que lee datos de cuadro, técnicas Nekketsu con corte anime | Juego | 4 contra 4 de 2 a 4 minutos en normal |
| **F9 Envoltorio** | Intro, título, demo, selección, VS, resultados con repetición, vestuario, podio, créditos, guardado | Juego | Una Olimpiada completa de principio a fin |
| **F10 Audio completo** | Todos los temas, efectos, música adaptativa, mezcla | PixelForja + Juego | Escuchado en tablet y audífonos, nada satura |
| **F11 Multijugador y Peques** | 4 mandos, teclado compartido, táctil, Modo Peques, accesibilidad | Juego | Sophie y Alana terminan una prueba solas |
| **F12 Pulido y lanzamiento** | Rendimiento, PWA, Desafíos, fantasmas, equipo secreto, "Métete al juego" | Juego | 60 fps estables, carga de menos de 4 s, instalable |
| **v1.5** | Salto entre Azoteas, Martillo Loco | Ambos | |
| **v2** | Dodgeball, Historia, en línea | Ambos | |

**Orden recomendado si quieres algo jugable rápido:** F0, F1, F2, F3, F4. Con eso ya tienes la rebanada vertical y sabes si el juego funciona.

---

## 17. Calidad y pruebas

### 17.1 En PixelForja
- Las pruebas de calidad actuales sobre cada animación nueva.
- Imágenes doradas de un cuadro clave por animación nueva.
- Prueba de que `cajas` y `manos` son coherentes con el sprite (la mano cae sobre pixeles opacos).
- Prueba de que cada escenario es recorrible de inicio a fin (ya existe algo igual para el Bosque GG).

### 17.2 En el juego
- **Vitest:** física, combate, puntos, IA. Con la simulación determinista: "esta partida con esta semilla y estas entradas termina con este resultado".
- **Simulaciones automáticas:** 100 carreras CPU contra CPU por prueba. Falla si alguien queda trabado más de 5 s o si una prueba dura más del doble de lo esperado.
- **Playwright:** una captura por escena en computadora y teléfono, comparada con su dorada.
- **Rendimiento:** prueba que mide los fps con 16 atletas y falla bajo 55.

### 17.3 Prueba humana
Al final de F4, F8 y F11: tú, Stephanie, Sophie y Alana juegan sin explicación. Anotamos dónde se traban y qué piden repetir. Eso pesa más que cualquier prueba automática.

---

## 18. Riesgos y cómo los bajamos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las animaciones de cargar y lanzar se ven raras en chibi | Alto, es el movimiento estrella | Prototiparlas primero en F2 con el editor de poses, ajustar antes de seguir |
| 16 atletas no llegan a 60 fps en tablet | Alto | Packs por prueba, atlas, público en 32 px, LOD de IA (los lejanos piensan cada 4 cuadros), modo de 8 atletas |
| El bioma ciudad toma más de lo pensado | Medio | Empezar con 1 tramo en F3. Las fachadas por parámetros rinden mucho más que dibujar a mano |
| El juego no es divertido | Crítico | La rebanada vertical de F4 existe para descubrirlo temprano |
| Alcance que crece | Alto | Lo que no está en v1 va a una lista aparte y no entra hasta terminar F12 |
| Audio sintetizado que suena pobre | Medio | Escucharlo en F4, no al final. Si no da, se cambia la receta en `sfx.ts` |
| Propiedad intelectual al publicar | Medio | Todo original desde el inicio, equipo fan apagado, revisar el título antes de publicar |

---

## 19. Decisiones que necesito de ti

1. **¿Cuál juego tienes en la cabeza?** El del cross country y la bola (1990), el de las vallas y la natación (*Crash 'n the Boys*), o la mezcla que propongo.
2. **¿Vista oblicua estilo Kunio?** Es mi recomendación fuerte. La otra opción es reusar la isométrica de la arena.
3. **¿Tramo bonus Saigón?** Le da sello propio. Suma unas dos semanas de arte.
4. **¿Tu familia en un juego de peleas, en tono caricatura?** Si prefieres, la Familia GG puede ser el equipo de "los buenos" que nunca pierde el KO, solo se marea.
5. **¿Es para uso personal o algún día lo publicas?** Cambia cuánto cuidado ponemos con el título y el equipo fan.
6. **¿Dispositivo principal?** Tablet, computadora con mandos o las dos. Define el orden de F11.

---

## 20. Prompts listos para cada fase

Copias y pegas en una sesión nueva de Claude Code sobre el repo indicado.

**F0 (juego):**
> En Nekketsu-Olympic-GG, arma la base del juego según docs/PLAN.md secciones 6.1 a 6.5: Phaser 3 + TypeScript + Vite, netlify.toml, PixelForja como submódulo en tools/pixel_forja, cargador del kit deportivo actual, proyección oblicua 640x360 con escala entera, y Rick caminando y corriendo sin patinar con `avance` y sonidos de paso en cada evento. Pruebas en Vitest de la proyección y el reproductor de animación.

**F1 (juego):**
> En Nekketsu-Olympic-GG, implementa el motor de pelea de docs/PLAN.md sección 7: estados, datos de cuadro sacados de `eventos` y `punto`, hitstop, derribo, levantarse con invulnerabilidad, mareo, bate y bote de basura, y una IA peleadora básica. Un cuarto de prueba 1 contra 1. Pruebas deterministas con semilla.

**F2 (PixelForja):**
> En pixel_forja, crea src/engine/anim/nekketsu.ts con los grupos Cargar, Ser cargado, Agarre, Estados y Armas de la sección 15.1 del plan de Nekketsu Olympic GG (te lo pego abajo). Exporta `cajas`, `manos` y `cabeza` por cuadro en export/motion.ts y agrega el filtro de filas. Todo debe pasar el control de calidad en 32, 48 y 64 y llevar imágenes doradas.

**F3 (PixelForja):**
> En pixel_forja, crea el bioma ciudad en src/engine/world/city/ según la sección 15.4 del plan: fachadas por parámetros, calle, escuela, cielo por hora y siluetas para paralaje. Sale como capas PNG más Tiled JSON con franja jugable, sólidos y entidades. Genera una postal 640x360 del tramo 1.

**F4 (juego):**
> En Nekketsu-Olympic-GG, arma la rebanada vertical de la fase F4 del plan: tramo 1 del cross country con 8 atletas de Familia GG e Instituto Nekketsu, y un Kachinuki simple en una azotea. HUD, banners, música base, resultados. Debe correr a 60 fps en tablet.

---

## Fuentes

- [Downtown Nekketsu Kōshinkyoku: Soreyuke Daiundōkai en Nintendo Life](https://www.nintendolife.com/games/nes/downtown_nekketsu_kshinkyoku_soreyuke_daiundkai)
- [Downtown Nekketsu March en Nintendo Wiki](https://nintendo.fandom.com/wiki/Downtown_Nekketsu_March:_Super-Awesome_Field_Day!)
- [Crash 'n' the Boys: Street Challenge en Wikipedia](https://en.wikipedia.org/wiki/Crash_%27n%27_the_Boys:_Street_Challenge)
- [Crash 'n the Boys en Giant Bomb](https://www.giantbomb.com/games/3030-8109/)
- PixelForja: README.md, docs/PLAN.md, docs/KIT_DEPORTES.md, docs/KIT_JUEGO.md y el código en src/engine
