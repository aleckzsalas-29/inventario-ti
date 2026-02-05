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
2. **Técnico**: Gestión de equipos, asignaciones, reparaciones
3. **Cliente**: Vista de sus equipos y documentos

## Core Requirements (Estáticos)
- [ ] Gestión de equipos con bitácoras
- [ ] Asignación de equipos por empresa
- [ ] Campos personalizables de equipos
- [ ] Descarga de reportes PDF
- [ ] Servicios externos (hosting, servidores)
- [ ] Módulo de cotizaciones
- [ ] Módulo de facturación
- [ ] Roles con permisos configurables
- [ ] Notificaciones email
- [ ] Modo claro/oscuro

## Implementado (05/02/2026)
✅ Backend completo con todos los endpoints API
✅ Autenticación JWT con roles y permisos
✅ CRUD: Empresas, Sucursales, Empleados, Equipos
✅ Bitácoras/Logs de equipos
✅ Asignaciones y devoluciones de equipos
✅ Reparaciones (envío y finalización)
✅ Dar de baja equipos
✅ Servicios externos (hosting, servidores, dominios)
✅ Cotizaciones con items y generación PDF
✅ Facturas con items y generación PDF
✅ Gestión de usuarios y roles con permisos
✅ Dashboard con KPIs y gráficos
✅ Toggle modo claro/oscuro
✅ Reportes PDF de equipos y bitácoras
✅ Interfaz moderna con Shadcn/UI

## Pendiente / Backlog

### P0 (Crítico)
- [ ] Configurar API key de Resend para emails

### P1 (Alto)
- [ ] Campos personalizables dinámicos para equipos
- [ ] Firma digital en asignaciones
- [ ] Exportación a Excel

### P2 (Medio)
- [ ] Alertas de renovación de servicios
- [ ] Reportes avanzados con filtros
- [ ] Historial de cambios (audit log)

### P3 (Bajo)
- [ ] Notificaciones push
- [ ] Dashboard widgets personalizables
- [ ] Importación masiva de datos

## Credenciales de Prueba
- Email: admin@inventarioti.com
- Password: admin123

## Next Steps
1. Solicitar API key de Resend para activar notificaciones email
2. Implementar campos dinámicos para equipos
3. Añadir firma digital en módulo de asignaciones
