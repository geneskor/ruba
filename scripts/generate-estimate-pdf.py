#!/usr/bin/env python3

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def register_fonts() -> tuple[str, str]:
    regular_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]

    regular_path = next((p for p in regular_candidates if Path(p).exists()), None)
    bold_path = next((p for p in bold_candidates if Path(p).exists()), None)

    if regular_path:
        pdfmetrics.registerFont(TTFont("DocRegular", regular_path))
        if bold_path:
            pdfmetrics.registerFont(TTFont("DocBold", bold_path))
            return "DocRegular", "DocBold"
        return "DocRegular", "DocRegular"

    return "Helvetica", "Helvetica-Bold"


def money(amount: int) -> str:
    return f"{amount:,}".replace(",", " ")


def build_pdf(
    output: Path,
    estimate_number: str,
    estimate_date: str,
    customer: str,
    executor: str,
    project: str,
) -> None:
    font_regular, font_bold = register_fonts()
    output.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Смета {estimate_number}",
        author=executor,
        subject=project,
    )

    style_title = ParagraphStyle(
        "title",
        fontName=font_bold,
        fontSize=15,
        leading=19,
        alignment=1,
    )
    style_h = ParagraphStyle(
        "h",
        fontName=font_bold,
        fontSize=11,
        leading=14,
    )
    style = ParagraphStyle(
        "body",
        fontName=font_regular,
        fontSize=10.5,
        leading=14,
    )
    style_right = ParagraphStyle(
        "right",
        parent=style,
        alignment=2,
    )

    rows = [
        ("1", "Проектирование структуры и прототипов страниц", 9000),
        ("2", "Дизайн и адаптивная верстка ключевых страниц", 19000),
        ("3", "Разработка каталога (категории, карточки, навигация)", 18000),
        ("4", "Блоговый раздел и шаблоны статей", 8000),
        ("5", "SEO-база (meta, canonical, sitemap, schema)", 9000),
        ("6", "Формы заявок и клиентские скрипты", 7000),
        ("7", "Настройка деплоя на VPS (nginx, SSL, публикация)", 8000),
        ("8", "Тестирование, правки и запуск", 2000),
    ]
    total = sum(item[2] for item in rows)

    story = [
        Paragraph("СМЕТА НА ИЗГОТОВЛЕНИЕ САЙТА", style_title),
        Spacer(1, 5 * mm),
        Paragraph(f"№ {estimate_number} от {estimate_date}", style_h),
        Spacer(1, 3 * mm),
        Paragraph(f"Проект: {project}", style),
        Spacer(1, 5 * mm),
    ]

    table_data = [
        [
            Paragraph("<b>№</b>", style),
            Paragraph("<b>Наименование работ</b>", style),
            Paragraph("<b>Стоимость, руб.</b>", style_right),
        ]
    ]

    for idx, name, amount in rows:
        table_data.append(
            [
                Paragraph(idx, style),
                Paragraph(name, style),
                Paragraph(money(amount), style_right),
            ]
        )

    table_data.append(
        [
            "",
            Paragraph(f"<b>ИТОГО</b>", style),
            Paragraph(f"<b>{money(total)}</b>", style_right),
        ]
    )

    table = Table(table_data, colWidths=[12 * mm, 122 * mm, 36 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), font_bold),
                ("FONTNAME", (1, -1), (2, -1), font_bold),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    story.extend(
        [
            table,
            Spacer(1, 6 * mm),
            Paragraph(
                f"Итого к оплате: <b>{money(total)} руб.</b> (Восемьдесят тысяч рублей 00 копеек).",
                style,
            ),
            Spacer(1, 4 * mm),
            Paragraph(
                "<b>Примечание.</b> Все дальнейшие правки после сдачи сайта оплачиваются отдельно "
                "по согласованной стоимости. Поскольку сайт только передан в работу, правки в "
                "течение ближайших двух календарных дней — с 21 по 23 апреля 2026 года "
                "включительно — выполняются бесплатно.",
                style,
            ),
            Spacer(1, 3 * mm),
            Paragraph(
                "Передача прав администрирования и всех технических доступов к сайту "
                "осуществляется Исполнителем в течение 1 рабочего дня с даты поступления "
                "полной оплаты.",
                style,
            ),
            Spacer(1, 8 * mm),
        ]
    )

    doc.build(story)


def parse_args() -> argparse.Namespace:
    today = date.today().strftime("%d.%m.%Y")
    parser = argparse.ArgumentParser(description="Генерация PDF-сметы на сайт.")
    parser.add_argument(
        "--output",
        default=f"docs/smeta-{date.today().isoformat()}.pdf",
        help="Путь к выходному PDF файлу.",
    )
    parser.add_argument(
        "--number",
        default=f"SM-{date.today().isoformat()}-01",
        help="Номер сметы.",
    )
    parser.add_argument(
        "--date",
        default=today,
        help="Дата сметы (ДД.ММ.ГГГГ).",
    )
    parser.add_argument(
        "--customer",
        default="____________________________",
        help="Наименование/ФИО заказчика.",
    )
    parser.add_argument(
        "--executor",
        default="____________________________",
        help="Наименование/ФИО исполнителя.",
    )
    parser.add_argument(
        "--project",
        default="Изготовление сайта «Рыба здесь - есть!»",
        help="Название проекта.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build_pdf(
        output=Path(args.output),
        estimate_number=args.number,
        estimate_date=args.date,
        customer=args.customer,
        executor=args.executor,
        project=args.project,
    )
    print(f"PDF создан: {args.output}")


if __name__ == "__main__":
    main()
