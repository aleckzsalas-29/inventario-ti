#!/bin/bash
# Script de actualización para reportes PDF profesionales
# Ejecutar como: bash update_pdf_reports.sh

echo "=== Actualizando reportes PDF de mantenimiento ==="

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/server.py" ]; then
    echo "ERROR: Ejecuta este script desde /var/www/inventario-ti"
    exit 1
fi

# Crear backup
echo "Creando backup de server.py..."
cp backend/server.py backend/server.py.backup.$(date +%Y%m%d_%H%M%S)

# Descargar el archivo actualizado desde Emergent (si está disponible)
# Si no, el usuario debe usar "Save to Github" en Emergent

echo ""
echo "=== INSTRUCCIONES ==="
echo "1. En Emergent, haz clic en 'Save to Github' para guardar los cambios"
echo "2. Luego ejecuta estos comandos:"
echo ""
echo "   cd /var/www/inventario-ti"
echo "   git stash"
echo "   git pull origin main"
echo "   sudo systemctl restart inventario-backend"
echo ""
echo "3. Verifica que funcione:"
echo "   sudo systemctl status inventario-backend"
echo ""
echo "=== FIN ==="
