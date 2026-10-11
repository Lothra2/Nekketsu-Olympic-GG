# Para PixelForja: empieza aquí

Si eres una sesión de Claude Code trabajando en `Lothra2/pixel_forja`, este archivo te dice qué hacer. Todo lo que el juego *Nekketsu Olympic GG* necesita de PixelForja vive en esta carpeta. No hace falta que nadie te pegue nada más.

---

## 1. Al arrancar la sesión

1. **Trae este repo, solo para leer.** Es público:
   ```bash
   git clone --depth 1 https://github.com/Lothra2/Nekketsu-Olympic-GG ../nekketsu
   # si ya existe: git -C ../nekketsu pull
   ```
   Usa la rama por defecto del repo.
2. **Lee completo** [PEDIDO.md](PEDIDO.md). Es el contrato: qué se pide, las reglas y los criterios de aceptación de cada lote.
3. **Lee** [ESTADO.md](ESTADO.md) para ver qué lotes están aprobados y qué insumos del juego ya existen.
4. **Revisa en PixelForja** qué ya se entregó: cada lote entregado deja `docs/olimpico/<lote>/ENTREGA.md` en `main`. Si existe, ese lote ya se hizo aunque ESTADO.md no esté al día.
5. **Revisa que el lote anterior esté en `main`.** Si su PR sigue abierto, para y avísale a Rick: el lote nuevo tiene que salir de un `main` que ya lo traiga.
6. **Elige el lote:**
   - El que te pidió Rick, si te nombró uno.
   - Si no, el primero de la tabla de orden (PEDIDO.md, sección 16) que no esté entregado y cuyas dependencias sí lo estén.
   - Antes de empezar, di en una línea qué lote vas a hacer y por qué.

---

## 2. Qué archivos de este repo se usan

| Archivo | Para qué | Lo necesita |
|---|---|---|
| `para_pixel_forja/PEDIDO.md` | El contrato completo | Todos los lotes |
| `para_pixel_forja/ESTADO.md` | Qué está aprobado y qué insumos existen | Todos los lotes |
| `docs/PLAN.md` | Contexto del juego: pruebas, equipos, tono, humor | Para entender el porqué. El pedido manda si algo choca |
| `kit.config.json` | La configuración del kit que pide el juego | Lote I y todo lo que genere el kit |
| `data/stages/<id>.layout.json` | La geometría de cada escenario | Lotes E |
| `data/teams.json`, `fichas/*.ficha.json` | Equipos y personajes editados | Lotes C e I |
| `data/dialogs/*.json` | Textos del juego | Para probar fuentes y la caja de diálogo |

Si un lote necesita un insumo que todavía no existe en este repo, como el layout de un escenario, **no lo inventes**. Para, di exactamente qué falta y sigue con la parte del lote que no depende de eso.

---

## 3. Reglas de la sesión

- **No escribas en este repo.** Solo lees. El trabajo va en PixelForja.
- **Una rama nueva en PixelForja y un PR contra `main` por lote.**
- **Todo es capacidad general del motor** (PEDIDO.md, sección 3.1). Lo propio de Nekketsu va como ejemplo en `docs/ejemplos/nekketsu/`.
- **Respeta cada "párate para aprobar".** Muestra el resultado (GIF, tablero, postal, ficha de arte) y espera a Rick antes de seguir.
- **Corre las pruebas de PixelForja** (`npm test`, y `npm run e2e` si tocaste el estudio) antes de abrir el PR.

---

## 4. Al terminar el lote

1. Crea en PixelForja `docs/olimpico/<lote>/ENTREGA.md` con este formato:
   ```markdown
   # Lote <X>: <nombre>
   Estado: entregado
   PR: <link>
   Fecha: <aaaa-mm-dd>

   ## Qué se hizo
   ## Cómo se usa (estudio y kit)
   ## Pruebas
   ## Decisiones que tomé sin preguntar
   ## Límites honestos
   ## Lo que necesita el siguiente lote
   ```
2. Deja junto a ese archivo el tablero PNG, los GIFs y las postales del lote.
3. Abre el PR contra `main` con todo lo de PEDIDO.md, sección 15.
4. Termina con un mensaje corto para Rick: qué lote quedó, el link del PR, qué tiene que revisar y cuál es el siguiente lote.

---

## 5. La línea que Rick pega para arrancar

> Clona https://github.com/Lothra2/Nekketsu-Olympic-GG (solo lectura) y sigue para_pixel_forja/LEEME.md. Haz el siguiente lote pendiente.
