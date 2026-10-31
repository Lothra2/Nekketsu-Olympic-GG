# Pedido: la cancha de tenis vista desde atrás (lote TENIS_V)

El tenis cambió de vista. Ya no es de lado: la cámara está detrás de tu equipo, como en el tenis del Switch Sports,
y la cancha se ve en profundidad. Hoy el juego la pinta por código (cielo, pinos, grada, arcilla y red). Este lote es
el arte de PixelForja para reemplazar ese dibujo. El juego lo toma con `hayUi` y el camino de código queda de respaldo.

## Cómo proyecta el juego

- Cancha de dobles: 200 de ancho (x de -100 a 100) y 400 de largo (d de 0, tu fondo, a 400, el de ellos). Red en d 200.
- Escala por profundidad: `s(d) = 480 / (480 + d)`. Tu fondo a escala 1, el de ellos a 0,545.
- Pantalla (lienzo de 640 x 360, el cuadro de 640 centrado; en celulares anchos se ven hasta 80 px más a cada lado):
  - `x_pantalla = 320 + x * s * 1.35`
  - `y_pantalla = -135.6 + 457.6 * s`  (tu línea de fondo en la fila 322, la de ellos en la 114)
- Con eso, las esquinas de la cancha de dobles caen en: tu fondo x 185 a 455 (fila 322); el de ellos x 246 a 394
  (fila 114). La red (d 200, con los palos 8 afuera de la cancha) va de x 217 a 423 en la fila 187, y mide 17 px de
  alto en pantalla (24 en el mundo por la escala 0,706).
- Los jugadores son los atletas del kit con sus filas `up` (los nuestros, de espaldas) y `down` (ellos, de frente),
  escalados con `s(d)`. Eso ya funciona con el pack de tenis actual.

## Lo que pedimos

1. **`ui/tenis_fondo.png` (800 x 360)**: el paisaje y la cancha en esa perspectiva exacta, en el estilo de Đà Lạt
   (pinos, niebla de la mañana, el lago Xuân Hương de fondo, la grada con público, la silla del juez a la derecha de la
   red, la arcilla roja con sus líneas blancas). Sin la red. El cuadro de 640 centrado (x 80 a 720 del png).
2. **`ui/tenis_red.png`**: la red sola, con sus dos palos, para dibujarla encima de los jugadores de atrás y debajo de
   los de adelante. Que mida lo que dice la proyección (de x 217 a 423 en el cuadro de 640, 17 px de alto más los palos).
3. **En el manifiesto**, en `ui.interfaz`: `tenis_fondo` con `cancha` (las cuatro esquinas en el png de 800, para que el
   juego sepa que calza) y `tenis_red` con `fila: 187`.
4. Opcional: `ui/tenis_publico.png` animado (2 cuadros) para la grada, y los sellos de las líneas de saque si quieren
   que se vean con textura de arcilla.

## Lo que no cambia

- Nada del pack de tenis de los atletas ni de la pelota.
- El escenario `dalat` de lado se queda para el que quiera volver a usarlo.

## Nota del juego

Si alguna medida no calza al integrar, el juego no la corrige: queda anotado aquí con la coordenada exacta.

**Hecho (lote TENIS_V, PixelForja `src/engine/ui/tenis.ts`):** `tenis_fondo` y `tenis_red` salen de la parte `tenis`
de `ui.interfaz`, los dos de 800 x 360, con `extra.cancha = [[265, 322], [535, 322], [474, 114], [326, 114]]` (en el
png de 800: restar 80 para el cuadro de 640), `extra.red = { fila: 187, x0: 297, x1: 503, alto: 17 }` y
`extra.proyeccion`. La primera versión de este pedido decía fila 211 y x 174 a 466 para la red: era un error de
cuenta, la red a d 200 cae en la 187. El juego la dibuja en `fila` como profundidad, igual que antes la de código.
