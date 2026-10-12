# Verificación: saigon_hem

Las 9 pruebas pasan.

| # | Prueba | Resultado | Qué se midió |
|---|---|---|---|
| 1 | Costuras | pasa | 12 trozos de 1280 px revisados en sus bordes: 0 pixeles distintos |
| 2 | Paralaje | pasa | cielo: la vuelta cambia 44 filas (un paso normal, hasta 45). Lejos: 8 (hasta 13) |
| 3 | Piso | pasa | 3840 x 130 px de franja: 0 transparentes |
| 4 | Apoyo | pasa | 11 cajas, 3 postes y 6 objetos del layout, todos sobre piso o plataforma |
| 5 | Colisión | pasa | colision.json es igual al layout en 10 listas |
| 6 | Camino | pasa | se llega a la meta (x 3790) desde la salida (x 40), con salto de 36, escalón de 6 y salto largo de 84 |
| 7 | Legibilidad | pasa | 233 siluetas (cada 64 px, 4 carriles, 1 contorno): contraste mediano 5.4:1, el peor 2.3:1 en x 3800, y 20 (mínimo 2:1) |
| 8 | Paleta | pasa | 24 colores usados de los 24 de la ficha |
| 9 | Peso | pasa | en la pantalla más cargada: 7 capas (máx 8), 6 luces encendidas (máx 12), 13 piezas animadas (máx 16), 6 objetos (máx 24) |
