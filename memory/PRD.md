# Sistema de Inventario TI - PRD

## Problema Original
Migración de sistema PHP de inventario TI a stack moderno (React + FastAPI + MongoDB) con mejoras de interfaz y nuevos módulos.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) con JWT auth
- **Base de datos**: MongoDB
- **Emails**: Resend (pendiente API key)

## User Personas
1. **Administrador**: Acceso total, gestión de usuarios y permisos
2. **Técnico**: Gestión de equipos, asignaciones, mantenimientos
3. **Cliente**: Vista de sus equipos y documentos

## Core Requirements (Estáticos)
- [x] Gestión de equipos con bitácoras
- [x] Asignación de equipos por empresa
- [x] Campos de credenciales en equipos (Windows, correo, nube)
- [x] Bitácoras de mantenimiento (Preventivo, Correctivo, Reparación, Otro)
- [x] Descarga de reportes PDF
- [x] Servicios externos (hosting, servidores)
- [x] Módulo de cotizaciones
- [x] Módulo de facturación
- [x] Roles con permisos configurables
- [x] Modo claro/oscuro
- [ ] Campos personalizables dinámicos (UI pendiente)
- [ ] Notificaciones email (requiere API key Resend)

## Implementado (05/02/2026)

### MVP Original
- ✅ Backend completo con todos los endpoints API
- ✅ Autenticación JWT con roles y permisos
- ✅ CRUD: Empresas, Sucursales, Empleados, Equipos
- ✅ Bitácoras/Logs de equipos
- ✅ Asignaciones y devoluciones de equipos
- ✅ Dar de baja equipos
- ✅ Servicios externos (hosting, servidores, dominios)
- ✅ Cotizaciones con items y generación PDF
- ✅ Facturas con items y generación PDF
- ✅ Gestión de usuarios y roles con permisos
- ✅ Dashboard con KPIs
- ✅ Toggle modo claro/oscuro
- ✅ Reportes PDF de equipos y bitácoras

### Refactorización (05/02/2026)
- ✅ **Eliminados campos de costos** de toda la estructura
- ✅ **Módulo de Reparaciones → Bitácoras de Mantenimiento**
  - Tipos: Preventivo, Correctivo, Reparación, Otro
  - Flujo: Crear → Iniciar → Finalizar
  - Filtros por tipo y estado
- ✅ **Campos de credenciales en Equipos**
  - Windows: usuario y contraseña
  - Correo: cuenta y contraseña
  - Nube/Cloud: usuario y contraseña
  - Botones mostrar/ocultar contraseña
- ✅ **Backend de Campos Personalizados** (API lista)
  - Endpoint: /api/custom-fields
  - Soporta: text, number, date, select, boolean, password

## Pendiente / Backlog

### P0 (Crítico)
- [ ] UI para gestión de campos personalizados
- [ ] Configurar API key de Resend para emails

### P1 (Alto)
- [ ] Alertas de renovación de servicios externos
- [ ] Exportación a Excel
- [ ] Firma digital en asignaciones

### P2 (Medio)
- [ ] Reportes avanzados con filtros
- [ ] Historial de cambios (audit log)

### P3 (Bajo)
- [ ] Notificaciones push
- [ ] Dashboard widgets personalizables
- [ ] Importación masiva de datos

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Archivos Clave
- `/app/backend/server.py` - API completa
- `/app/frontend/src/pages/MaintenancePage.js` - Bitácoras de mantenimiento
- `/app/frontend/src/pages/EquipmentPage.js` - Gestión de equipos con credenciales
- `/app/frontend/src/pages/EquipmentDetailPage.js` - Detalle con credenciales

## Endpoints API Principales
- `POST /api/auth/login` - Autenticación
- `GET /api/dashboard/stats` - Estadísticas
- `GET/POST /api/equipment` - CRUD Equipos
- `GET/POST /api/maintenance` - Bitácoras de mantenimiento
- `PUT /api/maintenance/{id}/start` - Iniciar mantenimiento
- `PUT /api/maintenance/{id}/complete` - Finalizar mantenimiento
- `GET/POST /api/custom-fields` - Campos personalizados (backend listo)

## Next Steps
1. Implementar UI para campos personalizados dinámicos
2. Solicitar API key de Resend para notificaciones
3. Añadir alertas de renovación de servicios
