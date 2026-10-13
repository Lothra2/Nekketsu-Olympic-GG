# Verificación: cancha_maracaibo

Las 9 pruebas pasan.

| # | Prueba | Resultado | Qué se midió |
|---|---|---|---|
| 1 | Costuras | pasa | 3 trozos de 1280 px revisados en sus bordes: 0 pixeles distintos |
| 2 | Paralaje | pasa | cielo: la vuelta cambia 77 filas (un paso normal, hasta 79). Lejos: 37 (hasta 51) |
| 3 | Piso | pasa | 640 x 104 px de franja: 0 transparentes |
| 4 | Apoyo | pasa | 0 cajas, 0 postes y 1 objetos del layout, todos sobre piso o plataforma |
| 5 | Colisión | pasa | colision.json es igual al layout en 10 listas |
| 6 | Camino | pasa | arena sin salida ni meta: se llega a todo el piso desde x 0, con salto de 36, escalón de 6 y salto largo de 84 |
| 7 | Legibilidad | pasa | 30 siluetas (cada 64 px, 3 carriles, 1 contorno): contraste mediano 4.1:1, el peor 3.5:1 en x 24, y 24 (mínimo 2:1) |
| 8 | Paleta | pasa | 24 colores usados de los 24 de la ficha |
| 9 | Peso | pasa | en la pantalla más cargada: 6 capas (máx 8), 7 luces encendidas (máx 12), 3 piezas animadas (máx 16), 0 objetos (máx 24) |
