"""Monta web/public/jogo/index.html a partir de jogo-arthur/index.html.

O index.html daqui é o fonte: um fragmento (sem <html>/<head>), porque é o
formato que a prévia no Claude espera. O Portal serve arquivo estático, então
precisa do documento completo — este script só embrulha o fragmento.
Rodar da raiz do repositório:  python jogo-arthur/publicar_no_portal.py
"""
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
fonte = (raiz / "jogo-arthur" / "index.html").read_text(encoding="utf-8")
destino = raiz / "web" / "public" / "jogo" / "index.html"
destino.parent.mkdir(parents=True, exist_ok=True)

cabeca = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#cfeeff">
<!-- GERADO por jogo-arthur/publicar_no_portal.py — editar jogo-arthur/index.html, não este arquivo. -->
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}body{margin:0}img{max-width:100%}</style>
"""
# <title>, <link> e <style> do fragmento ficam no <head>; o resto vai pro <body>.
corte = fonte.index("</style>") + len("</style>")
html = cabeca + fonte[:corte] + "\n</head>\n<body>\n" + fonte[corte:] + "\n</body>\n</html>\n"
destino.write_text(html, encoding="utf-8")
print(f"ok: {destino.relative_to(raiz)} ({len(html)//1024} KB)")
