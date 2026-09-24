"""Gera os ícones do Portal instalado como app (tela inicial do celular).

    python scripts/gerar_icones_app.py   (de dentro de web/)

Saída em public/app/:
  icone-192.png, icone-512.png  -> manifest, "any"
  icone-maskable-512.png        -> manifest, "maskable" (Android recorta em círculo/squircle)
  apple-touch-icon.png (180)    -> iPhone; o iOS arredonda sozinho, então é quadrado cheio

Mesmo desenho da tela de entrada: brasão da família (public/crest-familia.webp)
sobre o fundo de madeira com brilho dourado. Muda só a margem: no maskable o
Android pode recortar até 20% de cada lado, então o brasão encolhe pra caber na
zona segura (círculo de 80% do lado).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "public" / "app"
BRASAO = RAIZ / "public" / "crest-familia.webp"
MADEIRA_CENTRO = (51, 35, 15)   # --wood-warm #33230f
MADEIRA_BORDA = (23, 17, 11)    # --wood-dark #17110b
BRILHO = (227, 196, 118)        # --gold-soft #e3c476


def fundo(lado):
    """Radial de madeira (quente no centro, escura na borda) + brilho dourado."""
    img = Image.new("RGB", (lado, lado), MADEIRA_BORDA)
    passos = 60
    d = ImageDraw.Draw(img)
    for i in range(passos, 0, -1):
        r = lado * 0.75 * i / passos
        t = i / passos
        cor = tuple(round(MADEIRA_CENTRO[k] * (1 - t) + MADEIRA_BORDA[k] * t) for k in range(3))
        d.ellipse((lado / 2 - r, lado * 0.45 - r, lado / 2 + r, lado * 0.45 + r), fill=cor)
    brilho = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(brilho).ellipse((lado * 0.2, lado * 0.15, lado * 0.8, lado * 0.75), fill=70)
    brilho = brilho.filter(ImageFilter.GaussianBlur(lado * 0.12))
    img.paste(Image.new("RGB", (lado, lado), BRILHO), (0, 0), brilho)
    return img.filter(ImageFilter.GaussianBlur(lado * 0.004))


def desenhar(lado, altura_brasao):
    img = fundo(lado).convert("RGBA")
    brasao = Image.open(BRASAO).convert("RGBA")
    alt = round(lado * altura_brasao)
    larg = round(brasao.width * alt / brasao.height)
    brasao = brasao.resize((larg, alt), Image.LANCZOS)
    img.alpha_composite(brasao, ((lado - larg) // 2, (lado - alt) // 2))
    return img.convert("RGB")


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    desenhar(192, 0.78).save(SAIDA / "icone-192.png", optimize=True)
    desenhar(512, 0.78).save(SAIDA / "icone-512.png", optimize=True)
    desenhar(512, 0.60).save(SAIDA / "icone-maskable-512.png", optimize=True)
    desenhar(180, 0.74).save(SAIDA / "apple-touch-icon.png", optimize=True)
    for p in sorted(SAIDA.glob("*.png")):
        print(p.relative_to(RAIZ), p.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
