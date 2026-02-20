"""
INSTRUCCIONES DE ACTUALIZACIÓN - REPORTES PDF PROFESIONALES
============================================================

Este archivo contiene el código actualizado para los reportes PDF de mantenimiento.
Debes reemplazar DOS funciones en tu archivo server.py:

1. generate_maintenance_history_pdf (reporte por equipo)
2. generate_maintenance_report_pdf (reporte por período)

PASOS:
1. Abre /var/www/inventario-ti/backend/server.py
2. Busca: @api_router.get("/reports/maintenance/{equipment_id}/pdf")
3. Elimina toda esa función hasta el siguiente @api_router
4. Pega el contenido de FUNCIÓN 1 de este archivo
5. Busca: @api_router.get("/reports/maintenance/pdf")
6. Elimina toda esa función hasta el siguiente @api_router
7. Pega el contenido de FUNCIÓN 2 de este archivo
8. Guarda y reinicia: sudo systemctl restart inventario-backend

============================================================
FUNCIÓN 1: generate_maintenance_history_pdf
============================================================
"""

# COPIA DESDE AQUÍ PARA FUNCIÓN 1 ↓↓↓

"""
@api_router.get("/reports/maintenance/{equipment_id}/pdf")
async def generate_maintenance_history_pdf(equipment_id: str, current_user: dict = Depends(get_current_user)):
    \"\"\"Generate professional PDF report of maintenance history for an equipment with full details\"\"\"
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    logs = await db.maintenance_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    if not eq and not logs:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # Get company info for logo
    company = None
    logo_url = None
    company_name = ""
    if eq and eq.get("company_id"):
        company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
        if company:
            logo_url = company.get("logo_url")
            company_name = company.get("name", "")
    
    # Get assigned employee name
    assigned_employee = ""
    if eq and eq.get("assigned_to"):
        emp = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
        if emp:
            assigned_employee = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
    
    # Get custom fields
    custom_fields = await db.custom_fields.find({"entity_type": "maintenance", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)
    eq_custom_fields = await db.custom_fields.find({"entity_type": "equipment", "is_active": {"$ne": False}}, {"_id": 0}).to_list(50)
    
    inv_code = str(eq.get('inventory_code', 'N/A') if eq else logs[0].get('equipment_code', 'N/A'))[:30]
    
    # Create professional PDF
    pdf = ModernPDF(title="Historial de Mantenimientos", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Equipment Info Section
    pdf.section_title("INFORMACION DEL EQUIPO")
    
    # Basic info in two columns
    pdf.set_font("Helvetica", "", 9)
    col_width = 95
    
    if eq:
        # Row 1
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Codigo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('inventory_code', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Tipo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('equipment_type', 'N/A')), 0, 1)
        
        # Row 2
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Marca:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('brand', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Modelo:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('model', 'N/A')), 0, 1)
        
        # Row 3
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "No. Serie:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('serial_number', 'N/A')), 0)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Estado:", 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_width - 30, 6, str(eq.get('status', 'N/A')), 0, 1)
        
        # Row 4 - Assigned to
        if assigned_employee:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(30, 6, "Asignado a:", 0)
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(col_width - 30, 6, assigned_employee, 0, 1)
        
        pdf.ln(3)
        
        # Hardware Specifications
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
        
        # Software Info
        has_software = any([eq.get('os_name'), eq.get('antivirus_name')])
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
        
        # Network Info
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
        
        # Custom fields for equipment
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
    
    # Maintenance History Section
    pdf.section_title(f"HISTORIAL DE MANTENIMIENTOS ({len(logs)} registros)")
    
    if not logs:
        pdf.set_font("Helvetica", "I", 10)
        pdf.cell(0, 10, "No hay registros de mantenimiento para este equipo", ln=True, align="C")
    else:
        for idx, log in enumerate(logs):
            # Maintenance entry header with color coding
            maint_type = str(log.get("maintenance_type", ""))
            status = str(log.get("status", ""))
            date_str = str(log.get("performed_date", log.get("created_at", "")))[:10]
            
            # Color based on type
            if maint_type == "Preventivo":
                pdf.set_fill_color(41, 128, 185)  # Blue
            elif maint_type == "Correctivo":
                pdf.set_fill_color(243, 156, 18)  # Orange
            elif maint_type == "Reparacion":
                pdf.set_fill_color(231, 76, 60)   # Red
            else:
                pdf.set_fill_color(149, 165, 166) # Gray
            
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 8, f"  {idx + 1}. {maint_type} - {status} | Fecha: {date_str}", 0, ln=True, fill=True)
            pdf.set_text_color(0, 0, 0)
            
            # Content box
            pdf.set_fill_color(250, 250, 250)
            pdf.set_draw_color(200, 200, 200)
            
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(25, 6, "Descripcion:", "LT")
            pdf.set_font("Helvetica", "", 9)
            desc = str(log.get('description', 'N/A'))[:120]
            pdf.cell(0, 6, desc, "RT", 1)
            
            tech = log.get("technician")
            if tech:
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(25, 6, "Tecnico:", "L")
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(0, 6, str(tech)[:50], "R", 1)
            
            if maint_type == "Preventivo":
                if log.get("next_maintenance_date"):
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(25, 6, "Prox. Mant.:", "L")
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(70, 6, log.get('next_maintenance_date'), 0)
                    if log.get("maintenance_frequency"):
                        pdf.set_font("Helvetica", "B", 9)
                        pdf.cell(25, 6, "Frecuencia:", 0)
                        pdf.set_font("Helvetica", "", 9)
                        pdf.cell(0, 6, log.get('maintenance_frequency'), "R", 1)
                    else:
                        pdf.cell(0, 6, "", "R", 1)
            
            if maint_type in ["Correctivo", "Reparacion"]:
                diag = log.get("problem_diagnosis")
                if diag:
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(25, 6, "Diagnostico:", "L")
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, str(diag)[:100], "R", 1)
                sol = log.get("solution_applied")
                if sol:
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(25, 6, "Solucion:", "L")
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, str(sol)[:100], "R", 1)
                if log.get("repair_time_hours"):
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.cell(25, 6, "Tiempo:", "L")
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(0, 6, f"{log.get('repair_time_hours')} horas", "R", 1)
            
            parts = log.get("parts_used")
            if parts:
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(25, 6, "Materiales:", "L")
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(0, 6, str(parts)[:100], "R", 1)
            
            # Custom fields
            if custom_fields and log.get("custom_fields"):
                cf_values = log.get("custom_fields", {})
                for cf in custom_fields:
                    value = cf_values.get(cf.get("name"), "")
                    if value:
                        pdf.set_font("Helvetica", "B", 8)
                        pdf.cell(25, 5, f"{cf.get('name')}:", "L")
                        pdf.set_font("Helvetica", "I", 8)
                        pdf.cell(0, 5, str(value)[:80], "R", 1)
            
            # Status and completion
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(100, 100, 100)
            if log.get("completed_at"):
                completed = str(log.get("completed_at", ""))[:19].replace("T", " ")
                pdf.cell(0, 5, f"Completado: {completed}", "LRB", 1)
            else:
                pdf.cell(0, 5, f"Registrado: {str(log.get('created_at', ''))[:19].replace('T', ' ')}", "LRB", 1)
            pdf.set_text_color(0, 0, 0)
            
            pdf.ln(4)
    
    pdf_bytes = pdf.output()
    filename = f"mantenimientos_{inv_code}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})
"""

# FIN DE FUNCIÓN 1 ↑↑↑

"""
============================================================
FUNCIÓN 2: generate_maintenance_report_pdf
============================================================
"""

# COPIA DESDE AQUÍ PARA FUNCIÓN 2 ↓↓↓

"""
@api_router.get("/reports/maintenance/pdf")
async def generate_maintenance_report_pdf(
    period: str = Query("week", description="day, week, month"),
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    \"\"\"Generate professional PDF report of maintenance logs by period with full equipment details\"\"\"
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now - timedelta(days=1)
        period_label = "Ultimo dia"
    elif period == "month":
        start_date = now - timedelta(days=30)
        period_label = "Ultimo mes"
    else:  # week
        start_date = now - timedelta(days=7)
        period_label = "Ultima semana"
    
    query = {"created_at": {"$gte": start_date.isoformat()}}
    if company_id:
        equipment_list = await db.equipment.find({"company_id": company_id}, {"id": 1}).to_list(1000)
        eq_ids = [e["id"] for e in equipment_list]
        query["equipment_id"] = {"$in": eq_ids}
    
    logs = await db.maintenance_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get company info
    company_name = ""
    logo_url = None
    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if company:
            company_name = company.get("name", "")
            logo_url = company.get("logo_url")
    
    # Get all equipment details for the logs
    equipment_ids = list(set([log.get("equipment_id") for log in logs if log.get("equipment_id")]))
    equipment_map = {}
    if equipment_ids:
        eq_list = await db.equipment.find({"id": {"$in": equipment_ids}}, {"_id": 0}).to_list(500)
        equipment_map = {eq["id"]: eq for eq in eq_list}
    
    # Statistics
    stats = {"Preventivo": 0, "Correctivo": 0, "Reparacion": 0, "Otro": 0}
    status_stats = {"Pendiente": 0, "En Proceso": 0, "Finalizado": 0}
    for log in logs:
        mtype = log.get("maintenance_type", "Otro")
        stats[mtype] = stats.get(mtype, 0) + 1
        status = log.get("status", "Pendiente")
        status_stats[status] = status_stats.get(status, 0) + 1
    
    # Create professional PDF
    pdf = ModernPDF(title="Reporte de Mantenimientos", company_name=company_name, logo_url=logo_url)
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Period info
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(52, 73, 94)
    pdf.cell(0, 8, f"Periodo: {period_label}", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"Desde: {start_date.strftime('%d/%m/%Y')} - Hasta: {now.strftime('%d/%m/%Y')}", ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)
    
    # Summary Statistics
    pdf.section_title("RESUMEN ESTADISTICO")
    
    # Stats in boxes
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(95, 8, f"Total de Registros: {len(logs)}", 1, 0, "C")
    finalized = status_stats.get("Finalizado", 0)
    pdf.cell(95, 8, f"Completados: {finalized} ({round(finalized/len(logs)*100) if logs else 0}%)", 1, 1, "C")
    
    pdf.ln(3)
    
    # Type breakdown
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
    
    # Status breakdown
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
        # Detailed maintenance records
        pdf.section_title("DETALLE DE MANTENIMIENTOS")
        
        for idx, log in enumerate(logs):
            eq = equipment_map.get(log.get("equipment_id"), {})
            
            # Maintenance header with color
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
            
            # Equipment info box
            pdf.set_fill_color(248, 249, 250)
            pdf.set_draw_color(200, 200, 200)
            
            # Equipment details
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(25, 5, "Equipo:", "LT")
            pdf.set_font("Helvetica", "", 8)
            eq_info = f"{eq.get('inventory_code', log.get('equipment_code', 'N/A'))} - {eq.get('equipment_type', log.get('equipment_type', ''))}"
            pdf.cell(70, 5, eq_info[:40], "T")
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(20, 5, "Marca:", "T")
            pdf.set_font("Helvetica", "", 8)
            pdf.cell(0, 5, f"{eq.get('brand', '')} {eq.get('model', '')}"[:30], "RT", 1)
            
            # Serial and more hardware info
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
            
            # OS and status
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
            
            # Maintenance description
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(25, 5, "Descripcion:", "L")
            pdf.set_font("Helvetica", "", 8)
            pdf.cell(0, 5, str(log.get('description', ''))[:90], "R", 1)
            
            # Technician
            if log.get("technician"):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(25, 5, "Tecnico:", "L")
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 5, str(log.get('technician', ''))[:50], "R", 1)
            
            # Type-specific fields
            if maint_type == "Preventivo":
                if log.get("next_maintenance_date") or log.get("maintenance_frequency"):
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.cell(25, 5, "Prox. Mant.:", "L")
                    pdf.set_font("Helvetica", "", 8)
                    next_info = log.get('next_maintenance_date', 'N/A')
                    if log.get("maintenance_frequency"):
                        next_info += f" ({log.get('maintenance_frequency')})"
                    pdf.cell(0, 5, next_info, "R", 1)
            
            if maint_type in ["Correctivo", "Reparacion"]:
                if log.get("problem_diagnosis"):
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.cell(25, 5, "Diagnostico:", "L")
                    pdf.set_font("Helvetica", "", 8)
                    pdf.cell(0, 5, str(log.get('problem_diagnosis', ''))[:80], "R", 1)
                if log.get("solution_applied"):
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.cell(25, 5, "Solucion:", "L")
                    pdf.set_font("Helvetica", "", 8)
                    pdf.cell(0, 5, str(log.get('solution_applied', ''))[:80], "R", 1)
                if log.get("repair_time_hours"):
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.cell(25, 5, "Tiempo:", "L")
                    pdf.set_font("Helvetica", "", 8)
                    pdf.cell(0, 5, f"{log.get('repair_time_hours')} horas", "R", 1)
            
            # Parts used
            if log.get("parts_used"):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(25, 5, "Materiales:", "L")
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 5, str(log.get('parts_used', ''))[:80], "R", 1)
            
            # Close box
            pdf.cell(0, 2, "", "LRB", 1)
            pdf.ln(3)
            
            # Page break if needed
            if pdf.get_y() > 250:
                pdf.add_page()
    
    pdf_bytes = pdf.output()
    filename = f"mantenimientos_{period}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})
"""

# FIN DE FUNCIÓN 2 ↑↑↑
