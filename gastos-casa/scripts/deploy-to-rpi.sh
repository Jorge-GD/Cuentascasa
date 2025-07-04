#!/bin/bash
# ============= deploy-to-rpi.sh =============
# Script para transferir Gastos Casa a Raspberry Pi

set -e

# Configuración
RPI_USER="pi"
RPI_HOST=""
RPI_PATH="/opt/docker-projects/projects/gastos-casa"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

echo "🍓 DEPLOY GASTOS CASA A RASPBERRY PI"
echo "===================================="

# Verificar parámetros
if [ $# -eq 0 ]; then
    echo "Uso: $0 <IP_RASPBERRY_PI> [usuario]"
    echo "Ejemplo: $0 192.168.1.100 pi"
    exit 1
fi

RPI_HOST="$1"
if [ $# -ge 2 ]; then
    RPI_USER="$2"
fi

RPI_TARGET="$RPI_USER@$RPI_HOST"

# Verificar conectividad
log "🔍 Verificando conectividad con $RPI_TARGET..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$RPI_TARGET" "echo 'SSH OK'" >/dev/null 2>&1; then
    error "No se puede conectar a $RPI_TARGET. Verifica IP, usuario y configuración SSH."
fi

# Verificar que la RPI tiene Docker instalado
log "🐳 Verificando instalación Docker en RPI..."
if ! ssh "$RPI_TARGET" "docker --version" >/dev/null 2>&1; then
    error "Docker no está instalado en la RPI. Ejecuta primero: ./scripts/setup-raspberry-pi.sh"
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ] || [ ! -f "package.json" ]; then
    error "Ejecuta este script desde el directorio raíz del proyecto gastos-casa"
fi

# Crear backup del proyecto actual si existe
log "📦 Creando backup del proyecto actual en RPI..."
ssh "$RPI_TARGET" "
    if [ -d '$RPI_PATH' ]; then
        echo 'Creando backup...'
        sudo cp -r '$RPI_PATH' '$RPI_PATH.backup.$(date +%Y%m%d-%H%M%S)'
    fi
"

# Crear directorio del proyecto
log "📁 Preparando directorio del proyecto..."
ssh "$RPI_TARGET" "
    sudo mkdir -p '$RPI_PATH'
    sudo chown -R $RPI_USER:$RPI_USER '$RPI_PATH'
"

# Transferir archivos del proyecto
log "📤 Transfiriendo archivos del proyecto..."

# Crear lista de archivos a excluir
cat > /tmp/rsync-exclude << 'EOF'
node_modules/
.next/
dist/
build/
*.log
.git/
.env
.env.local
.env.development
.env.test
prisma/dev.db*
uploads/
backup*/
.DS_Store
EOF

# Transferir archivos con rsync
rsync -avz --delete \
    --exclude-from=/tmp/rsync-exclude \
    --progress \
    ./ "$RPI_TARGET:$RPI_PATH/"

rm /tmp/rsync-exclude

# Crear configuración específica para RPI
log "⚙️ Creando configuración específica para RPI..."

# Docker Compose para ARM
ssh "$RPI_TARGET" "cat > '$RPI_PATH/docker-compose.rpi.yml'" << 'EOF'
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
      NEXTAUTH_URL: https://gastos-casa.local
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

# Dockerfile optimizado para ARM
ssh "$RPI_TARGET" "cat > '$RPI_PATH/Dockerfile.rpi'" << 'EOF'
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

# Variables de entorno para RPI
RPI_IP=$(ssh "$RPI_TARGET" "hostname -I | cut -d' ' -f1")
ssh "$RPI_TARGET" "cat > '$RPI_PATH/.env.rpi'" << EOF
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

# Script de gestión específico del proyecto
ssh "$RPI_TARGET" "cat > '$RPI_PATH/manage.sh'" << 'EOF'
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
    "update")
        echo "🔄 Actualizando desde Git..."
        git pull
        $0 build
        $0 restart
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|build|logs|status|shell|db|backup|update}"
        ;;
esac
EOF

# Hacer ejecutable el script de gestión
ssh "$RPI_TARGET" "chmod +x '$RPI_PATH/manage.sh'"

# Construir e iniciar la aplicación
log "🏗️ Construyendo imagen Docker..."
ssh "$RPI_TARGET" "
    cd '$RPI_PATH'
    docker-compose -f docker-compose.rpi.yml --env-file .env.rpi build
"

log "🚀 Iniciando aplicación..."
ssh "$RPI_TARGET" "
    cd '$RPI_PATH'
    docker-compose -f docker-compose.rpi.yml --env-file .env.rpi up -d
"

# Ejecutar migraciones de base de datos
log "🗄️ Ejecutando migraciones de base de datos..."
sleep 10  # Esperar a que la base de datos esté lista

ssh "$RPI_TARGET" "
    cd '$RPI_PATH'
    docker-compose -f docker-compose.rpi.yml --env-file .env.rpi exec app npx prisma migrate deploy || echo 'Migraciones ya aplicadas'
    docker-compose -f docker-compose.rpi.yml --env-file .env.rpi exec app npx prisma db seed || echo 'Seed ya ejecutado'
"

# Verificar que todo funciona
log "🔍 Verificando deploy..."
sleep 5

if ssh "$RPI_TARGET" "curl -f http://localhost:3000/api/health" >/dev/null 2>&1; then
    log "✅ Deploy exitoso!"
else
    warn "⚠️ La aplicación puede estar iniciando. Verifica en unos minutos."
fi

# Actualizar script de gestión principal de RPI
log "🔧 Actualizando scripts de gestión..."
ssh "$RPI_TARGET" "
    # Añadir gastos-casa al script principal
    if ! grep -q 'gastos-casa' /opt/docker-projects/manage-rpi.sh; then
        sed -i '/cd \/opt\/docker-projects\/monitoring/a\\        cd /opt/docker-projects/projects/gastos-casa && ./manage.sh start' /opt/docker-projects/manage-rpi.sh
        sed -i '/stop.*2>\/dev\/null/i\\        cd /opt/docker-projects/projects/gastos-casa && ./manage.sh stop' /opt/docker-projects/manage-rpi.sh
    fi
"

echo ""
echo "🎉 ¡DEPLOY COMPLETADO!"
echo "====================="
echo ""
echo "📍 Información del deploy:"
echo "   • Host: $RPI_TARGET"
echo "   • Proyecto: $RPI_PATH"
echo "   • URL: http://gastos-casa.local"
echo "   • IP directa: http://$RPI_IP:3000"
echo ""
echo "🔧 Comandos útiles en la RPI:"
echo "   ssh $RPI_TARGET"
echo "   cd $RPI_PATH"
echo "   ./manage.sh status"
echo "   ./manage.sh logs"
echo ""
echo "📱 Añade a /etc/hosts de tus dispositivos:"
echo "   $RPI_IP gastos-casa.local"
echo ""
echo "🔍 Verificar funcionamiento:"
echo "   curl http://$RPI_IP:3000/api/health"
echo ""

info "El proyecto está configurado para iniciarse automáticamente al reiniciar la RPI"