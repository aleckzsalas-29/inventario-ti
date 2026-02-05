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

### Pendientes
- [ ] Integración con PAC para timbrado CFDI
- [ ] Campos personalizados dinámicos (UI)
- [ ] Notificaciones email (requiere API key Resend)
- [ ] Alertas de renovación de servicios externos

## Implementado (05/02/2026)

### Equipos - Nuevo Formulario con Tabs
- **General**: Empresa, código inventario, tipo, marca, modelo, serie, estado
- **Hardware**: 
  - Procesador (marca, modelo, velocidad)
  - RAM (capacidad, tipo DDR)
  - Almacenamiento (tipo SSD/HDD/NVMe, capacidad)
  - Red (IP, MAC)
- **Software**:
  - Sistema operativo (nombre, versión, licencia)
  - Antivirus (nombre, licencia, vencimiento)
- **Credenciales**:
  - Windows (usuario, contraseña)
  - Correo (cuenta, contraseña)
  - Nube (usuario, contraseña)

### Mantenimientos - Campos por Tipo
- **Preventivo**: Próximo mantenimiento, frecuencia
- **Correctivo/Reparación**: Diagnóstico, solución, tiempo de reparación, piezas
- Flujo: Crear → Iniciar → Finalizar
- Historial por equipo con descarga PDF

### Facturación CFDI México
- **Receptor**: RFC, régimen fiscal, código postal
- **CFDI**: Uso CFDI, método pago (PUE/PPD), forma pago, condiciones
- **Moneda**: MXN, USD, EUR con tipo de cambio
- Catálogos SAT integrados
- ⚠️ Sin timbrado PAC (pendiente integración)

### Cotizaciones
- RFC y régimen fiscal del cliente
- Uso CFDI para conversión a factura
- Conceptos con claves SAT opcionales

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Archivos Clave
```
/app/backend/server.py        # API completa
/app/frontend/src/pages/
├── EquipmentPage.js          # Formulario con tabs
├── EquipmentDetailPage.js    # Detalle + historial mantenimiento
├── MaintenancePage.js        # Bitácoras por tipo
├── InvoicesPage.js           # Facturas CFDI
├── QuotationsPage.js         # Cotizaciones RFC
└── DashboardPage.js          # KPIs
```

## Endpoints API
- `POST /api/auth/login` - Autenticación
- `GET/POST /api/equipment` - Equipos con hardware/software
- `GET/POST /api/maintenance` - Mantenimientos
- `GET /api/maintenance/history/{id}` - Historial por equipo
- `GET /api/reports/maintenance/{id}/pdf` - PDF mantenimientos
- `GET/POST /api/invoices` - Facturas CFDI
- `GET/POST /api/quotations` - Cotizaciones

## Next Steps
1. **P0**: Integración con PAC para timbrado CFDI (Facturama, Finkok, etc.)
2. **P1**: UI para campos personalizados dinámicos
3. **P1**: Notificaciones email (configurar Resend)
4. **P2**: Alertas de renovación de servicios
