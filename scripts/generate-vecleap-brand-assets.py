#!/usr/bin/env python3
"""Rasterize the Vecleap mark into desktop, installer, and web icon assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = ROOT / "apps" / "desktop"
LOGO_CANDIDATES = (
    DESKTOP / "resources" / "vecleap-logo-source.png",
    ROOT / "apps" / "web" / "public" / "vecleap-logo-source.png",
)


def resolve_logo() -> Path:
    for candidate in LOGO_CANDIDATES:
        if candidate.is_file():
            return candidate
    raise SystemExit(
        "Logo not found. Save the Vecleap mark PNG to "
        f"{LOGO_CANDIDATES[0]} (transparent or black background)."
    )


def strip_near_black(logo: Image.Image, threshold: int = 42) -> Image.Image:
    px = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b, a = px[x, y]
            if a > 0 and r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (r, g, b, 0)
    return logo


def load_mark() -> Image.Image:
    logo = Image.open(resolve_logo()).convert("RGBA")
    return strip_near_black(logo)


def fit_logo(canvas_size: int, padding: float = 0.12) -> Image.Image:
    logo = load_mark()
    side = int(canvas_size * (1 - 2 * padding))
    logo.thumbnail((side, side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    ox = (canvas_size - logo.width) // 2
    oy = (canvas_size - logo.height) // 2
    canvas.paste(logo, (ox, oy), logo)
    return canvas


def app_icon(canvas_size: int, padding: float = 0.14) -> Image.Image:
    """Windows/macOS application tile: light rounded square with the Vecleap mark."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = max(8, int(canvas_size * 0.1875))
    draw.rounded_rectangle((0, 0, canvas_size, canvas_size), radius=radius, fill=(255, 255, 255, 255))
    logo = load_mark()
    side = int(canvas_size * (1 - 2 * padding))
    logo.thumbnail((side, side), Image.Resampling.LANCZOS)
    ox = (canvas_size - logo.width) // 2
    oy = (canvas_size - logo.height) // 2
    canvas.paste(logo, (ox, oy), logo)
    return canvas


def write_icon_svg(path: Path, canvas_size: int) -> None:
    import base64
    import io

    png = app_icon(canvas_size)
    buf = io.BytesIO()
    png.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_size}" height="{canvas_size}" '
        f'viewBox="0 0 {canvas_size} {canvas_size}">\n'
        f'  <image href="data:image/png;base64,{encoded}" width="{canvas_size}" height="{canvas_size}"/>\n'
        "</svg>\n",
        encoding="utf-8",
    )


def brand_banner(width: int, height: int, dark: bool) -> Image.Image:
    bg = (21, 21, 23, 255) if dark else (255, 255, 255, 255)
    fg = (249, 250, 251, 255) if dark else (15, 17, 21, 255)
    canvas = Image.new("RGBA", (width, height), bg)
    draw = ImageDraw.Draw(canvas)
    logo = load_mark()
    mark_h = int(height * 0.72)
    logo.thumbnail((mark_h, mark_h), Image.Resampling.LANCZOS)
    x = int(width * 0.06)
    y = (height - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    try:
        font = ImageFont.truetype("segoeui.ttf", int(height * 0.28))
        font_light = ImageFont.truetype("segoeui.ttf", int(height * 0.24))
    except OSError:
        font = ImageFont.load_default()
        font_light = font
    text_x = x + logo.width + int(width * 0.04)
    draw.text((text_x, height * 0.22), "Vecleap", fill=fg, font=font)
    draw.text((text_x + int(width * 0.19), height * 0.22), "Harness", fill=(*fg[:3], 200), font=font_light)
    return canvas


def sidebar(width: int, height: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), (248, 250, 252, 255))
    logo = load_mark()
    mark = int(min(width, height) * 0.42)
    logo.thumbnail((mark, mark), Image.Resampling.LANCZOS)
    canvas.paste(logo, ((width - logo.width) // 2, (height - logo.height) // 2), logo)
    return canvas


def main() -> None:
    resolve_logo()

    resources = DESKTOP / "resources"
    for name, size in [("icon.png", 1104), ("icon-macos.png", 1104), ("icon-windows.png", 256)]:
        app_icon(size).save(resources / name, optimize=True)
    write_icon_svg(resources / "icon.svg", 1024)
    write_icon_svg(resources / "icon-windows.svg", 256)
    write_icon_svg(resources / "icon-macos.svg", 1024)

    assets = DESKTOP / "installer" / "assets"
    for name, dark in [("brand.png", False), ("brand-2x.png", False), ("brand-dark.png", True), ("brand-dark-2x.png", True)]:
        scale = 2 if name.endswith("2x.png") else 1
        img = brand_banner(600 * scale, 196 * scale, dark)
        img.save(assets / name, optimize=True)
    sidebar(164, 314).save(assets / "uninstaller-sidebar.png", optimize=True)

    welcome = DESKTOP / "renderer" / "assets"
    welcome.mkdir(parents=True, exist_ok=True)
    brand_banner(472, 40, False).save(welcome / "welcome-brand.png", optimize=True)

    web_public = ROOT / "apps" / "web" / "public"
    app_icon(50).save(web_public / "favicon.png", optimize=True)
    write_icon_svg(web_public / "favicon.svg", 50)

    client_brand = ROOT / "packages" / "client" / "ui-brand-official" / "src" / "client" / "assets"
    client_brand.mkdir(parents=True, exist_ok=True)
    mark_png = client_brand / "vecleap-mark.png"
    fit_logo(48).save(mark_png, optimize=True)
    import base64

    data_url = "data:image/png;base64," + base64.b64encode(mark_png.read_bytes()).decode()
    mark_ts = ROOT / "packages" / "client" / "ui-brand-official" / "src" / "client" / "vecleap-mark-data.ts"
    mark_ts.write_text(
        "/** Product mark as a data URL for client bundles. */\n"
        f"export const VECLEAP_MARK_DATA_URL = {data_url!r}\n",
        encoding="utf-8",
    )

    print("Vecleap brand assets written.")
    print("Next: pnpm --filter @deepseek-ai/dsh-desktop run render:tray-icon")


if __name__ == "__main__":
    main()
