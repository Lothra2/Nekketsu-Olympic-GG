# Conceptos de los mundos

Arte conceptual de cada escenario, generado con Higgsfield para fijar la identidad de cada lugar. **Es una referencia de ambiente, no un plano.** Rick lo pidió para que los mundos suban de nivel: "detalles, assets, mundos, esfuérzate muchísimo más".

## Cómo usarlo

- **Del concepto se toma:** la paleta, qué elementos hacen reconocible el lugar, cómo se reparten en capas (cielo, lejos, cerca, frente), la densidad de detalle y el ambiente (la hora, la luz y el clima).
- **Del concepto NO se toma:**
  - **La perspectiva.** Esa la manda la proyección del punto 1 de `NOCHE.md` (`px = x + 0.35 * y`, lo del fondo a la izquierda) y las capturas de `../gris_inclinado/`. El concepto pone la cámara donde le parece.
  - **La geometría del juego.** Escalones, cajas, huecos y alturas son los del layout de `data/stages/`, no los del dibujo.
  - **Los textos tal cual.** Una IA escribe letreros con errores, sobre todo en vietnamita. Los letreros se escriben bien, con las fuentes del kit.
  - **El acabado borroso o pintado.** El arte final es pixel art de verdad, con la paleta limitada del estilo de cada país.
- **La vara:** quien conozca el lugar tiene que reconocerlo en la postal sin leer el nombre. Si la postal de PixelForja queda por debajo de su concepto en identidad y en detalle, no está lista.

## Traducir, no copiar: el estilo del juego manda

Los conceptos vienen pintados, con mucho detalle y mucha saturación. Si se copian, matan el estilo que ya tiene el juego y los atletas se pierden en el fondo. PixelForja los **traduce** a su propio pixel art, el mismo de `saigon_hem` (E1) y de los sprites del kit:

1. **La misma escala de pixel que los sprites.** Un pixel del escenario es un pixel del juego a 640x360, igual que en un atleta. Nada de detalle más fino que el de un sprite: si un farol o una ventana no se lee con los pixeles de una cabeza de atleta, se simplifica.
2. **La paleta del estilo de cada país,** limitada como hoy (`vietnam_*`, `colombia_ladrillo`, `venezuela_ciudad`). El concepto dice qué colores tiene el lugar. El estilo dice cuántos y cuáles exactamente.
3. **Los contornos y el sombreado del kit.** El contorno `#1e1418` en lo que va en el plano de juego, sombreado por bandas sin degradados ni pinceladas, y la luz de la izquierda.
4. **Jerarquía de valor: los atletas mandan.**
   - El fondo lejano va más apagado y con menos contraste.
   - El plano de juego va claro y limpio.
   - Lo más saturado y contrastado de la pantalla son los atletas.
   - Los murales de la Comuna 13 y los faroles de Hội An pueden ser intensos, pero en las capas de atrás y nunca detrás de la franja donde se pelea con el mismo valor que la ropa de los atletas.
   - La prueba de legibilidad tiene que seguir en verde.
5. **Menos objetos, mejor elegidos.** De cada concepto salen los 4 o 5 elementos que hacen reconocible el lugar, bien dibujados. Lo demás se resume. Mejor un mural enorme y claro que diez chiquitos que se vuelven ruido.
6. **La prueba final:** una captura del juego con atletas encima del escenario nuevo, al lado de una de `saigon_hem`. Tienen que verse del mismo juego.

## Mundo por mundo

### `medellin_c13`, Comuna 13 (tres conceptos, uno por tramo)

- **`c13_calle_grafitis.jpg`, la estación San Javier y la subida de los grafitis.**
  - Se toma: la entrada del metro, el carrito de paletas de mango biche, el mural largo con cara, ojo, colibrí y mariposa, las casas de ladrillo apiladas con matas y banderines, y el metrocable sobre el valle.
  - El mural con "COMUNA 13" puede ir en la subida, además del letrero del mirador.
- **`c13_escaleras.jpg`, las escaleras eléctricas.**
  - Se toma: los tramos con techo naranja sobre estructura gris y vidrio, y la escalera de al lado con cada contrahuella de un color (es la imagen más reconocible del barrio).
  - Se toman también: los murales gigantes a los lados, los tanques negros y las varillas en los techos.
  - **En el juego, la escalera sube de izquierda a derecha.** Con la proyección se ven las contrahuellas, que es justo donde va el color.
- **`c13_mirador.jpg`, los techos de zinc y el mirador.**
  - Se toma: los techos de zinc con antenas y aires, la escalera de colores que sube al mirador, el letrero grande "COMUNA 13" de letras de colores, la bandera de Colombia y la vista abierta del valle con el metrocable.

### `hoian.jpg`, Hội An de noche

- **El mejor de todos.** Se toma casi entero:
  - las casas amarillas con tejas y madera oscura
  - los faroles en racimos y en cuerdas sobre la calle
  - los puestos de faroles
  - el río con velitas y botes
  - el puente japonés iluminado al fondo
- **Los dos postes del Tama-wari:** bambú con base de trípode, una bola azul con dragón y otra roja, y cintas de colores colgando. Los colores de cada bola son los del equipo que la defiende.

### `caracas_azotea.jpg`, la azotea del Kachinuki

- **Se toma:**
  - los neones "AREPERA LA CHAMA" (rosado) y "CARACAS" (turquesa) sobre la caseta
  - los tanques y antenas
  - el borde sin baranda con la franja amarilla y negra
  - las torres de Parque Central
  - el Ávila con la Cruz encendida
  - los cerros llenos de lucecitas
  - el helicóptero con reflector
  - el piso mojado que refleja el neón
- **Se ignora:** el letrero chiquito de "Venezuela" en la pared del fondo.
- **El borde va a la derecha,** como en el layout.

### Saigón (los cinco tramos del Cross)

- **`saigon_hem.jpg`, el hẻm.**
  - Se toma: las casas tubo con santa rita (bougainvillea), los cables enredados, las cortinas metálicas, el carrito de bánh mì, el puesto de phở con sus taburetes, el canalito con su puentecito y el piso mojado.
  - **Es lo que le falta al `saigon_hem` de E1:** más color y más vida en las fachadas.
- **`saigon_benthanh.jpg`, el mercado Bến Thành.**
  - Se toma: la fachada con la torre del reloj y las tres puertas, y los puestos de frutas, ropa, flores, sombreros cónicos y comida, con toldos de rayas.
  - Los puestos quedan a media altura, como pidió la puerta 1 de E2.
- **`saigon_rio.jpg`, el río.**
  - Se toma: el malecón con el xích lô, los muelles de madera, el ferry cruzando, los jacintos, los botes redondos (thúng chai), las palmas y la torre Bitexco al fondo con la luz dorada de la tarde.
- **`saigon_azoteas.jpg`, las azoteas bajo el aguacero.**
  - Se toma: los techos a distintas alturas con los huecos entre edificios, los tanques, la ropa tendida, los aires, la lluvia en diagonal y los neones de la ciudad en la neblina.
  - **El juego pide la viga cruzando el hueco ancho.** En el concepto casi no se lee, así que tiene que leerse clarito.
- **`saigon_estadio.jpg`, la recta final en el estadio Thống Nhất.**
  - Se toma: la pista roja con las vallas, la tribuna llena con banderas de Vietnam, las torres de luz, el marcador, el atardecer y la Bitexco.
  - **El letrero de la meta dice "FINISH" y no va.** Va "VỀ ĐÍCH" o "META", con la fuente del kit.
