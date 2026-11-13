from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/hatch/workspace/kiroween/payphantom/demo"
W, H = 1280, 720
BG = (13, 13, 28)
FG = (235, 235, 245)
MUT = (150, 150, 180)
ACC = (167, 139, 250)

def font(sz, bold=False):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/TTF/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def card(fname, lines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    y = H // 2 - sum(l[1] for l in lines) // 2 - 20
    for text, sz, color, bold in lines:
        f = font(sz, bold)
        bbox = d.textbbox((0, 0), text, font=f)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) // 2, y), text, font=f, fill=color)
        y += sz + 18
    img.save(os.path.join(OUT, fname))

card("title1.png", [
    ("PayPhantom", 72, FG, True),
    ("Chat jadi invoice PayPal - dan setiap pembayaran", 30, FG, False),
    ("pulang membawa struk NFT di BNB Chain.", 30, FG, False),
    ("Kiroween 2026  ·  Frankenstein  ·  PayPal Sandbox (live)", 24, MUT, False),
])
card("title2.png", [
    ("Begitu invoice dibayar, struk NFT dibuat", 40, FG, True),
    ("Bagian ini simulasi (mock mode):", 28, ACC, False),
    ("pembayaran sandbox asli butuh akun buyer PayPal.", 28, FG, False),
    ("Mint on-chain ditunda sampai operator mengonfirmasi.", 24, MUT, False),
])
print("titles written")
