# Nekketsu Olympic GG

Remake espiritual de los juegos deportivos Nekketsu de NES/Famicom, con escenarios entre Vietnam, Colombia y Venezuela y 6 equipos: Familia GG, Dragones de Saigón, Rolos de Chapinero, Panas de Caracas, Maracuchos del Lago e Instituto Nekketsu. Los personajes, las armas, los retratos, las fuentes y los sonidos salen de [PixelForja](https://github.com/Lothra2/pixel_forja).

## Qué se puede jugar hoy

- **Intro épica** de casi un minuto: "Familia GG presenta" con Thor, Kenji en la azotea de Japón con rayo y aura, el jet de la Nekketsu Air con el Instituto en las ventanillas, la ruta en un mapa del Pacífico en pixel art con pines y sellos de pasaporte, la Familia GG en Saigón, un montaje estilo anime de las pruebas (vallas, natación, jabalina y pelea, y los cuatro juntos con "¡A COMPETIR!"), los rivales en silueta en Bogotá, Maracaibo y Caracas, el VS, el puñetazo a la cámara y el logo con la Marcha Nekketsu.
- **Entrenamiento** para cada prueba y para la pelea: sin rivales ni reloj, un cartel dice qué hacer, espera a que lo hagas y los botones táctiles del paso laten en pantalla. Los carteles nombran el botón de lo que estés usando: J y K en teclado, A y B en la tablet, X y A en un control. Al final te ofrece jugar de verdad.
- **Niveles** en el menú (se recuerdan): PASEO (la máquina va suave, tu equipo aguanta el doble y pega más, en jabalina no hay nulo y en natación no hay salida en falso), NORMAL (un poco de ventaja) y NEKKETSU (sin ayuda). En PASEO y NORMAL hay una "goma" invisible: si vas muy atrás la máquina afloja, y si vas muy adelante aprieta un poco. Los números están todos en `src/core/nivel.ts`.
- **Olimpiada Express**: Familia GG contra el Instituto en 4 pruebas seguidas con medallero por equipos (10, 6, 4 y 2 puntos por puesto) y una final a pelea que vale 20. Termina con podio y fuegos artificiales.
- **Pruebas sueltas**:
  - *Cross Country Saigón*: la prueba estrella del original, en cinco tramos seguidos con el tiempo sumado.
    1. El hẻm: canales, muros, la calle inundada y las motos. Ya tiene el arte de PixelForja.
    2. El mercado Bến Thành: pasillos angostos entre puestos. Si caes encima de un puesto de frutas, se riegan y el que viene atrás se resbala.
    3. El río Saigón: el ferry, que es seguro pero hay que esperarlo, o nadar directo entre jacintos que te enredan.
    4. Las azoteas bajo el aguacero: saltos entre edificios, charcos y techos de zinc que resbalan, y una viga para cruzar el hueco ancho.
    5. La recta final en el estadio, con vallas.

    Los tramos 2 a 5 van en gris hasta que llegue su arte (lote E2). Con los rivales, a los golpes, como en el original. En Pruebas sueltas también se puede correr un tramo solo, para una partida corta.
  - *Obstáculos Comuna 13*: la carrera de obstáculos del original, subiendo la Comuna 13 de Medellín desde la calle hasta el mirador.
    - Escaleras eléctricas que van al revés, o los escalones empinados del lado.
    - Muros, una viga sobre un hueco y tendederos.
    - Perros dormidos que se despiertan si los pisas.
    - Saltar justo antes de un obstáculo da impulso.
    - Va en gris hasta el lote E3.
  - *Vallas del Café* (Eje Cafetero): alterna puño y patada para correr, salta las vallas, codazo con ★. Si tocas una valla, se cae y te frena.
  - *Natación Hạ Long* (bahía de Hạ Long): sales con salto, si te tiras antes del ¡YA! te quedas un segundo. Alterna puño y patada para nadar, ★ es la patada de delfín.
  - *Jabalina Llanera* (Llanos de Apure): carrerita alternando botones, mantén salto para el ángulo y suelta para lanzar. Si pisas la raya es nulo. Dos intentos.
- **Kachinuki Caracas**, la pelea final en una azotea de Parque Central de noche, en 1 contra 1 o 4 contra 4: Familia GG contra el Instituto Nekketsu.
  - Un borde sin baranda: caminando no te sales, pero si te tumban o te lanzan por ahí, quedas fuera.
  - Cada 30 s cae algo pesado del cielo. Antes aparece su sombra con un aro rojo.
  - A los 1:30 la azotea se achica: el borde avanza hasta la mitad.
  - Thor te salva si te caes: siempre en Paseo, una vez en Normal y nunca en Nekketsu.
  - Combo de jab, jab y gancho, patadas, patada voladora saltando corriendo, salto con patada.
  - Agarre: pégate a un rival recién golpeado o mareado y lo agarras. Puño son rodillazos (el tercero lo tumba), patada lo bota. El agarrado forcejea y se suelta machacando botones.
  - Guardia: mantén ★ sin la barra llena y te cubres de lo que viene de frente. Tres golpes seguidos o uno muy pesado la rompen.
  - Pisotón: patada al que está en el piso.
  - Onomatopeyas de cómic (¡POW!, ¡PAF!), contador de golpes seguidos y burlas del Instituto cuando te tumba: si le pegas mientras se ríe, se lo merece.
  - Una arepa cae cada tanto: quien la pisa recupera vida. La máquina va por ella cuando está mal.
  - Pantalla VS con lo que se dicen antes de pelear, y un K.O. grande al final.
  - Levantar al rival caído, caminar con él y lanzarlo contra los demás.
  - Armas del piso: chancleta (vuelve girando), tubo, silla plástica, pote, coco, paraguas, escoba. Caen más del cielo.
  - Barra Nekketsu y técnicas con corte de anime: Puño Mach (Rick), Patada Huracán (Steph), Chilena Asesina (Sophie), ¡Thor al Rescate! (Alana), Uppercut del Dragón (Kenji).
  - Cámara lenta en el K.O. final, victoria con fanfarria y "SE ACABÓ LA VAINA" si pierdes.
- Música original sintetizada en el momento: Marcha Nekketsu, tema de pelea, tensión de la intro y fanfarria.

## Controles

| | Teclado | Mando | Táctil |
|---|---|---|---|
| Mover | Flechas o WASD | Palanca o cruceta | Palanca |
| Correr | Doble toque o Shift | Doble toque o gatillo | Palanca hasta el borde |
| Puño (levantar, recoger, lanzar lo cargado) | J | X / Cuadrado | A |
| Patada (lanzar el arma) | K | A / Cruz | B |
| Salto | L o Espacio | B / Círculo | C |
| Técnica Nekketsu (barra llena) / guardia (mantenida, sin barra) | U | Y o RB | ★ |
| Pausa | Enter | Start | ‖ |

## Correr el juego

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/, listo para Netlify
```

## Regenerar el kit de PixelForja

El kit ya viene en `public/assets/kit/` (se commitea a propósito). Lo describe `kit.config.json` (el kit a medida de PixelForja): los packs de animaciones del juego, las fichas en `data/fichas/` (con la ropa de pista y el traje de baño), los equipos en `data/equipos.json`, las armas, Thor, las fuentes con vietnamita, los 56 efectos y los sonidos. Para regenerarlo:

```bash
git submodule update --init && (cd tools/pixel_forja && npm install)   # la primera vez
npm run kit            # escribe public/assets/kit
npm run escenarios     # regenera el arte de los escenarios que ya lo tienen (index.json)
npm run escenarios -- saigon_rio   # suma uno nuevo, cuando Rick aprobó su ficha y sus postales
npm run escenarios -- --validar    # valida todos los layouts de data/stages con las 9 pruebas, sin escribir nada
```

Lo que PixelForja todavía no trae (por ejemplo `silbato` y `marcha_nekketsu`, del lote H) queda en `manifest.pendiente` y aparece solo al regenerar cuando llegue.

## Pruebas con capturas

Con el servidor corriendo:

```bash
node scripts/capturas.mjs http://localhost:5173/ capturas          # intro, título, selección y pelea
node scripts/prueba-pelea.mjs http://localhost:5173/ capturas rick kenji   # combo, levantar, lanzar, técnica, chancleta
node scripts/prueba-pelea-nueva.mjs http://localhost:5173/ capturas/pelea_nueva   # VS, guardia, agarre, rodillazos, pisotón, voladora, arepa, burla y racha
node scripts/prueba-borde.mjs http://localhost:5173/   # pegada al borde de arriba o de abajo, los muros y los huecos siguen valiendo
node scripts/prueba-kachinuki.mjs http://localhost:5173/ capturas/kachinuki   # el borde, el rescate de Thor, lo que cae del cielo y la azotea que se achica
node scripts/prueba-pruebas.mjs http://localhost:5173/ capturas/pruebas  # vallas, natación, jabalina y medallero
node scripts/prueba-entrenamiento.mjs http://localhost:5173/ capturas/entrenamiento  # completa los 4 entrenamientos
node scripts/prueba-cross.mjs http://localhost:5173/ capturas/cross     # los cinco tramos con piloto automático, de punta a punta
node scripts/prueba-cross.mjs http://localhost:5173/ capturas/cross 3   # solo un tramo (1 a 5)
node scripts/prueba-teclas.mjs http://localhost:5173/   # cada tecla que nombra el juego hace lo que dice
node scripts/prueba-tactil.mjs http://localhost:5173/ capturas   # en tablet el cartel nombra A, B y C y tocándolos avanza
node scripts/tablet.mjs capturas                                   # tablet con controles táctiles
```

## Documentos

- [docs/PLAN.md](docs/PLAN.md): el plan maestro del juego.
- [para_pixel_forja/](para_pixel_forja/LEEME.md): todo lo que el juego necesita de PixelForja. Las sesiones de PixelForja leen sus instrucciones de aquí.
