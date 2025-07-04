#!/bin/bash
# Script para hacer deployment de gastos-casa en RPI

echo "🚀 DEPLOYMENT GASTOS CASA A RASPBERRY PI"
echo "========================================"

RPI_IP="192.168.8.167"

echo ""
echo "📝 INSTRUCCIONES DE DEPLOYMENT:"
echo "==============================="
echo ""
echo "Dado que el SSH no está disponible desde este PC, necesitas:"
echo ""
echo "1. 📋 Verificar estado de la RPI:"
echo "   Copia este archivo a la RPI: check-rpi-status.sh"
echo "   En la RPI ejecuta: ./check-rpi-status.sh"
echo ""
echo "2. 📁 Transferir código del proyecto:"
echo "   Opción A - USB/SD:"
echo "     - Copia toda la carpeta del proyecto a USB"
echo "     - Monta USB en RPI y copia a /opt/docker-projects/projects/gastos-casa/"
echo ""
echo "   Opción B - Git (si hay internet en RPI):"
echo "     cd /opt/docker-projects/projects"
echo "     git clone https://github.com/TU_USUARIO/gastos-casa.git"
echo ""
echo "3. 🐳 Crear configuración Docker para RPI:"

cat << 'EOF'

# En la RPI, crear estos archivos:

# /opt/docker-projects/projects/gastos-casa/docker-compose.rpi.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: gastos-casa-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: gastos_casa
      POSTGRES_USER: gastos_user
      POSTGRES_PASSWORD: gastos_rpi_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - gastos-network

  app:
    build:
      context: .
      dockerfile: Dockerfile.rpi
    container_name: gastos-casa-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://gastos_user:gastos_rpi_2024@postgres:5432/gastos_casa
      NODE_ENV: production
      NEXTAUTH_URL: http://192.168.8.167:3000
      NEXTAUTH_SECRET: gastos-rpi-secret-2024
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
    networks:
      - gastos-network

volumes:
  postgres_data:

networks:
  gastos-network:
    driver: bridge

# /opt/docker-projects/projects/gastos-casa/Dockerfile.rpi
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

# /opt/docker-projects/projects/gastos-casa/manage-rpi.sh
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando Gastos Casa..."
        docker-compose -f docker-compose.rpi.yml up -d
        ;;
    "stop")
        echo "⏹️ Deteniendo Gastos Casa..."
        docker-compose -f docker-compose.rpi.yml down
        ;;
    "build")
        echo "🏗️ Construyendo imagen..."
        docker-compose -f docker-compose.rpi.yml build --no-cache
        ;;
    "logs")
        docker-compose -f docker-compose.rpi.yml logs -f
        ;;
    "status")
        docker-compose -f docker-compose.rpi.yml ps
        ;;
    "shell")
        docker exec -it gastos-casa-app sh
        ;;
    "db")
        docker exec -it gastos-casa-db psql -U gastos_user gastos_casa
        ;;
    *)
        echo "Uso: $0 {start|stop|build|logs|status|shell|db}"
        ;;
esac

EOF

echo ""
echo "4. 🔧 Comandos en la RPI:"
echo "   cd /opt/docker-projects/projects/gastos-casa"
echo "   chmod +x manage-rpi.sh"
echo "   ./manage-rpi.sh build"
echo "   ./manage-rpi.sh start"
echo ""
echo "5. 🌐 Verificar funcionamiento:"
echo "   ./manage-rpi.sh status"
echo "   curl http://localhost:3000/api/health"
echo ""
echo "6. 🎯 Acceder desde tu red:"
echo "   http://$RPI_IP:3000"
echo ""
echo "📋 RESUMEN DE ARCHIVOS A CREAR EN RPI:"
echo "====================================="
echo "• docker-compose.rpi.yml - Configuración Docker"
echo "• Dockerfile.rpi - Imagen optimizada para ARM"
echo "• manage-rpi.sh - Script de gestión"
echo ""
echo "🔗 URLs una vez funcionando:"
echo "  • Aplicación: http://$RPI_IP:3000"
echo "  • Base de datos: $RPI_IP:5432"
echo ""