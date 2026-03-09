from fpdf import FPDF
from datetime import datetime
import httpx
import tempfile
import os
from helpers import sanitize_text


class ModernPDF(FPDF):
    """PDF con diseño moderno y elegante"""

    def __init__(self, title: str = "", company_name: str = "", logo_url: str = None):
        super().__init__()
        self.title_text = title
        self.company_name = company_name
        self.logo_url = logo_url
        self.primary_color = (41, 128, 185)
        self.secondary_color = (52, 73, 94)
        self.light_gray = (245, 245, 245)
        self.border_color = (189, 195, 199)

    def header(self):
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, 210, 35, 'F')

        logo_width = 0
        if self.logo_url:
            try:
                with httpx.Client() as client:
                    response = client.get(self.logo_url, timeout=5)
                    if response.status_code == 200:
                        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                            tmp.write(response.content)
                            tmp_path = tmp.name
                        self.image(tmp_path, 10, 5, 25)
                        logo_width = 30
                        os.unlink(tmp_path)
            except:
                pass

        self.set_xy(10 + logo_width, 8)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 18)
        self.cell(0, 10, self.title_text, ln=True, align="L" if logo_width else "C")

        if self.company_name:
            self.set_xy(10 + logo_width, 18)
            self.set_font("Helvetica", "", 11)
            self.cell(0, 8, self.company_name, ln=True, align="L" if logo_width else "C")

        self.set_xy(10, 28)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(220, 220, 220)
        self.cell(0, 5, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="R")

        self.ln(15)
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Página {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*self.secondary_color)
        self.set_fill_color(*self.light_gray)
        self.cell(0, 10, f"  {title}", ln=True, fill=True)
        self.ln(3)
        self.set_text_color(0, 0, 0)

    def add_table_header(self, headers: list, widths: list):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(*self.primary_color)
        self.set_text_color(255, 255, 255)
        for i, header in enumerate(headers):
            self.cell(widths[i], 8, header, 1, 0, "C", fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)

    def add_table_row(self, data: list, widths: list, alternate: bool = False):
        self.set_font("Helvetica", "", 8)
        if alternate:
            self.set_fill_color(*self.light_gray)
        else:
            self.set_fill_color(255, 255, 255)
        for i, value in enumerate(data):
            self.cell(widths[i], 7, str(value)[:int(widths[i]/2)], 1, 0, "L", fill=True)
        self.ln()

    def add_info_box(self, label: str, value: str, width: int = 95):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*self.secondary_color)
        self.cell(width/3, 7, label + ":", 0)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(0, 0, 0)
        self.cell(width*2/3, 7, str(value), 0, 1)

    def add_summary_card(self, title: str, items: dict):
        self.set_fill_color(*self.light_gray)
        self.set_draw_color(*self.border_color)
        y_start = self.get_y()
        self.rect(10, y_start, 190, 8 + len(items) * 6, 'DF')
        self.set_xy(12, y_start + 2)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*self.primary_color)
        self.cell(0, 6, title, ln=True)
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 9)
        for key, val in items.items():
            self.set_x(15)
            self.cell(0, 6, f"- {key}: {val}", ln=True)
        self.ln(5)
