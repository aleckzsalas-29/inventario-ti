# Sistema de Inventario TI - PRD

## Problema Original
Migración de sistema PHP de inventario TI a stack moderno con mejoras de interfaz y módulos adicionales.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) con JWT auth
- **Base de datos**: MongoDB
- **PDF**: fpdf2

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
- [x] **Campos Personalizados Dinámicos** (05/02/2026) ✨
- [x] **Validaciones Personalizadas** (05/02/2026) ✨ NUEVO
- [x] **Exportación de Campos Personalizados en PDF** (05/02/2026) ✨ NUEVO

### Pendientes
- [ ] Integración con PAC para timbrado CFDI (preparado, pendiente proveedor)
- [ ] Notificaciones email (requiere API key Resend)
- [ ] Alertas de renovación de servicios externos

## Implementado (05/02/2026)

### Campos Personalizados con Validaciones
Sistema completo de campos personalizados dinámicos con validaciones configurables.

**Secciones soportadas:**
- Equipos, Empresas, Sucursales, Empleados
- Servicios Externos, Mantenimientos
- Cotizaciones, Facturas

**Tipos de campo:**
- Texto, Número, Fecha, Lista de opciones, Sí/No, Contraseña

**Validaciones disponibles:**
| Tipo Campo | Validaciones |
|------------|--------------|
| Texto/Contraseña | Longitud mín/máx, Patrón Regex, Mensaje de error personalizado |
| Número | Valor mínimo/máximo |
| Fecha | Fecha mínima/máxima |

**Campos adicionales del campo:**
- Placeholder: Texto de ayuda en el input
- Help text: Instrucciones debajo del campo
- Categoría: Agrupación visual

**Exportación en PDF:**
- Reportes de equipos incluyen campos personalizados
- Historial de mantenimientos incluye campos personalizados

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Archivos Clave
```
/app/backend/server.py              # API completa
/app/frontend/src/pages/
├── CustomFieldsPage.js             # Gestión con validaciones ✨
├── EquipmentPage.js                # Formulario con custom fields
├── CompaniesPage.js                # Empresas + custom fields
├── EmployeesPage.js                # Empleados + custom fields
├── MaintenancePage.js              # Mantenimientos + custom fields
├── ExternalServicesPage.js         # Servicios + custom fields
└── ...
/app/frontend/src/components/
└── CustomFieldsRenderer.js         # Componente con validaciones ✨
```

## API Endpoints

### Campos Personalizados
```
GET  /api/custom-fields?entity_type=equipment
POST /api/custom-fields
PUT  /api/custom-fields/{id}
DELETE /api/custom-fields/{id}
```

**Schema CustomField:**
```json
{
  "entity_type": "equipment",
  "name": "Código SAT",
  "field_type": "text",
  "required": true,
  "placeholder": "ABC-1234",
  "help_text": "Formato: 3 letras, guión, 4 números",
  "validation": {
    "min_length": 8,
    "max_length": 10,
    "regex_pattern": "^[A-Z]{3}-[0-9]{4}$",
    "regex_message": "Debe ser formato ABC-1234"
  }
}
```

### Reportes PDF con Campos Personalizados
```
GET /api/reports/equipment/pdf?include_custom_fields=true
GET /api/reports/maintenance/{equipment_id}/pdf
```

## Next Steps
1. **P1**: Integración PAC para timbrado CFDI (requiere proveedor)
2. **P1**: Notificaciones email (configurar Resend)
3. **P2**: Alertas de renovación de servicios

## Campos Personalizados de Ejemplo
| Sección | Campo | Validación |
|---------|-------|------------|
| Equipos | Número de Activo Fijo | - |
| Equipos | Código SAT | Regex: ABC-1234 |
| Empresas | Código SAP | - |
| Empleados | Número de Empleado | - |
| Servicios | Contrato Número | - |
| Mantenimientos | Orden de Trabajo | - |
