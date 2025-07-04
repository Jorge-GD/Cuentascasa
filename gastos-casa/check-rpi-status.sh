#!/bin/bash
# Script para verificar estado de la RPI y continuar con deployment

echo "🍓 VERIFICACIÓN Y DEPLOYMENT - GASTOS CASA"
echo "=========================================="

echo ""
echo "📋 ESTADO ACTUAL DEL SISTEMA:"
echo "=============================="

# Verificar Docker
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker instalado: $(docker --version)"
    if systemctl is-active --quiet docker; then
        echo "✅ Docker ejecutándose"
    else
        echo "❌ Docker no está ejecutándose"
    fi
else
    echo "❌ Docker no instalado"
fi

echo ""
echo "🐳 CONTENEDORES DOCKER:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Sin contenedores ejecutándose"

echo ""
echo "🌐 REDES DOCKER:"
docker network ls 2>/dev/null || echo "No se pueden listar redes"

echo ""
echo "📁 ESTRUCTURA DE PROYECTOS:"
if [ -d "/opt/docker-projects" ]; then
    echo "✅ /opt/docker-projects existe"
    ls -la /opt/docker-projects/ 2>/dev/null || echo "Sin acceso al directorio"
else
    echo "❌ /opt/docker-projects no existe"
fi

echo ""
echo "🔥 FIREWALL:"
sudo ufw status 2>/dev/null || echo "UFW no configurado"

echo ""
echo "🌡️ SISTEMA:"
echo "Temperatura: $(vcgencmd measure_temp 2>/dev/null || echo 'No disponible')"
echo "Memoria: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disco: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " usado)"}')"

echo ""
echo "📍 RED:"
echo "IP Local: $(hostname -I | cut -d' ' -f1)"

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "=================="

if [ -d "/opt/docker-projects" ] && command -v docker >/dev/null 2>&1; then
    echo "✅ Sistema base configurado correctamente"
    echo ""
    echo "🚀 Para continuar con el deployment de gastos-casa:"
    echo ""
    echo "1. Asegúrate de tener el código del proyecto:"
    echo "   cd /opt/docker-projects/projects"
    echo "   git clone https://github.com/TU_USUARIO/gastos-casa.git"
    echo ""
    echo "2. O copia los archivos del proyecto a:"
    echo "   /opt/docker-projects/projects/gastos-casa/"
    echo ""
    echo "3. Construir e iniciar:"
    echo "   cd /opt/docker-projects/projects/gastos-casa"
    echo "   ./manage.sh build"
    echo "   ./manage.sh start"
    echo ""
    echo "4. Verificar funcionamiento:"
    echo "   curl http://localhost:3000/api/health"
    echo ""
    echo "5. Acceder desde tu red local:"
    echo "   http://$(hostname -I | cut -d' ' -f1):3000"
    
else
    echo "⚠️ El sistema necesita configuración adicional"
    echo ""
    if ! command -v docker >/dev/null 2>&1; then
        echo "❌ Docker no instalado. Ejecutar:"
        echo "   curl -fsSL https://get.docker.com | sh"
        echo "   sudo usermod -aG docker \$USER"
        echo "   newgrp docker"
    fi
    
    if [ ! -d "/opt/docker-projects" ]; then
        echo "❌ Estructura de proyectos no creada. Ejecutar:"
        echo "   sudo mkdir -p /opt/docker-projects/{proxy,monitoring,projects,shared}"
        echo "   sudo chown -R \$USER:\$USER /opt/docker-projects"
    fi
fi

echo ""
echo "🔧 Comandos útiles:"
echo "   rpi status     - Ver estado del sistema"
echo "   rpi start      - Iniciar servicios"
echo "   rpi stop       - Detener servicios"