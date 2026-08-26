from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer,
    Table, TableStyle, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "04_Logika_Proposisi_Fungsi_Invers.pdf"

FONT_DIR = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("Matheal", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("MathealBold", str(FONT_DIR / "arialbd.ttf")))

PAGE_W, PAGE_H = A4
BRAND = colors.HexColor("#215F6D")
BRAND_DARK = colors.HexColor("#173E46")
ACCENT = colors.HexColor("#D88A43")
SOFT = colors.HexColor("#EDF7F4")
TEXT = colors.HexColor("#223A36")
MUTED = colors.HexColor("#5B706B")
LINE = colors.HexColor("#D5E5DF")


def page_decor(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BRAND)
    canvas.rect(0, PAGE_H - 1.35 * cm, PAGE_W, 1.35 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("MathealBold", 9)
    canvas.drawString(1.65 * cm, PAGE_H - 0.84 * cm, "MatHeal - Pelajari, pahami, lalu kerjakan")
    canvas.setFillColor(MUTED)
    canvas.setFont("Matheal", 8)
    canvas.drawRightString(PAGE_W - 1.65 * cm, 0.75 * cm, f"Halaman {doc.page}")
    canvas.setStrokeColor(LINE)
    canvas.line(1.65 * cm, 1.08 * cm, PAGE_W - 1.65 * cm, 1.08 * cm)
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="TitleM", parent=styles["Title"], fontName="MathealBold", fontSize=24,
    leading=29, textColor=BRAND_DARK, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="SubtitleM", parent=styles["Normal"], fontName="Matheal", fontSize=11,
    leading=16, textColor=MUTED, spaceAfter=18,
))
styles.add(ParagraphStyle(
    name="H1M", parent=styles["Heading1"], fontName="MathealBold", fontSize=17,
    leading=22, textColor=BRAND_DARK, spaceBefore=4, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="H2M", parent=styles["Heading2"], fontName="MathealBold", fontSize=12,
    leading=16, textColor=BRAND, spaceBefore=10, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="BodyM", parent=styles["BodyText"], fontName="Matheal", fontSize=10,
    leading=15, textColor=TEXT, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="SmallM", parent=styles["BodyText"], fontName="Matheal", fontSize=8.6,
    leading=12, textColor=TEXT,
))
styles.add(ParagraphStyle(
    name="CalloutM", parent=styles["BodyText"], fontName="Matheal", fontSize=10,
    leading=15, textColor=BRAND_DARK,
))
styles.add(ParagraphStyle(
    name="CenterM", parent=styles["BodyText"], fontName="MathealBold", fontSize=13,
    leading=18, textColor=BRAND_DARK, alignment=TA_CENTER,
))


def p(text, style="BodyM"):
    return Paragraph(text, styles[style])


def box(items, bg=SOFT, border=LINE):
    content = items if isinstance(items, list) else [items]
    table = Table([[content]], colWidths=[17.1 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def bullet(text):
    return p(f"<b>-</b> {text}")


def section(title, body):
    return [p(title, "H2M"), *body]


def add_table(rows, widths=None, header=True):
    widths = widths or [17.1 * cm / len(rows[0])] * len(rows[0])
    formatted = [[p(cell, "SmallM") for cell in row] for row in rows]
    table = Table(formatted, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ]
    table.setStyle(TableStyle(style))
    return table


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=1.65 * cm, rightMargin=1.65 * cm,
        topMargin=1.85 * cm, bottomMargin=1.45 * cm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="module", frames=[frame], onPage=page_decor)])
    story = []

    # Page 1
    story += [Spacer(1, 0.35 * cm), p("MODUL MATHEAL - EDISI PEMULA 2026", "SmallM"), Spacer(1, 0.2 * cm)]
    story += [p("Logika Proposisi dan Fungsi Invers", "TitleM")]
    story += [p("Teori inti, contoh terarah, dan latihan yang selaras dengan kuis topik Logika Proposisi dan Fungsi Invers.", "SubtitleM")]
    story += [box([
        p("<b>Target belajar</b>", "H2M"),
        bullet("Menentukan nilai kebenaran, negasi, konjungsi, disjungsi, dan implikasi."),
        bullet("Menuliskan konvers, invers, dan kontraposisi dari implikasi."),
        bullet("Menentukan fungsi invers serta memeriksanya dengan komposisi."),
    ], colors.HexColor("#F2F8F6")), Spacer(1, 0.3 * cm)]
    story += [p("Peta konsep", "H1M")]
    story += [add_table([
        ["Bagian", "Yang dipelajari", "Kaitan dengan kuis"],
        ["Logika proposisi", "Pernyataan benar-salah, NOT, AND, OR, implikasi", "Memilih nilai kebenaran dan menyusun bentuk implikasi"],
        ["Bentuk implikasi", "Konvers, invers, kontraposisi", "Menjelaskan hubungan antar bentuk pernyataan"],
        ["Fungsi invers", "Syarat satu-ke-satu, langkah mencari invers, verifikasi", "Menghitung dan memeriksa invers fungsi"],
    ], [3.2 * cm, 7.1 * cm, 6.8 * cm])]
    story += [Spacer(1, 0.35 * cm), box([
        p("<b>Cara menggunakan modul</b>", "H2M"),
        p("Baca halaman 2-4 berurutan. Kerjakan latihan halaman 5 tanpa melihat pembahasan. Setelah dapat menjelaskan alasan setiap langkah, lanjutkan ke kuis level mudah.", "CalloutM"),
    ], colors.HexColor("#FFF8EE"), colors.HexColor("#EFCB9B"))]
    story += [PageBreak()]

    # Page 2
    story += [p("1. Logika Proposisi", "H1M")]
    story += [p("Proposisi adalah kalimat deklaratif yang memiliki tepat satu nilai: benar atau salah. Pertanyaan dan perintah bukan proposisi karena tidak memiliki nilai kebenaran.")]
    story += [add_table([
        ["Simbol", "Nama", "Kapan bernilai benar"],
        ["NOT p", "Negasi", "Saat p salah"],
        ["p AND q", "Konjungsi", "Saat p dan q keduanya benar"],
        ["p OR q", "Disjungsi", "Saat minimal satu dari p atau q benar"],
        ["p -> q", "Implikasi", "Kecuali ketika p benar dan q salah"],
    ], [3.2 * cm, 4.3 * cm, 9.6 * cm])]
    story += section("Tabel kebenaran implikasi", [
        p("Perhatikan bahwa implikasi <b>p -> q</b> hanya salah ketika janji pada p terjadi, tetapi q tidak terjadi."),
        add_table([
            ["p", "q", "p -> q"],
            ["B", "B", "B"],
            ["B", "S", "S"],
            ["S", "B", "B"],
            ["S", "S", "B"],
        ], [5.7 * cm, 5.7 * cm, 5.7 * cm]),
    ])
    story += section("Contoh", [
        box([
            p("<b>Soal:</b> p: 'Hari ini hujan' dan q: 'Jalanan basah'. Tuliskan negasi dari p dan bentuk p AND q.", "CalloutM"),
            p("<b>Jawab:</b> NOT p: 'Hari ini tidak hujan'. Bentuk p AND q: 'Hari ini hujan dan jalanan basah'. Konjungsi hanya benar jika kedua pernyataan benar.", "CalloutM"),
        ], colors.HexColor("#F2F8F6")),
    ])
    story += [PageBreak()]

    # Page 3
    story += [p("2. Konvers, Invers, dan Kontraposisi", "H1M")]
    story += [p("Jika bentuk awal adalah <b>p -> q</b>, tiga bentuk turunannya harus ditulis dengan memperhatikan apakah posisi dan negasi berubah.")]
    story += [add_table([
        ["Bentuk", "Hasil dari p -> q", "Contoh: 'Jika belajar, maka lulus'"],
        ["Konvers", "q -> p", "Jika lulus, maka belajar"],
        ["Invers", "NOT p -> NOT q", "Jika tidak belajar, maka tidak lulus"],
        ["Kontraposisi", "NOT q -> NOT p", "Jika tidak lulus, maka tidak belajar"],
    ], [3.5 * cm, 4.3 * cm, 9.3 * cm])]
    story += [box([
        p("<b>Prinsip penting:</b> Implikasi p -> q selalu ekuivalen dengan kontraposisinya NOT q -> NOT p. Konvers dan invers juga ekuivalen satu sama lain, tetapi umumnya tidak ekuivalen dengan implikasi awal.", "CalloutM"),
    ], colors.HexColor("#FFF8EE"), colors.HexColor("#EFCB9B"))]
    story += section("Contoh langkah", [
        p("<b>Soal:</b> Tentukan konvers, invers, dan kontraposisi dari: 'Jika bilangan habis dibagi 4, maka bilangan tersebut genap.'"),
        bullet("Tentukan p: 'bilangan habis dibagi 4' dan q: 'bilangan genap'."),
        bullet("Konvers: Jika bilangan genap, maka bilangan habis dibagi 4."),
        bullet("Invers: Jika bilangan tidak habis dibagi 4, maka bilangan tidak genap."),
        bullet("Kontraposisi: Jika bilangan tidak genap, maka bilangan tidak habis dibagi 4."),
        p("<b>Pemeriksaan:</b> Hanya kontraposisi yang mempunyai nilai kebenaran sama dengan pernyataan awal.", "CalloutM"),
    ])
    story += [PageBreak()]

    # Page 4
    story += [p("3. Fungsi Invers", "H1M")]
    story += [p("Fungsi invers membalik proses fungsi asal. Jika f mengubah input x menjadi output y, maka f^-1 mengembalikan y menjadi x. Fungsi harus satu-ke-satu agar inversnya merupakan fungsi.")]
    story += [box([
        p("<b>Langkah umum mencari invers</b>", "H2M"),
        bullet("Tulis y = f(x)."),
        bullet("Tukar posisi x dan y."),
        bullet("Selesaikan persamaan untuk y."),
        bullet("Ganti y dengan f^-1(x), lalu verifikasi dengan komposisi."),
    ])]
    story += section("Contoh lengkap", [
        p("<b>Soal:</b> Tentukan invers dari f(x) = 2x + 3."),
        add_table([
            ["Langkah", "Proses"],
            ["1", "y = 2x + 3"],
            ["2", "Tukar x dan y: x = 2y + 3"],
            ["3", "x - 3 = 2y, sehingga y = (x - 3) / 2"],
            ["4", "Jadi f^-1(x) = (x - 3) / 2"],
            ["5", "Verifikasi: f(f^-1(x)) = 2((x - 3) / 2) + 3 = x"],
        ], [2.3 * cm, 14.8 * cm]),
    ])
    story += [box([
        p("<b>Kesalahan umum:</b> f^-1(x) bukan 1 / f(x). Jangan lupa menukar x dan y, serta jangan berhenti sebelum memeriksa hasil dengan komposisi.", "CalloutM"),
    ], colors.HexColor("#FFF2F0"), colors.HexColor("#EDC1BB"))]
    story += [PageBreak()]

    # Page 5
    story += [p("4. Latihan Sebelum Kuis", "H1M")]
    story += [p("Kerjakan tanpa melihat halaman sebelumnya. Tuliskan diketahui, konsep yang dipakai, langkah, dan jawaban akhir.")]
    story += [p("Level mudah - memahami konsep", "H2M"),
              bullet("Tentukan nilai p AND q jika p benar dan q salah."),
              bullet("Tuliskan negasi dari: '7 adalah bilangan prima'."),
              bullet("Sebutkan syarat agar suatu fungsi mempunyai invers berupa fungsi.")]
    story += [p("Level sedang - menerapkan konsep", "H2M"),
              bullet("Tentukan invers dari f(x) = 3x - 6."),
              bullet("Jika p salah dan q benar, tentukan nilai (NOT p) AND q."),
              bullet("Buktikan dengan komposisi bahwa invers f(x) = 3x - 6 adalah benar.")]
    story += [p("Level sulit - menalar dan memverifikasi", "H2M"),
              bullet("Dari p -> q, tuliskan konvers, invers, dan kontraposisi. Jelaskan mana yang ekuivalen dengan implikasi awal."),
              bullet("Jelaskan mengapa f(x) = x^2 pada semua bilangan real tidak mempunyai invers fungsi. Berikan pembatasan domain yang membuatnya memiliki invers.")]
    story += [box([
        p("<b>Checklist sebelum kuis</b>", "H2M"),
        bullet("Saya dapat membedakan proposisi, negasi, konjungsi, disjungsi, dan implikasi."),
        bullet("Saya dapat menulis konvers, invers, dan kontraposisi secara tepat."),
        bullet("Saya dapat mencari dan memeriksa fungsi invers dengan komposisi."),
    ], colors.HexColor("#F2F8F6"))]
    story += [PageBreak()]

    # Page 6
    story += [p("Ringkasan dan Hubungan dengan Kuis", "H1M")]
    story += [add_table([
        ["Keterampilan", "Petunjuk jawaban esai yang baik"],
        ["Nilai kebenaran", "Tulis nilai p dan q, lalu terapkan operator satu per satu."],
        ["Bentuk implikasi", "Definisikan p dan q sebelum menulis konvers, invers, atau kontraposisi."],
        ["Fungsi invers", "Tunjukkan tukar x-y, langkah aljabar, dan satu pemeriksaan komposisi."],
    ], [5.2 * cm, 11.9 * cm])]
    story += [Spacer(1, 0.3 * cm), box([
        p("<b>Ketika jawaban Anda berbeda bentuk</b>", "H2M"),
        p("Jawaban tetap dapat benar jika langkah logis dan hasil akhirnya ekuivalen. Misalnya (x - 3) / 2 dan 0,5x - 1,5 menyatakan fungsi invers yang sama.", "CalloutM"),
    ], colors.HexColor("#FFF8EE"), colors.HexColor("#EFCB9B"))]
    story += section("Referensi belajar", [
        bullet("OpenStax, <i>College Algebra 2e</i>, bagian Inverse Functions."),
        bullet("Oscar Levin, <i>Discrete Mathematics: An Open Introduction</i>, bagian Symbolic Logic."),
        bullet("Materi MatHeal: Logika Proposisi dan Fungsi Invers."),
    ])
    story += [Spacer(1, 1.0 * cm), p("Siap berlatih? Kembali ke aplikasi dan pilih <b>Mulai Quiz Sekarang</b> untuk mengerjakan kuis Logika Proposisi & Fungsi Invers.", "CenterM")]

    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
