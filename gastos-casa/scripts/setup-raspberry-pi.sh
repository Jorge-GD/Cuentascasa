#!/bin/bash
# ============= setup-raspberry-pi.sh =============
# Script de configuración automática para Raspberry Pi

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

echo "🍓 CONFIGURACIÓN AUTOMÁTICA RASPBERRY PI"
echo "========================================"

# Verificar que estamos en Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    error "Este script debe ejecutarse en una Raspberry Pi"
fi

# Verificar usuario
if [ "$USER" != "pi" ]; then
    warn "Se recomienda ejecutar como usuario 'pi'"
fi

# 1. Actualizar sistema
log "📦 Actualizando sistema base..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias esenciales
log "🔧 Instalando herramientas esenciales..."
sudo apt install -y \
    git curl wget vim nano htop iotop tree \
    unzip zip fail2ban ufw dnsmasq \
    bc

# 3. Configurar optimizaciones del sistema
log "⚡ Configurando optimizaciones del sistema..."

# GPU memory split
if ! grep -q "gpu_mem=16" /boot/config.txt; then
    echo "gpu_mem=16" | sudo tee -a /boot/config.txt
fi

# Cgroups para Docker
if ! grep -q "cgroup_enable=cpuset" /boot/cmdline.txt; then
    sudo sed -i 's/$/ cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1/' /boot/cmdline.txt
fi

# Optimizaciones de memoria
cat >> /tmp/sysctl_optimizations << 'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.max_map_count=262144
fs.file-max=65536
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
EOF

sudo cp /tmp/sysctl_optimizations /etc/sysctl.d/99-docker-optimizations.conf

# 4. Configurar firewall básico
log "🔥 Configurando firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000:9000/tcp
sudo ufw --force enable

# 5. Instalar Docker
log "🐳 Instalando Docker..."

# Remover versiones antiguas
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Instalar dependencias
sudo apt install -y ca-certificates gnupg lsb-release

# Añadir clave GPG de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Añadir repositorio Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configurar Docker daemon
sudo mkdir -p /etc/docker
cat > /tmp/docker-daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-shm-size": "64m",
  "live-restore": true,
  "experimental": false
}
EOF

sudo mv /tmp/docker-daemon.json /etc/docker/daemon.json

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Habilitar Docker al boot
sudo systemctl enable docker
sudo systemctl restart docker

# 6. Instalar Docker Compose standalone
log "📦 Instalando Docker Compose standalone..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 7. Crear estructura de directorios
log "📁 Creando estructura de proyectos..."
sudo mkdir -p /opt/docker-projects
sudo chown -R $USER:$USER /opt/docker-projects

cd /opt/docker-projects

mkdir -p {
  proxy,
  monitoring,
  backup,
  projects,
  shared/{databases,storage,logs,ssl,backup}
}

# 8. Crear redes Docker
log "🌐 Creando redes Docker..."
# Verificar si las redes existen antes de crearlas
docker network ls | grep -q proxy-network || docker network create --driver bridge proxy-network
docker network ls | grep -q monitoring-network || docker network create --driver bridge monitoring-network
docker network ls | grep -q projects-network || docker network create --driver bridge projects-network

# 9. Configurar Traefik (Reverse Proxy)
log "🔀 Configurando Traefik..."
cd /opt/docker-projects/proxy

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
      - "8080:8080"
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
      - "traefik.http.routers.dashboard.rule=Host(\`traefik.local\`)"
      - "traefik.http.routers.dashboard.service=api@internal"

networks:
  proxy-network:
    external: true
EOF

cat > traefik.yml << 'EOF'
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: proxy-network
  file:
    directory: /etc/traefik/dynamic
    watch: true

log:
  level: INFO
  filePath: /logs/traefik.log

accessLog:
  filePath: /logs/access.log
EOF

mkdir -p dynamic ../shared/ssl ../shared/logs
touch ../shared/ssl/acme.json
chmod 600 ../shared/ssl/acme.json

# 10. Configurar DNS local
log "🌍 Configurando DNS local..."
RPI_IP=$(hostname -I | cut -d' ' -f1)

sudo cat > /etc/dnsmasq.d/local-projects << EOF
# DNS local para proyectos
address=/local/$RPI_IP
address=/gastos-casa.local/$RPI_IP
address=/traefik.local/$RPI_IP
address=/monitor.local/$RPI_IP

cache-size=1000
EOF

sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq

# 11. Configurar monitoreo básico
log "📊 Configurando monitoreo..."
cd /opt/docker-projects/monitoring

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
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
      - "traefik.http.routers.grafana.rule=Host(\`monitor.local\`)"

volumes:
  grafana_data:

networks:
  monitoring-network:
    external: true
  proxy-network:
    external: true
EOF

# 12. Crear scripts de gestión
log "🛠️ Creando scripts de gestión..."
cd /opt/docker-projects

cat > manage-rpi.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando servicios principales..."
        cd /opt/docker-projects/proxy && docker-compose up -d
        cd /opt/docker-projects/monitoring && docker-compose up -d
        echo "✅ Servicios básicos iniciados"
        ;;
    "stop")
        echo "⏹️ Deteniendo todos los servicios..."
        docker stop $(docker ps -q) 2>/dev/null || echo "No hay contenedores ejecutándose"
        ;;
    "restart")
        $0 stop
        sleep 3
        $0 start
        ;;
    "status")
        echo "📊 Estado de servicios:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "💾 Uso de disco:"
        df -h | head -5
        echo ""
        echo "🧠 Memoria:"
        free -h
        echo ""
        echo "🌡️ Temperatura:"
        vcgencmd measure_temp 2>/dev/null || echo "No disponible"
        ;;
    "logs")
        docker-compose -f /opt/docker-projects/proxy/docker-compose.yml logs --tail=50
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs}"
        ;;
esac
EOF

chmod +x manage-rpi.sh

# Crear alias
echo "alias rpi='/opt/docker-projects/manage-rpi.sh'" >> ~/.bashrc

# 13. Configurar servicio systemd
log "🔄 Configurando arranque automático..."
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

sudo systemctl daemon-reload
sudo systemctl enable docker-projects.service

# 14. Crear script de backup básico
log "💾 Configurando sistema de backup..."
cd /opt/docker-projects

cat > backup-system.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/docker-projects/shared/backup"
DATE=$(date +%Y%m%d-%H%M%S)

echo "📦 Creando backup del sistema - $DATE"

mkdir -p "$BACKUP_DIR/$DATE"

# Backup de configuraciones
tar -czf "$BACKUP_DIR/$DATE/configurations.tar.gz" \
    /opt/docker-projects/proxy \
    /opt/docker-projects/monitoring \
    /etc/dnsmasq.d \
    --exclude="*.log"

# Limpiar backups antiguos (30 días)
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

echo "✅ Backup completado en $BACKUP_DIR/$DATE"
EOF

chmod +x backup-system.sh

# Programar backup semanal
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/docker-projects/backup-system.sh >> /opt/docker-projects/shared/logs/backup.log 2>&1") | crontab -

# 15. Iniciar servicios básicos
log "🚀 Iniciando servicios básicos..."
cd /opt/docker-projects/proxy
docker-compose up -d

cd /opt/docker-projects/monitoring  
docker-compose up -d

# 16. Crear script de información del sistema
cat > /opt/docker-projects/system-info.sh << 'EOF'
#!/bin/bash

echo "🍓 INFORMACIÓN RASPBERRY PI DOCKER SERVER"
echo "=========================================="
echo ""
echo "🖥️  Hostname: $(hostname)"
echo "📍 IP Local: $(hostname -I | cut -d' ' -f1)"
echo "💻 Modelo: $(cat /proc/device-tree/model 2>/dev/null || echo 'Desconocido')"
echo "🧠 Memoria Total: $(free -h | awk '/^Mem:/ {print $2}')"
echo "💾 Almacenamiento:"
df -h | grep -E '^/dev' | while read line; do
    echo "   $line"
done
echo ""
echo "🌐 URLs de Acceso:"
echo "   • Traefik Dashboard: http://$(hostname -I | cut -d' ' -f1):8080"
echo "   • Grafana Monitor: http://monitor.local (admin/admin)"
echo ""
echo "🔧 Comandos útiles:"
echo "   rpi status    - Ver estado del sistema"
echo "   rpi start     - Iniciar servicios"
echo "   rpi stop      - Detener servicios"
echo ""
echo "📁 Estructura de proyectos:"
echo "   /opt/docker-projects/"
echo "   ├── proxy/          (Traefik reverse proxy)"
echo "   ├── monitoring/     (Grafana)"
echo "   ├── projects/       (Tus proyectos aquí)"
echo "   └── shared/         (Datos compartidos)"
echo ""
EOF

chmod +x /opt/docker-projects/system-info.sh

# Añadir al login
echo "/opt/docker-projects/system-info.sh" >> ~/.bashrc

echo ""
echo "🎉 ¡CONFIGURACIÓN COMPLETADA!"
echo "============================="
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo "1. Reinicia la Raspberry Pi: sudo reboot"
echo "2. Tras el reinicio, verifica: rpi status"
echo "3. Accede a Traefik: http://$(hostname -I | cut -d' ' -f1):8080"
echo "4. Accede a Grafana: http://monitor.local (admin/admin)"
echo "5. Añade tus proyectos en /opt/docker-projects/projects/"
echo ""
echo "📱 Añade a /etc/hosts de tus dispositivos:"
echo "$(hostname -I | cut -d' ' -f1) traefik.local monitor.local gastos-casa.local"
echo ""

warn "⚠️  REINICIA EL SISTEMA para aplicar todos los cambios: sudo reboot"