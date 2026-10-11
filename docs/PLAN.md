# Nekketsu Olympic GG: plan maestro (v3)

Un remake espiritual de los juegos deportivos "Nekketsu" de Technos para NES/Famicom, los "Atari oyunu" que todo el mundo jugó en Turquía, Latinoamérica y Asia. PixelForja es el motor de personajes, mundo, efectos, interfaz y audio.

La meta no es copiar el juego pixel por pixel. Es que se sienta igual de caótico, chistoso y adictivo, pero con animación de verdad, un mundo vivo entre Vietnam, Colombia y Venezuela, más pruebas, tu familia adentro y controles que una niña de 4 años pueda usar.

El pedido completo a PixelForja está en [para_pixel_forja/PEDIDO.md](../para_pixel_forja/PEDIDO.md). Las sesiones de PixelForja leen sus instrucciones de esa carpeta.

---

## 0. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Juegos base | *Downtown Nekketsu Kōshinkyoku: Soreyuke Daiundōkai* (1990) y *Bikkuri Nekketsu Shin Kiroku* / *Crash 'n the Boys* (1992). Se cubren TODAS las pruebas de los dos |
| Pruebas extra | 7 más, sacadas de lo que PixelForja ya anima: fútbol, básquet, vóley playa, quemado, chapita, đá cầu y tejo |
| Vista | 2.5D oblicua estilo Kunio-kun |
| Escenarios | Vietnam, Colombia y Venezuela. Bonus "Cruce Loco" en Saigón, Bogotá y Caracas |
| Tus hijas | Juegan completas, con KO incluido. El tono sigue siendo caricatura: estrellas, polvo, pajaritos, nunca sangre. Sophie va en verde y Alana en rosado, con su look de pixel art actual |
| Familia GG | De Caracas, viviendo en Saigón. Juega de local en las dos etapas |
| Equipos | 6 principales: Familia GG, Dragones de Saigón, Rolos de Chapinero, Panas de Caracas, Maracuchos del Lago e Instituto Nekketsu. Más 2 secretos |
| Duración | La Gira Completa es el modo principal: las 16 pruebas, los 3 bonus y la final, de 90 a 120 minutos con guardado entre pruebas |
| Humor | Modismos de cada país, chistes y todo retro como el juego original. Sin groserías porque lo juegan las niñas |
| Uso | Personal. El equipo fan de superhéroes se puede activar en Opciones |
| Dispositivos | Tablet táctil y computadora con mandos, los dos desde la fase F0. Meta de rendimiento: una tablet de gama media (tipo iPad de 9a generación o Galaxy Tab A8) y mandos estándar por la Gamepad API (Xbox, PlayStation, 8BitDo) |
| PixelForja | Todo lo que se le pide es capacidad general del motor, no código atado a este juego. El juego le pasa su configuración |
| Motor del juego | Phaser 3 + TypeScript + Vite. PWA en Netlify. Mismo patrón que GG Abyss |
| Motor de arte | PixelForja genera todo. El juego solo lee el kit y su `manifest.json` |
| Regla de oro de los escenarios | La geometría la define el juego y PixelForja pinta encima. Una sola fuente de verdad (sección 6) |

---

## 1. Qué cubrimos del original

### 1.1 Downtown Nekketsu Kōshinkyoku (1990)
Cuatro escuelas rivales, hasta 4 jugadores, armas tiradas en el piso, cuatro pruebas:

| Prueba original | En nuestro juego |
|---|---|
| Cross country por la ciudad | **Cross Country Saigón**: la prueba estrella, 4 tramos |
| Carrera de obstáculos | **Obstáculos Comuna 13**: parkour en Medellín |
| Tama-wari: trepar y romper la bola | **Tama-wari Hội An**: entre faroles, de noche |
| Kachinuki kakutō: pelea final | **Kachinuki Caracas**: azotea con El Ávila de fondo |

### 1.2 Bikkuri Nekketsu Shin Kiroku / Crash 'n the Boys (1992)
Cinco pruebas olímpicas sin reglas:

| Prueba original | En nuestro juego |
|---|---|
| Vallas con golpes | **Vallas del Café**: pista rural en el Eje Cafetero |
| Lanzamiento de martillo | **Martillo Llanero**: en los Llanos, con chigüires que salen corriendo |
| Natación | **Natación Hạ Long**: en el mar, entre los islotes |
| Salto entre azoteas | **Azoteas de Cartagena**: techos coloniales al atardecer |
| Judo | **Judo y Vovinam Hà Nội**: dojo frente al lago Hoàn Kiếm |

### 1.3 Lo que mantenemos sí o sí del espíritu Nekketsu
- Escuelas rivales con capitán, burlas y rivalidad entre equipos.
- Todo vale: golpes en plena carrera, armas del piso, levantar al rival y tirárselo a otro.
- 4 jugadores a la vez.
- Puntos por prueba y un campeón general.
- El equipo japonés Instituto Nekketsu como campeón defensor y jefe final.
- La música de marcha escolar como identidad.
- Humor físico exagerado.

---

## 2. Las pruebas extra, sacadas del motor

PixelForja ya trae 33 animaciones de fútbol con portero, básquet, vóley, tenis y béisbol. Sería un desperdicio no usarlas. Cada prueba extra es también un guiño a otro juego de la saga Kunio-kun o al deporte de cada país.

| Prueba | País | Guiño | Lo que ya anima PixelForja |
|---|---|---|---|
| **Fútbol Callejero 4 contra 4** | Colombia, Barranquilla en Carnaval | *Nekketsu Kōkō Soccer-bu* / *Nintendo World Cup* | Las 33 de fútbol más el portero |
| **Básquet 3x3** | Venezuela, Maracaibo de noche con el relámpago del Catatumbo | *Kunio-kun no Nekketsu Street Basket* | `dribble`, `shoot`, `dunk`, `block` |
| **Vóley Playa 2 contra 2** | Venezuela, Isla de Margarita | Vóley de la saga | Las 7 de vóley |
| **Quemado Nekketsu** | Venezuela, liceo de Caracas | *Nekketsu Kōkō Dodgeball-bu*, el primer juego de la saga | `throw`, `catch`, `dodge`, `vb_dive` |
| **Chapita** | Venezuela, barrio de Caracas | Béisbol callejero con chapas, puro Caracas | `bat`, `pitch`, `catch` |
| **Đá cầu** | Vietnam, parque Tao Đàn en Saigón | El volante de patear de las calles de Vietnam | `volley`, `chilena`, `trap`, `header` |
| **Tejo** | Colombia, cancha en La Candelaria con Monserrate | El deporte nacional colombiano: el disco explota la mecha | `throw` más un lanzamiento por debajo nuevo |

**Total: 16 pruebas** más el bonus Cruce Loco en 3 versiones. Tenis queda como minijuego opcional para la v2.

Mi crítica: 16 pruebas son muchísimas. Por eso van en oleadas (sección 17) y una Olimpiada no las juega todas. Se arma una gira de 5 a 7 pruebas según el modo.

---

## 3. La Gira Nekketsu: estructura del juego

### 3.1 La historia en una línea
El Instituto Nekketsu, campeón invencible de Japón, sale de gira por primera vez y reta a los mejores de Vietnam, Colombia y Venezuela. La Familia GG, caraqueña viviendo en Saigón, se cuela en la gira.

### 3.1.1 Cuántos equipos juegan
- En cancha siempre hay **4 equipos**, como en el original. Así son 16 atletas y la tablet aguanta.
- Tu equipo más 3 rivales que cambian en cada gira, sacados de Dragones, Rolos, Panas, Maracuchos y la Familia GG si no la elegiste. Cada gira se siente distinta.
- El **Instituto Nekketsu** no compite en las pruebas: espera en la final. Si llegas primero a la final, el Kachinuki termina con un 4 contra 4 contra ellos.

### 3.2 Etapas
| Etapa | Pruebas | Bonus |
|---|---|---|
| **1. Vietnam** | Cross Country Saigón, Natación Hạ Long, Đá cầu, Tama-wari Hội An, Judo y Vovinam Hà Nội | Cruce Loco Saigón: motos, xích lô, sillas plásticas |
| **2. Colombia** | Obstáculos Comuna 13, Azoteas de Cartagena, Vallas del Café, Tejo, Fútbol Callejero | Cruce Loco Bogotá: TransMilenio, busetas, vendedores |
| **3. Venezuela** | Chapita, Vóley Playa Margarita, Martillo Llanero, Básquet Maracaibo, Quemado | Cruce Loco Caracas: autopista con camioneticas y motorizados |
| **Final** | Kachinuki en una azotea de Caracas con El Ávila y la Cruz iluminada | Instituto Nekketsu como jefe |
| **Secreto** | Barrio Nekketsu: la ciudad japonesa de los 80, homenaje directo al original | Se desbloquea al ganar la gira en difícil |

### 3.3 Modos de gira
- **Gira Completa (el modo principal):** las 16 pruebas, los 3 bonus Cruce Loco y la final. De 90 a 120 minutos. Se guarda después de cada prueba y se puede seguir otro día.
- **Gira Estándar:** 3 pruebas por país, 1 bonus y la final. Unos 60 minutos.
- **Gira Express:** 5 pruebas al azar más la final. Unos 25 minutos.
- **Gira Clásica:** solo las 4 pruebas de 1990 en el orden original. Para los nostálgicos.
- **Gira Crash:** solo las 5 pruebas de 1992.

---

## 4. Mi crítica actualizada

### 4.1 La vista oblicua queda confirmada
- Es la que da el feeling Kunio.
- La vista lateral es la más fuerte de PixelForja: saltos, garrocha, jabalina y natación están dibujados de lado.
- La izquierda es el espejo de la derecha. Solo necesitamos 5 filas de las 8 y la memoria baja un 37 %.

### 4.2 Los escenarios son el riesgo número uno
Pediste escenarios prolijos y perfectos, sin sorpresas al final. Estoy de acuerdo y es donde más proyectos se caen. Los fallos típicos son:
- La colisión no coincide con el dibujo.
- Costuras entre trozos de fondo.
- Paralaje que salta al repetirse.
- Objetos flotando sobre el piso.
- Atletas que no se leen contra un fondo muy cargado.

La solución está en la sección 6: la geometría vive en un solo archivo que diseña el juego, PixelForja pinta sobre esa geometría, y cada escenario pasa por 5 puertas de aprobación con pruebas automáticas. Nadie pinta un escenario que no se haya jugado antes en gris.

### 4.3 Tus hijas con KO
Perfecto. Al ser chibis todos tienen la misma proporción, así que Alana a los 4 años pega igual de chistoso que Rick. El KO es "volar, rebotar, quedar con estrellas y pajaritos". Nada que asuste.

### 4.4 Uso personal
- El equipo fan de superhéroes se puede activar en Opciones.
- La música sigue siendo original. No es por la ley: una marcha nueva que sea "tuya" le da más identidad al juego que un remix de la de 1990.

### 4.5 Tablet y computadora desde el día uno
La capa de entrada se construye en F0 con táctil, teclado y mandos. Si se deja para el final, la interfaz táctil se siente pegada con cinta.

---

## 5. Lo que lo hace mucho mejor que el original

1. **Golpes que se sienten.** Cada golpe trae su cuadro de impacto y el punto exacto del puño. Hitstop de 2 a 4 cuadros, temblor de cámara, chispa y sonido justo donde pega.
2. **Animación de verdad.** El original tenía 2 o 3 cuadros por acción. Aquí son 8 a 13 con poses clave y pies que no patinan a ninguna velocidad.
3. **Técnicas Nekketsu de 75 animaciones.** El torpedo humano es el clavado de natación en tierra. La chilena de fútbol es una patada aérea.
4. **Medidor Nekketsu.** Se llena al pegar, al recibir y al ir perdiendo. Lleno, activas tu técnica con corte de anime. El que va atrás siempre tiene chance.
5. **Tres países vivos.** Motos y lluvia de la tarde en Saigón, grafitis en Medellín, el relámpago del Catatumbo en Maracaibo, chigüires en el llano.
6. **Clima dinámico.** Aguacero tropical que moja el piso y hace resbalar, atardeceres, noches con neón.
7. **Comida local como energía.** Bánh mì, phở, arepa, bandeja paisa, cachapa, tequeños. La rivalidad de la arepa entre Colombia y Venezuela, incluida.
8. **Repetición instantánea** del mejor KO en cámara lenta, gracias a la simulación determinista.
9. **Tú adentro.** Tu personaje desde el estudio de PixelForja o una selfie.
10. **Modo Peques** y **4 jugadores reales**.

---

## 6. Escenarios sin sorpresas

### 6.1 Una sola fuente de verdad
```
Juego: data/stages/<id>.layout.json     ← geometría jugable: piso, huecos, plataformas, agua, muros
            │
            ▼
PixelForja: pinta capas sobre esa geometría y devuelve PNG + colisión verificada
            │
            ▼
Juego: carga el escenario. Si la colisión del kit no coincide con el layout, la prueba falla
```
El juego decide dónde hay un hueco, a qué altura está una azotea y dónde empieza el agua, porque eso es diseño de juego. PixelForja decide cómo se ve. Así es imposible que el dibujo diga una cosa y la colisión otra.

El formato del layout está en el pedido, sección 10.2.

### 6.2 Las 5 puertas de cada escenario
| Puerta | Qué se entrega | Quién aprueba |
|---|---|---|
| 1. Ficha de arte | Lugar, hora, paleta de 24 colores, lista de 8 a 12 elementos icónicos, 3 detalles de vida (cosas que se mueven) | Tú, en 5 minutos |
| 2. Gris jugable | El layout en el juego con cajas grises. Se juega y se ajusta | Tú y yo, jugando |
| 3. Postales | PixelForja entrega 3 capturas de 640x360 (inicio, medio y final) a la hora del día elegida | Tú |
| 4. Escenario completo | Todas las capas, objetos, luces y partículas en el juego | Pruebas automáticas |
| 5. Prueba en tablet | 60 fps, legible, sin costuras, jugado de punta a punta | Tú, en la tablet |

### 6.3 Pruebas automáticas de escenario
- **Costuras:** los trozos de fondo pegan sin una sola línea de diferencia.
- **Paralaje:** cada capa que se repite cierra el ciclo sin salto.
- **Piso:** ningún hueco transparente donde el layout dice "piso".
- **Apoyo:** todo objeto con apoyo cae sobre el piso o sobre una plataforma del layout.
- **Colisión:** la colisión que devuelve PixelForja es igual al layout, pixel por pixel en la franja jugable.
- **Camino:** desde la salida se llega a la meta caminando, saltando o nadando según las reglas de la prueba.
- **Legibilidad:** contraste mínimo entre el contorno de los atletas y el fondo de la franja jugable. Si un fondo es tan cargado que un atleta se pierde, falla.
- **Paleta:** el escenario no usa más colores que los de su ficha de arte.
- **Rendimiento:** número máximo de capas y de luces por pantalla.

### 6.4 Lista de escenarios
| Id | Lugar | Prueba | Hora | Elementos icónicos |
|---|---|---|---|---|
| `saigon_hem` | Callejones del Distrito 3 | Cross Country tramo 1 | Mañana | Cables enredados, motos paradas, sillas plásticas, puestos de bánh mì, altares de la tierra |
| `saigon_benthanh` | Mercado Bến Thành | Cross Country tramo 2 | Media mañana | Torre del reloj, toldos, frutas, vendedoras con nón lá |
| `saigon_rio` | Río Saigón | Cross Country tramo 3 | Mediodía | Ferry, jacintos de agua, bote de bambú, Landmark 81 al fondo |
| `saigon_azoteas` | Azoteas de Saigón | Cross Country tramo 4 | Tarde con aguacero | Cafés en azotea, tanques, ropa tendida, Bitexco al fondo |
| `saigon_estadio` | Estadio de la meta | Llegada del Cross Country | Atardecer | Gradas, marcador, fuegos artificiales |
| `halong` | Bahía de Hạ Long | Natación | Mañana | Islotes de piedra caliza, juncos de velas rojas, aldea flotante |
| `taodan` | Parque Tao Đàn | Đá cầu | Amanecer | Árboles enormes, abuelos haciendo ejercicio, jaulas de pájaros |
| `hoian` | Hội An | Tama-wari | Noche | Faroles de colores, río Thu Bồn, puente japonés, casas amarillas |
| `hanoi_dojo` | Dojo frente al Hoàn Kiếm | Judo y Vovinam | Tarde | Tatami, ventanales al lago, Torre de la Tortuga al fondo |
| `medellin_c13` | Comuna 13 | Obstáculos | Mañana | Escaleras eléctricas, grafitis, casas de ladrillo, metrocable al fondo |
| `cartagena` | Ciudad amurallada | Azoteas | Atardecer | Balcones con buganvillas, Torre del Reloj, mar Caribe |
| `cocora` | Eje Cafetero | Vallas | Mañana con neblina | Palmas de cera, cafetales, pista de tierra de escuela rural, Willys |
| `candelaria` | La Candelaria, Bogotá | Tejo | Tarde nublada | Cancha de tejo con mechas, casas coloniales, Monserrate |
| `barranquilla` | Calle de Barranquilla | Fútbol Callejero | Mediodía | Carnaval, Marimonda, música, arcos de piedra en la calle |
| `caracas_barrio` | Barrio de Caracas | Chapita | Tarde | Casitas en el cerro, El Ávila, escaleras, perros, cava con refrescos |
| `margarita` | Playa El Agua | Vóley Playa | Mediodía | Palmeras, toldos, mar turquesa, vendedores de empanadas |
| `llanos` | Llanos de Apure | Martillo | Atardecer | Sabana, chigüires, garzas, morichales, caney |
| `maracaibo` | Cancha frente al Lago | Básquet 3x3 | Noche | Puente Rafael Urdaneta iluminado, relámpago del Catatumbo, gaitas |
| `liceo` | Liceo caraqueño en el centro | Quemado | Mañana | Patio techado, murales patrios, cantina, pupitres, El Ávila asomado detrás del techo |
| `caracas_azotea` | Azotea en Parque Central | Kachinuki final | Noche | El Ávila con la Cruz iluminada, torres, neón, helicóptero |
| `cruce_saigon` | Avenida de Saigón | Bonus | Hora pico | Ríos de motos, xích lô, vendedores |
| `cruce_bogota` | Avenida de Bogotá | Bonus | Hora pico | TransMilenio, busetas, vendedores ambulantes, llovizna |
| `cruce_caracas` | Autopista de Caracas | Bonus | Hora pico | Camioneticas por puesto, motorizados, vendedores de tequeños |
| `nekketsu` | Barrio Nekketsu, Japón | Secreto | Atardecer | Escuela japonesa, expendedoras, río con muro, homenaje al original |

---

## 7. Dirección de arte

### 7.1 Resolución y escala
- Resolución interna **640 x 360**, escala entera a la pantalla. Nunca x1.5.
- Atletas en celda **48** (chibi de unos 44 px). Gigantes en **64**. Jefe secreto en **96**. Público en **32**.

### 7.2 Composición de la pantalla oblicua
```
y 0   ┌──────────────────────────────────────┐
      │ cielo y nubes (paralaje 0.1)         │
y 90  │ silueta lejana: Ávila, Landmark 81    │  paralaje 0.3
y 150 │ fachadas cercanas                     │  paralaje 0.7
y 200 ├──────────────────────────────────────┤  ← borde de atrás de la franja jugable
      │ PISO JUGABLE (franja de 130 px)       │  paralaje 1.0
y 330 ├──────────────────────────────────────┤  ← borde de adelante
y 360 │ primer plano: barandas, postes        │  paralaje 1.2, tapa un poco
      └──────────────────────────────────────┘
```

### 7.3 Paleta por país
| País | Carácter | Colores base |
|---|---|---|
| Vietnam | Húmedo, verde, rojo y amarillo de bandera, neón de noche | Verde tropical, rojo laca, amarillo Hội An, gris concreto mojado |
| Colombia | Colores vivos coloniales, montaña verde, grafiti | Amarillo, azul y rojo de bandera, buganvilla fucsia, verde café, ladrillo |
| Venezuela | Caribe luminoso, cerro verde del Ávila, atardecer naranja | Amarillo, azul y rojo con estrellas, turquesa de playa, naranja llanero |

### 7.4 Vida en cada escenario
Cada escenario tiene al menos 3 cosas que se mueven aunque nadie juegue: motos que pasan al fondo, ropa tendida con viento, faroles que se mecen, perros que se rascan, palomas que se espantan cuando alguien corre cerca, vendedores que pregonan.

---

## 8. Arquitectura técnica

### 8.1 Repos y flujo del kit
```
Nekketsu-Olympic-GG/            el juego (este repo)
  tools/pixel_forja/            PixelForja como submódulo (solo para regenerar)
  kit.config.json               qué le pide el juego a PixelForja
  fichas/                       personajes editados en el estudio (*.ficha.json)
  data/stages/*.layout.json     la geometría de cada escenario (la fuente de verdad)
  public/assets/kit/            el kit generado, SE COMMITEA
  src/                          el juego
```
- PixelForja gana un generador general de kits por configuración (`kit-a-medida`). El juego solo escribe su `kit.config.json` con atletas, packs, escenarios, efectos y audio.
- En el juego: `"kit": "tsx tools/pixel_forja/scripts/kit-a-medida.ts public/assets/kit --config kit.config.json"`.
- El kit se commitea. Netlify compila sin correr PixelForja.
- Es el patrón de `docs/KIT_JUEGO.md` de PixelForja para GG Abyss.

### 8.2 Stack
| Pieza | Elección | Por qué |
|---|---|---|
| Motor | Phaser 3.90 | Escenas, cargador, mandos, audio web, tweens, RetroFont, nineslice |
| Lenguaje | TypeScript estricto | Tipos del manifiesto compartidos con PixelForja |
| Build | Vite | Rápido, PWA fácil |
| Pruebas | Vitest y Playwright | Igual que PixelForja |
| Publicar | Netlify, PWA instalable | Íconos de app salen de PixelForja |
| Móvil nativo (después) | Capacitor | Envolver Phaser es trivial |

### 8.3 Estructura del código
```
src/
  main.ts  config.ts
  core/     kit.ts  anim.ts  input.ts  audio.ts  save.ts  rng.ts  i18n.ts  replay.ts
  sim/      world.ts  projection.ts  collision.ts  combat.ts  items.ts  ball.ts  weather.ts
  actors/   actor.ts  stats.ts  states/  brains/
  events/   crosscountry/ obstacles/ tamawari/ kachinuki/ hurdles/ hammer/ swim/ rooftop/ judo/
            soccer/ basket/ beachvolley/ dodgeball/ chapita/ dacau/ tejo/ cruce/
  scenes/   Boot Preload Intro Title Mode TourMap TeamSelect Lineup Versus Event Results Locker
            Podium Credits Options Replay
  ui/       hud.ts dialog.ts portrait.ts bars.ts menu.ts touch.ts banner.ts cutin.ts
  data/     teams.json events.json tour.json dialogs/*.json stages/*.layout.json
```

### 8.4 Simulación determinista
- Paso fijo de 60 Hz, el dibujo interpola.
- Todo lo aleatorio sale de `rng.ts` con semilla.
- Las entradas se guardan por paso.
- Salen gratis: repeticiones, fantasmas, pruebas de "esta partida termina igual siempre" y juego en línea con rollback algún día.

### 8.5 Proyección oblicua
```ts
// mundo: x a lo largo, y profundidad (0 = fondo de la franja), z altura
pantallaX = x - camX
pantallaY = bordeAtras + y - z
orden = y del pivote
sombra = elipse en (x, bordeAtras + y)
```
Fila de la hoja según la velocidad: horizontal `right` (con `flipX` a la izquierda), diagonal `up_right` o `down_right`, solo profundidad `up` o `down`. Las pruebas de campo siempre de lado.

Pies sin patinar: `anim.cuadro += (velocidad * dt) / avance * cuadros`.

### 8.6 Presupuesto de memoria
- Packs por prueba: cada prueba carga solo sus animaciones (unas 12).
- Con 16 atletas en pantalla: unos 90 MB de texturas. Con 20: unos 110 MB.
- Meta: menos de 120 MB por escena y carga de menos de 4 segundos.
- Por eso una Olimpiada tiene 4 equipos en cancha, aunque haya 6 disponibles.

---

## 9. El núcleo: moverse y pelear como Kunio

### 9.1 Controles
| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Moverse | Flechas o WASD | Palanca o cruceta | Palanca virtual |
| Correr | Doble toque | Doble toque o gatillo | Doble toque o botón |
| Puño | J | X / Cuadrado | A |
| Patada | K | A / Cruz | B |
| Saltar | L | B / Círculo | C |
| Agarrar, recoger, lanzar | Puño cerca de algo | Igual | Igual |
| Técnica Nekketsu | Puño + Patada con medidor lleno | Igual | Botón especial |

Combinaciones Kunio: correr + puño, correr + patada (voladora), salto + patada, puño junto a un caído para levantarlo y otra vez para lanzarlo, puño junto a un objeto para recogerlo, agarre por cercanía con rodillazo y proyección.

### 9.2 Estados
`idle`, `walk`, `run`, `jump`, `air_attack`, `attack`, `grab`, `grabbed`, `lift`, `carry`, `throw`, `carried`, `thrown`, `hitstun`, `knockdown`, `getup`, `dizzy`, `ko`, `climb`, `hang`, `balance`, `swim`, `ride`, `slip_wet`, `taunt`, `celebrate`.

### 9.3 Datos de cuadro sacados del kit
- Arranque: cuadros antes del `impacto`. Activo: el cuadro del impacto y el siguiente. Recuperación: el resto.
- Hitbox: círculo de 6 px en `punto`. Hurtbox: `cuerpo` del cuadro actual (sin implementos ni efectos).
- Levantar y lanzar: quien levanta trae `carga` por cuadro. El juego dibuja al rival (`carried`) o al objeto encima, con su base en la carga y una profundidad más que quien lo lleva. Al lanzar, sale desde la carga del cuadro de la `suelta`, con la física del juego. `thrown_spin` es una bolita sin arco: la parábola la pone el juego.
- Armas en la mano: el sprite no trae el arma. El juego dibuja `<id>_mano_<k>` del atlas de objetos en `arma[x, y]`, con `k = round(angulo / 22.5)`, y detrás del cuerpo si `detras = 1`. Así 19 armas caben en una sola hoja.
- Si una animación cambia en PixelForja, el balance cambia solo y de forma coherente.

### 9.4 Daño y reacciones
```
daño = base * (1 + ataque / 10) * (1 - defensa_rival / 25) * multiplicador_arma
hitstop = 2 cuadros (jab) a 4 cuadros (técnica)
```
- 3 golpes en 1 segundo: derribo. Arma o técnica: derribo directo con vuelo.
- Un solo golpe extra en el aire, así no hay combos infinitos.
- Aguante en 0: mareado 3 segundos. Otro golpe: KO.
- 40 cuadros de invulnerabilidad al levantarse.
- Piso mojado por aguacero: correr y frenar de golpe hace resbalar.

### 9.5 Objetos del piso
| Objeto | Dónde abunda | Golpe | Lanzado | Especial |
|---|---|---|---|---|
| Chancleta | Todos los países | 3 | 8 | Vuelve girando como boomerang. El arma secreta de toda mamá latina |
| Silla plástica | Vietnam | 8 | 10 | Se puede pararse encima para alcanzar algo |
| Nón lá | Vietnam | 2 | 6 | Se lanza como frisbee |
| Coco | Venezuela y Colombia | 6 | 12 | Rueda |
| Bate | Venezuela | 8 | 10 | Swing con `bat` |
| Tubo | Todos | 10 | 12 | Rebota |
| Llanta | Todos | 6 | 12 | Rueda y tumba a varios |
| Pote de basura | Todos | 12 | 16 | Se patea rodando |
| Cono de tránsito | Ciudades | 4 | 8 | Si cae en la cabeza, tapa la vista 2 s |
| Escoba | Todos | 7 | 9 | Largo alcance |
| Paraguas | Bogotá, de los Rolos | 7 | 8 | Abierto bloquea proyectiles |
| Abanico | Maracaibo, de los Maracuchos | 2 | 4 | No pega, empuja |
| Termo de tinto | Bogotá | 6 | 10 | Suelta una nube de vapor que marea 1 s |
| Bici y patineta | Cross Country | | | Más rápido, un golpe te tumba |

### 9.6 Técnicas Nekketsu
| Técnica | Animación base | Efecto |
|---|---|---|
| Puño Mach | `jab` en bucle a 2x | Ráfaga de 8 golpes |
| Patada Huracán | `whirlwind` + `kick_martial` | Barre alrededor |
| Torpedo Humano | `dive` en tierra | Cabezazo volador |
| Rodilla Voladora | `flying_kick` con más elevación | Cruza media pantalla |
| Uppercut del Dragón | `uppercut` con salto | Lanza hacia arriba |
| Barrida Infernal | `slide` | Tumba a la línea |
| Cabezazo Bomba | `header` | Rebota al rival contra el borde |
| Chilena Asesina | `chilena` | Patada aérea hacia atrás |
| Tackle Locomotora | `tackle` | Atraviesa a varios |
| Lluvia de Pelotas | `tennis_serve` repetido | Proyectiles |
| Chancletazo Supremo | `throw` | Lluvia de chancletas que vuelven |
| ¡Thor al Rescate! | Thor: `run`, `bite`, `bark` | Thor tumba al más cercano |

Las técnicas propias de cada atleta de la sección 10 (Tejo Explosivo, Ciclovía Infernal, Furrazo, Clavada Catatumbo, Abanicazo, Batazo de Jonrón y las demás) se arman igual: una animación que ya existe o que está en el pedido, más un efecto.

Al activar: congelado de 30 cuadros, líneas de velocidad, retrato con cara de enojo y nombre de la técnica.

### 9.7 Atributos
Puño, Patada, Arma, Lanzar, Agilidad, Defensa, Salto, Velocidad, Nado, Balón (nuevo, para las pruebas de pelota) y Aguante.

---

## 10. Equipos

Seis equipos principales y dos secretos. En cancha juegan 4 (sección 3.1.1). Cada uno con uniforme, tema musical, burla y forma de hablar propia.

### 10.1 Familia GG (De Caracas a Saigón, azul y dorado)
Cada uno lleva su look de pixel art actual con su color personal. El dorado del "GG" en el pecho y el número los une como equipo.

| Atleta | Color | Rol | Fuerte | Técnica |
|---|---|---|---|---|
| Rick | Azul | Capitán, potencia | Puño, Lanzar, Defensa | Puño Mach |
| Steph | El de su preset | Técnica y velocidad | Velocidad, Nado, Patada | Patada Huracán |
| Sophie | Verde | Acróbata | Salto, Agilidad, Balón | Chilena Asesina |
| Alana | Rosado | Pequeña e inesquivable | Agilidad, caja de daño chiquita | ¡Thor al Rescate! |

Thor corre por la pista animando, ladra en los récords y entra con la técnica de Alana. Hablan venezolano caraqueño con palabras en vietnamita que aprendieron en Saigón.

### 10.2 Rồng Sài Gòn, Dragones de Saigón (rojo y amarillo)
Los vecinos de la Familia GG en Saigón. Hablan un español "aprendido por correspondencia" mezclado con vietnamita, puro doblaje retro.

| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Minh | Capitán, vovinam | Cinta roja, `spiked` | Patada tijera de vovinam |
| Lan | Corredora | Coleta, uniforme escolar con pañoleta roja | Torpedo Humano |
| Tuấn | Đá cầu, pies mágicos | `messy1`, sandalias | Chilena Asesina |
| Bà Hoa | La abuela del barrio, pesada | `bob` gris, nón lá | Silla Plástica Voladora |

### 10.3 Rolos de Chapinero (Bogotá, amarillo y rojo)
Friolentos, elegantes, con paraguas siempre a mano porque en Bogotá llueve cuando le da la gana.

| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Andrés "El Doctor" | Capitán, tejista de brazo fino | `parted`, ruana, paraguas negro | Tejo Explosivo |
| Camila "Sumercé" | Ciclista de la ciclovía | `high_ponytail`, casco, chaqueta impermeable | Ciclovía Infernal (embestida en bici) |
| Pipe | Hincha futbolero | `messy2`, camiseta azul sin escudo | Cabezazo Bomba |
| Don Hernando | Gigante del tinto (celda 64) | Bigote, saco de paño, termo de tinto | Termo Volador (nube de vapor que marea) |

Arma propia: el **paraguas**. Golpea como bate y, abierto, bloquea proyectiles.

### 10.4 Los Panas de Caracas (amarillo, azul y rojo con estrellas)
Los vecinos de la Familia GG en Caracas. La rivalidad es de cuadra.

| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Gabo | Capitán, pelotero | Gorra de béisbol, `buzzcut` | Batazo de Jonrón |
| Yuli | Voleibolista | `curly_long`, uniforme de liceo | Remate Relámpago |
| Chamo Toto | El más pequeño, rápido | `afro`, franela suelta | Puño Mach |
| La Señora Carmen | La vecina, chancleta en mano | Rolos, bata de casa | Chancletazo Supremo |

### 10.5 Maracuchos del Lago (Maracaibo, azul, amarillo y negro)
El cuarto equipo nacional. Hablan con voseo maracucho, se quejan del calor y todo es "¡qué molleja!". Caracas contra Maracaibo es la rivalidad más vieja de Venezuela, y en el juego se nota.

| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Ender "El Primo" | Capitán gaitero | Bigote, guayabera, sombrero de pelo e' guama | Furrazo (onda de sonido de gaita que empuja a todos) |
| Yusmary | Basquetbolista | `curly_long` recogido, camiseta sin mangas | Clavada Catatumbo (con rayo) |
| Jhonder | Velocista | `shorthawk`, franela de rayas | Relámpago del Catatumbo (carrera con rayo) |
| Abuela Nerva | La abuela con abanico | `bob` gris, bata, abanico | Abanicazo (ráfaga que tumba) |

Arma propia: el **abanico**. Corto alcance, empuja en vez de pegar.

### 10.6 Instituto Nekketsu (gakuran negro, cinta roja): el jefe
| Atleta | Rol | Look | Técnica |
|---|---|---|---|
| Kenji "Toro" Sakamoto | Capitán delincuente | Pompadour `cowlick_tall`, gakuran abierto | Uppercut del Dragón |
| Ryu Takeda | Karateka | Cinta, `spiked` | Rodilla Voladora |
| Goro Iwata | Gigante (celda 64) | `buzzcut`, sin mangas | Tackle Locomotora |
| Tetsu Mori | Lanzador | `flat_top`, lentes oscuros | Doble Pote |

### 10.7 Equipos secretos
- **Los del Abismo:** goblin, trol, orco y el minotauro como jefe. Crossover con GG Abyss.
- **Equipo fan:** los seis superhéroes del kit deportivo. Para uso personal, en Opciones.

### 10.8 Métete al juego
Armas tu personaje en el estudio de PixelForja o desde una selfie, exportas la ficha, repartes 44 puntos de atributos y reemplazas a quien quieras.

---

## 11. Las 16 pruebas en detalle

Formato: reglas, mecánica, IA y criterio de terminado. Las animaciones nuevas de cada una están en el pedido a PixelForja.

### 11.1 Cross Country Saigón (estrella, fiel a 1990)
**Reglas.** Los 16 atletas corren por Saigón. Puntos por llegada. Vale todo.

**Tramos:**
1. **Callejones del Distrito 3.** Pistola de salida. Motos que salen de los hẻm, sillas plásticas, cables bajos que hay que agacharse para pasar, un perro que persigue.
2. **Mercado Bến Thành.** Pasillos estrechos entre puestos, frutas que se caen y hacen resbalar, la torre del reloj de fondo.
3. **Río Saigón.** Dos caminos: el ferry (largo, seguro) o nadar entre jacintos de agua (corto, arriesgado).
4. **Azoteas.** Saltos entre edificios, cafés con sillitas, y el aguacero de la tarde que moja todo y hace resbalar. Bajada por la escalera de incendio al estadio.

**Atajos.** Bici, patineta, una alcantarilla secreta del tramo 1 al 3.

**Cámara.** Sigue al jugador 1 o al punto medio de los humanos. Quien queda fuera de pantalla más de 2 s reaparece en el borde con 3 s de castigo.

**IA.** Corredor, peleador y tramposo. Rubber band suave del 5 %.

**Terminado cuando.** Se corre de punta a punta con 16 atletas a 60 fps en tablet y 10 simulaciones automáticas terminan sin que nadie se trabe.

### 11.2 Obstáculos Comuna 13 (fiel a 1990)
**Reglas.** Carrera de 4 por un recorrido vertical: subir la Comuna 13 desde abajo hasta el mirador.

**Obstáculos.** Escaleras eléctricas que van al revés, escalones, muros para trepar, techos de lata, vigas, tendederos, un perro dormido que despierta si lo pisas.

**Mecánica.** Saltar en el último paso antes del obstáculo da impulso. Puedes empujar o tumbar al de al lado.

**Terminado cuando.** Con un solo botón se termina, con buen ritmo se gana por mucho.

### 11.3 Tama-wari Hội An (fiel a 1990)
**Reglas.** Cada equipo tiene un poste con una bola gigante de papel arriba. Gana el primero en romper la bola rival.

**Mecánica.**
- Trepar machacando arriba, o manteniendo en Modo Peques.
- Arriba, `pole_punch` le quita vida a la bola, que se raja en 4 estados.
- Desde abajo, patear el poste lo sacude. Agarrar el pie del que trepa lo baja de un jalón.
- Al romperse: confeti, cartel colgante con el nombre del equipo, fanfarria y los faroles se encienden de golpe.

**Terminado cuando.** Las partidas duran entre 60 y 120 s y hay remontadas.

### 11.4 Kachinuki Caracas: la final (fiel a 1990)
**Reglas.** Todos contra todos por equipos en una azotea de Parque Central de noche. Un borde sin baranda: si te tiran, quedas fuera. Gana el último equipo en pie.

**Formato.**
- Cada 30 s cae un objeto del cielo con sombra de aviso.
- A los 90 s la azotea se achica.
- El Instituto Nekketsu entra como jefe si llegas invicto.

**Ambiente.** El Ávila con la Cruz iluminada, torres con ventanas encendidas, neón que parpadea, un helicóptero con reflector que sigue al líder, fuegos artificiales al final.

**IA.** Lee los datos de cuadro: bloquea golpes de arranque largo, castiga en la recuperación, busca el borde.

**Terminado cuando.** Un 4 contra 4 en normal dura de 2 a 4 minutos y la IA difícil te obliga a bloquear.

### 11.5 Vallas del Café (fiel a 1992)
**Reglas.** 4 carriles en profundidad, 400 m con vallas en una pista rural entre palmas de cera. Te puedes cambiar de carril y pegarle al de al lado.

**Mecánica.** Saltar justo en el último `paso` antes de la valla da impulso. Saltar tarde la tumba y frena. Un Willys cargado de café cruza la pista a mitad de carrera.

**Terminado cuando.** Se gana con ritmo y los golpes deciden carreras apretadas.

### 11.6 Martillo Llanero (fiel a 1992)
**Reglas.** Girar y soltar el martillo lo más lejos posible. 3 intentos.

**Mecánica.** `hammer_spin` acelera al ritmo de giros. `hammer_release` en el ángulo justo. Si sueltas mal, el martillo sale para cualquier lado: espanta garzas, cae en el morichal, casi le pega a un chigüire que sale corriendo.

**Terminado cuando.** Se entiende en 1 intento y se domina en 20.

### 11.7 Natación Hạ Long (fiel a 1992)
**Reglas.** 50 m ida y vuelta en mar abierto entre boyas. Se vale hundir al de al lado.

**Mecánica.**
- Salida desde un junco: barra de tiempo, salida en falso con castigo.
- Brazada al ritmo: apretar en el cuadro del `paso` de cada brazada da impulso. Ritmo, no machacar.
- Crol rápido pero cansa, pecho estable, mariposa fuerte pero difícil, espalda para ver a los rivales.
- `swim_punch` al de al lado. 3 golpes lo hunden 1 s.
- Vuelta en la boya con patada en el cuadro justo.

**Terminado cuando.** Se gana con ritmo y el mar se ve mejor que la piscina de la arena actual.

### 11.8 Azoteas de Cartagena (fiel a 1992)
**Reglas.** Carrerita, garrocha y salto al techo siguiente, cada uno más lejos. Por turnos, 3 intentos. El que cae aterriza en un balcón con flores, en un carrito de frutas o en una palenquera que lo regaña.

**Mecánica.** Velocidad por ritmo de pasos, momento de clavar la garrocha y ángulo. Viento visible con las banderitas.

### 11.9 Judo y Vovinam Hà Nội (fiel a 1992)
**Reglas.** Torneo 1 contra 1 en tatami. Ippon por proyección limpia o por sacar al rival 3 veces del tatami.

**Mecánica.** Agarre por cercanía, forcejeo con la palanca, proyecciones (`judo_throw`), contra-agarre en el cuadro justo, y la patada tijera de vovinam como técnica especial de los Dragones.

### 11.10 Fútbol Callejero Barranquilla (extra)
**Reglas.** 4 contra 4 en una calle en pleno Carnaval, arcos de piedra, sin faltas. Dos tiempos de 2 minutos.

**Mecánica.** Pase, tiro cargado, vaselina, cabezazo, chilena, barrida, entrada que tumba, portero que se lanza. Todo sale del pack de fútbol de PixelForja con su `impacto` en el contacto con el pie.

**Ambiente.** Comparsas pasando al fondo, una Marimonda que se mete a la cancha, tambores.

### 11.11 Básquet 3x3 Maracaibo (extra)
**Reglas.** 3 contra 3, media cancha, a 11 puntos. Los golpes valen.

**Mecánica.** Dribble, tiro con barra de tiempo, clavada con `elevacion`, tapón. Con el medidor lleno, clavada Nekketsu que rompe el tablero.

**Ambiente.** Noche, el puente iluminado, relámpagos del Catatumbo que iluminan la cancha de golpe, gaita sonando en un carro.

### 11.12 Vóley Playa Margarita (extra)
**Reglas.** 2 contra 2, a 11 puntos. La arena frena al correr.

**Mecánica.** Saque, recepción, colocación, remate, bloqueo y plancha. La IA ya sabe calcular dónde cae la pelota (la arena de PixelForja lo hace).

### 11.13 Quemado Nekketsu (extra, homenaje al primer juego)
**Reglas.** 4 contra 4 en el patio techado del liceo. El que es quemado pasa al "cementerio" detrás del rival y puede quemar desde ahí, como en el original.

**Mecánica.** Lanzar, atrapar en el cuadro justo, esquivar, tiro especial con el medidor lleno.

### 11.14 Chapita (extra, venezolano puro)
**Reglas.** Béisbol callejero con chapas de refresco y un palo de escoba. 3 innings cortos.

**Mecánica.** El lanzador elige chapa recta o chapa con efecto. El bateador tiene una barra de tiempo. Si la chapa pasa la casa del vecino es jonrón, y si rompe una ventana sale la Señora Carmen con la chancleta.

### 11.15 Đá cầu (extra, vietnamita puro)
**Reglas.** Mantener el volante en el aire en círculo, pasándolo con los pies. Versión duelo 2 contra 2 con red baja.

**Mecánica.** Ritmo: cada toque en el cuadro justo. Toques de lujo (`chilena`, de espuela) dan más puntos.

### 11.16 Tejo (extra, colombiano puro)
**Reglas.** Lanzar el tejo a la cancha de greda a 18 m y reventar las mechas.

**Mecánica.** Barra de fuerza y de ángulo, viento cero porque es techado. Mecha reventada: explosión con humo y punto. Si le pegas al tejo del rival lo mueves.

**Ambiente.** Cancha techada de madera, banderines, Monserrate por la ventana, gente animando.

### 11.17 Bonus: Cruce Loco
Tres versiones de un cruce estilo Frogger con golpes.
- **Saigón:** ríos de motos que no frenan, xích lô, vendedoras con varas al hombro.
- **Bogotá:** TransMilenio, busetas, llovizna que moja todo.
- **Caracas:** autopista con camioneticas por puesto, motorizados zigzagueando, vendedores de tequeños entre los carros.

Premio: monedas para el vestuario y una comida especial.

---

## 12. Intro, menús y flujo

### 12.1 Mapa de pantallas
```
Arranque → Toca para empezar → Intro → Título → Modo
  Gira → Equipo → Mapa de la gira → Alineación → [VS → Prueba → Resultados → Vestuario] x N → Final → Podio → Créditos
  Prueba libre / Versus / Desafíos / Opciones / Métete al juego / Récords
```

### 12.2 La intro, toma por toma (55 s, se salta)
| Tiempo | Imagen | Sonido |
|---|---|---|
| 0:00 | Negro. Texto a máquina: "JAPÓN. INSTITUTO NEKKETSU. 10 AÑOS INVICTO." | Campana de escuela |
| 0:04 | Kenji en la azotea de su escuela, de espaldas, con el gakuran al viento. Arruga un papel: "¿NADIE EN JAPÓN NOS AGUANTA? ENTONCES NOS VAMOS DE GIRA." | Viento |
| 0:10 | Mapa mundial en pixel art. Un avión vuela a Vietnam, Colombia y Venezuela con un sello en cada país | Arpegio que sube |
| 0:15 | Saigón al amanecer, motos, cables. Minh rompe una tabla en un patio: "¡MỘT, HAI, BA, DÔ!" Tarjeta del equipo | Acorde de los Dragones |
| 0:20 | Bogotá bajo la lluvia. Andrés abre el paraguas con elegancia, una buseta pasa y lo empapa igual: "¡AY, NO, QUÉ BOLETA!" Tarjeta | Acorde de los Rolos |
| 0:25 | Maracaibo, mediodía con calor que deforma el aire. Ender se abanica: "¿VOS SABÉIS LO QUE ES CALOR, PRIMO?" Tarjeta | Acorde de los Maracuchos |
| 0:30 | Caracas, El Ávila. Gabo batea una chapa que sale de la pantalla: "¡ÉPALE!" Tarjeta | Acorde de los Panas |
| 0:34 | La chapa cruza el mundo y cae en el café de la Familia GG desayunando en Saigón. Rick la agarra, Thor ladra, Sophie y Alana se miran: "¡NOS VAMOS DE GIRA!" Tarjeta | Acorde de la Familia |
| 0:41 | Los 6 capitanes en fila. Kenji le lanza un puñetazo a la cámara: impacto, temblor, la pantalla se raja | Golpe crítico |
| 0:44 | El logo "NEKKETSU OLYMPIC GG" cae sobre el vidrio roto con brillo | Arranca la Marcha Nekketsu |
| 0:48 | Estadio con el público ondeando banderas de los 3 países y de Japón, fuegos artificiales. "PRESIONA START" titilando | La marcha en bucle |

**Modo demo.** Si nadie toca nada en 20 s, la CPU juega 30 s de una prueba al azar. Como en las maquinitas.

### 12.3 Mapa de la gira
Mapa en pixel art con Vietnam, Colombia y Venezuela unidos por la ruta del avión. Cada prueba es una medalla en el mapa que se llena con el color de quien la ganó.

### 12.4 Presentación VS
Los 4 capitanes con cara de enojo, una burla corta entre dos rivales con modismos de cada país, y el nombre de la prueba cayendo. 5 s, se salta.

### 12.5 Resultados
Tabla de puestos y puntos, ganadores con `celebrate`, `win` o `dance`, perdedores con `sad` o `lose`, y la repetición del mejor momento en cámara lenta. Puntos: 1° 10, 2° 6, 3° 4, 4° 2, más 1 por KO en el Kachinuki.

### 12.6 Vestuario
Guiño a la tienda de River City Ransom. Monedas GG por puesto, KO y récords.
- **Comida del país donde estás:** bánh mì, phở, cà phê sữa đá, nước mía en Vietnam. Arepa, empanada, bandeja paisa, buñuelo, aguapanela en Colombia. Arepa, tequeños, cachapa, malta, papelón con limón en Venezuela. Recuperan aguante.
- **Equipo:** zapatillas, cinta, gorra de natación, guantes. Mejoras por una prueba.
- **Alineación:** quién compite en las pruebas individuales. Un atleta cansado rinde menos.

### 12.7 Podio y créditos
Podio en el estadio, himno del ganador, confeti, Thor corriendo alrededor. Créditos con los autores LPC sobre un desfile de todos los atletas.

---

### 12.8 Textos, humor y tono retro
Todo el texto se escribe como un juego de NES traducido en los 90: frases cortas, MAYÚSCULAS en los momentos grandes, un toque de "traducción rara" a propósito y mucho humor físico. Cero groserías.

**Pantallas del sistema, versión retro:**
| Original | En el juego |
|---|---|
| GAME OVER | SE ACABÓ LA VAINA |
| CONTINUE? | ¿OTRA PARTIDITA? 9... 8... 7... |
| PAUSE | ¡ÉPALE, PAUSA! |
| NEW RECORD | ¡RÉCORD, MI PANA! |
| KO | ¡CHAO, PESCAO! |
| YOU WIN | ¡GANASTE, CAMPEÓN! |
| Carga | "CALENTANDO LOS MÚSCULOS..." |

**Cómo habla cada equipo:**
| Equipo | Modismos | Ejemplo de burla | Ejemplo al perder |
|---|---|---|---|
| Familia GG | Caraqueño con vietnamita: "chamo", "burda", "fino", "chévere", "trời ơi" | "¡CHAMO, AGARRA ESA CHANCLETA!" | "¡TRỜI ƠI, QUÉ LADILLA!" |
| Dragones de Saigón | Vietnamita con español de doblaje: "trời ơi", "nhanh lên", "chết rồi", "dô" | "¡TÚ ERES LENTO COMO TRÁFICO DE LAS SEIS!" | "¡CHẾT RỒI! ME DERROTÓ UN TURISTA." |
| Rolos de Chapinero | "sumercé", "qué boleta", "qué jartera", "bacano", "ala", "¿sí o qué?" | "ALA, SUMERCÉ, CORRA QUE SE MOJA." | "QUÉ BOLETA... Y SIN TINTO." |
| Panas de Caracas | "épale", "pana", "qué ladilla", "burda de", "chévere", "¡ñooo!" | "¡ÉPALE! ¿ESO ES TODO, CHAMO?" | "¡ÑOOO, VALE! ME TUMBARON." |
| Maracuchos del Lago | Voseo maracucho, "primo", "¡qué molleja!", "mollejúo", "muérgano" | "¿VOS SABÉIS CON QUIÉN TE METISTE, PRIMO?" | "AH NO, PRIMO, ES QUE HACE MUCHO CALOR." |
| Instituto Nekketsu | Japonés retro de anime: "ikuzo", "nani", "omae" | "¡IKUZO! ESTA GIRA ES NUESTRA." | "¡¿NANI?! ESTO NO SALÍA EN EL MANUAL..." |

**Chistes que se repiten en todo el juego:**
- La rivalidad de la arepa: colombianos y venezolanos pelean en el vestuario sobre de quién es la arepa. En la tienda, la arepa de cada país tiene una descripción que provoca al otro.
- Los rolos siempre llevan paraguas, incluso en Margarita a pleno sol.
- Los maracuchos se quejan del calor en todos lados, incluso en la neblina del Eje Cafetero.
- La Señora Carmen aparece de la nada con la chancleta cuando alguien rompe algo.
- Bà Hoa y la Abuela Nerva se hacen amigas y se pasan la gira compartiendo comida.
- Thor se roba algo en cada escenario: un bánh mì, una arepa, un tequeño.
- Kenji nunca entiende los modismos y pide traducción.

**Locutor.** Comenta cada prueba con frases cortas tipo transmisión de los 80: "¡QUÉ GOLPE, SEÑORES!", "¡ESTO NO LO VE UNO TODOS LOS DÍAS!", "¡LA CHANCLETA HA HABLADO!".

Los textos viven en `src/data/dialogs/*.json`, en español e inglés, con un campo `voz` que define el tono de los blips.

## 13. Audio

### 13.1 Música original, sintetizada con PixelForja
| Tema | Dónde | Carácter |
|---|---|---|
| Marcha Nekketsu | Título, podio | Marcha de banda escolar a 132 bpm, trompeta en onda cuadrada |
| Tema del Instituto | Jefe final, intro | Rock japonés de los 80 en menor |
| Saigón Chạy | Etapa Vietnam | Pentatónica vietnamita, sonido tipo đàn tranh en triángulo, ritmo de ciudad |
| Hội An de Noche | Tama-wari | Tambores de festival, flauta |
| Parce, Corra | Etapa Colombia | Cumbia chiptune, guacharaca con ruido filtrado |
| Café y Neblina | Vallas | Bambuco acelerado |
| Ajiaco Rock | Rolos de Chapinero | Rock en español bogotano de los 90 en chiptune, con lluvia de fondo |
| Pana, Dale | Etapa Venezuela | Joropo chiptune con arpegio tipo cuatro y maracas |
| Gaita del Lago | Básquet Maracaibo y Maracuchos | Gaita zuliana con furro y tambora en chiptune |
| Azotea Final | Kachinuki | El tema más intenso, mezcla la marcha con los tres países |
| Vestuario | Entre pruebas | Tranquilo |
| Victoria y derrota | Resultados | Fanfarria y jingle triste |
| Acorde de equipo | Presentaciones | 4 compases por equipo |

Música adaptativa: en el final apretado sube el tempo un 10 % y entra percusión extra.

### 13.2 Efectos y ambientes
Pistola, silbato, golpes en 3 variantes, chancleta, silla plástica, chapuzón, brazada, bola que revienta, mecha de tejo que explota, chapa que sale volando, ventana rota, público que grita y hace "ooooh", megáfono, blips de voz por personaje, perro, moto con corneta, camionetica, gallo, chicharras, ranas del llano, aguacero, trueno del Catatumbo.

### 13.3 Mezcla
Música 60 %, efectos 100 %, público 40 % de fondo y 90 % en los picos. La música baja un 30 % en técnicas y diálogos. En tablet el audio arranca con el primer toque.

---

## 14. HUD e interfaz
- Arriba: retrato 40x40 de cada humano, nombre, aguante, medidor Nekketsu y puesto. Paneles 9-slice con el color del equipo.
- Carreras: minimapa lineal con las cabecitas.
- Pelota: marcador estilo transmisión de TV.
- Números de daño de la hoja de PixelForja.
- Diálogos con retrato que cambia de expresión y texto a máquina con blip.
- Banners: "¡LISTOS!", "¡YA!", "¡KO!", "¡RÉCORD!", "¡META!", "¡GOL!", "¡JONRÓN!".
- Táctil: palanca, 3 botones y el especial, semitransparentes, movibles y escalables.

---

## 15. Modos de juego
| Modo | Qué es | Jugadores |
|---|---|---|
| Gira | Completa, Express, Clásica o Crash | 1 a 4 en el mismo equipo |
| Prueba libre | Una prueba suelta | 1 a 4 |
| Versus | Cada jugador con su equipo | 2 a 4 |
| Desafíos | 3 medallas por prueba, fantasma de tu mejor marca | 1 |
| Historia (v2) | La gira con escenas entre pruebas | 1 a 4 |
| En línea (v3) | Versus con rollback | 2 a 4 |

## 16. Modo Peques y accesibilidad
- Correr automático, saltos asistidos, trepar manteniendo, IA suave, textos grandes. El KO sigue, pero se levantan más rápido.
- Opción global "mantener en vez de machacar".
- Remapeo, dificultad Fácil, Normal y Nekketsu, indicadores con forma además de color, interruptor de temblor y destellos.
- Español e inglés. Los personajes sueltan palabras en vietnamita y modismos de cada país.
- Las fuentes traen todos los acentos del vietnamita (ă, â, ê, ô, ơ, ư, đ y los 5 tonos), así "Rồng Sài Gòn" y "Đá cầu" se escriben bien. Hoy el motor no los tiene: está en el pedido.

---

## 17. Hoja de ruta

Cada fase termina con algo jugable en la tablet y en la computadora. Ninguna arranca sin que la anterior pase su criterio. La columna PixelForja dice qué lote del pedido tiene que estar listo antes.

| Fase | Qué se construye | Necesita de PixelForja | Criterio de terminado |
|---|---|---|---|
| **F0 Cimientos** | Phaser, Vite, TS, Netlify, submódulo, cargador, proyección oblicua, entrada táctil, teclado y mando, un atleta corriendo sin patinar | Ninguno, usa el kit deportivo actual | Rick corre a 60 fps en tablet y PC con pasos en el cuadro justo |
| **F1 Motor de pelea** | Estados, combate con datos de cuadro, hitstop, derribo, mareo, KO, objetos, IA peleadora | Lote A | 1 contra 1 que da ganas de jugar otra vez |
| **F2 Movimientos Kunio** | Levantar y lanzar, agarre, armas, chancleta | Lotes B1 y D1 | Rick levanta a Kenji y lo tira contra otros dos |
| **F3 Gris jugable** | Layouts en gris del tramo 1 del Cross Country y la azotea final | Ninguno | Se juegan los dos en gris y se siente bien |
| **F4 Primer escenario real** | Tramo 1 de Saigón pintado, con vida y luces | Lotes C1, G1 (fuentes), I y E1 | Pasa las 5 puertas |
| **F5 Rebanada vertical** | Tramo 1 con 8 atletas + Kachinuki simple + HUD + música base | Lotes F1, G1, H1 | 3 personas juegan 10 minutos sin explicación y piden otra |
| **F6 Cross Country completo** | Los 4 tramos, nado, trepar, bici, 16 atletas, IA de 3 personalidades | Lotes B2, C2, D2, E2 | 10 simulaciones sin trabarse |
| **F7 Resto de 1990** | Obstáculos, Tama-wari, Kachinuki completo | Lotes B3, E3 | La Gira Clásica se juega completa |
| **F8 Las de 1992** | Vallas, Martillo, Natación, Azoteas, Judo | Lotes B4, E4 | La Gira Crash se juega completa |
| **F9 Envoltorio** | Intro, título, demo, mapa de gira, VS, resultados con repetición, vestuario, podio, créditos, guardado | Lote G2, H2 | Una gira de principio a fin |
| **F10 Pelotas** | Fútbol, Básquet, Vóley Playa, Quemado | Lotes B5, E5 | Partidos completos con IA decente |
| **F11 Nacionales** | Chapita, Đá cầu, Tejo, Cruce Loco x3 | Lotes B6, E6 | Las 3 etapas completas |
| **F12 Pulido** | Rendimiento, PWA, Desafíos, fantasmas, secretos, Barrio Nekketsu, Modo Peques final | Lote I | 60 fps estables, carga de menos de 4 s, instalable |

**Para tener algo jugable rápido:** F0 a F5. Ahí ya sabes si el juego funciona.

---

## 18. Calidad
- **PixelForja:** las pruebas de calidad actuales sobre todo lo nuevo, imágenes doradas, coherencia de `cajas` y `manos`, pruebas de escenario de la sección 6.3.
- **Juego:** Vitest de física, combate, puntos e IA con semillas, 100 simulaciones CPU contra CPU por prueba, capturas de Playwright por escena en PC y teléfono, prueba de fps con 16 atletas que falla bajo 55.
- **Familia:** al final de F5, F9 y F12, ustedes cuatro juegan sin explicación y anotamos todo.

## 19. Riesgos
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Escenarios con detalles mal hechos | Alto, lo pediste explícito | Una sola fuente de verdad, 5 puertas, 9 pruebas automáticas |
| Levantar y lanzar se ve raro en chibi | Alto | Prototipo en el editor de poses en el lote B1, aprobación antes de seguir |
| 16 atletas no llegan a 60 fps | Alto | Packs por prueba, atlas, público en 32 px, IA lejana cada 4 cuadros |
| 24 escenarios es muchísimo arte | Alto | Fachadas y calles por parámetros, kits por país reutilizables, oleadas |
| El juego no es divertido | Crítico | La rebanada vertical de F5 lo responde temprano |
| Alcance que crece | Alto | Lo que no está en este plan va a una lista aparte |
| Audio sintetizado pobre | Medio | Se escucha en F5, no al final |

## 20. Lo que me falta saber
Nada que bloquee. Las decisiones están cerradas. Lo que queda se decide en las puertas de aprobación de cada lote y de cada escenario.

## Fuentes
- [Downtown Nekketsu Kōshinkyoku en Nintendo Life](https://www.nintendolife.com/games/nes/downtown_nekketsu_kshinkyoku_soreyuke_daiundkai)
- [Downtown Nekketsu March en Nintendo Wiki](https://nintendo.fandom.com/wiki/Downtown_Nekketsu_March:_Super-Awesome_Field_Day!)
- [Crash 'n' the Boys en Wikipedia](https://en.wikipedia.org/wiki/Crash_%27n%27_the_Boys:_Street_Challenge)
- [Crash 'n the Boys en Giant Bomb](https://www.giantbomb.com/games/3030-8109/)
- PixelForja: README.md, docs/PLAN.md, docs/KIT_DEPORTES.md, docs/KIT_JUEGO.md y el código en src/engine
