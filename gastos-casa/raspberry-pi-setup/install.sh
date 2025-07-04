#!/bin/bash
# ============= install.sh =============
# Script principal de instalación para Raspberry Pi

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
echo "🍓 INSTALACIÓN RASPBERRY PI DOCKER SERVER"
echo "========================================"
echo -e "${NC}"

# Verificar que estamos en Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    error "Este script debe ejecutarse en una Raspberry Pi"
fi

# Verificar que tenemos los archivos necesarios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/scripts/setup-raspberry-pi.sh"

if [ ! -f "$SETUP_SCRIPT" ]; then
    error "No se encontró el script setup-raspberry-pi.sh en: $SETUP_SCRIPT"
fi

# Verificar directorio actual
log "Directorio actual: $(pwd)"
log "Script de setup: $SETUP_SCRIPT"

section "PASO 1: CONFIGURACIÓN BASE DEL SISTEMA"
log "Ejecutando configuración automática de la Raspberry Pi..."
chmod +x "$SETUP_SCRIPT"
"$SETUP_SCRIPT"

section "PASO 2: INSTALACIÓN DE ARCHIVOS DE CONFIGURACIÓN"
log "Copiando configuraciones del proyecto..."

# Crear estructura si no existe
sudo mkdir -p /opt/docker-projects/projects/gastos-casa
sudo chown -R pi:pi /opt/docker-projects

# Copiar archivos de configuración
if [ -d "config" ]; then
    log "Copiando configuraciones predefinidas..."
    cp -r config/* /opt/docker-projects/
fi

# Copiar archivos del proyecto si existen
if [ -d "project-files" ]; then
    log "Copiando archivos del proyecto gastos-casa..."
    cp -r project-files/* /opt/docker-projects/projects/gastos-casa/
fi

section "PASO 3: CONFIGURACIÓN DE GASTOS CASA"
log "Configurando proyecto gastos-casa..."

cd /opt/docker-projects/projects/gastos-casa

# Crear docker-compose específico para RPI si no existe
if [ ! -f "docker-compose.rpi.yml" ]; then
    log "Creando docker-compose.rpi.yml..."
    cat > docker-compose.rpi.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: gastos-casa-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: gastos_casa
      POSTGRES_USER: gastos_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../../shared/backup:/backups
    networks:
      - gastos-network
      - monitoring-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gastos_user -d gastos_casa"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile.rpi
    container_name: gastos-casa-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://gastos_user:${DB_PASSWORD}@postgres:5432/gastos_casa
      NODE_ENV: production
      NEXTAUTH_URL: http://gastos-casa.local
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      APP_NAME: "Gastos Casa - RPI"
      APP_VERSION: "1.0.0-rpi"
    volumes:
      - ./uploads:/app/uploads
      - ../../shared/backup:/app/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - gastos-network
      - proxy-network
      - monitoring-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gastos-casa.rule=Host(\`gastos-casa.local\`)"
      - "traefik.http.routers.gastos-casa.entrypoints=web"
      - "traefik.http.services.gastos-casa.loadbalancer.server.port=3000"

volumes:
  postgres_data:

networks:
  gastos-network:
    driver: bridge
  proxy-network:
    external: true
  monitoring-network:
    external: true
EOF
fi

# Crear Dockerfile para ARM si no existe
if [ ! -f "Dockerfile.rpi" ]; then
    log "Creando Dockerfile.rpi..."
    cat > Dockerfile.rpi << 'EOF'
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN chown nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "server.js"]
EOF
fi

# Crear variables de entorno
if [ ! -f ".env.rpi" ]; then
    log "Creando variables de entorno..."
    RPI_IP=$(hostname -I | cut -d' ' -f1)
    cat > .env.rpi << EOF
# Database
DB_PASSWORD=gastos_rpi_secure_$(date +%Y%m%d)
DATABASE_URL=postgresql://gastos_user:gastos_rpi_secure_$(date +%Y%m%d)@postgres:5432/gastos_casa

# App
NODE_ENV=production
NEXTAUTH_URL=http://gastos-casa.local
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_TELEMETRY_DISABLED=1

# App info
APP_NAME="Gastos Casa - RPI"
APP_VERSION="1.0.0-rpi"
EOF
fi

# Crear script de gestión del proyecto
if [ ! -f "manage.sh" ]; then
    log "Creando script de gestión del proyecto..."
    cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando Gastos Casa..."
        docker-compose -f docker-compose.rpi.yml --env-file .env.rpi up -d
        ;;
    "stop")
        echo "⏹️ Deteniendo Gastos Casa..."
        docker-compose -f docker-compose.rpi.yml --env-file .env.rpi down
        ;;
    "restart")
        $0 stop
        sleep 3
        $0 start
        ;;
    "build")
        echo "🏗️ Construyendo imagen..."
        docker-compose -f docker-compose.rpi.yml --env-file .env.rpi build --no-cache
        ;;
    "logs")
        docker-compose -f docker-compose.rpi.yml --env-file .env.rpi logs -f
        ;;
    "status")
        docker-compose -f docker-compose.rpi.yml --env-file .env.rpi ps
        ;;
    "shell")
        docker exec -it gastos-casa-app sh
        ;;
    "db")
        docker exec -it gastos-casa-db psql -U gastos_user gastos_casa
        ;;
    "backup")
        echo "📦 Creando backup..."
        docker exec gastos-casa-db pg_dump -U gastos_user gastos_casa > backup-$(date +%Y%m%d-%H%M%S).sql
        echo "✅ Backup creado"
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|build|logs|status|shell|db|backup}"
        ;;
esac
EOF
    chmod +x manage.sh
fi

section "PASO 4: VERIFICACIÓN FINAL"
log "Verificando instalación..."

# Dar permisos a scripts
chmod +x /home/pi/raspberry-pi-setup/scripts/*.sh

# Verificar que todo esté instalado
if command -v docker >/dev/null 2>&1 && systemctl is-active --quiet docker; then
    log "✅ Docker instalado y funcionando"
else
    warn "Docker no está funcionando correctamente"
fi

if docker network ls | grep -q proxy-network; then
    log "✅ Redes Docker configuradas"
else
    warn "Redes Docker no configuradas correctamente"
fi

if [ -d "/opt/docker-projects" ]; then
    log "✅ Estructura de proyectos creada"
else
    warn "Estructura de proyectos no creada"
fi

section "INSTALACIÓN COMPLETADA"

echo ""
echo "🎉 ¡INSTALACIÓN COMPLETADA!"
echo "=========================="
echo ""
echo "📝 Próximos pasos:"
echo "1. Reinicia la Raspberry Pi: sudo reboot"
echo "2. Después del reinicio:"
echo "   cd /opt/docker-projects/projects/gastos-casa"
echo "   ./manage.sh build"
echo "   ./manage.sh start"
echo ""
echo "🌐 URLs de acceso:"
RPI_IP=$(hostname -I | cut -d' ' -f1)
echo "   • Gastos Casa: http://gastos-casa.local"
echo "   • Traefik Dashboard: http://$RPI_IP:8080"
echo "   • Grafana: http://monitor.local"
echo ""
echo "🔧 Comandos útiles:"
echo "   rpi status    - Ver estado del sistema"
echo "   rpi start     - Iniciar servicios"
echo "   rpi stop      - Detener servicios"
echo ""
echo "📱 Añade a /etc/hosts de tus dispositivos:"
echo "   $RPI_IP gastos-casa.local traefik.local monitor.local"
echo ""

warn "⚠️  REINICIA LA RASPBERRY PI para aplicar todos los cambios: sudo reboot"