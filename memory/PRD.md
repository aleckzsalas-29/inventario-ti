# PRD - Sistema de Inventario TI (InventarioTI)

## Problema Original
Modernizar un proyecto PHP de inventario TI existente en una aplicación full-stack con interfaz moderna.

## Stack Tecnológico
- **Backend**: FastAPI, MongoDB, Pydantic, JWT, fpdf2, Resend, APScheduler
- **Frontend**: React, React Router, Shadcn UI, Tailwind CSS, Axios

## Arquitectura del Backend (Refactorizada)
```
/app/backend/
├── server.py              # Punto de entrada (111 líneas)
├── config.py              # Variables de entorno
├── database.py            # Conexión MongoDB
├── auth.py                # JWT, passwords, get_current_user
├── helpers.py             # generate_id, now_iso, sanitize_text
├── models.py              # Todos los modelos Pydantic (521 líneas)
├── routes/
│   ├── __init__.py        # Agregación de routers
│   ├── auth_routes.py     # Auth + Users + Roles
│   ├── company_routes.py  # Companies + Branches + Employees
│   ├── equipment_routes.py # Equipment + Logs + Assignments + Decommissions
│   ├── maintenance_routes.py # Maintenance logs
│   ├── services_routes.py # External Services
│   ├── finance_routes.py  # Quotations + Invoices + CFDI
│   ├── config_routes.py   # Settings + Custom Fields + Dashboard + Permissions
│   ├── report_routes.py   # Todos los reportes PDF
│   └── notification_routes.py # Notificaciones email + scheduler
├── services/
│   ├── pdf_service.py     # ModernPDF class
│   └── email_service.py   # Templates + Resend + APScheduler
└── requirements.txt
```

## Módulos Implementados
1. **Equipos**: CRUD completo, logs, asignaciones, reportes PDF
2. **Empresas**: CRUD, sucursales, empleados
3. **Mantenimientos**: Preventivo/Correctivo/Reparación, historial, reportes PDF
4. **Servicios Externos**: CRUD, reportes PDF, alertas de renovación
5. **Cotizaciones**: CRUD, PDF, estados, campos CFDI
6. **Facturas**: CRUD, PDF, timbrado (placeholder), campos CFDI
7. **Campos Personalizados**: Dinámicos por entidad con validación
8. **Reportes**: Página centralizada con filtros avanzados
9. **Configuración**: Tema, logo, personalización login
10. **Notificaciones**: In-app (campana), email manual y automático

## Funcionalidades Completadas
- Login/registro con JWT
- Dashboard con estadísticas
- CRUD completo para todos los módulos
- Reportes PDF profesionales
- Tema dinámico personalizable
- Login page personalizable (fondo, títulos, logo)
- Sistema de notificaciones in-app
- Notificaciones email vía Resend (manual)
- **Notificaciones automáticas con APScheduler** (configurables: hora, tipos, destinatarios)
- **Refactorización completa del backend** (de 3680 líneas monolíticas a 15+ módulos)
- Asignación de equipos a empleados
- Bajas de equipos
- Remoción de branding externo

## Integraciones 3rd Party
- **Resend**: Envío de emails (API Key: sandbox)
- **PAC CFDI**: Placeholder (pendiente proveedor)

## Credenciales de Prueba
- Email: admin@example.com
- Password: adminpassword
- Resend API Key: re_9dxaW5uj_12Ct6F9W15sWhS8VjpwsZ97P (sandbox)

## Tareas Pendientes
### P1 - Próximas
- Integración PAC para timbrado CFDI (requiere proveedor: Facturama/Finkok)

### P2 - Futuras
- Re-implementar checklist en MaintenancePage
- Mejoras de accesibilidad (aria-describedby warnings)

### Notas Operativas
- El servidor del usuario frecuentemente está desincronizado. Siempre verificar que tiene el código más reciente antes de debuggear.
