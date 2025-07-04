# 🍓 Raspberry Pi - Servidor Docker Multi-Proyecto

## 🎯 Objetivo

Configurar una Raspberry Pi como servidor doméstico que ejecute múltiples proyectos Docker con arranque automático, reverse proxy, y gestión centralizada.

---

## 📋 Índice

1. [Preparación Hardware y OS](#preparación-hardware-y-os)
2. [Configuración Base del Sistema](#configuración-base-del-sistema)
3. [Instalación Docker ARM](#instalación-docker-arm)
4. [Estructura de Proyectos](#estructura-de-proyectos)
5. [Reverse Proxy y DNS Local](#reverse-proxy-y-dns-local)
6. [Gestión de Proyectos](#gestión-de-proyectos)
7. [Monitoreo y Logs](#monitoreo-y-logs)
8. [Backup y Mantenimiento](#backup-y-mantenimiento)
9. [Optimización Performance](#optimización-performance)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Preparación Hardware y OS

### **Hardware Recomendado:**

| Componente | Mínimo | Recomendado | Óptimo |
|------------|--------|-------------|--------|
| **Raspberry Pi** | Pi 4 4GB | Pi 4 8GB | Pi 5 8GB |
| **Almacenamiento** | SD 32GB Class 10 | SSD USB 3.0 256GB | SSD USB 3.0 512GB |
| **Cooling** | Heatsinks | Fan oficial | Case con fan |
| **Alimentación** | 3.5A oficial | 3.5A oficial | 3.5A oficial |
| **Red** | WiFi | Ethernet | Ethernet |

### **1. Instalación OS (Raspberry Pi OS Lite 64-bit)**

```bash
# Descargar Raspberry Pi Imager
# https://www.raspberrypi.com/software/

# Configuración recomendada en Imager:
# - OS: Raspberry Pi OS Lite (64-bit)
# - SSH: Habilitar con clave pública
# - Usuario: pi / contraseña segura
# - WiFi: Configurar si es necesario
# - Locale: es_ES.UTF-8
```

### **2. Configuración Inicial SSH**

```bash
# Conectar por SSH
ssh pi@RASPBERRY_PI_IP

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Configurar hostname
sudo hostnamectl set-hostname rpi-docker-server

# Configurar timezone
sudo timedatectl set-timezone Europe/Madrid

# Habilitar SSH, I2C, SPI si es necesario
sudo raspi-config
```

---

## ⚙️ Configuración Base del Sistema

### **1. Configuración de Almacenamiento**

```bash
# Si usas SSD USB, moveremos el sistema
# Verificar dispositivos
lsblk

# Clonar SD a SSD (si aplicable)
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress

# Cambiar boot a SSD (solo Pi 4/5)
echo 'program_usb_boot_mode=1' | sudo tee -a /boot/config.txt

# Reboot y verificar
sudo reboot
# Después del reboot:
lsblk  # Debería mostrar SSD como disco principal
```

### **2. Optimizaciones del Sistema**

```bash
# Crear script de optimización
cat > ~/optimize-rpi.sh << 'EOF'
#!/bin/bash

echo "🔧 Optimizando Raspberry Pi para Docker..."

# Reducir swap (mejor para SSD)
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf

# Optimizar memoria
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf

# Optimizar red
echo "net.core.rmem_max = 134217728" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 134217728" | sudo tee -a /etc/sysctl.conf

# GPU memory split (más RAM para sistema)
echo "gpu_mem=16" | sudo tee -a /boot/config.txt

# Habilitar cgroups para Docker
sed -i 's/$/ cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1/' /boot/cmdline.txt

# Instalar herramientas esenciales
sudo apt install -y \
    htop iotop \
    git curl wget \
    vim nano \
    tree fd-find \
    unzip zip \
    fail2ban \
    ufw

# Configurar fail2ban básico
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configurar firewall básico
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000:9000/tcp  # Rango para proyectos
sudo ufw --force enable

echo "✅ Optimización completada. Reinicia el sistema."
EOF

chmod +x ~/optimize-rpi.sh
./optimize-rpi.sh

# Reiniciar
sudo reboot
```

---

## 🐳 Instalación Docker ARM

### **1. Instalación Docker Engine**

```bash
# Script de instalación Docker para ARM
cat > ~/install-docker.sh << 'EOF'
#!/bin/bash

echo "🐳 Instalando Docker en Raspberry Pi..."

# Remover versiones antiguas
sudo apt remove -y docker docker-engine docker.io containerd runc

# Instalar dependencias
sudo apt update
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Añadir clave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Añadir repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Habilitar Docker al boot
sudo systemctl enable docker

# Configurar Docker daemon para ARM
sudo mkdir -p /etc/docker
cat > /tmp/daemon.json << 'INNER_EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "experimental": false,
  "live-restore": true,
  "default-runtime": "runc"
}
INNER_EOF

sudo mv /tmp/daemon.json /etc/docker/daemon.json

# Reiniciar Docker
sudo systemctl restart docker

echo "✅ Docker instalado. Sal y vuelve a entrar para usar docker sin sudo."
EOF

chmod +x ~/install-docker.sh
./install-docker.sh

# Salir y volver a entrar por SSH
exit
ssh pi@RASPBERRY_PI_IP

# Verificar instalación
docker --version
docker compose version
docker run hello-world
```

### **2. Configuración Docker Compose Standalone**

```bash
# Instalar compose standalone (más rápido en ARM)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar
docker-compose --version
```

---

## 📁 Estructura de Proyectos

### **1. Crear Estructura de Directorios**

```bash
# Crear estructura para múltiples proyectos
sudo mkdir -p /opt/docker-projects
sudo chown -R pi:pi /opt/docker-projects

cd /opt/docker-projects

# Estructura recomendada
mkdir -p {
  proxy,
  monitoring,
  backup,
  projects/{gastos-casa,proyecto2,proyecto3},
  shared/{databases,storage,logs,ssl}
}

tree /opt/docker-projects
```

### **2. Configuración de Red Docker**

```bash
# Crear redes Docker personalizadas
docker network create --driver bridge proxy-network
docker network create --driver bridge monitoring-network
docker network create --driver bridge projects-network

# Verificar redes
docker network ls
```

---

## 🌐 Reverse Proxy y DNS Local

### **1. Configurar Traefik (Reverse Proxy)**

```bash
cd /opt/docker-projects/proxy

# Crear configuración Traefik
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic:/etc/traefik/dynamic:ro
      - ../shared/ssl:/ssl:ro
      - ../shared/logs:/logs
    networks:
      - proxy-network
    environment:
      - TZ=Europe/Madrid
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.local`)"
      - "traefik.http.routers.dashboard.service=api@internal"

networks:
  proxy-network:
    external: true
EOF

# Configuración principal de Traefik
cat > traefik.yml << 'EOF'
# Configuración API y Dashboard
api:
  dashboard: true
  insecure: true

# Entry points
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

# Providers
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: proxy-network
  file:
    directory: /etc/traefik/dynamic
    watch: true

# Certificados automáticos (para desarrollo local)
certificatesResolvers:
  letsencrypt:
    acme:
      email: tu-email@ejemplo.com
      storage: /ssl/acme.json
      httpChallenge:
        entryPoint: web

# Logs
log:
  level: INFO
  filePath: /logs/traefik.log

accessLog:
  filePath: /logs/access.log
EOF

# Configuración dinámica
mkdir -p dynamic
cat > dynamic/middlewares.yml << 'EOF'
http:
  middlewares:
    secure-headers:
      headers:
        accessControlAllowMethods:
          - GET
          - OPTIONS
          - PUT
        accessControlMaxAge: 100
        hostsProxyHeaders:
          - "X-Forwarded-Host"
        sslRedirect: true
        stsSeconds: 63072000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
EOF

# Crear directorio SSL
mkdir -p ../shared/ssl
mkdir -p ../shared/logs
touch ../shared/ssl/acme.json
chmod 600 ../shared/ssl/acme.json

# Iniciar Traefik
docker-compose up -d

echo "✅ Traefik configurado en http://traefik.local:8080"
```

### **2. Configurar DNS Local**

```bash
# Instalar dnsmasq para DNS local
sudo apt install -y dnsmasq

# Configurar dnsmasq
sudo cat > /etc/dnsmasq.d/local-projects << 'EOF'
# DNS local para proyectos
address=/local/192.168.1.XXX  # CAMBIAR POR IP DE TU RPI
address=/gastos-casa.local/192.168.1.XXX
address=/traefik.local/192.168.1.XXX
address=/monitor.local/192.168.1.XXX

# Cache DNS
cache-size=1000
EOF

# Reiniciar dnsmasq
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq

echo "📝 Añade estas entradas al /etc/hosts de tus dispositivos:"
echo "192.168.1.XXX gastos-casa.local"
echo "192.168.1.XXX traefik.local"
echo "192.168.1.XXX monitor.local"
```

---

## 🏠 Configurar Gastos Casa (Primer Proyecto)

### **1. Adaptar Gastos Casa para Multi-Proyecto**

```bash
cd /opt/docker-projects/projects

# Clonar proyecto desde tu repositorio
git clone https://github.com/TU_USUARIO/gastos-casa.git
cd gastos-casa

# Crear docker-compose específico para multi-proyecto
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
      NEXTAUTH_URL: https://gastos-casa.local
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
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
      - "traefik.http.routers.gastos-casa.rule=Host(`gastos-casa.local`)"
      - "traefik.http.routers.gastos-casa.entrypoints=websecure"
      - "traefik.http.routers.gastos-casa.tls=true"
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

# Variables de entorno para RPI
cat > .env.rpi << 'EOF'
# Database
DB_PASSWORD=gastos_rpi_secure_2024
DATABASE_URL=postgresql://gastos_user:gastos_rpi_secure_2024@postgres:5432/gastos_casa

# App
NODE_ENV=production
NEXTAUTH_URL=https://gastos-casa.local
NEXTAUTH_SECRET=tu-clave-super-secreta-para-rpi
NEXT_TELEMETRY_DISABLED=1

# App info
APP_NAME="Gastos Casa - RPI"
APP_VERSION="1.0.0-rpi"
EOF

# Construir y iniciar
docker-compose -f docker-compose.rpi.yml --env-file .env.rpi build
docker-compose -f docker-compose.rpi.yml --env-file .env.rpi up -d

echo "✅ Gastos Casa disponible en https://gastos-casa.local"
```

---

## 📊 Monitoreo y Logs

### **1. Configurar Stack de Monitoreo**

```bash
cd /opt/docker-projects/monitoring

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Prometheus - Métricas
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - monitoring-network
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prometheus.rule=Host(`prometheus.local`)"

  # Grafana - Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring-network
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`monitor.local`)"

  # Node Exporter - Métricas del sistema
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring-network

  # cAdvisor - Métricas de contenedores
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/kmsg:/dev/kmsg
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
      - /cgroup:/cgroup:ro
    networks:
      - monitoring-network

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring-network:
    external: true
  proxy-network:
    external: true
EOF

# Configuración Prometheus
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']
EOF

docker-compose up -d

echo "✅ Monitoreo disponible en:"
echo "  - Grafana: http://monitor.local (admin/admin)"
echo "  - Prometheus: http://prometheus.local"
```

### **2. Configurar Logs Centralizados**

```bash
# Crear sistema de logs
mkdir -p /opt/docker-projects/shared/logs

# Script de rotación de logs
cat > /opt/docker-projects/shared/rotate-logs.sh << 'EOF'
#!/bin/bash
# Rotar logs de todos los proyectos

LOG_DIR="/opt/docker-projects/shared/logs"
RETENTION_DAYS=30

find "$LOG_DIR" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete
docker system prune -f --filter "until=${RETENTION_DAYS}d"

echo "$(date): Logs rotados" >> "$LOG_DIR/rotation.log"
EOF

chmod +x /opt/docker-projects/shared/rotate-logs.sh

# Añadir a crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/docker-projects/shared/rotate-logs.sh") | crontab -
```

---

## 💾 Backup y Mantenimiento

### **1. Sistema de Backup Centralizado**

```bash
cd /opt/docker-projects/backup

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backup-service:
    image: alpine:latest
    container_name: backup-service
    restart: "no"
    volumes:
      - /opt/docker-projects:/projects:ro
      - ../../shared/backup:/backups
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: tail -f /dev/null  # Keep container running
    networks:
      - monitoring-network
EOF

# Script de backup maestro
cat > master-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/docker-projects/shared/backup"
DATE=$(date +%Y%m%d-%H%M%S)
PROJECTS_DIR="/opt/docker-projects/projects"

echo "🔄 Iniciando backup maestro - $DATE"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR/$DATE"

# Backup de cada proyecto con base de datos
for project in $(ls "$PROJECTS_DIR"); do
    if [ -d "$PROJECTS_DIR/$project" ]; then
        echo "📦 Backup de $project..."
        
        PROJECT_BACKUP="$BACKUP_DIR/$DATE/$project"
        mkdir -p "$PROJECT_BACKUP"
        
        # Backup de archivos del proyecto
        tar -czf "$PROJECT_BACKUP/files.tar.gz" -C "$PROJECTS_DIR" "$project"
        
        # Backup de base de datos si existe
        DB_CONTAINER="${project}-db"
        if docker ps --format "table {{.Names}}" | grep -q "$DB_CONTAINER"; then
            echo "🗄️  Backup DB de $project..."
            docker exec "$DB_CONTAINER" pg_dump -U ${project}_user ${project} > "$PROJECT_BACKUP/database.sql" 2>/dev/null || echo "⚠️  Sin DB o error en $project"
        fi
    fi
done

# Backup de configuración del sistema
echo "⚙️  Backup de configuración del sistema..."
tar -czf "$BACKUP_DIR/$DATE/system-config.tar.gz" \
    /opt/docker-projects/proxy \
    /opt/docker-projects/monitoring \
    /etc/dnsmasq.d \
    --exclude="*.log" \
    --exclude="node_modules"

# Limpar backups antiguos (30 días)
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "✅ Backup completado en $BACKUP_DIR/$DATE"
df -h "$BACKUP_DIR"
EOF

chmod +x master-backup.sh

# Programar backup diario
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/docker-projects/backup/master-backup.sh >> /opt/docker-projects/shared/logs/backup.log 2>&1") | crontab -
```

### **2. Scripts de Gestión del Sistema**

```bash
# Script de gestión general
cat > /opt/docker-projects/manage-rpi.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando todos los servicios..."
        cd /opt/docker-projects/proxy && docker-compose up -d
        cd /opt/docker-projects/monitoring && docker-compose up -d
        cd /opt/docker-projects/projects/gastos-casa && docker-compose -f docker-compose.rpi.yml up -d
        ;;
    "stop")
        echo "⏹️  Deteniendo todos los servicios..."
        docker stop $(docker ps -q)
        ;;
    "restart")
        echo "🔄 Reiniciando todos los servicios..."
        $0 stop
        sleep 5
        $0 start
        ;;
    "status")
        echo "📊 Estado de servicios:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "💾 Uso de disco:"
        df -h
        echo ""
        echo "🧠 Uso de memoria:"
        free -h
        ;;
    "logs")
        echo "📋 Logs recientes:"
        docker-compose -f /opt/docker-projects/proxy/docker-compose.yml logs --tail=50
        ;;
    "update")
        echo "🔄 Actualizando proyectos..."
        cd /opt/docker-projects/projects/gastos-casa
        git pull
        docker-compose -f docker-compose.rpi.yml build --no-cache
        docker-compose -f docker-compose.rpi.yml up -d
        ;;
    "backup")
        echo "💾 Ejecutando backup manual..."
        /opt/docker-projects/backup/master-backup.sh
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs|update|backup}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar todos los servicios"
        echo "  stop    - Detener todos los servicios"
        echo "  restart - Reiniciar todos los servicios"
        echo "  status  - Ver estado del sistema"
        echo "  logs    - Ver logs recientes"
        echo "  update  - Actualizar proyectos desde Git"
        echo "  backup  - Ejecutar backup manual"
        ;;
esac
EOF

chmod +x /opt/docker-projects/manage-rpi.sh

# Alias para facilitar uso
echo "alias rpi='/opt/docker-projects/manage-rpi.sh'" >> ~/.bashrc
source ~/.bashrc
```

---

## ⚡ Optimización Performance

### **1. Configuraciones de Performance**

```bash
# Script de optimización específica para Docker
cat > /opt/docker-projects/optimize-docker.sh << 'EOF'
#!/bin/bash

echo "⚡ Optimizando Docker para Raspberry Pi..."

# Configurar límites de memoria para contenedores
cat > /etc/docker/daemon.json << 'INNER_EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-shm-size": "64m",
  "default-ulimits": {
    "memlock": {
      "Hard": -1,
      "Name": "memlock",
      "Soft": -1
    }
  },
  "live-restore": true
}
INNER_EOF

# Optimizaciones del kernel
cat >> /etc/sysctl.conf << 'INNER_EOF'
# Optimizaciones Docker RPI
vm.max_map_count=262144
fs.file-max=65536
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
INNER_EOF

sudo systemctl restart docker

echo "✅ Optimizaciones aplicadas"
EOF

chmod +x /opt/docker-projects/optimize-docker.sh
sudo ./optimize-docker.sh
```

### **2. Monitoreo de Recursos**

```bash
# Script de monitoreo
cat > /opt/docker-projects/monitor-resources.sh << 'EOF'
#!/bin/bash

echo "📊 ESTADO DEL SISTEMA RASPBERRY PI"
echo "=================================="

# CPU y temperatura
echo "🌡️  Temperatura: $(vcgencmd measure_temp)"
echo "💻 CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')% en uso"

# Memoria
echo "🧠 Memoria:"
free -h

# Disco
echo "💾 Almacenamiento:"
df -h | grep -E "^/dev"

# Docker
echo "🐳 Contenedores Docker:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Red
echo "🌐 Conexiones de red:"
ss -tuln | grep LISTEN | head -10
EOF

chmod +x /opt/docker-projects/monitor-resources.sh
```

---

## 🔄 Arranque Automático

### **1. Crear Servicio Systemd**

```bash
# Servicio para iniciar todos los proyectos al boot
sudo cat > /etc/systemd/system/docker-projects.service << 'EOF'
[Unit]
Description=Docker Projects Auto Start
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=pi
Group=pi
WorkingDirectory=/opt/docker-projects
ExecStart=/opt/docker-projects/manage-rpi.sh start
ExecStop=/opt/docker-projects/manage-rpi.sh stop
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

# Habilitar servicio
sudo systemctl daemon-reload
sudo systemctl enable docker-projects.service

# Test del servicio
sudo systemctl start docker-projects.service
sudo systemctl status docker-projects.service
```

### **2. Healthcheck y Auto-recovery**

```bash
# Script de healthcheck automático
cat > /opt/docker-projects/healthcheck.sh << 'EOF'
#!/bin/bash

LOG_FILE="/opt/docker-projects/shared/logs/healthcheck.log"

log() {
    echo "[$(date)] $1" >> "$LOG_FILE"
}

# Verificar servicios críticos
SERVICES=("traefik" "gastos-casa-app" "gastos-casa-db")

for service in "${SERVICES[@]}"; do
    if ! docker ps | grep -q "$service"; then
        log "⚠️  Servicio $service no está ejecutándose. Reiniciando..."
        /opt/docker-projects/manage-rpi.sh restart
        break
    fi
done

# Verificar acceso web
if ! curl -f http://gastos-casa.local/api/health >/dev/null 2>&1; then
    log "⚠️  Aplicación no responde. Reiniciando servicios..."
    /opt/docker-projects/manage-rpi.sh restart
fi

# Verificar temperatura
TEMP=$(vcgencmd measure_temp | cut -d= -f2 | cut -d\' -f1)
if (( $(echo "$TEMP > 70" | bc -l) )); then
    log "🌡️  Temperatura alta: ${TEMP}°C"
fi

# Verificar espacio en disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log "💾 Espacio en disco bajo: ${DISK_USAGE}%"
    docker system prune -f
fi
EOF

chmod +x /opt/docker-projects/healthcheck.sh

# Ejecutar cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/docker-projects/healthcheck.sh") | crontab -
```

---

## 🚨 Troubleshooting

### **Problemas Comunes:**

#### **1. Contenedores no inician:**
```bash
# Verificar logs
docker-compose logs serviceName

# Verificar recursos
free -h
df -h

# Reiniciar Docker
sudo systemctl restart docker
```

#### **2. Aplicación lenta:**
```bash
# Verificar temperatura
vcgencmd measure_temp

# Verificar uso de recursos
htop
docker stats

# Limpiar Docker
docker system prune -f
```

#### **3. No se puede acceder desde red:**
```bash
# Verificar firewall
sudo ufw status

# Verificar Traefik
docker logs traefik

# Verificar DNS
nslookup gastos-casa.local
```

#### **4. Base de datos corrupta:**
```bash
# Restaurar desde backup
cd /opt/docker-projects/shared/backup
ls -la  # Ver backups disponibles
# Usar script de restore del proyecto
```

---

## 📱 Añadir Nuevos Proyectos

### **Template para Nuevo Proyecto:**

```bash
# Crear estructura para nuevo proyecto
mkdir -p /opt/docker-projects/projects/mi-nuevo-proyecto
cd /opt/docker-projects/projects/mi-nuevo-proyecto

# Template docker-compose
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    container_name: mi-nuevo-proyecto-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - proyecto-network
      - proxy-network
      - monitoring-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mi-proyecto.rule=Host(`mi-proyecto.local`)"
      - "traefik.http.routers.mi-proyecto.entrypoints=websecure"
      - "traefik.http.services.mi-proyecto.loadbalancer.server.port=3000"

networks:
  proyecto-network:
    driver: bridge
  proxy-network:
    external: true
  monitoring-network:
    external: true
EOF
```

---

## 🎉 Resultado Final

### **URLs de Acceso:**
- 🏠 **Gastos Casa**: https://gastos-casa.local
- 🔧 **Traefik Dashboard**: http://traefik.local:8080
- 📊 **Grafana Monitoring**: http://monitor.local
- 📈 **Prometheus**: http://prometheus.local

### **Comandos de Gestión:**
```bash
rpi start     # Iniciar todos los servicios
rpi stop      # Detener todos los servicios
rpi status    # Ver estado del sistema
rpi update    # Actualizar proyectos
rpi backup    # Backup manual
```

### **¡Tu Raspberry Pi ahora es un servidor profesional listo para múltiples proyectos Docker!** 🍓🐳

**Siguientes pasos:**
1. Añadir más proyectos usando el template
2. Configurar SSL certificates para HTTPS
3. Implementar CI/CD para deploy automático
4. Expandir monitoreo con alertas