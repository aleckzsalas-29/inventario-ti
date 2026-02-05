# Sistema de Inventario TI - PRD

## Problema Original
Migración de sistema PHP de inventario TI a stack moderno con mejoras de interfaz y módulos adicionales.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) con JWT auth
- **Base de datos**: MongoDB
- **Emails**: Resend (pendiente API key)

## Core Requirements

### Completados ✅
- [x] Gestión de equipos con especificaciones detalladas
- [x] Campos de hardware: procesador, RAM, almacenamiento, red
- [x] Campos de software: SO, antivirus con fechas de vencimiento
- [x] Credenciales de equipos: Windows, correo, nube (ocultas)
- [x] Bitácoras de mantenimiento con tipos: Preventivo, Correctivo, Reparación, Otro
- [x] Campos específicos por tipo de mantenimiento
- [x] Historial de mantenimientos por equipo con PDF
- [x] Facturas con formato CFDI México
- [x] Cotizaciones con RFC y régimen fiscal
- [x] Asignación de equipos por empresa/empleado
- [x] Reportes PDF
- [x] Modo claro/oscuro
- [x] **Campos Personalizados Dinámicos** (05/02/2026) ✨ NUEVO

### Pendientes
- [ ] Integración con PAC para timbrado CFDI (preparado, pendiente proveedor)
- [ ] Notificaciones email (requiere API key Resend)
- [ ] Alertas de renovación de servicios externos

## Implementado (05/02/2026) - Campos Personalizados

### Funcionalidad de Campos Personalizados
Permite crear campos adicionales dinámicos para cualquier sección del sistema sin modificar código.

**Secciones soportadas:**
- Equipos (equipment)
- Empresas (company)
- Sucursales (branch)
- Empleados (employee)
- Servicios Externos (service)
- Mantenimientos (maintenance)
- Cotizaciones (quotation)
- Facturas (invoice)

**Tipos de campo disponibles:**
- Texto
- Número
- Fecha
- Lista de opciones (select)
- Sí/No (boolean)
- Contraseña (oculta)

**Componentes creados:**
- `/app/frontend/src/pages/CustomFieldsPage.js` - Página de administración
- `/app/frontend/src/components/CustomFieldsRenderer.js` - Componente reutilizable

**Integración en formularios:**
- EquipmentPage.js - Pestaña "Adicionales"
- CompaniesPage.js - Sección campos adicionales
- EmployeesPage.js - Sección campos adicionales
- ExternalServicesPage.js - Sección campos adicionales
- MaintenancePage.js - Sección campos adicionales

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Archivos Clave
```
/app/backend/server.py        # API completa
/app/frontend/src/pages/
├── CustomFieldsPage.js       # Gestión de campos personalizados ✨
├── EquipmentPage.js          # Formulario con tabs y custom fields
├── EquipmentDetailPage.js    # Detalle + historial mantenimiento
├── MaintenancePage.js        # Bitácoras por tipo + custom fields
├── CompaniesPage.js          # Empresas + custom fields
├── EmployeesPage.js          # Empleados + custom fields
├── ExternalServicesPage.js   # Servicios externos + custom fields
├── InvoicesPage.js           # Facturas CFDI
├── QuotationsPage.js         # Cotizaciones RFC
└── DashboardPage.js          # KPIs
/app/frontend/src/components/
└── CustomFieldsRenderer.js   # Componente reutilizable ✨
```

## Endpoints API

### Campos Personalizados (NUEVO)
- `GET /api/custom-fields` - Listar campos (filtro por entity_type)
- `POST /api/custom-fields` - Crear campo
- `PUT /api/custom-fields/{id}` - Actualizar campo
- `DELETE /api/custom-fields/{id}` - Eliminar campo (soft delete)

### Existentes
- `POST /api/auth/login` - Autenticación
- `GET/POST /api/equipment` - Equipos con hardware/software
- `GET/POST /api/maintenance` - Mantenimientos
- `GET /api/maintenance/history/{id}` - Historial por equipo
- `GET /api/reports/maintenance/{id}/pdf` - PDF mantenimientos
- `GET/POST /api/invoices` - Facturas CFDI
- `GET/POST /api/quotations` - Cotizaciones

## Next Steps
1. **P1**: Integración con PAC para timbrado CFDI (requiere elegir proveedor)
2. **P1**: Notificaciones email (configurar Resend)
3. **P2**: Alertas de renovación de servicios

## Campos Personalizados Creados (Ejemplos)
- Equipos: "Número de Activo Fijo"
- Empresas: "Código SAP"
- Empleados: "Número de Empleado"
- Servicios: "Contrato Número"
- Mantenimientos: "Orden de Trabajo"
