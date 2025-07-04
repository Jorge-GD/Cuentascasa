#!/bin/bash
# ============= install-simple.sh =============
# Script de instalación SIMPLIFICADO para Raspberry Pi
# Evita problemas de conexión y dependencias

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

section() {
    echo -e "\n${CYAN}🔧 $1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

echo -e "${CYAN}"
echo "🍓 INSTALACIÓN SIMPLIFICADA RASPBERRY PI"
echo "========================================"
echo -e "${NC}"

# Verificar directorio
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log "Directorio de instalación: $SCRIPT_DIR"

section "PASO 1: VERIFICACIONES BÁSICAS"

# Verificar que estamos en Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    warn "No se detectó Raspberry Pi, pero continuando..."
fi

# Verificar conexión a internet
log "Verificando conexión a internet..."
if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    log "✅ Conexión a internet OK"
    INTERNET_OK=true
else
    warn "❌ Sin conexión a internet. Saltando actualizaciones."
    INTERNET_OK=false
fi

# Verificar Docker
if command -v docker >/dev/null 2>&1; then
    log "✅ Docker ya está instalado"
    DOCKER_INSTALLED=true
else
    log "⚠️  Docker no instalado"
    DOCKER_INSTALLED=false
fi

section "PASO 2: CREAR ESTRUCTURA DE DIRECTORIOS"

log "Creando estructura de proyectos..."
sudo mkdir -p /opt/docker-projects/{proxy,monitoring,projects,shared/{backup,logs,ssl}}
sudo chown -R $USER:$USER /opt/docker-projects
log "✅ Estructura creada en /opt/docker-projects"

section "PASO 3: CONFIGURAR REDES DOCKER (si Docker existe)"

if [ "$DOCKER_INSTALLED" = true ]; then
    log "Creando redes Docker..."
    docker network ls | grep -q proxy-network || docker network create --driver bridge proxy-network
    docker network ls | grep -q monitoring-network || docker network create --driver bridge monitoring-network
    docker network ls | grep -q projects-network || docker network create --driver bridge projects-network
    log "✅ Redes Docker configuradas"
else
    warn "Docker no instalado. Saltando configuración de redes."
fi

section "PASO 4: COPIAR CONFIGURACIONES"

log "Copiando configuraciones predefinidas..."

# Copiar archivos de configuración
if [ -d "$SCRIPT_DIR/config" ]; then
    cp -r "$SCRIPT_DIR/config"/* /opt/docker-projects/ 2>/dev/null || true
    log "✅ Configuraciones copiadas"
fi

# Configurar proyecto gastos-casa
log "Configurando proyecto gastos-casa..."
mkdir -p /opt/docker-projects/projects/gastos-casa

# Crear docker-compose básico para gastos-casa
cat > /opt/docker-projects/projects/gastos-casa/docker-compose.simple.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: gastos-casa-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: gastos_casa
      POSTGRES_USER: gastos_user
      POSTGRES_PASSWORD: gastos_simple_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - gastos-network

volumes:
  postgres_data:

networks:
  gastos-network:
    driver: bridge
EOF

# Variables de entorno básicas
cat > /opt/docker-projects/projects/gastos-casa/.env.simple << 'EOF'
DB_PASSWORD=gastos_simple_2024
DATABASE_URL=postgresql://gastos_user:gastos_simple_2024@localhost:5432/gastos_casa
NODE_ENV=production
APP_NAME="Gastos Casa - RPI Simple"
EOF

# Script de gestión básico
cat > /opt/docker-projects/projects/gastos-casa/manage-simple.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando Gastos Casa (modo simple)..."
        docker-compose -f docker-compose.simple.yml up -d
        ;;
    "stop")
        echo "⏹️ Deteniendo Gastos Casa..."
        docker-compose -f docker-compose.simple.yml down
        ;;
    "logs")
        docker-compose -f docker-compose.simple.yml logs -f
        ;;
    "status")
        docker-compose -f docker-compose.simple.yml ps
        ;;
    *)
        echo "Uso: $0 {start|stop|logs|status}"
        ;;
esac
EOF

chmod +x /opt/docker-projects/projects/gastos-casa/manage-simple.sh

section "PASO 5: CONFIGURAR INSTALACIÓN DE DOCKER (SI ES NECESARIO)"

if [ "$DOCKER_INSTALLED" = false ] && [ "$INTERNET_OK" = true ]; then
    log "Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    log "✅ Docker instalado. Reinicia la sesión para usar docker sin sudo."
elif [ "$DOCKER_INSTALLED" = false ]; then
    warn "Sin internet. Instala Docker manualmente:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
fi

section "PASO 6: CREAR SCRIPTS DE GESTIÓN"

# Script de gestión principal
cat > /opt/docker-projects/manage-simple.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando servicios disponibles..."
        cd /opt/docker-projects/projects/gastos-casa
        ./manage-simple.sh start
        ;;
    "stop")
        echo "⏹️ Deteniendo servicios..."
        cd /opt/docker-projects/projects/gastos-casa
        ./manage-simple.sh stop
        ;;
    "status")
        echo "📊 Estado de servicios:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker no disponible"
        echo ""
        echo "💾 Uso de disco:"
        df -h | grep -E "^/dev" | head -3
        echo ""
        echo "🧠 Memoria:"
        free -h
        ;;
    "install-docker")
        echo "🐳 Instalando Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo "✅ Reinicia la sesión para usar docker"
        ;;
    *)
        echo "Uso: $0 {start|stop|status|install-docker}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start         - Iniciar servicios"
        echo "  stop          - Detener servicios"
        echo "  status        - Ver estado del sistema"
        echo "  install-docker - Instalar Docker"
        ;;
esac
EOF

chmod +x /opt/docker-projects/manage-simple.sh

# Crear alias
echo "alias rpi='/opt/docker-projects/manage-simple.sh'" >> ~/.bashrc

section "INSTALACIÓN COMPLETADA"

echo ""
echo "🎉 ¡INSTALACIÓN BÁSICA COMPLETADA!"
echo "=================================="
echo ""
echo "📝 Próximos pasos:"

if [ "$DOCKER_INSTALLED" = false ]; then
    echo "1. Instalar Docker:"
    echo "   rpi install-docker"
    echo "   newgrp docker  # O reinicia la sesión"
    echo ""
fi

echo "2. Iniciar servicios básicos:"
echo "   rpi start"
echo ""
echo "3. Ver estado:"
echo "   rpi status"
echo ""
echo "🔧 Comandos útiles:"
echo "   rpi status    - Ver estado del sistema"
echo "   rpi start     - Iniciar servicios"
echo "   rpi stop      - Detener servicios"
echo ""
echo "📁 Todo instalado en: /opt/docker-projects/"
echo ""

if [ "$INTERNET_OK" = false ]; then
    warn "⚠️  Sin conexión a internet. Conecta y ejecuta 'rpi install-docker'"
fi

log "🎯 Para instalar el sistema completo cuando tengas internet estable:"
log "    Ejecuta: $SCRIPT_DIR/scripts/setup-raspberry-pi.sh"