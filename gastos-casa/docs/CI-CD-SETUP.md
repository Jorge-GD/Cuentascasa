# 🚀 Guía de CI/CD para Gastos Casa

## 🎯 Objetivo

Configurar despliegue automático que actualice la aplicación Docker cada vez que hagas push a GitHub.

---

## 📋 Opciones de Deploy

### **Opción 1: GitHub Actions (Recomendado)**
Deploy automático desde GitHub con pipeline completo.

### **Opción 2: Deploy Manual**
Deploy local controlado cuando quieras.

### **Opción 3: Webhook Simple**
Deploy automático usando webhooks de GitHub.

---

## 🔧 Configuración Inicial

### **1. Ejecutar Setup Automático**
```bash
./scripts/setup-ci-cd.sh
```

Este script:
- ✅ Genera claves SSH para deploy
- ✅ Configura acceso SSH local
- ✅ Crea usuario deploy (opcional)
- ✅ Configura permisos
- ✅ Inicializa Git si no existe
- ✅ Te muestra qué secrets configurar en GitHub

---

## 🐙 Configuración GitHub Actions

### **1. Crear Repositorio en GitHub**
```bash
# Si no tienes repositorio remoto
git remote add origin https://github.com/TU_USUARIO/gastos-casa.git
git branch -M main
git push -u origin main
```

### **2. Configurar Secrets en GitHub**

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**

Añade estos secrets:

| Secret | Valor | Descripción |
|--------|-------|-------------|
| `DEPLOY_HOST` | `192.168.1.XXX` | IP de tu servidor |
| `DEPLOY_USER` | `tu_usuario` | Usuario SSH |
| `DEPLOY_PATH` | `/ruta/completa/gastos-casa` | Ruta del proyecto |
| `DEPLOY_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Clave SSH privada |
| `GITHUB_TOKEN` | `ghp_xxxxx...` | Token de GitHub |

### **3. Configurar Token de GitHub**

1. Ve a GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. Crea un token con permisos:
   - ✅ `repo` (acceso al repositorio)
   - ✅ `write:packages` (para GitHub Container Registry)
3. Copia el token en el secret `GITHUB_TOKEN`

### **4. Habilitar GitHub Container Registry**

1. Ve a tu repositorio → **Settings** → **Actions** → **General**
2. En "Workflow permissions" selecciona "Read and write permissions"
3. Guarda cambios

---

## 🚀 ¿Cómo Funciona?

### **Flujo Automático:**

1. **Push a GitHub** → Trigger del workflow
2. **Build & Test** → Verifica código y tests
3. **Build Docker Image** → Construye imagen y la sube a GitHub Container Registry
4. **Deploy** → Se conecta a tu servidor y actualiza la aplicación
5. **Verificación** → Comprueba que todo funciona
6. **Notificación** → (Opcional) Notifica en Slack
7. **Rollback** → Si algo falla, restaura backup automáticamente

### **El Deploy Incluye:**

- ✅ **Backup automático** antes de actualizar
- ✅ **Actualización de código** desde GitHub
- ✅ **Pull de nueva imagen** Docker
- ✅ **Recreación del contenedor** con zero-downtime
- ✅ **Verificación** de salud de la aplicación
- ✅ **Limpieza** de imágenes antiguas
- ✅ **Rollback automático** si falla

---

## 🛠️ Deploy Manual

Si prefieres control manual:

```bash
# Deploy manual completo
./scripts/manual-deploy.sh
```

Este script hace lo mismo que GitHub Actions pero manualmente:
- 📦 Backup automático
- 🧪 Ejecuta tests
- 🏗️ Build de nueva imagen
- 🔄 Deploy con zero-downtime
- 🔍 Verificación completa
- 📊 Reporte de estado

---

## 🔗 Webhook Simple (Alternativa)

Si no quieres usar GitHub Actions:

### **1. Configurar Webhook en GitHub**

1. Ve a tu repositorio → **Settings** → **Webhooks**
2. Añade webhook:
   - **URL**: `http://TU_IP:9000/webhook`
   - **Content type**: `application/json`
   - **Events**: `Just the push event`

### **2. Instalar webhook receiver**

```bash
# Instalar webhook receiver
sudo npm install -g node-webhook
sudo npm install -g pm2

# Crear configuración
cat > webhook.json << EOF
{
  "port": 9000,
  "hooks": {
    "gastos-casa": {
      "command": "/ruta/completa/gastos-casa/scripts/webhook-deploy.sh",
      "user": "deploy"
    }
  }
}
EOF

# Iniciar webhook receiver
pm2 start webhook.json
pm2 save
pm2 startup
```

---

## 📊 Monitoreo y Logs

### **Ver logs de deploy:**
```bash
# Logs de GitHub Actions (en GitHub)
# Ver en Actions tab de tu repositorio

# Logs locales de deploy
tail -f /var/log/gastos-casa-deploy.log

# Logs de aplicación
docker-compose --env-file .env.production logs -f app
```

### **Verificar estado:**
```bash
# Estado de contenedores
docker-compose --env-file .env.production ps

# Health check
curl http://TU_IP:3000/api/health

# Verificar imagen actual
docker images | grep gastos-casa
```

---

## 🔄 Rollback

### **Rollback automático:**
- GitHub Actions hace rollback automático si el deploy falla

### **Rollback manual:**
```bash
# Ver backups disponibles
ls -la /home/$(whoami)/gastos-casa-backups/

# Restaurar backup específico
./scripts/restore-backup.sh /path/to/backup.tar.gz
```

---

## 🔧 Troubleshooting

### **GitHub Actions falla:**

1. **Verificar secrets:** Todos los secrets están configurados correctamente
2. **Verificar SSH:** `ssh -i ~/.ssh/gastos-casa-deploy usuario@ip`
3. **Verificar permisos:** Usuario tiene acceso a Docker
4. **Ver logs:** En GitHub → Actions → Click en el workflow fallido

### **Deploy manual falla:**

```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar permisos
ls -la docker-compose.yml
groups $USER

# Verificar conectividad
curl http://localhost:3000/api/health
```

### **Aplicación no responde después del deploy:**

```bash
# Ver logs de contenedor
docker-compose --env-file .env.production logs app

# Verificar configuración
cat .env.production

# Reiniciar servicios
docker-compose --env-file .env.production restart
```

---

## 📈 Optimizaciones

### **Para acelerar deploys:**

1. **Cache de Docker layers** (ya incluido en GitHub Actions)
2. **Multi-stage builds** (ya implementado en Dockerfile)
3. **Dependency caching** (ya incluido)

### **Para mejorar seguridad:**

1. **Usuario deploy dedicado** (incluido en setup)
2. **Claves SSH específicas** (generadas automáticamente)
3. **Secrets en GitHub** (no en código)

---

## 🎉 ¡Listo!

Ahora cada vez que hagas:

```bash
git add .
git commit -m "Actualización de la aplicación"
git push origin main
```

**¡La aplicación se actualizará automáticamente en tu servidor!** 🚀

### **Puedes monitorear el proceso en:**
- 🐙 **GitHub**: Tab "Actions" de tu repositorio
- 🖥️ **Servidor**: `docker-compose logs -f app`
- 🌐 **Web**: `http://TU_IP:3000/api/health`

### **En caso de problemas:**
- 🔄 **Rollback automático** si algo falla
- 📦 **Backup diario** para restaurar manualmente
- 📋 **Logs detallados** para debugging