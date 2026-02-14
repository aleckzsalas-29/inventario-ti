# Sistema de Inventario TI - PRD

## Problema Original
Migración de sistema PHP de inventario TI a stack moderno con mejoras de interfaz y módulos adicionales.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) con JWT auth
- **Base de datos**: MongoDB
- **PDF**: fpdf2

## Core Requirements

### Completados
- [x] Gestión de equipos con especificaciones detalladas
- [x] Campos de hardware: procesador, RAM, almacenamiento, red
- [x] Campos de software: SO, antivirus con fechas de vencimiento
- [x] Credenciales de equipos: Windows, correo, nube (ocultas)
- [x] Bitácoras de mantenimiento con tipos: Preventivo, Correctivo, Reparación, Otro
- [x] Campos específicos por tipo de mantenimiento
- [x] **Campo `performed_date`** - Fecha de realización del mantenimiento (14/02/2026)
- [x] Historial de mantenimientos por equipo con PDF
- [x] **Reportes PDF por período** - día, semana, mes (14/02/2026)
- [x] Facturas con formato CFDI México
- [x] Cotizaciones con RFC y régimen fiscal
- [x] **Asignación de equipos a empleados** con flujo de estados (14/02/2026)
- [x] **Logo URL en empresas** - aparece en formulario y PDFs (14/02/2026)
- [x] **Reporte de estado de equipos por empresa** (14/02/2026)
- [x] Campos Personalizados Dinámicos con validaciones
- [x] Modo claro/oscuro
- [x] **Instrucciones de despliegue** - archivo /app/instructions.txt (14/02/2026)

### Pendientes
- [ ] Integración con PAC para timbrado CFDI (preparado, pendiente proveedor)
- [ ] Notificaciones email (requiere API key Resend)
- [ ] Alertas de renovación de servicios externos

## Implementado (14/02/2026)

### Bitácoras de Mantenimiento
- Campo `performed_date` añadido al formulario con valor por defecto (fecha actual)
- Tabla muestra fecha de realización en lugar de fecha de creación
- Payload limpia campos vacíos para evitar errores 422

### Reportes PDF
- Dropdown de reportes en página de Mantenimientos
- Opciones: Último día, Última semana, Último mes
- Endpoint: GET /api/reports/maintenance/pdf?period=day|week|month

### Empresas y Logos
- Campo `logo_url` en formulario de empresas
- Preview del logo en el formulario
- Logo visible en detalles de la empresa
- Botón "Reporte Equipos" para descargar PDF de estado

### Asignación de Equipos
- Flujo de estados: Disponible → Asignado → Disponible
- Equipo muestra nombre del empleado asignado

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Archivos Clave
```
/app/backend/server.py              # API completa
/app/instructions.txt               # Instrucciones de despliegue Ubuntu
/app/frontend/src/pages/
├── CustomFieldsPage.js             # Gestión con validaciones
├── EquipmentPage.js                # Formulario con custom fields y asignación
├── CompaniesPage.js                # Empresas con logo y reporte de equipos
├── EmployeesPage.js                # Empleados + custom fields
├── MaintenancePage.js              # Mantenimientos con performed_date y reportes
├── ExternalServicesPage.js         # Servicios + custom fields
└── ...
/app/frontend/src/components/
└── CustomFieldsRenderer.js         # Componente con validaciones
```

## API Endpoints

### Mantenimientos
```
POST /api/maintenance               # Crear bitácora (con performed_date)
GET  /api/reports/maintenance/pdf?period=day|week|month  # Reporte por período
GET  /api/reports/maintenance/{equipment_id}/pdf         # Historial de equipo
```

### Empresas
```
POST /api/companies                 # Crear empresa (con logo_url)
PUT  /api/companies/{id}            # Actualizar empresa
GET  /api/reports/equipment-status/pdf?company_id=xxx    # Reporte de estado
```

### Asignaciones
```
POST /api/assignments               # Crear asignación
PUT  /api/assignments/{id}/return   # Devolver equipo
```

## Next Steps
1. **P1**: Integración PAC para timbrado CFDI (requiere proveedor)
2. **P1**: Notificaciones email (configurar Resend)
3. **P2**: Alertas de renovación de servicios

## Testing Status
- Backend: 100% (15/15 tests passed)
- Frontend: 100% (todas las funcionalidades verificadas)
- Archivo de tests: /app/backend/tests/test_requested_features.py
