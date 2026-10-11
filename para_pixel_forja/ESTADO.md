# Estado del pedido a PixelForja

Lo actualiza el lado del juego cuando Rick aprueba un lote. La fuente de verdad de lo entregado es `docs/olimpico/<lote>/ENTREGA.md` en `main` de PixelForja: si existe ahí, el lote está entregado aunque esta tabla esté atrasada.

Estados: `pendiente`, `en curso`, `entregado`, `aprobado`.

## Lotes

| Orden | Lote | Qué | Depende de | Estado | PR |
|---|---|---|---|---|---|
| 1 | A | Datos por cuadro, filas, atlas, retratos, vestuario por pack | Nada | pendiente | |
| 2 | B1 + D1 | Levantar y lanzar, agarres, armas del piso | A | pendiente | |
| 3 | C1 | Familia GG e Instituto Nekketsu | A | pendiente | |
| 4 | G1 fuentes | Acentos del vietnamita en las fuentes | Nada | pendiente | |
| 5 | I inicial | Kit a medida por configuración | A | pendiente | |
| 6 | E1 | Sistema de escenarios oblicuos + `saigon_hem` | A, I, layout de `saigon_hem` | pendiente | |
| 7 | F | Efectos | Nada | pendiente | |
| 8 | G1, H1 | Resto de interfaz y audio de la rebanada vertical | Nada | pendiente | |
| 9 | B2, C2, D2, E2 | Cross Country completo y equipos nacionales | E1 | pendiente | |
| 10 | B3, E3 | Obstáculos, Tama-wari, Kachinuki | E1 | pendiente | |
| 11 | B4, E4 | Pruebas de 1992 | E1 | pendiente | |
| 12 | G2, H2 | Envoltorio y audio completo | | pendiente | |
| 13 | B5, E5 | Pruebas de pelota | E1 | pendiente | |
| 14 | B6, B7, C3, E6 | Tradicionales, técnicas, secretos y Barrio Nekketsu | E1 | pendiente | |
| 15 | J | Estudio | Todo | pendiente | |

## Insumos que pone el juego

Lo que PixelForja lee de este repo y todavía no existe. Cada uno lo produce una fase del juego.

| Insumo | Ruta | Lo necesita | Lo produce | Estado |
|---|---|---|---|---|
| Configuración del kit | `kit.config.json` | I, para generar el kit real | Juego F0 (versión inicial). El lote I puede arrancar antes con su propio ejemplo en `docs/ejemplos/nekketsu/` | pendiente |
| Equipos | `data/teams.json` | I. El lote C no lo necesita: las tablas de equipos están en el pedido | Juego F0 | pendiente |
| Layout del tramo 1 de Saigón | `data/stages/saigon_hem.layout.json` | E1 | Juego F3 (gris jugable) | pendiente |
| Layout de la azotea final | `data/stages/caracas_azotea.layout.json` | E3 | Juego F3 | pendiente |
| Resto de layouts | `data/stages/*.layout.json` | E2 a E6 | Juego F6 a F11 | pendiente |
| Textos | `data/dialogs/*.json` | G1 | Juego F5 | pendiente |

Los lotes A, B1 + D1, C1, G1 fuentes, I inicial, F, G1 y H1 no necesitan ningún insumo del juego. Se pueden empezar ya.
