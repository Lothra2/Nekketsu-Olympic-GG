# Verificación: cartagena

Las 9 pruebas pasan.

| # | Prueba | Resultado | Qué se midió |
|---|---|---|---|
| 1 | Costuras | pasa | 3 trozos de 1280 px revisados en sus bordes: 0 pixeles distintos |
| 2 | Paralaje | pasa | cielo: la vuelta cambia 36 filas (un paso normal, hasta 38). Lejos: 20 (hasta 44) |
| 3 | Piso | pasa | 880 x 20 px de franja: 0 transparentes |
| 4 | Apoyo | pasa | 0 cajas, 0 postes y 3 objetos del layout, todos sobre piso o plataforma |
| 5 | Colisión | pasa | colision.json es igual al layout en 10 listas |
| 6 | Camino | pasa | arena sin salida ni meta: se llega a todo el piso desde x 0, con salto de 36, escalón de 6 y salto largo de 84 |
| 7 | Legibilidad | pasa | 13 siluetas (cada 64 px, 1 carriles, 1 contorno): contraste mediano 4.9:1, el peor 2.9:1 en x 88, y 12 (mínimo 2:1) |
| 8 | Paleta | pasa | 24 colores usados de los 24 de la ficha |
| 9 | Peso | pasa | en la pantalla más cargada: 6 capas (máx 8), 3 luces encendidas (máx 12), 5 piezas animadas (máx 16), 2 objetos (máx 24) |
