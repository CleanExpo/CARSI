#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "marketing" / "ccw-roadshow" / "proofs"
LOGO = ROOT / "public" / "logo.png"

INK = "#0B0F14"
MUTED = "#465466"
BLUE = "#2490ED"
GREEN = "#14B981"
GOLD = "#F5B72E"
PAPER = "#F8FAFC"
LINE = "#D7E1EC"
WHITE = "#FFFFFF"

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


@dataclass(frozen=True)
class AssetSpec:
    filename: str
    size: tuple[int, int]
    variant: str


SPECS = [
    AssetSpec("ccw-roadshow-social-square-proof.png", (1080, 1080), "square"),
    AssetSpec("ccw-roadshow-social-portrait-proof.png", (1080, 1350), "portrait"),
    AssetSpec("ccw-roadshow-story-proof.png", (1080, 1920), "story"),
    AssetSpec("ccw-roadshow-linkedin-proof.png", (1200, 627), "linkedin"),
    AssetSpec("ccw-roadshow-email-header-proof.png", (1200, 600), "email"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(path, size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    max_width: int,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    line_gap: int = 8,
    max_lines: int | None = None,
) -> int:
    x, y = xy
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, fnt)[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    line_h = text_size(draw, "Ag", fnt)[1] + line_gap
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: str, fg: str = INK) -> tuple[int, int]:
    x, y = xy
    fnt = font(28, True)
    w, h = text_size(draw, text, fnt)
    pad_x, pad_y = 26, 13
    draw.rounded_rectangle((x, y, x + w + pad_x * 2, y + h + pad_y * 2), radius=28, fill=fill)
    draw.text((x + pad_x, y + pad_y - 2), text, font=fnt, fill=fg)
    return x + w + pad_x * 2, y + h + pad_y * 2


def paste_logo(img: Image.Image, x: int, y: int, size: int) -> None:
    logo = Image.open(LOGO).convert("RGBA").resize((size, size))
    tile = Image.new("RGBA", (size + 22, size + 22), WHITE)
    mask = Image.new("L", tile.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, tile.size[0], tile.size[1]), radius=18, fill=255)
    img.alpha_composite(tile, (x, y))
    img.alpha_composite(logo, (x + 11, y + 11))


def draw_outcome_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, body: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=22, fill=WHITE, outline=LINE, width=3)
    draw.ellipse((x1 + 28, y1 + 29, x1 + 48, y1 + 49), fill=accent)
    draw.text((x1 + 66, y1 + 22), title, font=font(31, True), fill=INK)
    draw_wrapped(draw, body, (x1 + 66, y1 + 68), x2 - x1 - 92, font(23), MUTED, line_gap=7, max_lines=2)


def draw_common(draw: ImageDraw.ImageDraw, img: Image.Image, w: int, h: int, compact: bool = False) -> None:
    draw.rectangle((0, 0, w, h), fill=PAPER)
    draw.rectangle((0, 0, w, 16), fill=BLUE)
    draw.rectangle((0, 16, w, 28), fill=GREEN)

    margin = max(56, w // 18)
    logo_size = 72 if compact else 86
    paste_logo(img, margin, margin, logo_size)
    brand_x = margin + logo_size + 36
    draw.text((brand_x, margin + 8), "CARSI x Carpet Cleaners Warehouse", font=font(30 if compact else 34, True), fill=GREEN)
    draw.text((brand_x, margin + 48), "Business Growth Days 2026", font=font(24 if compact else 28), fill=MUTED)


def draw_asset(spec: AssetSpec) -> Image.Image:
    w, h = spec.size
    img = Image.new("RGBA", (w, h), PAPER)
    draw = ImageDraw.Draw(img)
    compact = spec.variant in {"linkedin", "email"}
    draw_common(draw, img, w, h, compact)

    margin = max(56, w // 18)
    hero_top = 160 if compact else 210
    hero_size = 68 if compact else 86
    if spec.variant == "story":
        hero_size = 94

    hero_bottom = draw_wrapped(
        draw,
        "Grow Your Cleaning Business",
        (margin, hero_top),
        w - margin * 2,
        font(hero_size, True),
        INK,
        line_gap=12,
        max_lines=2 if compact else 3,
    )

    sub_y = hero_bottom + 24

    pill(draw, (margin, sub_y), "Spend two days with Phil McGurk", GREEN, WHITE)
    pill(draw, (margin, sub_y + 66), "Limited places available", GOLD, INK)

    footer_h = 150 if compact else 168 if spec.variant != "story" else 230
    footer_top = h - footer_h - margin // 2

    if compact:
        draw.rounded_rectangle(
            (margin, footer_top, w - margin, h - margin // 2),
            radius=30,
            fill=WHITE,
            outline=LINE,
            width=3,
        )
        f_y = footer_top + 30
        draw.text(
            (margin + 34, f_y),
            "Melbourne 22-23 July | Sydney 30-31 July",
            font=font(26, True),
            fill=INK,
        )
        draw.text(
            (margin + 34, f_y + 42),
            "$175 per person or $500 for five seats",
            font=font(23, True),
            fill=BLUE,
        )
        draw.text(
            (margin + 34, f_y + 78),
            "Book at carsi.com.au/events/ccw-roadshow",
            font=font(20),
            fill=MUTED,
        )
        return img.convert("RGB")

    body_y = sub_y + 150
    body = "Practical business-growth training inside Carpet Cleaners Warehouse: see equipment, compare solutions, ask real-world questions and leave with clearer quoting strategies."
    draw_wrapped(draw, body, (margin, body_y), w - margin * 2, font(32 if not compact else 27), MUTED, line_gap=10, max_lines=3)

    outcomes = [
        ("Win better-fit jobs", "Attract the right work and quote with confidence.", BLUE),
        ("Avoid costly mistakes", "Make smarter decisions before buying gear or adding services.", GREEN),
        ("Quote with confidence", "Explain value and set better expectations.", GOLD),
        ("Build a stronger business", "Connect systems, team language and follow-up.", BLUE),
    ]

    card_top = body_y + 150
    card_w = (w - margin * 2 - 24) // 2
    card_h = 145
    shown_outcomes = outcomes[:2] if spec.variant == "square" else outcomes
    for i, (title, body_text, accent) in enumerate(shown_outcomes):
        x = margin + (i % 2) * (card_w + 24)
        y = card_top + (i // 2) * (card_h + 24)
        draw_outcome_card(draw, (x, y, x + card_w, y + card_h), title, body_text, accent)

    draw.rounded_rectangle((margin, footer_top, w - margin, h - margin // 2), radius=30, fill=WHITE, outline=LINE, width=3)
    f_y = footer_top + 30
    footer_font = font(30 if not compact else 24, True)
    draw.text((margin + 34, f_y), "Melbourne 22-23 July | Sydney 30-31 July", font=footer_font, fill=INK)
    draw.text((margin + 34, f_y + 46), "$175 per person or $500 for five seats", font=font(28 if not compact else 22, True), fill=BLUE)
    draw.text((margin + 34, f_y + 88), "Book at carsi.com.au/events/ccw-roadshow", font=font(24 if not compact else 20), fill=MUTED)

    return img.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in SPECS:
        img = draw_asset(spec)
        path = OUT / spec.filename
        img.save(path, quality=95)
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
