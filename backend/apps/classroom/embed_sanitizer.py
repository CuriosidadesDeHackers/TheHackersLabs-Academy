"""Normaliza embed_code para lecciones tipo 'embed'.

Solo se permite un único <iframe> apuntando a un dominio de la allowlist,
con un subconjunto de atributos seguros.
"""
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

from rest_framework import serializers

ALLOWED_EMBED_HOSTS = {
    'www.youtube.com',
    'youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
}

ALLOWED_IFRAME_ATTRS = {
    'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title', 'loading',
}


class _SingleIframeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags_seen = []
        self.iframe_attrs = None
        self.error = None

    def handle_starttag(self, tag, attrs):
        self.tags_seen.append(tag)
        if tag != 'iframe' or self.iframe_attrs is not None:
            self.error = f"Tag no permitido: <{tag}>"
            return
        self.iframe_attrs = dict(attrs)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag != 'iframe':
            self.error = f"Tag no permitido: </{tag}>"

    def handle_data(self, data):
        if data.strip():
            self.error = 'No se permite texto/JS fuera del <iframe>.'


def sanitize_embed_code(raw):
    """Valida que embed_code sea exactamente un <iframe> hacia un dominio
    permitido y devuelve una versión reconstruida (solo atributos seguros).
    Lanza ValidationError si no cumple el formato esperado."""
    raw = (raw or '').strip()
    if not raw:
        return ''

    parser = _SingleIframeParser()
    try:
        parser.feed(raw)
        parser.close()
    except Exception:
        raise serializers.ValidationError('embed_code no es HTML válido.')

    if parser.error:
        raise serializers.ValidationError(parser.error)
    if parser.iframe_attrs is None:
        raise serializers.ValidationError('embed_code debe contener exactamente un <iframe>.')

    src = parser.iframe_attrs.get('src', '')
    parsed = urlparse(src)
    if parsed.scheme != 'https' or parsed.netloc not in ALLOWED_EMBED_HOSTS:
        raise serializers.ValidationError(
            f'El src del iframe debe ser https y pertenecer a uno de estos dominios: '
            f'{", ".join(sorted(ALLOWED_EMBED_HOSTS))}.'
        )

    safe_attrs = {k: v for k, v in parser.iframe_attrs.items() if k in ALLOWED_IFRAME_ATTRS}
    safe_attrs['src'] = src
    attr_str = ' '.join(
        f'{k}="{escape(v, quote=True)}"' if v is not None else k
        for k, v in safe_attrs.items()
    )
    return f'<iframe {attr_str}></iframe>'
