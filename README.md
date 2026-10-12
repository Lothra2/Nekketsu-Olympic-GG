# Nekketsu Olympic GG

Remake espiritual de los juegos deportivos Nekketsu de NES/Famicom, con escenarios entre Vietnam, Colombia y Venezuela y 6 equipos: Familia GG, Dragones de Saigón, Rolos de Chapinero, Panas de Caracas, Maracuchos del Lago e Instituto Nekketsu. Los personajes, las armas, los retratos, las fuentes y los sonidos salen de [PixelForja](https://github.com/Lothra2/pixel_forja).

## Qué se puede jugar hoy

- **Intro épica** de casi un minuto: "Familia GG presenta" con Thor, Kenji en la azotea de Japón con rayo y aura, el jet de la Nekketsu Air con el Instituto en las ventanillas, la ruta en un mapa del Pacífico en pixel art con pines y sellos de pasaporte, la Familia GG en Saigón, un montaje estilo anime de las pruebas (vallas, natación, jabalina y pelea, y los cuatro juntos con "¡A COMPETIR!"), los rivales en silueta en Bogotá, Maracaibo y Caracas, el VS, el puñetazo a la cámara y el logo con la Marcha Nekketsu.
- **Entrenamiento** para cada prueba y para la pelea: sin rivales ni reloj, un cartel dice qué hacer, espera a que lo hagas y los botones táctiles del paso laten en pantalla. Los carteles nombran el botón de lo que estés usando: J y K en teclado, A y B en la tablet, X y A en un control. Al final te ofrece jugar de verdad.
- **Olimpiada Express**: Familia GG contra el Instituto en 4 pruebas seguidas con medallero por equipos (10, 6, 4 y 2 puntos por puesto) y una final a pelea que vale 20. Termina con podio y fuegos artificiales.
- **Pruebas sueltas**:
  - *Vallas del Café* (Eje Cafetero): alterna puño y patada para correr, salta las vallas, codazo con ★. Si tocas una valla, se cae y te frena.
  - *Natación Hạ Long* (bahía de Hạ Long): sales con salto, si te tiras antes del ¡YA! te quedas un segundo. Alterna puño y patada para nadar, ★ es la patada de delfín.
  - *Jabalina Llanera* (Llanos de Apure): carrerita alternando botones, mantén salto para el ángulo y suelta para lanzar. Si pisas la raya es nulo. Dos intentos.
- **Pelea callejera** en una azotea de Caracas de noche, en 1 contra 1 o 4 contra 4: Familia GG contra el Instituto Nekketsu.
  - Golpes con combos, patadas, patada voladora corriendo, salto con patada.
  - Levantar al rival caído, caminar con él y lanzarlo contra los demás.
  - Armas del piso: chancleta (vuelve girando), tubo, silla plástica, pote, coco, paraguas, escoba. Caen más del cielo.
  - Barra Nekketsu y técnicas con corte de anime: Puño Mach (Rick), Patada Huracán (Steph), Chilena Asesina (Sophie), ¡Thor al Rescate! (Alana), Uppercut del Dragón (Kenji).
  - Cámara lenta en el KO final, victoria con fanfarria y "SE ACABÓ LA VAINA" si pierdes.
- Música original sintetizada en el momento: Marcha Nekketsu, tema de pelea, tensión de la intro y fanfarria.

## Controles

| | Teclado | Mando | Táctil |
|---|---|---|---|
| Mover | Flechas o WASD | Palanca o cruceta | Palanca |
| Correr | Doble toque o Shift | Doble toque o gatillo | Palanca hasta el borde |
| Puño (levantar, recoger, lanzar lo cargado) | J | X / Cuadrado | A |
| Patada (lanzar el arma) | K | A / Cruz | B |
| Salto | L o Espacio | B / Círculo | C |
| Técnica Nekketsu (barra llena) | U | Y o RB | ★ |
| Pausa | Enter | Start | ‖ |

## Correr el juego

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/, listo para Netlify
```

## Regenerar el kit de PixelForja

El kit ya viene en `public/assets/kit/` (se commitea a propósito). Para regenerarlo:

```bash
npm run kit:preparar   # submódulo tools/pixel_forja y sus dependencias
npm run kit            # escribe public/assets/kit
```

## Pruebas con capturas

Con el servidor corriendo:

```bash
node scripts/capturas.mjs http://localhost:5173/ capturas          # intro, título, selección y pelea
node scripts/prueba-pelea.mjs http://localhost:5173/ capturas rick kenji   # combo, levantar, lanzar, técnica, chancleta
node scripts/prueba-pruebas.mjs http://localhost:5173/ capturas/pruebas  # vallas, natación, jabalina y medallero
node scripts/prueba-entrenamiento.mjs http://localhost:5173/ capturas/entrenamiento  # completa los 4 entrenamientos
node scripts/prueba-teclas.mjs http://localhost:5173/   # cada tecla que nombra el juego hace lo que dice
node scripts/prueba-tactil.mjs http://localhost:5173/ capturas   # en tablet el cartel nombra A, B y C y tocándolos avanza
node scripts/tablet.mjs capturas                                   # tablet con controles táctiles
```

## Documentos

- [docs/PLAN.md](docs/PLAN.md): el plan maestro del juego.
- [para_pixel_forja/](para_pixel_forja/LEEME.md): todo lo que el juego necesita de PixelForja. Las sesiones de PixelForja leen sus instrucciones de aquí.
