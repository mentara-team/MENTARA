from __future__ import annotations

import os
from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True)
class BgRemovalConfig:
    # Color-distance threshold to consider a pixel background.
    threshold: float = 28.0
    # Soft band for anti-aliased edges.
    soft_band: float = 40.0
    # If background is very close to white, clamp to this.
    prefer_white_if_close: bool = True


def _avg_color(colors: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    r = sum(c[0] for c in colors) / len(colors)
    g = sum(c[1] for c in colors) / len(colors)
    b = sum(c[2] for c in colors) / len(colors)
    return int(r), int(g), int(b)


def _dist(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def _guess_background_rgb(img: Image.Image, cfg: BgRemovalConfig) -> tuple[int, int, int]:
    w, h = img.size
    corners = [
        img.getpixel((0, 0))[:3],
        img.getpixel((w - 1, 0))[:3],
        img.getpixel((0, h - 1))[:3],
        img.getpixel((w - 1, h - 1))[:3],
    ]
    bg = _avg_color(corners)

    if cfg.prefer_white_if_close and _dist(bg, (255, 255, 255)) < 18:
        return (255, 255, 255)

    return bg


def remove_bg_and_crop(src: str, dst: str, cfg: BgRemovalConfig = BgRemovalConfig()) -> tuple[int, int]:
    img = Image.open(src).convert("RGBA")
    bg = _guess_background_rgb(img, cfg)

    data = list(img.getdata())
    out = []

    thr = cfg.threshold
    soft = cfg.soft_band

    for r, g, b, a in data:
        if a == 0:
            out.append((r, g, b, 0))
            continue

        d = _dist((r, g, b), bg)
        if d <= thr:
            out.append((r, g, b, 0))
        elif d <= thr + soft:
            # fade alpha proportionally through the soft band
            t = (d - thr) / soft
            out.append((r, g, b, int(a * t)))
        else:
            out.append((r, g, b, a))

    img.putdata(out)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img.save(dst, optimize=True)
    return img.size


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_path = os.path.join(root, "frontend", "public", "branding", "mentara-logo.png")
    dst_path = os.path.join(root, "frontend", "public", "branding", "mentara-logo-transparent.png")

    size = remove_bg_and_crop(src_path, dst_path)
    print(f"Wrote {dst_path} (size={size[0]}x{size[1]})")
