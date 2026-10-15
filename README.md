# Nekketsu Olympic GG

Remake espiritual de los juegos deportivos Nekketsu de NES/Famicom, con escenarios entre Vietnam, Colombia y Venezuela y 6 equipos: Familia GG, Rồng Sài Gòn, Rolos de Chapinero, Panas de Caracas, Maracuchos del Lago e Instituto Nekketsu. Los personajes, las armas, los retratos, las fuentes y los sonidos salen de [PixelForja](https://github.com/Lothra2/pixel_forja).

## Qué se puede jugar hoy

- **Intro épica** de casi un minuto: "Familia GG presenta" con Thor, Kenji en la azotea de Japón con rayo y aura, el jet de la Nekketsu Air con el Instituto en las ventanillas, la ruta en un mapa del Pacífico en pixel art con pines y sellos de pasaporte, la Familia GG en Saigón, un montaje estilo anime de las pruebas (vallas, natación, jabalina y pelea, y los cuatro juntos con "¡A COMPETIR!"), los rivales en silueta en Bogotá, Maracaibo y Caracas, el VS, el puñetazo a la cámara y el logo con la Marcha Nekketsu.
- **Entrenamiento** para cada prueba y para la pelea: sin rivales ni reloj, un cartel dice qué hacer, espera a que lo hagas y los botones táctiles del paso laten en pantalla. Los carteles nombran el botón de lo que estés usando: J y K en teclado, A y B en la tablet, X y A en un control. Al final te ofrece jugar de verdad.
- **Niveles** en el menú (se recuerdan): PASEO (la máquina va suave, tu equipo aguanta el doble y pega más, en jabalina no hay nulo y en natación no hay salida en falso), NORMAL (un poco de ventaja) y NEKKETSU (sin ayuda). En PASEO y NORMAL hay una "goma" invisible: si vas muy atrás la máquina afloja, y si vas muy adelante aprieta un poco. Los números están todos en `src/core/nivel.ts`.
- **Seis equipos, 24 atletas**: Familia GG (Venezuela), Instituto Nekketsu (Japón), Rồng Sài Gòn (Vietnam), Rolos de Chapinero (Colombia), Panas de Caracas y Maracuchos del Lago (Venezuela). La selección va por pasos: tu equipo, tu atleta, el equipo rival y, en el 1 contra 1 y el judo, tu rival. Cada equipo tiene sus colores, su bandera, su burla y su frase, y todas las pruebas usan los dos equipos elegidos. El entrenamiento se salta el rival: te espera el Instituto (o la Familia, si el Instituto eres tú).
- **Carga**: cada prueba muestra su nombre, una barra y un consejo mientras carga. Al elegir tu equipo y el rival, sus atletas se empiezan a bajar mientras eliges, así la prueba arranca casi sin espera. La copia del artifact arranca con un manifiesto de 2.7 MB (antes 10) y cada atleta llega en un paquete de 1.4 MB (antes 1.8); el judo va en otro paquete que solo se baja al ir al tatami.
- **Barra Nekketsu en todas las pruebas de pelota y en las de campo**: se llena jugando bien (tirar, encestar, robar, tapar, buenos toques, puntos) y también cuando te anotan, para remontar. Llena, ★ es el súper golpe de cada deporte. Si la tocas antes de tiempo, un cartel te dice cómo llenarla. La máquina también usa el suyo.
- **Olimpiada Express**: tu equipo contra el que elijas. Cada gira sortea 5 de las 16 pruebas (al menos una de Vietnam y una de Colombia) y cierra con el Kachinuki en Caracas. Medallero por equipos (10, 6, 4 y 2 puntos por puesto, el judo da 10 y 6) y la final vale 20. Termina en el podio del estadio, con las banderas del campeón subiendo y fuegos artificiales.
- **Pruebas sueltas**:
  - *Cross Country Saigón*: la prueba estrella del original, en cinco tramos seguidos con el tiempo sumado.
    1. El hẻm: canales, muros, la calle inundada y las motos. Ya tiene el arte de PixelForja.
    2. El mercado Bến Thành: pasillos angostos entre puestos. Si caes encima de un puesto de frutas, se riegan y el que viene atrás se resbala.
    3. El río Saigón: el ferry, que es seguro pero hay que esperarlo, o nadar directo entre jacintos que te enredan.
    4. Las azoteas bajo el aguacero: saltos entre edificios, charcos y techos de zinc que resbalan, y una viga para cruzar el hueco ancho.
    5. La recta final en el estadio, con vallas.

    Los cinco tramos tienen el arte de PixelForja. Con los rivales, a los golpes, como en el original. En Pruebas sueltas también se puede correr un tramo solo, para una partida corta.
  - *Obstáculos Comuna 13*: la carrera de obstáculos del original, subiendo la Comuna 13 de Medellín desde la calle hasta el mirador.
    - Escaleras eléctricas que van al revés, o los escalones empinados del lado.
    - Muros, una viga sobre un hueco y tendederos.
    - Perros dormidos: si pisas uno, se despierta y te embiste. Si eres rápido, te escapas.
    - Gatos que se suben de un salto a los techos bajos cuando pasas.
    - Saltar justo antes de un obstáculo da impulso.
  - *Vallas del Café* (Eje Cafetero): alterna puño y patada para correr, salta las vallas, codazo con ★ (solo a los rivales). Si tocas una valla, se cae y te frena. Cambiar de carril pide un empujón claro de la palanca, y el salto apretado un pelito antes se guarda.
  - *Natación Hạ Long* (bahía de Hạ Long): sales con salto en el ¡YA!. Salida en falso solo en Nekketsu; en Paseo y Normal, apretar antes no cuenta. Alterna puño y patada para nadar, ★ es la patada de delfín (su barra dice DELFÍN).
  - *Jabalina Llanera* (Llanos de Apure): carrerita alternando botones, mantén salto para el ángulo y suelta para lanzar (un toque corto lanza a 40°). Si sueltas pasada la raya es nulo. Corriendo a tope se llena la barra del rayo, que sigue al segundo intento: ★ es la Lanza del Catatumbo, sola a 45° con un rayo y más fuerza. Dos intentos.
  - *Azoteas de Cartagena* (la ciudad amurallada al atardecer): el salto entre azoteas de 1992, con garrocha.
    - Carrerita alternando puño y patada, y salto en la cajita roja para clavar la garrocha. Clavar tarde o temprano le quita impulso.
    - Salto otra vez arriba del todo es el empuje: estira el salto. Un salto lejos de la cajita no la clava, solo avisa.
    - Corriendo a tope y clavando perfecto se llena la barra Nekketsu: arriba, ★ es la Garrocha Nekketsu, que llega mucho más lejos.
    - Si en el despegue ya no llega ni con el mejor empuje, la garrocha se queda casi derecha, se le devuelve y cae de espalda en su techo.
    - Las banderitas muestran el viento. El techo de enfrente se aleja en cada ronda: 5, 6 y 7 m.
    - El que no llega cae en el balcón de las buganvillas, en el carrito de frutas o al lado de la palenquera, que lo regaña. Tres rondas, cuenta el mejor salto.
  - *Quemado Nekketsu* (patio techado del liceo, Caracas): el homenaje al primer juego, 4 contra 4.
    - Tres en la cancha y uno en el cementerio, detrás del rival. Tres golpes y quedas quemado (cuatro para la Familia en PASEO), y pasas al cementerio.
    - Desde el cementerio también se quema, y si quemas a alguien vuelves a la cancha. Pierde el equipo que se queda sin nadie adentro, con 2 minutos y muerte súbita.
    - Puño lanza (corriendo o saltando sale más fuerte), patada pasa o atrapa (justo antes de que llegue), salto esquiva. Con la barra llena, especial es el tiro Nekketsu, y si te lo tiran a ti sale "¡CUIDADO!".
    - Tus tiros pasan por encima de tus compañeros, y los compañeros de la máquina también esquivan y atrapan.
    - El salto para esquivar es de bolita, con las rodillas al pecho: arriba de 8 px el balón pasa por debajo.
  - *Chapita* (barrio de Caracas): béisbol de calle con chapas y palo de escoba, 2 contra 2 en tres innings cortos.
    - Bateas con puño un pelito antes de que llegue la chapa. Con la flecha arriba la mandas alta y abajo rasante, para las curvas que suben o bajan.
    - Lanzas con puño (recta) o patada (curva, que sube o baja con la flecha).
    - Tres strikes es ponche y la que atrapa el del campo es out, pero los batazos altos y fuertes se le escapan. Según lo lejos: sencillo, doble o triple. Por encima de la casa del vecino es jonrón. Si rompes la ventana sale la señora Carmen con la chancleta.
    - Barra llena: ★ al batear es el Batazo Nekketsu (jonrón seguro) y al lanzar, la Recta de Fuego.
    - El bateador espera en guardia meneando el palo de escoba y batea con él a dos manos.
  - *Tama-wari Hội An* (de noche, entre faroles): cada equipo tiene un poste de bambú con una bola de papel arriba. Gana el primero que rompe la bola del otro.
    - Al pie del poste del otro, salto o arriba lo agarra. Machacar puño y patada trepa rápido; mantener arriba trepa despacio.
    - Arriba, puño a la bola, que se raja en 4 estados.
    - Desde abajo, la patada sacude el poste y el puño le jala el pie al que va empezando a trepar.
    - En el piso, a los golpes como en la pelea.
  - *Đá cầu* (parque Tao Đàn, Saigón): el volante de plumas que se juega con los pies, 2 contra 2 con red baja, a 5 puntos.
    - El círculo amarillo marca dónde va a caer (en Nekketsu no hay ayuda).
    - Patada la pasa al otro lado, puño se la levanta a tu compañero (y él te la arma junto a la red), y saltando cerca de la red con patada sale la chilena, que vale doble si es punto.
    - Hasta 3 toques por lado y nadie dos seguidas. El toque perfecto, a media pierna, va al hueco del rival.
    - Barra llena: ★ es la Chilena Nekketsu, en llamas y doble.
  - *Tejo* (La Candelaria, Bogotá): el deporte nacional de Colombia, 2 contra 2 en 3 rondas.
    - Un botón fija la puntería (la línea que recorre la caja, vista desde arriba) y otro la fuerza (la barra con su raya). Las dos van a velocidad pareja. En lo rojo de arriba el tejo se pasa de la caja.
    - Lanzas los dos tejos de tu equipo, por debajo y con el tejo en la mano hasta que lo sueltas. Barra llena: ★ es el Pulso Nekketsu (la barra va lenta y el bocín cuenta más grande).
    - Mecha que revienta: 3. Embocinada, adentro del bocín: 6. Moñona, las dos a la vez: 9, con fuegos artificiales.
    - Si en una ronda nadie suma, el tejo más cerca del bocín se lleva la mano: 1. Empatados al final, desempate.
  - *Vóley playa* (Playa El Agua, Margarita): 2 contra 2 con la red alta, a 7 puntos.
    - El círculo amarillo marca dónde cae. Puño la pasa al otro lado, patada se la pasa a tu compañero y él te la arma junto a la red: ¡SALTA Y REMATA!
    - Cerca de la red, salto y puño es el remate. Si el rival salta a tiempo, te bloquea. Nadie la toca dos veces seguidas (en Paseo se te perdona).
    - Barra llena: ★ es el Remate de Fuego, que no se bloquea ni se saca.
  - *Tenis de dobles* (Đà Lạt, entre pinos): 2 contra 2 con raqueta, a 7 puntos.
    - Aquí la bola pica una vez antes de pegarle. El círculo amarillo marca dónde la vas a alcanzar.
    - Puño le pega con la raqueta, patada es el globo alto y al fondo. Si viene alta cerca de la red, salto y puño: el smash. Tu compañero a veces te la deja alta junto a la red para que remates.
    - Barra llena: ★ es el Drive Nekketsu, en llamas al hueco.
  - *Fútbol callejero* (Carnaval de Barranquilla): 4 contra 4 (tres en la cancha y un arquero) con arcos de piedra, 2 minutos y medio y gol de oro si hay empate.
    - Pasas por encima del balón y es tuyo. Puño pasa, patada tira (la flecha apunta arriba o abajo). Sin el balón, patada es la barrida (saltando la esquivas) y puño, el hombrazo para quitárselo.
    - Cerca del arco, el pase sale alto como centro: salta y cabecea.
    - Barra llena: ★ es el tiro Nekketsu.
    - El arquero se lanza y al arquero no se le barre. Cada tanto la Marimonda cruza la cancha y el balón le rebota.
  - *Básquet 3x3* (Maracaibo, con el relámpago del Catatumbo de fondo): 3 contra 3 a un aro, gana el primero a 11 o el que vaya ganando a los 3 minutos.
    - Mantén patada para llenar la barra y suéltala en lo verde. Cerca del aro, salto es la clavada, y corriendo vuela de más lejos. La clavada puede fallar, y si te marcan el defensor salta a taparla: el cartel avisa "¡TE MARCAN!" para que la pases.
    - Aquí los golpes valen: sin balón, pegado al que lo tiene, puño se lo roba. Saltando frente al que tira, tapón. Abajo un cartel dice lo que puedes hacer ahora.
    - Barra llena, ★: cerca del aro la clavada Nekketsu rompe el tablero, de lejos el tiro de fuego no falla y sin balón la tacleada se lo arranca al rival.
  - *Judo y Vovinam Hà Nội* (tatami frente al lago Hoàn Kiếm): 1 contra 1 con el motor de la pelea y otras reglas.
    - Cada uno en su judogi: blanco el tuyo, azul el rival, con el cinturón del color de su equipo. Se saludan con el rei al empezar, en cada ¡HAJIME! y al final.
    - Agarrados de solapa y manga, flecha adelante y patada es el seoi nage: gira de espaldas, lo carga en la espalda y lo azota del otro lado. ¡IPPON!, 2 puntos.
    - Patada sola es el o-soto-gari, la barrida por fuera: ¡WAZA-ARI!, 1 punto. El que cae hace el ukemi, la palmada al tatami. Tumbar de un golpe: ¡WAZA-ARI!, 1. Gana el primero a 3.
    - 1:30 de reloj. Si se acaba empatado, punto de oro. Después de cada punto, ¡HAJIME! de nuevo.
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
- Ambientes del lugar debajo de la música, cada vez desde un punto distinto del bucle: el mar en Natación y Vóley, el cafetal en Vallas, el llano en Jabalina, el tráfico de Saigón y la Comuna 13 en el Cross, Hội An de noche en el Tama-wari, la llovizna de Bogotá en el Tejo, el lago de noche en el Básquet, la azotea de Caracas en la pelea, el atardecer de Cartagena en Azoteas, el carnaval en el Fútbol, los pinos de Đà Lạt en el Tenis y el recreo del liceo en el Quemado.
- Cada equipo celebra con su acorde de victoria al ganar una prueba, la pelea o la gira: la fanfarria con cuatro de la Familia (y el ladrido de Thor), el rock del Instituto, el đàn tranh de Rồng Sài Gòn, el torbellino de los Rolos, el joropo de los Panas y la gaita de los Maracuchos.
- Cada mundo con su tema de PixelForja: Saigón, la Comuna 13, Hội An, Bogotá, Margarita, Đà Lạt, el Carnaval de Barranquilla, la gaita de Maracaibo, Caracas, la champeta de Cartagena, el bambuco del Eje Cafetero, los remeros de Hạ Long, el pajarillo de Apure y el tema del Instituto en el Kachinuki. El judo sigue con la pelea sintetizada.
- La interfaz de PixelForja (lote G1): la palanca y los botones táctiles con su cuadro apretado, el marcador de la pelea con el panel de cada equipo, el retrato en su marco dorado y las barras de aguante y Nekketsu (la llena brilla), el reloj en números de TV, la caja de diálogo de la intro con su flechita, y los letreros grandes con su fondo: ¡LISTOS!, ¡YA!, ¡META!, ¡GOL!, ¡JONRÓN!, ¡RÉCORD!, quien gana en la cinta dorada y los especiales en la explosión.
- El envoltorio de PixelForja (lote G2): la tarjeta de cada equipo en la selección con su bandera, su escudo y las cuatro caras; el ícono de la prueba elegida junto a su lugar en el menú; oro, plata y bronce en el medallero, en la tabla de resultados y en la final; el podio del estadio de noche con las banderas del campeón subiendo por los mástiles; el VS de dos contra dos con cuatro retratos grandes; la pausa tramada (la pelea se ve detrás), SE ACABÓ LA VAINA bajo la lluvia y ¿OTRA PARTIDITA? en su propia pantalla de arcade con la cuenta grande.
- Sonidos de RAYO_PUNTA y H2_CORTO: el rayo de la jabalina sale de la punta de la lanza y truena cuando cae, también en Maracaibo; el Furrazo suena a furro; las motos del Cross pitan con su corneta; y el Cross cambia de ambiente en cada tramo: el mercado Bến Thành, el río y el estadio.
- Los vehículos de PixelForja (lote D2) en el Cross: el ferry del río que anda al cruzar y se queda atracado en el muelle, las motos de cuatro colores que pitan cuando tienes adelante y frenan con polvo cuando atropellan, el xích lô, los jacintos que bajan por el río y la fruta regada cuando alguien tumba un puesto del mercado.
- Los súper golpes de PixelForja (lote B7H8):
  - **Básquet:** la clavada Nekketsu grande, que rompe el tablero en el instante en que la mano llega al aro, y la tacleada en plancha, que tumba al rival en el impacto.
  - **Vóley:** el remate de fuego con la vuelta entera en el aire, mientras la pelota lo espera colgada hasta el impacto.
  - **Đá cầu:** las chilenas de lado (la Nekketsu, desde más alto y con la vuelta atrás) y el dominio del cầu antes de sacar, con un toque en cada pie.
  - **Chapita:** el lanzamiento de lado con golpe de muñeca y el batazo Nekketsu con la vuelta completa, espejada con su palo.
  - **Jabalina:** la lanza del Catatumbo, con el relámpago sobre la jabalina en alto antes de soltarla.
  - **Quemado:** el tiro con la rodilla arriba y el balonazo que lo sienta.
  - **Judo:** con la barra llena, la tijera del vovinam, ippon, con el rival cayendo cuadro a cuadro y la palmada del ukemi al caer.
  - **Ambientes nuevos:** el parque Tao Đàn en el Đá cầu, el barrio de Caracas en la Chapita y el dojo de Hà Nội en el judo.
- **Las técnicas de equipo** de PixelForja (lote B7), con la barra llena en la pelea: el Chancletazo Supremo de la Familia GG (tres chancletas, la última tumba), el Copetazo del Instituto, la Silla Plástica Voladora de Rồng Sài Gòn, la Ciclovía Infernal de los Rolos (con el rival que sale volando), el Batazo de Jonrón de los Panas y el Furrazo de los Maracuchos, que tumba a todos los de cerca. Además, la atrapada del Quemado, el paso pesado en la arena del Vóley y el salto de susto cuando una moto pasa rozando en el Cross.
- **Las canchas a 800** (lote E4): Margarita, Đà Lạt, Tao Đàn, Maracaibo, Barranquilla, el liceo, la Candelaria y Hội An traen escenario a los lados. En el iPhone se ve el lugar completo, sin acercar la cámara.
- **Las motos y el xích lô a escala de atleta** (lote D3) y **el relámpago que baja del cielo** (`rayo_cielo`) en la lanza del Catatumbo y sobre el aro de Maracaibo.
- Los efectos que se repiten (el aura de fuego de los poderes, el confeti, el rayo del Catatumbo) se apagan solos al rato y no se quedan tapando el juego.
- Los deportes de pelota usan las animaciones de PixelForja sin la pelota pintada: la pelota la mueve el juego y, mientras alguien la tiene, va donde la pone la animación. En la pelea, cada equipo se burla con su gesto y su frase en un globo.

## Pantalla

El juego llena la pantalla en cualquier celular acostado, sin barras negras:
- Está diseñado en un cuadro de 640 x 360 (16:9). En pantallas más alargadas (19.5:9, 20:9) se estira a los costados hasta 800 de ancho, sin deformar.
- Lo importante (personajes, textos, menús) queda centrado. Los costados muestran más fondo, y en las carreras y la pelea, más mundo.
- Las canchas fijas (vóley, tenis, đá cầu, básquet, fútbol, quemado, tejo, tama-wari) juegan en 640, pero su arte mide 800 con 80 de escenario a cada lado (lote E4). En las pantallas alargadas se ve ese escenario, con la cancha centrada y sin acercar la cámara. Sin el arte, la cámara se acerca lo justo para que la cancha llene la pantalla.
- Los botones táctiles se pegan a los bordes de la pantalla.
- En tablets, más cuadradas, queda en 16:9 con barras arriba y abajo.
- Al tocar la primera pantalla en el celular pide pantalla completa y se acuesta solo, si el navegador lo permite.
- El icono de la pantalla de inicio son Sophie y Alana con su aura de fuego, los rayos del título y el GG dorado. Sale de los retratos del kit con `python3 scripts/icono.py` (`public/icono-180.png`, `-192` y `-512`).
- En iPhone el navegador no deja pantalla completa. Para jugar sin barras: Compartir → Agregar a pantalla de inicio, y abrirlo desde el ícono. El manifiesto (`public/manifest.webmanifest`) lo abre acostado y sin barras, también en Android.
- La pantalla de inicio muestra la versión (commit y fecha del build). Así se sabe qué build está publicado en Netlify.
- Con `?diag` al final de la dirección sale un recuadro con las medidas reales de la ventana, el lienzo y el juego.
- Todo esto está en `src/core/pantalla.ts`.

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
node scripts/prueba-intro.mjs http://localhost:5173/ capturas/intro [844x390]   # la intro cuadro a cuadro: reacciones, tarjetas y textos enteros y sin tapar (también en pantalla ancha)
node scripts/prueba-celular.mjs http://localhost:5173/ capturas/celular 844 390   # cada escena en un celular alargado: llena la pantalla, todo centrado
node scripts/prueba-girar.mjs http://localhost:5173/   # parado pide girar; al girar (y al cambiar de pantalla) todo se acomoda
node scripts/prueba-palanca.mjs http://localhost:5173/   # la palanca táctil con un dedo de verdad: bajar hasta el borde y volver a subir sin soltar
node scripts/prueba-aves.mjs http://localhost:4173/ capturas/aves   # las palomas del hẻm despegan y vuelven, el gallo de la Comuna 13 canta y se asusta (hace falta el kit con aves)
node scripts/prueba-b7e4d3.mjs http://localhost:4173/ capturas/b7e4d3   # B7, E4, D3 y rayo_cielo: las 8 canchas a 640 y 780, la moto, el rayo, la técnica de cada equipo, la atrapada y la arena
node scripts/prueba-b7h8.mjs http://localhost:4173/ capturas/b7h8   # los súper golpes B7H8: clavada y tablero, plancha, remate colgado, dominio y chilenas, batazo girado, lanza del rayo, balonazo, tijera y ambientes
node scripts/prueba-g2.mjs http://localhost:4173/ capturas/g2   # G2, RAYO_PUNTA y H2_CORTO: tarjetas, ícono del menú, VS de 4, pausa, SE ACABÓ, ¿OTRA PARTIDITA?, medallas, podio con banderas, rayo y trueno
node scripts/prueba-g1d2.mjs http://localhost:4173/ capturas/g1d2   # interfaz G1 y vehículos D2: botones, marcador, reloj de TV, letreros con fondo, ferry, motos, xích lô, jacintos y fruta
node scripts/prueba-gira.mjs http://localhost:4173/ capturas/gira   # la Olimpiada con Tama-wari, Đá cầu, Tejo y Judo: cada una arranca en gira, reparte puntos y vuelve al medallero
node scripts/prueba-azoteas.mjs http://localhost:4173/ capturas/azoteas   # el entrenamiento con un bot y tres rondas con el techo alejándose, con caídas
node scripts/prueba-quemado.mjs http://localhost:4173/ capturas/quemado [partido] [nivel]   # entrenamiento con un bot y un partido 4 contra 4; imprime tiros, golpes, atrapadas y esquivas de cada equipo
node scripts/prueba-chapita.mjs http://localhost:4173/ capturas/chapita [juego] [nivel]   # entrenamiento con un bot (batear, curvas, lanzar) y un juego de tres innings
node scripts/prueba-voley.mjs http://localhost:4173/ capturas/voley   # entrenamiento con un bot, la jugada de 3 toques con tu compañero, el remate de fuego y un partido
node scripts/prueba-equipos.mjs http://localhost:4173/ capturas/equipos   # la selección (equipo, atleta, rival) con teclas, las 15 pruebas con equipos nuevos, la memoria y las texturas que falten
node scripts/prueba-b4b6.mjs http://localhost:4173/ capturas/b4b6   # el judo proyectando, el tejo en la mano, el palo de la Chapita, la garrocha que no llega, el salto de bolita, un ambiente y un acorde
node scripts/prueba-tenis.mjs http://localhost:4173/ capturas/tenis   # entrenamiento con un bot (pique, smash, globo) y un partido de dobles
node scripts/prueba-futbol.mjs http://localhost:4173/ capturas/futbol [partido] [nivel]   # entrenamiento con un bot y un partido 4 contra 4; imprime tiros, atajadas y robos
node scripts/prueba-basket.mjs http://localhost:4173/ capturas/basket [partido] [nivel]   # entrenamiento con un bot y un partido a 11; imprime posesiones, tiros, canastas, tumbadas y tapones
node scripts/prueba-borde.mjs http://localhost:5173/   # pegada al borde de arriba o de abajo, los muros y los huecos siguen valiendo
node scripts/prueba-kachinuki.mjs http://localhost:5173/ capturas/kachinuki   # el borde, el rescate de Thor, lo que cae del cielo y la azotea que se achica
node scripts/prueba-pruebas.mjs http://localhost:5173/ capturas/pruebas  # vallas, natación, jabalina y medallero
node scripts/prueba-entrenamiento.mjs http://localhost:5173/ capturas/entrenamiento  # completa los 4 entrenamientos
node scripts/prueba-tamawari.mjs http://localhost:5173/ capturas/tamawari   # el entrenamiento de Tama-wari jugado con el teclado
node scripts/prueba-judo.mjs http://localhost:5173/ capturas/judo   # un combate de judo con la máquina de los dos lados hasta los 3 puntos
node scripts/prueba-tejo.mjs http://localhost:5173/ capturas/tejo   # el entrenamiento de Tejo con un bot que apunta, y un partido de tres rondas
node scripts/prueba-dacau.mjs http://localhost:5173/ capturas/dacau   # el entrenamiento de Đá cầu con un bot y un partido entero
node scripts/prueba-cross.mjs http://localhost:5173/ capturas/cross     # los cinco tramos con piloto automático, de punta a punta
node scripts/prueba-cross.mjs http://localhost:5173/ capturas/cross 3   # solo un tramo (1 a 5)
node scripts/prueba-teclas.mjs http://localhost:5173/   # cada tecla que nombra el juego hace lo que dice
node scripts/prueba-tactil.mjs http://localhost:5173/ capturas   # en tablet el cartel nombra A, B y C y tocándolos avanza
node scripts/tablet.mjs capturas                                   # tablet con controles táctiles
```

## Documentos

- [docs/PLAN.md](docs/PLAN.md): el plan maestro del juego.
- [para_pixel_forja/](para_pixel_forja/LEEME.md): todo lo que el juego necesita de PixelForja. Las sesiones de PixelForja leen sus instrucciones de aquí.
