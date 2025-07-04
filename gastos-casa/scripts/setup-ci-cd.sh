#!/bin/bash
# ============= setup-ci-cd.sh =============

echo "🔧 Configurando CI/CD para despliegue automático..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# 1. Generar clave SSH para deploy
log "🔑 Generando clave SSH para deploy..."
SSH_KEY_PATH="$HOME/.ssh/gastos-casa-deploy"

if [ ! -f "$SSH_KEY_PATH" ]; then
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "gastos-casa-deploy"
    log "✅ Clave SSH generada en: $SSH_KEY_PATH"
else
    log "ℹ️  Clave SSH ya existe"
fi

# 2. Configurar acceso SSH local
log "🔐 Configurando acceso SSH..."
cat "$SSH_KEY_PATH.pub" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

# 3. Verificar acceso SSH
LOCAL_IP=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no $USER@$LOCAL_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    log "✅ Acceso SSH configurado correctamente"
else
    error "❌ Error configurando acceso SSH"
fi

# 4. Crear usuario deploy dedicado (opcional pero recomendado)
log "👤 Configurando usuario deploy..."
if ! id "deploy" &>/dev/null; then
    sudo adduser --disabled-password --gecos "" deploy
    sudo usermod -aG docker deploy
    
    # Configurar SSH para usuario deploy
    sudo mkdir -p /home/deploy/.ssh
    sudo cp "$SSH_KEY_PATH.pub" /home/deploy/.ssh/authorized_keys
    sudo chown -R deploy:deploy /home/deploy/.ssh
    sudo chmod 700 /home/deploy/.ssh
    sudo chmod 600 /home/deploy/.ssh/authorized_keys
    
    # Dar permisos sudo sin contraseña para comandos específicos
    echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/local/bin/docker-compose" | sudo tee /etc/sudoers.d/deploy
    
    log "✅ Usuario deploy creado"
else
    log "ℹ️  Usuario deploy ya existe"
fi

# 5. Configurar permisos para el directorio de la aplicación
log "📁 Configurando permisos de directorio..."
APP_DIR=$(pwd)
sudo chown -R $USER:docker "$APP_DIR"
sudo chmod -R g+w "$APP_DIR"

# 6. Inicializar repositorio Git si no existe
log "📚 Configurando repositorio Git..."
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial commit for CI/CD setup"
    log "✅ Repositorio Git inicializado"
else
    log "ℹ️  Repositorio Git ya existe"
fi

# 7. Crear webhook script para GitHub (alternativa sin GitHub Actions)
log "🔗 Creando webhook script..."
cat > scripts/webhook-deploy.sh << 'EOF'
#!/bin/bash
# Webhook script para deploy automático

# Log de deploy
DEPLOY_LOG="/var/log/gastos-casa-deploy.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

log "🚀 Iniciando deploy automático via webhook..."

# Navegar al directorio de la aplicación
cd /ruta/completa/gastos-casa

# Backup automático
log "📦 Creando backup..."
./scripts/backup-schedule.sh

# Actualizar código
log "📥 Actualizando código..."
git fetch origin
git reset --hard origin/main

# Rebuild y restart
log "🔄 Actualizando aplicación..."
docker-compose --env-file .env.production build --no-cache app
docker-compose --env-file .env.production up -d --force-recreate app

# Verificar
LOCAL_IP=$(grep HOST_IP .env.production | cut -d= -f2)
if curl -f "http://$LOCAL_IP:3000/api/health" >/dev/null 2>&1; then
    log "✅ Deploy exitoso"
else
    log "❌ Deploy falló"
    exit 1
fi
EOF

chmod +x scripts/webhook-deploy.sh

# 8. Mostrar información para configurar GitHub
echo ""
echo "🎯 CONFIGURACIÓN DE GITHUB SECRETS"
echo "================================================="
echo ""
echo "Ve a tu repositorio de GitHub → Settings → Secrets and variables → Actions"
echo "y añade estos secrets:"
echo ""
echo "🔑 DEPLOY_HOST:"
echo "   $LOCAL_IP"
echo ""
echo "👤 DEPLOY_USER:"
echo "   $USER"
echo ""
echo "🗂️ DEPLOY_PATH:"
echo "   $APP_DIR"
echo ""
echo "🔐 DEPLOY_SSH_KEY:"
echo "   (Copia el contenido completo del archivo siguiente)"
echo "   ┌─────────────────────────────────────────────────────────────┐"
cat "$SSH_KEY_PATH"
echo "   └─────────────────────────────────────────────────────────────┘"
echo ""
echo "🔐 GITHUB_TOKEN:"
echo "   • Ve a GitHub → Settings → Developer settings → Personal access tokens"
echo "   • Crea un token con permisos: repo, write:packages"
echo "   • Copia el token en este secret"
echo ""

# 9. Opcional: Configurar Slack notifications
echo "📢 SLACK_WEBHOOK_URL (Opcional):"
echo "   • Ve a tu Slack → Apps → Incoming Webhooks"
echo "   • Crea un webhook para el canal #deployments"
echo "   • Copia la URL del webhook"
echo ""

# 10. Mostrar comandos de verificación
echo "🔍 VERIFICACIÓN:"
echo "================================================="
echo ""
echo "1. Verificar acceso SSH:"
echo "   ssh -i $SSH_KEY_PATH $USER@$LOCAL_IP 'echo SSH OK'"
echo ""
echo "2. Verificar Docker:"
echo "   docker-compose --env-file .env.production ps"
echo ""
echo "3. Test del webhook local:"
echo "   ./scripts/webhook-deploy.sh"
echo ""

log "✅ Configuración de CI/CD completada"
log "🚀 Push a GitHub para probar el deploy automático"