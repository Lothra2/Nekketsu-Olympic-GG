"""El icono del juego para la pantalla de inicio (iPhone, iPad, Android): Sophie y Alana con sus retratos del kit,
el aura Nekketsu detrás, los rayos de sol del título y el GG de fuego en su placa. Se arma en pixel art de 256 y
sale a 512 (x2, pixel duro) y a 192 y 180 (reducido suave).
    python3 scripts/icono.py
"""
import json, math, os
from PIL import Image, ImageDraw

KIT = 'public/assets/kit'
S = 256
m = json.load(open(f'{KIT}/manifest.json'))

def retrato(id_, expr):
    r = m['atletas'][id_]['retratos']
    i = r['expresiones'].index(expr)
    im = Image.open(f"{KIT}/{r['archivo']}").convert('RGBA')
    g = r['grande']
    return im.crop((i * g, r['chico'], (i + 1) * g, r['chico'] + g))

def glifo(ch, fnt='fuente_titulo'):
    import re
    txt = open(f'{KIT}/ui/fuentes/{fnt}.fnt', encoding='utf-8').read()
    c = re.search(rf'<char id="{ord(ch)}" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"', txt)
    x, y, w, h = map(int, c.groups())
    return Image.open(f'{KIT}/ui/fuentes/{fnt}.png').convert('RGBA').crop((x, y, x + w, y + h))

def x(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)

ico = Image.new('RGBA', (S, S), (11, 11, 20, 255))
d = ImageDraw.Draw(ico)
# los rayos de sol del título, sin huecos: rojo y naranja, desde detrás de las caras
cx, cy = S / 2, S * 0.36
N = 18
for i in range(N):
    a0 = i / N * 2 * math.pi - math.pi / 2
    a1 = a0 + 2 * math.pi / N
    col = (196, 40, 52, 255) if i % 2 else (240, 128, 40, 255)
    d.polygon([(cx, cy), (cx + math.cos(a0) * 400, cy + math.sin(a0) * 400), (cx + math.cos(a1) * 400, cy + math.sin(a1) * 400)], fill=col)
# el resplandor del centro, en anillos de pixel (sin degradé suave: es pixel art)
for r, col in ((84, (255, 176, 64, 255)), (62, (255, 214, 96, 255)), (40, (255, 240, 170, 255))):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)

# la placa del GG de fuego, abajo; las niñas se le paran encima
px0, py0, px1, py1 = 52, 142, 204, 226
d.rectangle((px0 + 4, py0 + 4, px1 + 4, py1 + 4), fill=(40, 6, 14, 200))
d.rectangle((px0, py0, px1, py1), fill=(11, 11, 26, 255))
d.rectangle((px0, py0, px1, py1), outline=(242, 194, 48, 255), width=4)
d.rectangle((px0 + 7, py0 + 7, px1 - 7, py1 - 7), outline=(255, 255, 255, 70), width=1)
G = x(glifo('G'), 4)
sep = 6
gx = (S - (G.width * 2 + sep)) // 2
gy = py1 - 12 - G.height
for k in range(2):
    sombra = Image.new('RGBA', G.size, (0, 0, 0, 0))
    sombra.putalpha(G.getchannel('A').point(lambda v: 200 if v else 0))
    ico.alpha_composite(sombra, (gx + k * (G.width + sep) + 3, gy + 3))
    ico.alpha_composite(G, (gx + k * (G.width + sep), gy))

# el aura Nekketsu detrás de cada una (un cuadro del efecto del kit), y Sophie y Alana al frente
fx = m['fx']['aura_nekketsu']
aura = x(Image.open(f"{KIT}/{fx['archivo']}").convert('RGBA').crop((2 * fx['w'], 0, 3 * fx['w'], fx['h'])), 2)
for ax in (0, 128):
    ico.alpha_composite(aura, (ax, -8))
ico.alpha_composite(retrato('sophie', 'feliz'), (30, 44))
ico.alpha_composite(retrato('alana', 'burla'), (130, 44))

ico = ico.convert('RGB')
x(ico, 2).save('public/icono-512.png', optimize=True)
ico.resize((192, 192), Image.LANCZOS).save('public/icono-192.png', optimize=True)
ico.resize((180, 180), Image.LANCZOS).save('public/icono-180.png', optimize=True)
print('icono listo')
