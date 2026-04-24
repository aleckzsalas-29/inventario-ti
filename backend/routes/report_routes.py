from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from fpdf import FPDF
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user
from services.pdf_service import ModernPDF
from helpers import sanitize_text

router = APIRouter()


def _add_equipment_detail(pdf, eq, assigned_name, custom_fields_list):
    """Helper: renders a full equipment detail card in the PDF"""
    page_width = 190
    col = 95

    # Header bar
    pdf.set_fill_color(41, 128, 185)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    header = f"  {eq.get('inventory_code', 'N/A')} - {eq.get('equipment_type', '')} | {eq.get('brand', '')} {eq.get('model', '')}"
    pdf.cell(0, 8, sanitize_text(header), 0, 1, fill=True)
    pdf.set_text_color(0, 0, 0)

    # Info rows helper
    def row(label, value, label2=None, value2=None):
        if not value and not value2:
            return
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(28, 5, f"{label}:", "L", 0)
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(col - 28, 5, sanitize_text(str(value or 'N/A'))[:45], 0, 0)
        if label2:
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(28, 5, f"{label2}:", 0, 0)
            pdf.set_font("Helvetica", "", 8)
            pdf.cell(0, 5, sanitize_text(str(value2 or 'N/A'))[:45], "R", 1)
        else:
            pdf.cell(0, 5, "", "R", 1)

    # GENERAL
    row("Codigo", eq.get('inventory_code'), "Tipo", eq.get('equipment_type'))
    row("Marca", eq.get('brand'), "Modelo", eq.get('model'))
    row("No. Serie", eq.get('serial_number'), "Estado", eq.get('status'))
    if assigned_name:
        row("Asignado a", assigned_name, None, None)
    if eq.get('observations'):
        row("Observaciones", eq.get('observations'), None, None)

    # HARDWARE
    has_hw = any([eq.get('processor_brand'), eq.get('ram_capacity'), eq.get('storage_capacity')])
    if has_hw:
        pdf.set_font("Helvetica", "BI", 8)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 5, "  Hardware", "LR", 1, fill=True)
        proc = f"{eq.get('processor_brand', '')} {eq.get('processor_model', '')}".strip()
        if eq.get('processor_speed'):
            proc += f" @ {eq['processor_speed']}"
        ram = eq.get('ram_capacity', '')
        if eq.get('ram_type'):
            ram += f" ({eq['ram_type']})"
        storage = ""
        if eq.get('storage_capacity'):
            storage = f"{eq.get('storage_type', '')} {eq['storage_capacity']}".strip()
        row("Procesador", proc if proc else None, "RAM", ram if ram else None)
        if storage:
            row("Almacenamiento", storage, None, None)

    # SOFTWARE
    has_sw = any([eq.get('os_name'), eq.get('antivirus_name'), eq.get('office_version')])
    if has_sw:
        pdf.set_font("Helvetica", "BI", 8)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 5, "  Software", "LR", 1, fill=True)
        os_info = eq.get('os_name', '')
        if eq.get('os_version'):
            os_info += f" {eq['os_version']}"
        row("Sist. Operativo", os_info if os_info else None, "Licencia SO", eq.get('os_license'))
        if eq.get('office_version'):
            row("Office", eq.get('office_version'), "Lic. Office", eq.get('office_license'))
        if eq.get('antivirus_name'):
            row("Antivirus", eq.get('antivirus_name'), "Vence AV", eq.get('antivirus_expiry'))

    # NETWORK
    has_net = any([eq.get('ip_address'), eq.get('mac_address')])
    if has_net:
        pdf.set_font("Helvetica", "BI", 8)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 5, "  Red", "LR", 1, fill=True)
        row("IP", eq.get('ip_address'), "MAC", eq.get('mac_address'))

    # CREDENTIALS
    has_cred = any([eq.get('windows_user'), eq.get('email_account'), eq.get('cloud_user')])
    if has_cred:
        pdf.set_font("Helvetica", "BI", 8)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 5, "  Credenciales", "LR", 1, fill=True)
        if eq.get('windows_user'):
            row("Usuario Win", eq.get('windows_user'), "Pass Win", eq.get('windows_password'))
        if eq.get('email_account'):
            row("Email", eq.get('email_account'), "Pass Email", eq.get('email_password'))
        if eq.get('cloud_user'):
            row("Cloud", eq.get('cloud_user'), "Pass Cloud", eq.get('cloud_password'))

    # CUSTOM FIELDS
    cf_values = eq.get("custom_fields") or {}
    has_cf = False
    for cf in custom_fields_list:
        val = cf_values.get(cf.get("name"), "")
        if val:
            if not has_cf:
                pdf.set_font("Helvetica", "BI", 8)
                pdf.set_fill_color(240, 240, 240)
                pdf.cell(0, 5, "  Campos Adicionales", "LR", 1, fill=True)
                has_cf = True
            row(cf.get('name', ''), val, None, None)

    # Bottom border
    pdf.cell(0, 1, "", "LRB", 1)
    pdf.ln(4)

    if pdf.get_y() > 250:
        pdf.add_page()


@router.get("/reports/equipment/pdf")
async def generate_equipment_report_pdf(company_id: Optional[str] = None, status: Optional[str] = None, include_custom_fields: bool = False, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    if status:
        query["status"] = status
    equipment_list = await db.equipment.find(query, {"_id": 0}).to_list(500)

    company_name = ""
    logo_url = None
    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if company:
            company_name = company.get("name", "")
            logo_url = company.get("logo_url")

    # Fetch employee names
    employee_ids = list(set([eq.get("assigned_to") for eq in equipment_list if eq.get("assigned_to")]))
    employees = {}
    if employee_ids:
        emp_list = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0}).to_list(500)
        employees = {e["id"]: f"{e.get('first_name', '')} {e.get('last_name', '')}" for e in emp_list}

    # Fetch custom fields for equipment
    eq_custom_fields = await db.custom_fields.find({"entity_type": "equipment", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)

    pdf = ModernPDF(title="Inventario de Equipos", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()

    # Summary
    status_counts = {}
    type_counts = {}
    for eq in equipment_list:
        s = eq.get("status", "Sin estado")
        t = eq.get("equipment_type", "Sin tipo")
        status_counts[s] = status_counts.get(s, 0) + 1
        type_counts[t] = type_counts.get(t, 0) + 1

    pdf.section_title(f"RESUMEN ({len(equipment_list)} equipos)")
    pdf.set_font("Helvetica", "", 9)
    summary_parts = [f"{s}: {c}" for s, c in sorted(status_counts.items())]
    pdf.cell(0, 6, "Por estado: " + " | ".join(summary_parts), ln=True)
    type_parts = [f"{t}: {c}" for t, c in sorted(type_counts.items())]
    pdf.cell(0, 6, "Por tipo: " + " | ".join(type_parts), ln=True)
    pdf.ln(5)

    # Detail per equipment
    pdf.section_title("DETALLE DE EQUIPOS")
    for eq in equipment_list:
        assigned_name = employees.get(eq.get("assigned_to", ""), "")
        _add_equipment_detail(pdf, eq, assigned_name, eq_custom_fields)

    pdf_bytes = pdf.output()
    filename = f"inventario_equipos_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/reports/equipment-logs/{equipment_id}/pdf")
async def generate_equipment_logs_pdf(equipment_id: str, current_user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    logs = await db.equipment_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

    company_name = ""
    logo_url = None
    if eq.get("company_id"):
        company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
        if company:
            company_name = company.get("name", "")
            logo_url = company.get("logo_url")

    assigned_employee = ""
    if eq.get("assigned_to"):
        emp = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
        if emp:
            assigned_employee = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"

    # Fetch custom fields for full equipment detail
    eq_custom_fields = await db.custom_fields.find({"entity_type": "equipment", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)

    pdf = ModernPDF(title="Bitacora de Equipo", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()

    # Full equipment detail
    _add_equipment_detail(pdf, eq, assigned_employee, eq_custom_fields)

    # Logs table
    pdf.section_title(f"HISTORIAL DE BITACORA ({len(logs)} registros)")
    if not logs:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(0, 10, "No hay registros en la bitacora", ln=True, align="C")
    else:
        headers = ["Fecha", "Tipo", "Descripcion", "Realizado por"]
        widths = [35, 25, 100, 30]
        pdf.add_table_header(headers, widths)

        user_ids = list(set([l.get("performed_by") for l in logs if l.get("performed_by")]))
        users_map = {}
        if user_ids:
            u_list = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
            users_map = {u["id"]: u.get("name", "") for u in u_list}

        for i, log in enumerate(logs):
            user_name = users_map.get(log.get("performed_by", ""), "")[:15]
            data = [
                str(log.get("created_at", ""))[:16].replace("T", " "),
                str(log.get("log_type", "")),
                sanitize_text(str(log.get("description", "")))[:55],
                user_name
            ]
            pdf.add_table_row(data, widths, alternate=(i % 2 == 1))

    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=bitacora_{eq.get('inventory_code', 'equipo')}.pdf"})


@router.get("/reports/maintenance/{equipment_id}/pdf")
async def generate_maintenance_history_pdf(equipment_id: str, current_user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    logs = await db.maintenance_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

    if not eq and not logs:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    company = None
    logo_url = None
    company_name = ""
    if eq and eq.get("company_id"):
        company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
        if company:
            logo_url = company.get("logo_url")
            company_name = company.get("name", "")

    assigned_employee = ""
    if eq and eq.get("assigned_to"):
        emp = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
        if emp:
            assigned_employee = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"

    custom_fields = await db.custom_fields.find({"entity_type": "maintenance", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)
    eq_custom_fields = await db.custom_fields.find({"entity_type": "equipment", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)

    inv_code = str(eq.get('inventory_code', 'N/A') if eq else logs[0].get('equipment_code', 'N/A'))[:30]

    pdf = ModernPDF(title="Historial de Mantenimientos", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.section_title("INFORMACION DEL EQUIPO")
    pdf.set_font("Helvetica", "", 9)
    col_width = 95

    if eq:
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Codigo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('inventory_code', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Tipo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('equipment_type', 'N/A')), 0, 1)

        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Marca:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('brand', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Modelo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('model', 'N/A')), 0, 1)

        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "No. Serie:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('serial_number', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Estado:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('status', 'N/A')), 0, 1)

        if assigned_employee:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(30, 6, "Asignado a:", 0)
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(col_width - 30, 6, assigned_employee, 0, 1)

        pdf.ln(3)

        has_hardware = any([eq.get('processor_brand'), eq.get('ram_capacity'), eq.get('storage_capacity')])
        if has_hardware:
            pdf.section_title("ESPECIFICACIONES DE HARDWARE")
            if eq.get('processor_brand') or eq.get('processor_model'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "Procesador:", 0)
                pdf.set_font("Helvetica", "", 9)
                proc_info = f"{eq.get('processor_brand', '')} {eq.get('processor_model', '')}".strip()
                if eq.get('processor_speed'):
                    proc_info += f" @ {eq.get('processor_speed')}"
                pdf.cell(0, 6, proc_info or 'N/A', 0, 1)
            if eq.get('ram_capacity'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "RAM:", 0)
                pdf.set_font("Helvetica", "", 9)
                ram_info = eq.get('ram_capacity', '')
                if eq.get('ram_type'):
                    ram_info += f" ({eq.get('ram_type')})"
                pdf.cell(0, 6, ram_info, 0, 1)
            if eq.get('storage_capacity'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "Almacenamiento:", 0)
                pdf.set_font("Helvetica", "", 9)
                storage_info = eq.get('storage_capacity', '')
                if eq.get('storage_type'):
                    storage_info = f"{eq.get('storage_type')} {storage_info}"
                pdf.cell(0, 6, storage_info, 0, 1)
            pdf.ln(3)

        has_software = any([eq.get('os_name'), eq.get('antivirus_name'), eq.get('office_version')])
        if has_software:
            pdf.section_title("SOFTWARE INSTALADO")
            if eq.get('os_name'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "Sist. Operativo:", 0)
                pdf.set_font("Helvetica", "", 9)
                os_info = eq.get('os_name', '')
                if eq.get('os_version'):
                    os_info += f" {eq.get('os_version')}"
                pdf.cell(0, 6, os_info, 0, 1)
                if eq.get('os_license'):
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(30, 6, "Licencia SO:", 0)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, eq.get('os_license', ''), 0, 1)
            if eq.get('office_version'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "Office:", 0)
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(0, 6, eq.get('office_version', ''), 0, 1)
                if eq.get('office_license'):
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(30, 6, "Lic. Office:", 0)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, eq.get('office_license', ''), 0, 1)
            if eq.get('antivirus_name'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "Antivirus:", 0)
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(0, 6, eq.get('antivirus_name', ''), 0, 1)
                if eq.get('antivirus_expiry'):
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(30, 6, "Vencimiento AV:", 0)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, eq.get('antivirus_expiry', ''), 0, 1)
            pdf.ln(3)

        has_network = any([eq.get('ip_address'), eq.get('mac_address')])
        if has_network:
            pdf.section_title("CONFIGURACION DE RED")
            if eq.get('ip_address'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "IP:", 0)
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(col_width - 30, 6, eq.get('ip_address', ''), 0)
            if eq.get('mac_address'):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 6, "MAC:", 0)
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(col_width - 30, 6, eq.get('mac_address', ''), 0)
            pdf.ln(8)

        if eq_custom_fields and eq.get("custom_fields"):
            pdf.section_title("CAMPOS ADICIONALES DEL EQUIPO")
            cf_values = eq.get("custom_fields", {})
            for cf in eq_custom_fields:
                value = cf_values.get(cf.get("name"), "")
                if value:
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(50, 6, f"{cf.get('name')}:", 0)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, str(value)[:80], 0, 1)
            pdf.ln(3)

    # Maintenance History
    pdf.section_title(f"HISTORIAL DE MANTENIMIENTOS ({len(logs)} registros)")

    if not logs:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(0, 10, "No hay registros de mantenimiento para este equipo", ln=True, align="C")
    else:
        for idx, log in enumerate(logs):
            maint_type = str(log.get("maintenance_type", ""))
            status = str(log.get("status", ""))
            date_str = str(log.get("performed_date", log.get("created_at", "")))[:10]

            if maint_type == "Preventivo":
                pdf.set_fill_color(41, 128, 185)
            elif maint_type == "Correctivo":
                pdf.set_fill_color(243, 156, 18)
            elif maint_type == "Reparacion":
                pdf.set_fill_color(231, 76, 60)
            else:
                pdf.set_fill_color(149, 165, 166)

            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 8, f"  {idx + 1}. {maint_type} - {status} | Fecha: {date_str}", 0, ln=True, fill=True)
            pdf.set_text_color(0, 0, 0)

            rows = []
            rows.append(("Descripcion", log.get('description', 'N/A')))
            if log.get("technician"):
                rows.append(("Tecnico", log.get('technician')))
            if maint_type == "Preventivo":
                if log.get("next_maintenance_date"):
                    next_info = log.get('next_maintenance_date', '')
                    if log.get("maintenance_frequency"):
                        next_info += f" (Frecuencia: {log.get('maintenance_frequency')})"
                    rows.append(("Prox. Mant.", next_info))
            if maint_type in ["Correctivo", "Reparacion"]:
                if log.get("problem_diagnosis"):
                    rows.append(("Diagnostico", log.get('problem_diagnosis')))
                if log.get("solution_applied"):
                    rows.append(("Solucion", log.get('solution_applied')))
                if log.get("repair_time_hours"):
                    rows.append(("Tiempo", f"{log.get('repair_time_hours')} horas"))
            if log.get("parts_used"):
                rows.append(("Materiales", log.get('parts_used')))

            if custom_fields and log.get("custom_fields"):
                cf_values = log.get("custom_fields", {})
                for cf in custom_fields:
                    value = cf_values.get(cf.get("name"), "")
                    if value:
                        rows.append((cf.get('name'), str(value)))

            page_width = 190
            margin_left = 10

            for i, (label, value) in enumerate(rows):
                if not value:
                    continue

                is_first = (i == 0)
                pdf.set_font("Helvetica", "", 9)
                text_width = page_width - 30
                safe_value = sanitize_text(str(value))
                lines = pdf.multi_cell(text_width, 5, safe_value, split_only=True)
                text_height = len(lines) * 5
                row_height = max(6, text_height)

                if pdf.get_y() + row_height > 280:
                    pdf.add_page()
                    is_first = True

                start_y = pdf.get_y()

                pdf.set_font("Helvetica", "B", 9)
                border_l = "LT" if is_first else "L"
                pdf.cell(30, row_height, f"{label}:", border_l, 0)

                pdf.set_font("Helvetica", "", 9)
                x_val = pdf.get_x()
                y_val = pdf.get_y()

                if is_first:
                    pdf.line(x_val, y_val, margin_left + page_width, y_val)

                pdf.multi_cell(text_width, 5, safe_value, border=0, align="L")
                end_y = pdf.get_y()

                pdf.line(margin_left + page_width, start_y, margin_left + page_width, end_y)
                pdf.set_y(end_y)

            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(100, 100, 100)
            if log.get("completed_at"):
                completed = str(log.get("completed_at", ""))[:19].replace("T", " ")
                completion_text = f"Completado: {completed}"
            else:
                completion_text = f"Registrado: {str(log.get('created_at', ''))[:19].replace('T', ' ')}"

            pdf.cell(0, 5, completion_text, "LRB", 1)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)

            if pdf.get_y() > 250:
                pdf.add_page()

    pdf_bytes = pdf.output()
    filename = f"mantenimientos_{inv_code}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/reports/maintenance/pdf")
async def generate_maintenance_report_pdf(
    period: str = Query("week", description="day, week, month"),
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now - timedelta(days=1)
        period_label = "Ultimo dia"
    elif period == "month":
        start_date = now - timedelta(days=30)
        period_label = "Ultimo mes"
    else:
        start_date = now - timedelta(days=7)
        period_label = "Ultima semana"

    query = {"created_at": {"$gte": start_date.isoformat()}}
    if company_id:
        equipment_list = await db.equipment.find({"company_id": company_id}, {"id": 1}).to_list(1000)
        eq_ids = [e["id"] for e in equipment_list]
        query["equipment_id"] = {"$in": eq_ids}

    logs = await db.maintenance_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    company_name = ""
    logo_url = None
    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if company:
            company_name = company.get("name", "")
            logo_url = company.get("logo_url")

    equipment_ids = list(set([log.get("equipment_id") for log in logs if log.get("equipment_id")]))
    equipment_map = {}
    if equipment_ids:
        eq_list = await db.equipment.find({"id": {"$in": equipment_ids}}, {"_id": 0}).to_list(500)
        equipment_map = {eq["id"]: eq for eq in eq_list}

    assigned_ids = list(set([eq.get("assigned_to") for eq in equipment_map.values() if eq.get("assigned_to")]))
    employees_map = {}
    if assigned_ids:
        emp_list = await db.employees.find({"id": {"$in": assigned_ids}}, {"_id": 0}).to_list(100)
        employees_map = {e["id"]: f"{e.get('first_name', '')} {e.get('last_name', '')}" for e in emp_list}

    stats = {"Preventivo": 0, "Correctivo": 0, "Reparacion": 0, "Otro": 0}
    status_stats = {"Pendiente": 0, "En Proceso": 0, "Finalizado": 0}
    for log in logs:
        mtype = log.get("maintenance_type", "Otro")
        stats[mtype] = stats.get(mtype, 0) + 1
        status = log.get("status", "Pendiente")
        status_stats[status] = status_stats.get(status, 0) + 1

    pdf = ModernPDF(title="Reporte de Mantenimientos", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(52, 73, 94)
    pdf.cell(0, 8, f"Periodo: {period_label}", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"Desde: {start_date.strftime('%d/%m/%Y')} - Hasta: {now.strftime('%d/%m/%Y')}", ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    pdf.section_title("RESUMEN ESTADISTICO")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(95, 8, f"Total de Registros: {len(logs)}", 1, 0, "C")
    finalized = status_stats.get("Finalizado", 0)
    pdf.cell(95, 8, f"Completados: {finalized} ({round(finalized/len(logs)*100) if logs else 0}%)", 1, 1, "C")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "Por Tipo de Mantenimiento:", ln=True)
    pdf.set_font("Helvetica", "", 9)

    colors = {"Preventivo": (41, 128, 185), "Correctivo": (243, 156, 18), "Reparacion": (231, 76, 60), "Otro": (149, 165, 166)}
    for mtype, count in stats.items():
        if count > 0:
            pdf.set_fill_color(*colors.get(mtype, (149, 165, 166)))
            pdf.set_text_color(255, 255, 255)
            pdf.cell(47, 7, f"{mtype}: {count}", 1, 0, "C", fill=True)
    pdf.ln(10)
    pdf.set_text_color(0, 0, 0)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "Por Estado:", ln=True)
    pdf.set_font("Helvetica", "", 9)
    status_colors = {"Pendiente": (241, 196, 15), "En Proceso": (52, 152, 219), "Finalizado": (46, 204, 113)}
    for status, count in status_stats.items():
        if count > 0:
            pdf.set_fill_color(*status_colors.get(status, (149, 165, 166)))
            pdf.set_text_color(255, 255, 255)
            pdf.cell(63, 7, f"{status}: {count}", 1, 0, "C", fill=True)
    pdf.ln(10)
    pdf.set_text_color(0, 0, 0)

    if not logs:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(0, 10, "No hay registros de mantenimiento en este periodo", ln=True, align="C")
    else:
        pdf.section_title("DETALLE DE MANTENIMIENTOS")

        for idx, log in enumerate(logs):
            eq = equipment_map.get(log.get("equipment_id"), {})
            maint_type = log.get("maintenance_type", "Otro")
            status = log.get("status", "Pendiente")
            date_str = str(log.get("performed_date", log.get("created_at", "")))[:10]

            if maint_type == "Preventivo":
                pdf.set_fill_color(41, 128, 185)
            elif maint_type == "Correctivo":
                pdf.set_fill_color(243, 156, 18)
            elif maint_type == "Reparacion":
                pdf.set_fill_color(231, 76, 60)
            else:
                pdf.set_fill_color(149, 165, 166)

            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 7, f"  {idx + 1}. {maint_type} | {status} | {date_str}", 0, ln=True, fill=True)
            pdf.set_text_color(0, 0, 0)

            pdf.set_fill_color(248, 249, 250)
            pdf.set_draw_color(200, 200, 200)

            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(25, 5, "Equipo:", "LT")
            pdf.set_font("Helvetica", "", 8)
            assigned_name = employees_map.get(eq.get("assigned_to", ""), "")
            eq_code = eq.get('inventory_code', log.get('equipment_code', 'N/A'))
            if assigned_name:
                eq_info = f"{eq_code} - {assigned_name} - {eq.get('equipment_type', log.get('equipment_type', ''))}"
            else:
                eq_info = f"{eq_code} - {eq.get('equipment_type', log.get('equipment_type', ''))}"
            pdf.cell(70, 5, eq_info[:45], "T")
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(20, 5, "Marca:", "T")
            pdf.set_font("Helvetica", "", 8)
            pdf.cell(0, 5, f"{eq.get('brand', '')} {eq.get('model', '')}"[:30], "RT", 1)

            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(25, 5, "No. Serie:", "L")
            pdf.set_font("Helvetica", "", 8)
            pdf.cell(70, 5, str(eq.get('serial_number', 'N/A'))[:25], 0)

            if eq.get('processor_brand') or eq.get('ram_capacity'):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(20, 5, "Config:", 0)
                pdf.set_font("Helvetica", "", 8)
                config = []
                if eq.get('processor_brand'):
                    config.append(f"{eq.get('processor_brand')} {eq.get('processor_model', '')}"[:15])
                if eq.get('ram_capacity'):
                    config.append(f"RAM {eq.get('ram_capacity')}")
                if eq.get('storage_capacity'):
                    config.append(f"{eq.get('storage_type', '')} {eq.get('storage_capacity')}"[:12])
                pdf.cell(0, 5, " | ".join(config)[:45], "R", 1)
            else:
                pdf.cell(0, 5, "", "R", 1)

            if eq.get('os_name') or eq.get('status'):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(25, 5, "S.O.:", "L")
                pdf.set_font("Helvetica", "", 8)
                os_info = f"{eq.get('os_name', '')} {eq.get('os_version', '')}"[:30] if eq.get('os_name') else "N/A"
                pdf.cell(70, 5, os_info, 0)
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(20, 5, "Estado Eq:", 0)
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 5, eq.get('status', 'N/A'), "R", 1)

            if eq.get('office_version'):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(25, 5, "Office:", "L")
                pdf.set_font("Helvetica", "", 8)
                office_info = eq.get('office_version', '')
                if eq.get('office_license'):
                    office_info += f" | Lic: {eq.get('office_license', '')}"
                pdf.cell(0, 5, office_info[:60], "R", 1)

            assigned_name = employees_map.get(eq.get("assigned_to", ""), "")
            if assigned_name:
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(25, 5, "Asignado a:", "L")
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 5, assigned_name, "R", 1)

            detail_rows = []
            detail_rows.append(("Descripcion", log.get('description', '')))
            if log.get("technician"):
                detail_rows.append(("Tecnico", log.get('technician')))
            if maint_type == "Preventivo":
                if log.get("next_maintenance_date") or log.get("maintenance_frequency"):
                    next_info = log.get('next_maintenance_date', 'N/A')
                    if log.get("maintenance_frequency"):
                        next_info += f" (Frecuencia: {log.get('maintenance_frequency')})"
                    detail_rows.append(("Prox. Mant.", next_info))
            if maint_type in ["Correctivo", "Reparacion"]:
                if log.get("problem_diagnosis"):
                    detail_rows.append(("Diagnostico", log.get('problem_diagnosis')))
                if log.get("solution_applied"):
                    detail_rows.append(("Solucion", log.get('solution_applied')))
                if log.get("repair_time_hours"):
                    detail_rows.append(("Tiempo", f"{log.get('repair_time_hours')} horas"))
            if log.get("parts_used"):
                detail_rows.append(("Materiales", log.get('parts_used')))

            page_width = 190
            margin_left = 10
            label_width = 30
            text_width = page_width - label_width

            for i, (label, value) in enumerate(detail_rows):
                if not value:
                    continue
                pdf.set_font("Helvetica", "", 8)
                safe_value = sanitize_text(str(value))
                lines = pdf.multi_cell(text_width, 4, safe_value, split_only=True)
                row_height = max(5, len(lines) * 4)

                if pdf.get_y() + row_height > 280:
                    pdf.add_page()

                start_y = pdf.get_y()
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(label_width, row_height, f"{label}:", "L", 0)
                pdf.set_font("Helvetica", "", 8)
                x_val = pdf.get_x()
                pdf.multi_cell(text_width, 4, safe_value, border=0, align="L")
                end_y = pdf.get_y()
                pdf.line(margin_left + page_width, start_y, margin_left + page_width, end_y)
                pdf.set_y(end_y)

            pdf.cell(0, 2, "", "LRB", 1)
            pdf.ln(3)

            if pdf.get_y() > 250:
                pdf.add_page()

    pdf_bytes = pdf.output()
    filename = f"mantenimientos_{period}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/reports/equipment-status/pdf")
async def generate_equipment_status_report_pdf(
    company_id: str = Query(..., description="ID de la empresa"),
    current_user: dict = Depends(get_current_user)
):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    equipment_list = await db.equipment.find({"company_id": company_id}, {"_id": 0}).to_list(500)

    employee_ids = [eq.get("assigned_to") for eq in equipment_list if eq.get("assigned_to")]
    employees = {}
    if employee_ids:
        emp_list = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0}).to_list(500)
        employees = {e["id"]: f"{e.get('first_name', '')} {e.get('last_name', '')}" for e in emp_list}

    status_counts = {}
    for eq in equipment_list:
        status = eq.get("status", "Sin estado")
        status_counts[status] = status_counts.get(status, 0) + 1

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Estado de Equipos por Empresa", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Empresa: {company.get('name', '')}", ln=True, align="C")
    pdf.cell(0, 6, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Resumen por Estado:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    for status, count in sorted(status_counts.items()):
        pdf.cell(0, 6, f"  - {status}: {count} equipo(s)", ln=True)
    pdf.cell(0, 6, f"  Total: {len(equipment_list)} equipo(s)", ln=True)
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Detalle de Equipos:", ln=True)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(25, 7, "Codigo", 1)
    pdf.cell(25, 7, "Tipo", 1)
    pdf.cell(30, 7, "Marca/Modelo", 1)
    pdf.cell(25, 7, "Serie", 1)
    pdf.cell(25, 7, "Estado", 1)
    pdf.cell(55, 7, "Asignado a", 1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 7)

    for eq in equipment_list:
        assigned_name = employees.get(eq.get("assigned_to", ""), "Sin asignar")
        pdf.cell(25, 6, str(eq.get("inventory_code", ""))[:12], 1)
        pdf.cell(25, 6, str(eq.get("equipment_type", ""))[:12], 1)
        pdf.cell(30, 6, f"{eq.get('brand', '')[:10]} {eq.get('model', '')[:10]}"[:18], 1)
        pdf.cell(25, 6, str(eq.get("serial_number", ""))[:12], 1)
        pdf.cell(25, 6, str(eq.get("status", ""))[:12], 1)
        pdf.cell(55, 6, assigned_name[:30], 1)
        pdf.ln()

    pdf_bytes = pdf.output()
    filename = f"equipos_{company.get('name', 'empresa')[:20]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/reports/external-services/pdf")
async def generate_external_services_report_pdf(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    company = None
    company_name = ""
    logo_url = None
    query = {"is_active": {"$ne": False}}

    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if company:
            company_name = company.get("name", "")
            logo_url = company.get("logo_url")
            query["company_id"] = company_id

    services = await db.external_services.find(query, {"_id": 0}).sort("renewal_date", 1).to_list(500)

    company_ids = list(set([s.get("company_id") for s in services if s.get("company_id")]))
    companies_map = {}
    if company_ids:
        comp_list = await db.companies.find({"id": {"$in": company_ids}}, {"_id": 0}).to_list(100)
        companies_map = {c["id"]: c.get("name", "") for c in comp_list}

    type_stats = {}
    total_cost_monthly = 0
    expiring_soon = []
    today = datetime.now(timezone.utc)

    for svc in services:
        svc_type = svc.get("service_type", "Otro")
        type_stats[svc_type] = type_stats.get(svc_type, 0) + 1
        cost = svc.get("cost", 0) or 0
        freq = svc.get("payment_frequency", "")
        if freq == "Mensual":
            total_cost_monthly += cost
        elif freq == "Trimestral":
            total_cost_monthly += cost / 3
        elif freq == "Semestral":
            total_cost_monthly += cost / 6
        elif freq == "Anual":
            total_cost_monthly += cost / 12

        if svc.get("renewal_date"):
            try:
                renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
                days_until = (renewal - today).days
                if 0 <= days_until <= 30:
                    expiring_soon.append({**svc, "days_until": days_until})
            except:
                pass

    pdf = ModernPDF(
        title="Reporte de Servicios Externos",
        company_name=company_name if company_id else "Todas las Empresas",
        logo_url=logo_url
    )
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.section_title("RESUMEN ESTADISTICO")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(63, 8, f"Total Servicios: {len(services)}", 1, 0, "C")
    pdf.cell(63, 8, f"Costo Mensual Est.: ${total_cost_monthly:,.2f}", 1, 0, "C")
    pdf.cell(64, 8, f"Por Renovar (30d): {len(expiring_soon)}", 1, 1, "C")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "Por Tipo de Servicio:", ln=True)
    pdf.set_font("Helvetica", "", 9)

    type_colors = {
        "Hosting": (52, 152, 219), "Servidor Privado": (155, 89, 182),
        "VPS": (155, 89, 182), "Dominio": (46, 204, 113),
        "SSL": (241, 196, 15), "Cloud Storage": (26, 188, 156),
        "CDN": (230, 126, 34), "Backup": (52, 73, 94), "Otro": (149, 165, 166)
    }

    col_count = 0
    for svc_type, count in sorted(type_stats.items()):
        color = type_colors.get(svc_type, (149, 165, 166))
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(47, 7, f"{svc_type}: {count}", 1, 0, "C", fill=True)
        col_count += 1
        if col_count >= 4:
            pdf.ln()
            col_count = 0
    if col_count > 0:
        pdf.ln()
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    if expiring_soon:
        pdf.section_title(f"SERVICIOS POR RENOVAR ({len(expiring_soon)})")
        for svc in sorted(expiring_soon, key=lambda x: x.get("days_until", 999)):
            days = svc.get("days_until", 0)
            pdf.set_font("Helvetica", "B", 9)
            if days <= 7:
                pdf.set_fill_color(248, 215, 218)
            else:
                pdf.set_fill_color(255, 243, 205)
            pdf.cell(0, 7, f"  {svc.get('provider', '')} - {svc.get('service_type', '')} | Vence en {days} dias", "LTR", 1, fill=True)
            pdf.set_font("Helvetica", "", 8)
            company_n = companies_map.get(svc.get("company_id"), "")
            pdf.cell(0, 5, f"  Empresa: {company_n} | Renovacion: {svc.get('renewal_date', '')[:10]}", "LBR", 1)
        pdf.ln(5)

    pdf.section_title(f"DETALLE DE SERVICIOS ({len(services)})")

    if not services:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(0, 10, "No hay servicios registrados", ln=True, align="C")
    else:
        for idx, svc in enumerate(services):
            svc_type = svc.get("service_type", "Otro")
            color = type_colors.get(svc_type, (149, 165, 166))
            pdf.set_fill_color(*color)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 7, f"  {idx + 1}. {svc.get('provider', '')} - {svc_type}", 0, 1, fill=True)
            pdf.set_text_color(0, 0, 0)

            page_width = 190
            label_width = 35
            text_width = page_width - label_width

            detail_rows = []
            comp_name = companies_map.get(svc.get("company_id"), "N/A")
            detail_rows.append(("Empresa", comp_name))
            if svc.get("description"):
                detail_rows.append(("Descripcion", svc.get("description")))
            dates_info = f"Inicio: {svc.get('start_date', 'N/A')[:10]}"
            if svc.get("renewal_date"):
                dates_info += f" | Renovacion: {svc.get('renewal_date')[:10]}"
            detail_rows.append(("Fechas", dates_info))
            if svc.get("cost"):
                cost_info = f"${svc.get('cost', 0):,.2f}"
                if svc.get("payment_frequency"):
                    cost_info += f" ({svc.get('payment_frequency')})"
                detail_rows.append(("Costo", cost_info))
            if svc.get("credentials_info"):
                detail_rows.append(("Credenciales", svc.get("credentials_info")))

            for i, (label, value) in enumerate(detail_rows):
                if not value:
                    continue
                pdf.set_font("Helvetica", "", 8)
                safe_value = sanitize_text(str(value))
                lines = pdf.multi_cell(text_width, 4, safe_value, split_only=True)
                row_height = max(5, len(lines) * 4)

                if pdf.get_y() + row_height > 280:
                    pdf.add_page()

                start_y = pdf.get_y()
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(label_width, row_height, f"{label}:", "L", 0)
                pdf.set_font("Helvetica", "", 8)
                pdf.multi_cell(text_width, 4, safe_value, border=0, align="L")
                end_y = pdf.get_y()
                pdf.line(10 + page_width, start_y, 10 + page_width, end_y)
                pdf.set_y(end_y)

            pdf.cell(0, 2, "", "LRB", 1)
            pdf.ln(3)

            if pdf.get_y() > 250:
                pdf.add_page()

    pdf_bytes = pdf.output()
    filename = f"servicios_externos_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/quotations/{quotation_id}/pdf")
async def generate_quotation_pdf(quotation_id: str, current_user: dict = Depends(get_current_user)):
    quot = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not quot:
        raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
    company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "COTIZACION", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, quot.get("quotation_number", ""), ln=True, align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    if company:
        pdf.cell(0, 6, company.get("name", ""), ln=True)
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Cliente:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, quot.get("client_name", ""), ln=True)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 8, "Descripcion", 1)
    pdf.cell(20, 8, "Cant.", 1, align="C")
    pdf.cell(30, 8, "P. Unit.", 1, align="C")
    pdf.cell(35, 8, "Total", 1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for item in quot.get("items", []):
        pdf.cell(80, 7, item.get("description", "")[:40], 1)
        pdf.cell(20, 7, str(item.get("quantity", 0)), 1, align="C")
        pdf.cell(30, 7, f"${item.get('unit_price', 0):.2f}", 1, align="R")
        pdf.cell(35, 7, f"${item.get('total', 0):.2f}", 1, align="R")
        pdf.ln()
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(150, 8, "TOTAL:", 0, align="R")
    pdf.cell(35, 8, f"${quot.get('total', 0):.2f}", 0, align="R")
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={quot.get('quotation_number', 'cotizacion')}.pdf"})


@router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "FACTURA", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, inv.get("invoice_number", ""), ln=True, align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    if company:
        pdf.cell(0, 6, company.get("name", ""), ln=True)
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Cliente:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, inv.get("client_name", ""), ln=True)
    if inv.get("client_tax_id"):
        pdf.cell(0, 6, f"RUC: {inv.get('client_tax_id', '')}", ln=True)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 8, "Descripcion", 1)
    pdf.cell(20, 8, "Cant.", 1, align="C")
    pdf.cell(30, 8, "P. Unit.", 1, align="C")
    pdf.cell(35, 8, "Total", 1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for item in inv.get("items", []):
        pdf.cell(80, 7, item.get("description", "")[:40], 1)
        pdf.cell(20, 7, str(item.get("quantity", 0)), 1, align="C")
        pdf.cell(30, 7, f"${item.get('unit_price', 0):.2f}", 1, align="R")
        pdf.cell(35, 7, f"${item.get('total', 0):.2f}", 1, align="R")
        pdf.ln()
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(150, 8, "TOTAL:", 0, align="R")
    pdf.cell(35, 8, f"${inv.get('total', 0):.2f}", 0, align="R")
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={inv.get('invoice_number', 'factura')}.pdf"})
