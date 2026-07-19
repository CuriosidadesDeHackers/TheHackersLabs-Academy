"""Generador de certificados PNG — The Hackers Labs.
Adaptado del script de diseño v7: mismo layout, fuentes y QR de verificación.
"""
import os
import hashlib
import time
import random
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_DIR = Path(settings.BASE_DIR) / 'fonts'
LOGO_PATH = Path(settings.BASE_DIR).parent / 'assets' / 'logo.png'

BG_TOP, BG_BOT = (6, 6, 10), (16, 13, 22)
ORANGE, ORANGE_DK, ORANGE_LT, ORANGE_GL = (255, 148, 0), (150, 78, 0), (255, 200, 80), (255, 130, 0)
WHITE, OFFWHITE, GRAY_MID, GRAY_DIM = (255, 255, 255), (232, 224, 210), (148, 140, 132), (55, 52, 48)

_FONT_FILES = {
    'orbitron': FONT_DIR / 'Orbitron-Variable.ttf',
    'rajdhani_bold': FONT_DIR / 'Rajdhani-Bold.ttf',
    'rajdhani_semi': FONT_DIR / 'Rajdhani-SemiBold.ttf',
    'rajdhani_reg': FONT_DIR / 'Rajdhani-Regular.ttf',
    'rajdhani_light': FONT_DIR / 'Rajdhani-Light.ttf',
}
_FALLBACK = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def font(name, size):
    path = _FONT_FILES.get(name)
    if path and path.exists():
        f = ImageFont.truetype(str(path), size)
        if name == 'orbitron':
            try:
                f.set_variation_by_name('Bold')
            except Exception:
                pass
        return f
    return ImageFont.truetype(_FALLBACK, size)


def tsz(draw, text, fnt):
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[2] - bb[0], bb[3] - bb[1]


def cx(draw, text, y, W, fnt, color=WHITE):
    w, _ = tsz(draw, text, fnt)
    draw.text(((W - w) // 2, y), text, font=fnt, fill=color)


def vgradient(img, top, bot):
    W, H = img.size
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)


def radial_glow(W, H, gx, gy, radius, color, intensity):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(40, 0, -1):
        r = int(radius * i / 40)
        a = int(intensity * (i / 40) ** 2.4)
        d.ellipse([(gx - r, gy - r), (gx + r, gy + r)], fill=(*color, a))
    return layer.filter(ImageFilter.GaussianBlur(85))


def comp(cert, glow):
    return Image.alpha_composite(cert.convert('RGBA'), glow).convert('RGB')


def add_noise(img, n=5):
    pix = img.load()
    W, H = img.size
    for _ in range(W * H // 10):
        x = random.randint(0, W - 1)
        y = random.randint(0, H - 1)
        v = random.randint(-n, n)
        pix[x, y] = tuple(max(0, min(255, c + v)) for c in pix[x, y])


def scanlines(img, gap=8, alpha=13):
    W, H = img.size
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for y in range(0, H, gap):
        d.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')


def bracket(draw, x, y, size, fx, fy, color=ORANGE, lw=3):
    sx = -1 if fx else 1
    sy = -1 if fy else 1
    draw.line([(x, y), (x + sx * size, y)], fill=color, width=lw)
    draw.line([(x, y), (x, y + sy * size)], fill=color, width=lw)
    r = 5
    draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color)


def circuit_deco(draw, H, M, W):
    lc = (*ORANGE, 45)
    for side_x, flip in [(M + 110, False), (W - M - 110, True)]:
        for sy_frac in [0.38, 0.72]:
            sy = int(H * sy_frac)
            draw.line([(side_x, sy - 110), (side_x, sy + 110)], fill=lc, width=2)
            draw.ellipse([(side_x - 5, sy - 5), (side_x + 5, sy + 5)], fill=ORANGE)
            ex = side_x + (-65 if flip else 65)
            draw.line([(side_x, sy), (ex, sy)], fill=lc, width=2)
            draw.ellipse([(ex - 3, sy - 3), (ex + 3, sy + 3)], fill=(*ORANGE, 100))


def fade_line(draw, cx_pos, y, half_w):
    for i in range(half_w):
        a = int(190 * i / half_w)
        draw.point((cx_pos - half_w + i, y), fill=(*GRAY_DIM, a))
        draw.point((cx_pos + i, y), fill=(*GRAY_DIM, 190 - int(190 * i / half_w)))


def ornament(draw, W, y, span=860):
    cx_pos = W // 2
    fade_line(draw, cx_pos, y, span // 2)
    for dx, rr, al in [(0, 9, 255), (-58, 4, 150), (58, 4, 150)]:
        draw.polygon(
            [(cx_pos + dx, y - rr), (cx_pos + dx + rr, y), (cx_pos + dx, y + rr), (cx_pos + dx - rr, y)],
            fill=(*ORANGE, al)
        )


def course_frame(draw, tx, ty, tw, th, px=40, py=24):
    x1, y1 = tx - px, ty - py
    x2, y2 = tx + tw + px, ty + th + py
    draw.rectangle([x1, y1, x2, y2], outline=(*ORANGE, 38), width=1)
    cs = 26
    for bx, by, sx, sy in [(x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)]:
        draw.line([(bx, by), (bx + sx * cs, by)], fill=(*ORANGE, 150), width=2)
        draw.line([(bx, by), (bx, by + sy * cs)], fill=(*ORANGE, 150), width=2)


def make_qr(url: str, size_px: int) -> Image.Image:
    import qrcode
    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=ORANGE, back_color=(20, 18, 28))
    return img.convert('RGBA').resize((size_px, size_px), Image.NEAREST)


def generate_certificate(student_name, course_name, completion_date, cert_id, verify_url, output_path):
    W, H = 2480, 1754
    M = 52

    cert = Image.new('RGB', (W, H), BG_TOP)
    vgradient(cert, BG_TOP, BG_BOT)
    cert = comp(cert, radial_glow(W, H, W // 2, int(H * 0.35), 1150, ORANGE_GL, 36))
    cert = comp(cert, radial_glow(W, H, W // 2, int(H * 0.80), 750, ORANGE_GL, 14))
    add_noise(cert, 3)

    draw = ImageDraw.Draw(cert, 'RGBA')

    m2 = M + 18
    draw.rectangle([M, M, W - M, H - M], outline=GRAY_DIM, width=2)
    draw.rectangle([m2, m2, W - m2, H - m2], outline=(*ORANGE, 48), width=1)
    bs = 90
    bracket(draw, M + 2, M + 2, bs, False, False)
    bracket(draw, W - M - 2, M + 2, bs, True, False)
    bracket(draw, M + 2, H - M - 2, bs, False, True)
    bracket(draw, W - M - 2, H - M - 2, bs, True, True)
    circuit_deco(draw, H, M, W)

    MAX_W = W - 480

    f_brand = font('orbitron', 92)
    f_lbl = font('rajdhani_light', 40)
    f_cert = font('rajdhani_reg', 46)
    f_cert_s = font('rajdhani_reg', 44)

    f_name = font('rajdhani_bold', 150)
    nw, nh = tsz(draw, student_name, f_name)
    if nw > MAX_W:
        f_name = font('rajdhani_bold', int(150 * MAX_W / nw))
        nw, nh = tsz(draw, student_name, f_name)

    f_course = font('rajdhani_semi', 84)
    cw, ch = tsz(draw, course_name, f_course)
    if cw > MAX_W:
        f_course = font('rajdhani_semi', int(84 * MAX_W / cw))
        cw, ch = tsz(draw, course_name, f_course)

    LOGO_H = 330
    _, bh = tsz(draw, 'THE HACKERS LABS', f_brand)
    _, lh = tsz(draw, 'CERTIFICADO DE FINALIZACION', f_lbl)
    _, cqh = tsz(draw, 'certifica que', f_cert)
    _, cmh = tsz(draw, 'ha completado', f_cert_s)
    ORN_H = 18
    FRAME_PY = 24 * 2

    QR_SIZE = 250
    QR_PAD = 14
    QR_BOX_H = QR_SIZE + QR_PAD * 2 + 40
    CHIP_H_est = 110
    PIE_H = max(QR_BOX_H, CHIP_H_est) + 20

    BODY_FIXED = (LOGO_H + bh + lh + cqh + nh + cmh + (ch + FRAME_PY) + ORN_H + PIE_H)

    USABLE = H - M * 2 - 20
    GAP_TOTAL = USABLE - BODY_FIXED

    gap_weights = [0.95, 0.6, 0.7, 1.25, 0.95, 1.3, 1.65, 1.45, 1.15]
    total_w = sum(gap_weights)
    gaps = [int(GAP_TOTAL * w / total_w) for w in gap_weights]
    gaps[-1] += GAP_TOTAL - sum(gaps)

    y = M + 10

    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert('RGBA')
        logo_w = int(logo.width * LOGO_H / logo.height)
        logo = logo.resize((logo_w, LOGO_H), Image.LANCZOS)
        cert.paste(logo, ((W - logo_w) // 2, y), logo)
        draw = ImageDraw.Draw(cert, 'RGBA')
        y += LOGO_H
    y += gaps[0]

    bw, _ = tsz(draw, 'THE HACKERS LABS', f_brand)
    bx = (W - bw) // 2
    draw.text((bx + 4, y + 4), 'THE HACKERS LABS', font=f_brand, fill=(*ORANGE_DK, 200))
    draw.text((bx, y), 'THE HACKERS LABS', font=f_brand, fill=ORANGE)
    y += bh + gaps[1]

    fade_line(draw, W // 2, y, 300)
    y += gaps[2]

    cx(draw, 'CERTIFICADO  DE  FINALIZACION', y, W, f_lbl, GRAY_MID)
    y += lh + gaps[3]

    cx(draw, 'certifica que', y, W, f_cert, GRAY_MID)
    y += cqh + gaps[4]

    draw.text(((W - nw) // 2, y), student_name, font=f_name, fill=WHITE)
    y += nh + gaps[5]

    cx(draw, 'ha completado satisfactoriamente el curso', y, W, f_cert_s, GRAY_MID)
    y += cmh + gaps[6]

    ccx = (W - cw) // 2
    course_frame(draw, ccx, y, cw, ch)
    draw.text((ccx + 3, y + 3), course_name, font=f_course, fill=(*ORANGE_DK, 160))
    draw.text((ccx, y), course_name, font=f_course, fill=ORANGE_LT)
    y += ch + FRAME_PY + gaps[7]

    ornament(draw, W, y)
    y += ORN_H + gaps[8]

    PIE_Y = y
    COL_L = W // 5
    COL_M = W // 2
    COL_R = W * 4 // 5

    f_pl = font('rajdhani_light', 36)
    f_pv = font('rajdhani_semi', 54)
    f_id_lbl = font('rajdhani_light', 30)
    f_id_val = font('orbitron', 36)

    lbl_f = 'FECHA DE EMISION'
    lfw, _ = tsz(draw, lbl_f, f_pl)
    dw, dh = tsz(draw, completion_date, f_pv)
    draw.text((COL_L - lfw // 2, PIE_Y), lbl_f, font=f_pl, fill=GRAY_MID)
    draw.text((COL_L - dw // 2, PIE_Y + 44), completion_date, font=f_pv, fill=OFFWHITE)

    chip_lbl = 'CERTIFICADO No.'
    chip_val = f'THL-{cert_id}'
    clw, clh = tsz(draw, chip_lbl, f_id_lbl)
    cvw, cvh = tsz(draw, chip_val, f_id_val)

    cp_x, cp_y = 44, 20
    chip_w = max(clw, cvw) + cp_x * 2
    chip_h = clh + cvh + cp_y * 2 + 14
    chip_x = COL_M - chip_w // 2
    chip_y = PIE_Y - 8

    draw.rounded_rectangle(
        [chip_x, chip_y, chip_x + chip_w, chip_y + chip_h],
        radius=10, fill=(28, 26, 36), outline=ORANGE, width=2
    )
    draw.line([(chip_x + 18, chip_y + 2), (chip_x + chip_w - 18, chip_y + 2)], fill=ORANGE_LT, width=1)
    for bx2, by2 in [(chip_x + 8, chip_y + 8), (chip_x + chip_w - 8, chip_y + 8),
                     (chip_x + 8, chip_y + chip_h - 8), (chip_x + chip_w - 8, chip_y + chip_h - 8)]:
        draw.ellipse([(bx2 - 3, by2 - 3), (bx2 + 3, by2 + 3)], fill=(*ORANGE, 140))

    draw.text((chip_x + (chip_w - clw) // 2, chip_y + cp_y), chip_lbl, font=f_id_lbl, fill=GRAY_MID)
    draw.text((chip_x + (chip_w - cvw) // 2, chip_y + cp_y + clh + 12), chip_val, font=f_id_val, fill=ORANGE_LT)

    sep_top = PIE_Y - 20
    sep_bot = chip_y + chip_h + 20
    for sx in [W // 3, W * 2 // 3]:
        draw.line([(sx, sep_top), (sx, sep_bot)], fill=(*GRAY_DIM, 100), width=1)
        draw.ellipse([(sx - 3, sep_top - 3), (sx + 3, sep_top + 3)], fill=(*ORANGE, 55))
        draw.ellipse([(sx - 3, sep_bot - 3), (sx + 3, sep_bot + 3)], fill=(*ORANGE, 55))

    qr_img = make_qr(verify_url, QR_SIZE)
    qr_pad = QR_PAD
    qr_bw = QR_SIZE + qr_pad * 2
    qr_bh = QR_SIZE + qr_pad * 2 + 40
    qr_bx = COL_R - qr_bw // 2
    qr_by = PIE_Y - 8

    draw.rounded_rectangle(
        [qr_bx, qr_by, qr_bx + qr_bw, qr_by + qr_bh],
        radius=10, fill=(28, 26, 36), outline=(*ORANGE, 80), width=1
    )
    cert.paste(qr_img, (qr_bx + qr_pad, qr_by + qr_pad), qr_img)
    draw = ImageDraw.Draw(cert, 'RGBA')

    f_qrl = font('rajdhani_light', 26)
    ql = 'Escanea para verificar'
    qlw, _ = tsz(draw, ql, f_qrl)
    draw.text((qr_bx + (qr_bw - qlw) // 2, qr_by + qr_pad + QR_SIZE + 8), ql, font=f_qrl, fill=GRAY_MID)

    f_url = font('rajdhani_light', 26)
    url_txt = verify_url.replace('https://', '').replace('http://', '')
    urlw, _ = tsz(draw, url_txt, f_url)
    draw.text(((W - urlw) // 2, H - M - 44), url_txt, font=f_url, fill=(*GRAY_MID, 150))

    cert = scanlines(cert, gap=8, alpha=7)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cert.save(output_path, 'PNG', dpi=(300, 300))
    return output_path


_MESES_ES = [
    '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]


def format_date_es(dt):
    return f"{dt.day:02d} de {_MESES_ES[dt.month]} de {dt.year}"


def new_cert_id(user, course):
    raw = f'{user.id}|{course.id}|{time.time()}|{random.random()}'
    return hashlib.sha256(raw.encode()).hexdigest()[:20].upper()


def build_for(certificate):
    """Renders the PNG for a Certificate instance and saves it onto certificate.image."""
    from django.core.files.base import ContentFile

    user = certificate.user
    course = certificate.course
    student_name = (f'{user.first_name} {user.last_name}'.strip()) or user.username
    verify_url = f"{settings.FRONTEND_URL}/verify/{certificate.cert_id}"
    date_str = format_date_es(certificate.issued_at)

    tmp_path = Path(settings.MEDIA_ROOT) / 'certificates' / f'{certificate.cert_id}.png'
    generate_certificate(
        student_name=student_name,
        course_name=course.title,
        completion_date=date_str,
        cert_id=certificate.cert_id,
        verify_url=verify_url,
        output_path=str(tmp_path),
    )
    with open(tmp_path, 'rb') as f:
        certificate.image.save(f'{certificate.cert_id}.png', ContentFile(f.read()), save=False)
    os.remove(tmp_path)
    return certificate
