"""Enhance the birthday-site photos.

Put the originals in assets/photos/ using the file names in RECIPES (or 01..10),
as .jpg/.jpeg/.png/.webp. Run:

    python tools/enhance_photos.py

Enhanced copies go to assets/photos/enhanced/NN.jpg (originals are untouched).
"""
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "photos"
OUT = SRC / "enhanced"
MAX_SIDE = 1400

# Per-photo recipes. Keys:
#   wb       gray-world white balance strength (0..1) - fixes green/pink casts
#   gamma    <1 brightens shadows, >1 darkens
#   cutoff   autocontrast clip % per side
#   contrast / color / sharp   PIL enhancer factors (1 = unchanged)
#   denoise  median filter size (0 = off) for grainy SNOW / old phone shots
#   crop     (left, top, right, bottom) as fractions
#   quad     4 corners (UL, LL, LR, UR) as fractions - straightens a tilted print
RECIPES = {
    "01": dict(src="family shirts", cutoff=0.5, color=1.08, sharp=1.25),
    "02": dict(src="glasses selfie", cutoff=0.5, color=1.04, sharp=1.2),
    "03": dict(src="kids with cat filter", cutoff=0.8, color=1.06, sharp=1.2),
    "04": dict(src="bunny ears", wb=0.35, cutoff=1.5, contrast=1.08, color=1.12, denoise=3, sharp=1.35),
    "05": dict(src="puppy filter", wb=0.6, cutoff=1.0, contrast=1.05, color=0.9, denoise=3, sharp=1.5),
    "06": dict(src="red shirt", cutoff=0.3, gamma=1.05, color=1.04, sharp=1.2),
    "07": dict(src="wedding kiss", gamma=0.92, cutoff=0.8, contrast=1.05, color=1.06, sharp=1.3),
    "08": dict(src="cat ears", wb=0.3, gamma=0.85, cutoff=1.0, color=1.05, denoise=3, sharp=1.3),
    "09": dict(src="old mirror selfie", wb=0.6, gamma=0.88, cutoff=1.2, contrast=1.08, color=1.2, denoise=3, sharp=1.3),
    "10": dict(src="medals", crop=(0, 0.2, 1, 1), cutoff=0.5, color=1.05, sharp=1.2),
}


def gray_world(img, strength):
    """Pull the average colour toward neutral grey to remove colour casts."""
    means = ImageStat.Stat(img).mean[:3]
    avg = sum(means) / 3
    bands = []
    for band, m in zip(img.split(), means):
        gain = 1 + strength * (avg / max(m, 1) - 1)
        bands.append(band.point(lambda v, g=gain: min(255, int(v * g))))
    return Image.merge("RGB", bands)


def enhance(img, r):
    w, h = img.size
    if "quad" in r:
        (ulx, uly), (llx, lly), (lrx, lry), (urx, ury) = r["quad"]
        out_w = int(((urx - ulx) + (lrx - llx)) / 2 * w)
        out_h = int(((lly - uly) + (lry - ury)) / 2 * h)
        data = (ulx * w, uly * h, llx * w, lly * h, lrx * w, lry * h, urx * w, ury * h)
        img = img.transform((out_w, out_h), Image.Transform.QUAD, data, Image.Resampling.BICUBIC)
        # print is small in the source: upscale so it isn't tiny on screen
        img = img.resize((out_w * 2, out_h * 2), Image.Resampling.LANCZOS)
    if "crop" in r:
        l, t, rr, b = r["crop"]
        img = img.crop((int(l * w), int(t * h), int(rr * w), int(b * h)))
    if r.get("denoise"):
        img = img.filter(ImageFilter.MedianFilter(r["denoise"]))
    if r.get("wb"):
        img = gray_world(img, r["wb"])
    if r.get("gamma", 1) != 1:
        g = r["gamma"]
        img = img.point(lambda v: int(255 * (v / 255) ** g))
    if r.get("cutoff"):
        img = ImageOps.autocontrast(img, cutoff=r["cutoff"], preserve_tone=True)
    for key, cls in (("contrast", ImageEnhance.Contrast), ("color", ImageEnhance.Color)):
        if r.get(key, 1) != 1:
            img = cls(img).enhance(r[key])
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    if r.get("sharp", 1) != 1:
        img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=int((r["sharp"] - 1) * 200), threshold=2))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, recipe in RECIPES.items():
        names = {key, recipe.get("src", key)}
        src = next((p for p in sorted(SRC.iterdir()) if p.stem in names and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}), None)
        if not src:
            print(f"  {key}: missing - skipped")
            continue
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        enhance(img, recipe).save(OUT / f"{key}.jpg", quality=86, optimize=True, progressive=True)
        print(f"  {key}: {src.name} -> enhanced/{key}.jpg")


if __name__ == "__main__":
    main()
