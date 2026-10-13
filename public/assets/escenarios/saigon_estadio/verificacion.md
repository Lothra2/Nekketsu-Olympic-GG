# Verificación: saigon_estadio

Las 9 pruebas pasan.

| # | Prueba | Resultado | Qué se midió |
|---|---|---|---|
| 1 | Costuras | pasa | 6 trozos de 1280 px revisados en sus bordes: 0 pixeles distintos |
| 2 | Paralaje | pasa | cielo: la vuelta cambia 36 filas (un paso normal, hasta 38). Lejos: 8 (hasta 10) |
| 3 | Piso | pasa | 1920 x 130 px de franja: 0 transparentes |
| 4 | Apoyo | pasa | 5 cajas, 2 postes y 0 objetos del layout, todos sobre piso o plataforma |
| 5 | Colisión | pasa | colision.json es igual al layout en 10 listas |
| 6 | Camino | pasa | se llega a la meta (x 1860) desde la salida (x 40), con salto de 36, escalón de 6 y salto largo de 84 |
| 7 | Legibilidad | pasa | 120 siluetas (cada 64 px, 4 carriles, 1 contorno): contraste mediano 3.9:1, el peor 2.9:1 en x 792, y 20 (mínimo 2:1) |
| 8 | Paleta | pasa | 23 colores usados de los 24 de la ficha |
| 9 | Peso | pasa | en la pantalla más cargada: 6 capas (máx 8), 1 luces encendidas (máx 12), 11 piezas animadas (máx 16), 7 objetos (máx 24) |
