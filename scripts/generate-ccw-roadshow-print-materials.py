#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A5
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
LOGO = ROOT / "public" / "logo.png"
BOOKING_URL = "https://carsi.com.au/events/ccw-roadshow"

BLUE = colors.HexColor("#2490ED")
GREEN = colors.HexColor("#34D399")
GOLD = colors.HexColor("#FBBF24")
INK = colors.HexColor("#0B0F14")
MUTED = colors.HexColor("#4B5563")
PAPER = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#D8E0EA")


@dataclass(frozen=True)
class OfficeEvent:
    slug: str
    city: str
    dates: str
    weekday: str
    venue: str
    address: str
    qr_source: str


EVENTS = [
    OfficeEvent(
        slug="melbourne",
        city="Melbourne",
        dates="22-23 July 2026",
        weekday="Wednesday + Thursday",
        venue="CCW Melbourne",
        address="Unit 1/5 Gatwick Road, Bayswater North VIC 3153",
        qr_source="ccw_melbourne_counter",
    ),
    OfficeEvent(
        slug="sydney",
        city="Sydney",
        dates="30-31 July 2026",
        weekday="Thursday + Friday",
        venue="CCW Sydney",
        address="2/8 Tollis Place, Seven Hills NSW 2147",
        qr_source="ccw_sydney_counter",
    ),
]


def booking_url(event: OfficeEvent) -> str:
    return (
        f"{BOOKING_URL}?event={event.slug}"
        f"&utm_source={event.qr_source}&utm_medium=print&utm_campaign=ccw_roadshow_2026"
    )


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str,
    size: float,
    leading: float,
    color=INK,
    max_lines: int | None = None,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_centered_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str,
    size: float,
    leading: float,
    color=INK,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        c.drawCentredString(x + width / 2, y, line)
        y -= leading
    return y


def pill(c: canvas.Canvas, x: float, y: float, label: str, fill, stroke=None, text=INK) -> None:
    c.setFont("Helvetica-Bold", 9)
    pad_x = 10
    w = c.stringWidth(label, "Helvetica-Bold", 9) + pad_x * 2
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y - 8, w, 18, 9, fill=1, stroke=1)
    c.setFillColor(text)
    c.drawString(x + pad_x, y - 2.5, label)


def draw_logo(c: canvas.Canvas, x: float, y: float, size: float) -> None:
    c.drawImage(ImageReader(str(LOGO)), x, y, width=size, height=size, mask="auto")


def draw_qr(c: canvas.Canvas, url: str, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    c.setFillColor(colors.white)
    c.roundRect(x - 8, y - 8, size + 16, size + 16, 12, fill=1, stroke=0)
    renderPDF.draw(drawing, c, x, y)


def draw_topic_grid(c: canvas.Canvas, x: float, y: float, width: float) -> float:
    topics = [
        "Carpet cleaning",
        "Rug cleaning",
        "Stain removal",
        "Tile cleaning",
        "Equipment + chemicals",
        "Business growth",
    ]
    col_gap = 10
    box_w = (width - col_gap) / 2
    box_h = 36
    for i, topic in enumerate(topics):
        col = i % 2
        row = i // 2
        bx = x + col * (box_w + col_gap)
        by = y - row * (box_h + 8)
        c.setFillColor(colors.white)
        c.setStrokeColor(LINE)
        c.roundRect(bx, by - box_h, box_w, box_h, 8, fill=1, stroke=1)
        c.setFillColor(BLUE if i % 2 == 0 else GREEN)
        c.circle(bx + 14, by - 18, 3.2, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bx + 24, by - 22, topic)
    return y - 3 * (box_h + 8)


def draw_footer(c: canvas.Canvas, page_w: float, y: float) -> None:
    c.setStrokeColor(LINE)
    c.line(36, y + 18, page_w - 36, y + 18)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawString(36, y, "CARSI is professional continuing education and is not an RTO.")
    c.drawRightString(page_w - 36, y, "Book at carsi.com.au/events/ccw-roadshow")


def draw_price_pills(c: canvas.Canvas, x: float, y: float, gap: float = 12) -> None:
    pill(c, x, y, "$175 each", GREEN, text=INK)
    pill(c, x + 90 + gap, y, "$500 for 5", GOLD, text=INK)


def flyer(c: canvas.Canvas, event: OfficeEvent) -> None:
    page_w, page_h = A4
    margin = 36

    c.setFillColor(PAPER)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    c.setFillColor(INK)
    c.rect(0, page_h - 255, page_w, 255, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(0, page_h - 255, 9, 255, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(9, page_h - 255, 5, 255, fill=1, stroke=0)

    draw_logo(c, margin, page_h - 98, 58)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin + 72, page_h - 60, "CARSI x Carpet Cleaners Warehouse")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 35)
    y = page_h - 135
    y = draw_wrapped(
        c,
        "Business Growth Days",
        margin,
        y,
        page_w - margin * 2 - 130,
        "Helvetica-Bold",
        35,
        39,
        colors.white,
    )
    c.setFont("Helvetica-Bold", 19)
    c.setFillColor(GOLD)
    c.drawString(margin, y - 8, f"{event.city} - {event.dates}")
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.72))
    c.drawString(margin, y - 32, "8.30am-4.30pm both days")

    draw_qr(c, booking_url(event), page_w - margin - 105, page_h - 145, 95)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(page_w - margin - 57, page_h - 164, "SCAN TO BOOK")

    content_top = page_h - 292
    left_w = 305
    right_x = margin + left_w + 24

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, content_top, "For walk-in customers ready to grow")
    draw_wrapped(
        c,
        "A practical two-day event for carpet cleaners, cleaners adding carpet or tile services, rug and stain removal operators, and teams wanting clearer business growth direction.",
        margin,
        content_top - 28,
        left_w,
        "Helvetica",
        11,
        16,
        MUTED,
    )

    grid_bottom = draw_topic_grid(c, margin, content_top - 112, left_w)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, grid_bottom - 10, "What customers will leave with")
    bullets = [
        "A clearer link between training, equipment, chemicals and service offers.",
        "Better questions to ask before buying gear or adding a new service.",
        "Practical confidence around quoting, customer expectations and follow-up.",
    ]
    by = grid_bottom - 34
    for bullet in bullets:
        c.setFillColor(BLUE)
        c.circle(margin + 4, by + 4, 2.8, fill=1, stroke=0)
        by = draw_wrapped(c, bullet, margin + 14, by, left_w - 14, "Helvetica", 10.5, 14, MUTED)
        by -= 4

    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(right_x, content_top - 320, page_w - right_x - margin, 320, 12, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.roundRect(right_x, content_top - 52, page_w - right_x - margin, 52, 12, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(right_x + 18, content_top - 32, "Books are essential")

    info_y = content_top - 78
    details = [
        ("Date", f"{event.weekday}, {event.dates}"),
        ("Time", "8.30am-4.30pm both days"),
        ("Venue", event.venue),
        ("Address", event.address),
    ]
    for label, value in details:
        c.setFillColor(GREEN if label == "Price" else BLUE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(right_x + 18, info_y, label.upper())
        info_y = draw_wrapped(
            c,
            value,
            right_x + 18,
            info_y - 14,
            page_w - right_x - margin - 36,
            "Helvetica-Bold",
            12,
            15,
            INK,
        )
        info_y -= 7

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(right_x + 18, info_y, "PRICE")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(right_x + 18, info_y - 15, "$175 per person")
    c.drawString(right_x + 18, info_y - 31, "$500 for 5 seats")

    draw_footer(c, page_w, 34)
    c.showPage()


def counter_card(c: canvas.Canvas, event: OfficeEvent) -> None:
    page_w, page_h = A5
    margin = 28

    c.setFillColor(INK)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(0, 0, 12, page_h, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(12, 0, 6, page_h, fill=1, stroke=0)

    draw_logo(c, margin, page_h - 78, 48)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 60, page_h - 48, "CARSI x CCW")
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.6))
    c.setFont("Helvetica", 8)
    c.drawString(margin + 60, page_h - 62, "Business Growth Days")

    y = page_h - 118
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 31)
    y = draw_centered_wrapped(c, "Grow Your Cleaning Business", margin, y, page_w - margin * 2, "Helvetica-Bold", 31, 34, colors.white)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(page_w / 2, y - 4, f"{event.city} - {event.dates}")

    c.setFillColor(colors.Color(1, 1, 1, alpha=0.72))
    c.setFont("Helvetica", 11)
    c.drawCentredString(page_w / 2, y - 28, "Carpet cleaning | Rugs | Stains | Tile | Growth")
    c.drawCentredString(page_w / 2, y - 45, "8.30am-4.30pm both days")

    card_y = y - 76
    c.setFillColor(colors.white)
    c.roundRect(margin, card_y - 130, page_w - margin * 2, 130, 14, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(page_w / 2, card_y - 28, "Books are essential")
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(page_w / 2, card_y - 60, "$175 per person")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(page_w / 2, card_y - 88, "$500 for 5 seats")
    draw_centered_wrapped(
        c,
        f"{event.venue} - {event.address}",
        margin + 20,
        card_y - 112,
        page_w - margin * 2 - 40,
        "Helvetica",
        8.5,
        10,
        MUTED,
    )

    qr_size = 118
    qr_x = page_w / 2 - qr_size / 2
    qr_y = 70
    draw_qr(c, booking_url(event), qr_x, qr_y, qr_size)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2, qr_y - 26, "SCAN TO BOOK")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.6))
    c.drawCentredString(page_w / 2, 26, "carsi.com.au/events/ccw-roadshow")

    c.showPage()


def write_pdf(filename: str, pagesize: tuple[float, float], draw_func, event: OfficeEvent) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    c = canvas.Canvas(str(path), pagesize=pagesize)
    c.setTitle(filename.replace("-", " ").replace(".pdf", ""))
    draw_func(c, event)
    c.save()
    return path


def write_print_pack(paths: Iterable[Path]) -> Path:
    from pypdf import PageObject, PdfReader, PdfWriter, Transformation

    pack = OUT / "ccw-roadshow-office-print-pack.pdf"
    writer = PdfWriter()
    a4_w, a4_h = A4
    for path in paths:
        reader = PdfReader(str(path))
        for page in reader.pages:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            if abs(width - a4_w) < 1 and abs(height - a4_h) < 1:
                writer.add_page(page)
                continue

            sheet = PageObject.create_blank_page(width=a4_w, height=a4_h)
            scale = min((a4_w - 72) / width, (a4_h - 72) / height)
            tx = (a4_w - width * scale) / 2
            ty = (a4_h - height * scale) / 2
            sheet.merge_transformed_page(page, Transformation().scale(scale).translate(tx, ty))
            writer.add_page(sheet)
    with pack.open("wb") as fh:
        writer.write(fh)
    return pack


def main() -> None:
    generated: list[Path] = []
    for event in EVENTS:
        generated.append(write_pdf(f"ccw-roadshow-{event.slug}-a4-flyer.pdf", A4, flyer, event))
        generated.append(
            write_pdf(f"ccw-roadshow-{event.slug}-a5-counter-card.pdf", A5, counter_card, event)
        )
    generated.append(write_print_pack(generated))
    for path in generated:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
