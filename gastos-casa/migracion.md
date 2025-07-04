# 🚀 Migración a Docker para Red Local

## 📋 Índice
1. [Preparación Pre-Migración](#preparación-pre-migración)
2. [Configuración Docker](#configuración-docker)
3. [Migración de Datos](#migración-de-datos)
4. [Configuración de Red Local](#configuración-de-red-local)
5. [Proceso de Migración Paso a Paso](#proceso-de-migración-paso-a-paso)
6. [Verificación y Testing](#verificación-y-testing)
7. [Mantenimiento y Backup](#mantenimiento-y-backup)
8. [Troubleshooting](#troubleshooting)

---

## 🔍 Preparación Pre-Migración

### 1. **Backup de Datos Actuales**
```bash
# 1. Backup de la base de datos actual
npm run db:backup

# 2. Backup completo del proyecto
cp -r gastos-casa gastos-casa-backup-$(date +%Y%m%d)

# 3. Exportar datos en formato SQL (si es SQLite)
sqlite3 prisma/dev.db .dump > backup-$(date +%Y%m%d).sql
```

### 2. **Inventario de Configuración Actual**
- ✅ Variables de entorno (.env)
- ✅ Base de datos actual (SQLite/PostgreSQL)
- ✅ Archivos de configuración
- ✅ Datos de usuarios y cuentas
- ✅ Reglas de categorización personalizadas

---

## 🐳 Configuración Docker

### 1. **Dockerfile**
```dockerfile
# ============= Dockerfile =============
FROM node:18-alpine AS base

# Instalar dependencias necesarias
RUN apk add --no-cache libc6-compat

# ============= Dependencies =============
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ============= Builder =============
FROM base AS builder
WORKDIR /app

# Copiar dependencias desde deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Variables de entorno para build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build de la aplicación
RUN npm run build

# ============= Runner =============
FROM base AS runner
WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Configurar permisos
RUN chown nextjs:nodejs /app

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Comando de inicio
CMD ["node", "server.js"]
```

### 2. **docker-compose.yml**
```yaml
# ============= docker-compose.yml =============
version: '3.8'

services:
  # Base de datos PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: gastos-casa-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: gastos_casa
      POSTGRES_USER: gastos_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-gastos_secure_password_2024}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256 --auth-local=scram-sha-256"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    ports:
      - "5432:5432"
    networks:
      - gastos-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gastos_user -d gastos_casa"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Aplicación Next.js
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gastos-casa-app
    restart: unless-stopped
    environment:
      # Database
      DATABASE_URL: postgresql://gastos_user:${DB_PASSWORD:-gastos_secure_password_2024}@postgres:5432/gastos_casa
      
      # Next.js
      NODE_ENV: production
      NEXTAUTH_URL: http://${HOST_IP:-localhost}:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-your-super-secret-key-change-this}
      
      # App específicas
      APP_NAME: "Gastos Casa"
      APP_VERSION: "1.0.0"
      
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./backups:/app/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - gastos-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Adminer para gestión de base de datos (opcional)
  adminer:
    image: adminer:4.8.1
    container_name: gastos-casa-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - gastos-network
    environment:
      ADMINER_DEFAULT_SERVER: postgres
    profiles:
      - admin

volumes:
  postgres_data:
    driver: local

networks:
  gastos-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 3. **Variables de Entorno (.env.production)**
```bash
# ============= .env.production =============

# Database Configuration
DB_PASSWORD=gastos_secure_password_2024
DATABASE_URL=postgresql://gastos_user:gastos_secure_password_2024@postgres:5432/gastos_casa

# Network Configuration
HOST_IP=192.168.1.100  # ← CAMBIAR POR TU IP LOCAL
NEXTAUTH_URL=http://192.168.1.100:3000
NEXTAUTH_SECRET=tu-clave-super-secreta-cambiar-esto-ahora

# App Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security
ALLOWED_HOSTS=192.168.1.0/24,localhost,127.0.0.1

# Backup Configuration
BACKUP_SCHEDULE="0 2 * * *"  # Backup diario a las 2 AM
BACKUP_RETENTION_DAYS=30
```

---

## 📊 Migración de Datos

### 1. **Script de Migración (migrate-to-docker.sh)**
```bash
#!/bin/bash
# ============= migrate-to-docker.sh =============

set -e  # Salir en caso de error

echo "🚀 Iniciando migración a Docker..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función de logging
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

# 1. Verificar prerrequisitos
log "Verificando prerrequisitos..."
command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose no está instalado"

# 2. Backup de seguridad
log "Creando backup de seguridad..."
BACKUP_DIR="backup-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup de base de datos actual
if [ -f "prisma/dev.db" ]; then
    cp prisma/dev.db "$BACKUP_DIR/"
    sqlite3 prisma/dev.db .dump > "$BACKUP_DIR/database-export.sql"
    log "Backup de SQLite creado"
fi

# Backup de configuración
cp .env "$BACKUP_DIR/.env.backup" 2>/dev/null || warn "No se encontró archivo .env"
cp -r uploads "$BACKUP_DIR/" 2>/dev/null || warn "No se encontró directorio uploads"

# 3. Configurar variables de entorno
log "Configurando variables de entorno..."
if [ ! -f ".env.production" ]; then
    # Obtener IP local automáticamente
    LOCAL_IP=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
    
    cat > .env.production << EOF
# Auto-generado durante migración
DB_PASSWORD=gastos_secure_password_$(date +%Y%m%d)
DATABASE_URL=postgresql://gastos_user:gastos_secure_password_$(date +%Y%m%d)@postgres:5432/gastos_casa
HOST_IP=$LOCAL_IP
NEXTAUTH_URL=http://$LOCAL_IP:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
    log "Archivo .env.production creado con IP: $LOCAL_IP"
else
    log "Usando .env.production existente"
fi

# 4. Construir y iniciar servicios
log "Construyendo imágenes Docker..."
docker-compose --env-file .env.production build --no-cache

log "Iniciando base de datos..."
docker-compose --env-file .env.production up -d postgres

# Esperar a que PostgreSQL esté listo
log "Esperando a que PostgreSQL esté disponible..."
for i in {1..30}; do
    if docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

# 5. Migrar datos
log "Ejecutando migraciones de base de datos..."
docker-compose --env-file .env.production run --rm app npx prisma migrate deploy
docker-compose --env-file .env.production run --rm app npx prisma db seed

# 6. Importar datos existentes (si existen)
if [ -f "$BACKUP_DIR/database-export.sql" ]; then
    log "Importando datos existentes..."
    # Aquí iría la lógica de conversión de SQLite a PostgreSQL
    # Esto requiere un script específico de conversión
    warn "Importación de datos automática no implementada. Ver sección manual."
fi

# 7. Iniciar aplicación completa
log "Iniciando aplicación completa..."
docker-compose --env-file .env.production up -d

# 8. Verificar salud de servicios
log "Verificando servicios..."
sleep 10

# Verificar PostgreSQL
if ! docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa >/dev/null 2>&1; then
    error "PostgreSQL no está funcionando correctamente"
fi

# Verificar aplicación
if ! curl -f "http://localhost:3000/api/health" >/dev/null 2>&1; then
    error "La aplicación no responde correctamente"
fi

log "✅ Migración completada exitosamente!"
log "🌐 Aplicación disponible en: http://$(cat .env.production | grep HOST_IP | cut -d= -f2):3000"
log "🗄️  Adminer disponible en: http://$(cat .env.production | grep HOST_IP | cut -d= -f2):8080"
log "📁 Backup guardado en: $BACKUP_DIR"

echo
echo "📝 PRÓXIMOS PASOS:"
echo "1. Verificar que la aplicación funciona correctamente"
echo "2. Importar datos manualmente si es necesario"
echo "3. Configurar firewall para permitir acceso en red local"
echo "4. Configurar backup automático"
```

### 2. **Script de Conversión de Datos (convert-sqlite-to-postgres.js)**
```javascript
// ============= convert-sqlite-to-postgres.js =============
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs');

async function migrateData() {
    console.log('🔄 Iniciando conversión de SQLite a PostgreSQL...');
    
    // Conexión SQLite
    const sqliteDb = new sqlite3.Database('./backup-migration-*/dev.db');
    
    // Conexión PostgreSQL
    const pgClient = new Client({
        host: 'localhost',
        port: 5432,
        database: 'gastos_casa',
        user: 'gastos_user',
        password: process.env.DB_PASSWORD
    });
    
    await pgClient.connect();
    
    try {
        // 1. Migrar Cuentas
        console.log('📁 Migrando cuentas...');
        const cuentas = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM Cuenta', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        for (const cuenta of cuentas) {
            await pgClient.query(
                'INSERT INTO "Cuenta" (id, nombre, tipo, color, "createdAt") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                [cuenta.id, cuenta.nombre, cuenta.tipo, cuenta.color, cuenta.createdAt]
            );
        }
        
        // 2. Migrar Categorías
        console.log('🏷️ Migrando categorías...');
        const categorias = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM Categoria', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        for (const categoria of categorias) {
            await pgClient.query(
                'INSERT INTO "Categoria" (id, nombre, color, icono, tipo503020) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                [categoria.id, categoria.nombre, categoria.color, categoria.icono, categoria.tipo503020]
            );
        }
        
        // 3. Migrar Movimientos
        console.log('💰 Migrando movimientos...');
        const movimientos = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM Movimiento', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        for (const mov of movimientos) {
            await pgClient.query(
                `INSERT INTO "Movimiento" (
                    id, fecha, descripcion, importe, saldo, hash,
                    "categoriaING", "subcategoriaING", categoria, subcategoria,
                    "esManual", "fechaImportacion", "cuentaId"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                ON CONFLICT (id) DO NOTHING`,
                [
                    mov.id, mov.fecha, mov.descripcion, mov.importe, mov.saldo, mov.hash,
                    mov.categoriaING, mov.subcategoriaING, mov.categoria, mov.subcategoria,
                    mov.esManual, mov.fechaImportacion, mov.cuentaId
                ]
            );
        }
        
        // 4. Migrar Reglas
        console.log('⚙️ Migrando reglas de categorización...');
        const reglas = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM ReglaCategorizacion', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        for (const regla of reglas) {
            await pgClient.query(
                `INSERT INTO "ReglaCategorizacion" (
                    id, nombre, patron, "tipoCoincidencia", categoria, subcategoria,
                    prioridad, activa, "cuentaId"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                ON CONFLICT (id) DO NOTHING`,
                [
                    regla.id, regla.nombre, regla.patron, regla.tipoCoincidencia,
                    regla.categoria, regla.subcategoria, regla.prioridad, regla.activa, regla.cuentaId
                ]
            );
        }
        
        console.log('✅ Migración de datos completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        sqliteDb.close();
        await pgClient.end();
    }
}

// Ejecutar migración
migrateData().catch(console.error);
```

---

## 🌐 Configuración de Red Local

### 1. **Configuración de Firewall**
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp comment "Gastos Casa App"
sudo ufw allow 8080/tcp comment "Gastos Casa Admin"

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Verificar puertos abiertos
sudo netstat -tlnp | grep :3000
```

### 2. **Configuración Next.js para Red Local**
```javascript
// ============= next.config.js =============
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
  
  // Configuración para red local
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // Configuración de host
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
```

### 3. **Script de Configuración de Red (setup-network.sh)**
```bash
#!/bin/bash
# ============= setup-network.sh =============

# Obtener IP local
LOCAL_IP=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
SUBNET=$(echo $LOCAL_IP | cut -d. -f1-3).0/24

echo "🌐 Configurando acceso en red local..."
echo "📍 IP del servidor: $LOCAL_IP"
echo "🔗 Subnet de red: $SUBNET"

# Actualizar variables de entorno
sed -i "s/HOST_IP=.*/HOST_IP=$LOCAL_IP/" .env.production
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$LOCAL_IP:3000|" .env.production

# Reiniciar contenedores con nueva configuración
docker-compose --env-file .env.production down
docker-compose --env-file .env.production up -d

echo "✅ Configuración completada"
echo "🌍 Acceso desde red local: http://$LOCAL_IP:3000"
echo "🗄️  Panel admin: http://$LOCAL_IP:8080"

echo ""
echo "📱 Para acceder desde otros dispositivos:"
echo "   - Móviles: http://$LOCAL_IP:3000"
echo "   - PCs: http://$LOCAL_IP:3000"
echo "   - Tablets: http://$LOCAL_IP:3000"
```

---

## 🔄 Proceso de Migración Paso a Paso

### **Fase 1: Preparación (30 minutos)**
```bash
# 1. Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Añadir usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# 3. Verificar instalación
docker --version
docker-compose --version
```

### **Fase 2: Backup y Configuración (15 minutos)**
```bash
# 1. Parar aplicación actual
npm run dev # Ctrl+C para parar

# 2. Crear backup completo
./migrate-to-docker.sh backup-only

# 3. Crear archivos Docker
# (Copiar Dockerfile y docker-compose.yml)
```

### **Fase 3: Construcción y Migración (20 minutos)**
```bash
# 1. Ejecutar migración automatizada
chmod +x migrate-to-docker.sh
./migrate-to-docker.sh

# 2. Configurar red local
chmod +x setup-network.sh
./setup-network.sh
```

### **Fase 4: Verificación (10 minutos)**
```bash
# 1. Verificar servicios
docker-compose --env-file .env.production ps

# 2. Verificar aplicación
curl http://localhost:3000/api/health

# 3. Verificar desde otro dispositivo
# Ir a http://IP_LOCAL:3000 desde móvil/otro PC
```

### **Fase 5: Importación Manual de Datos (si necesario)**
```bash
# 1. Convertir datos de SQLite a PostgreSQL
node convert-sqlite-to-postgres.js

# 2. Verificar datos importados
docker-compose --env-file .env.production exec postgres psql -U gastos_user -d gastos_casa -c "SELECT COUNT(*) FROM \"Movimiento\";"
```

---

## ✅ Verificación y Testing

### **Checklist de Verificación**
- [ ] ✅ Docker containers ejecutándose
- [ ] ✅ PostgreSQL funcional
- [ ] ✅ Aplicación responde en puerto 3000
- [ ] ✅ Acceso desde red local funcional
- [ ] ✅ Datos migrados correctamente
- [ ] ✅ Reglas de categorización funcionando
- [ ] ✅ Upload de archivos funcional
- [ ] ✅ Backup automático configurado

### **Tests de Funcionalidad**
```bash
# Test de API
curl -f "http://TUIP:3000/api/health" || echo "❌ API no responde"

# Test de base de datos
docker-compose --env-file .env.production exec postgres pg_isready -U gastos_user -d gastos_casa

# Test de persistencia
docker-compose --env-file .env.production restart app
curl -f "http://TUIP:3000/api/health" || echo "❌ App no se reinicia correctamente"
```

---

## 🔄 Mantenimiento y Backup

### **Backup Automático (backup-schedule.sh)**
```bash
#!/bin/bash
# ============= backup-schedule.sh =============

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup de PostgreSQL
docker-compose --env-file .env.production exec postgres pg_dump -U gastos_user gastos_casa > "$BACKUP_DIR/database.sql"

# Backup de uploads
cp -r uploads "$BACKUP_DIR/"

# Backup de configuración
cp .env.production "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

# Limpiar backups antiguos (30 días)
find /backups -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

echo "✅ Backup completado: $BACKUP_DIR"
```

### **Crontab para Backup Automático**
```bash
# Añadir al crontab
crontab -e

# Backup diario a las 2 AM
0 2 * * * /path/to/gastos-casa/backup-schedule.sh >> /var/log/gastos-backup.log 2>&1
```

### **Actualización de la Aplicación**
```bash
#!/bin/bash
# ============= update-app.sh =============

echo "🔄 Actualizando aplicación..."

# 1. Backup antes de actualizar
./backup-schedule.sh

# 2. Rebuild de la imagen
docker-compose --env-file .env.production build --no-cache app

# 3. Recrear contenedor de app
docker-compose --env-file .env.production up -d --force-recreate app

# 4. Verificar funcionamiento
sleep 10
curl -f "http://localhost:3000/api/health" && echo "✅ Actualización exitosa" || echo "❌ Error en actualización"
```

---

## 🚨 Troubleshooting

### **Problemas Comunes**

#### **1. Puerto 3000 ya en uso**
```bash
# Verificar qué proceso usa el puerto
sudo lsof -i :3000

# Parar proceso si es necesario
sudo kill -9 PID

# O cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Cambiar a puerto 3001
```

#### **2. PostgreSQL no inicia**
```bash
# Ver logs
docker-compose --env-file .env.production logs postgres

# Verificar permisos del volumen
sudo chown -R 999:999 postgres_data/

# Recrear contenedor
docker-compose --env-file .env.production down -v
docker-compose --env-file .env.production up -d postgres
```

#### **3. Aplicación no accesible desde red local**
```bash
# Verificar IP local
ip addr show

# Verificar firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Verificar binding
docker-compose --env-file .env.production exec app netstat -tlnp | grep :3000
```

#### **4. Error de migración de datos**
```bash
# Verificar conexión a PostgreSQL
docker-compose --env-file .env.production exec postgres psql -U gastos_user -d gastos_casa -c "SELECT version();"

# Recrear base de datos
docker-compose --env-file .env.production exec postgres psql -U gastos_user -c "DROP DATABASE gastos_casa; CREATE DATABASE gastos_casa;"

# Re-ejecutar migraciones
docker-compose --env-file .env.production run --rm app npx prisma migrate deploy
```

#### **5. Performance lenta**
```bash
# Verificar recursos
docker stats

# Optimizar PostgreSQL
docker-compose --env-file .env.production exec postgres psql -U gastos_user -d gastos_casa -c "VACUUM ANALYZE;"

# Verificar logs de aplicación
docker-compose --env-file .env.production logs app --tail 100
```

---

## 📱 Configuración de Dispositivos Cliente

### **Para dispositivos móviles:**
1. Conectar a la misma red WiFi
2. Abrir navegador y ir a `http://IP_SERVIDOR:3000`
3. Añadir a pantalla de inicio para experiencia de app

### **Para otros PCs:**
1. Conectar a la misma red local
2. Acceder via `http://IP_SERVIDOR:3000`
3. Crear acceso directo en escritorio

### **Configuración de DNS local (opcional):**
```bash
# En router o en cada dispositivo (/etc/hosts)
192.168.1.100 gastos-casa.local

# Acceso via: http://gastos-casa.local:3000
```

---

## 🔐 Consideraciones de Seguridad

### **Para Red Local:**
- ✅ Cambiar contraseñas por defecto
- ✅ Configurar firewall correctamente  
- ✅ Backup regular y automático
- ✅ Monitorizar logs de acceso
- ✅ Actualizar contenedores regularmente

### **Variables Sensibles:**
```bash
# Generar contraseñas seguras
openssl rand -base64 32  # Para NEXTAUTH_SECRET
openssl rand -base64 16  # Para DB_PASSWORD
```

---

## 📞 Soporte y Mantenimiento

### **Comandos útiles de administración:**
```bash
# Ver estado de servicios
docker-compose --env-file .env.production ps

# Ver logs en tiempo real
docker-compose --env-file .env.production logs -f app

# Reiniciar aplicación
docker-compose --env-file .env.production restart app

# Acceder a base de datos
docker-compose --env-file .env.production exec postgres psql -U gastos_user gastos_casa

# Backup manual
./backup-schedule.sh

# Restaurar backup
docker-compose --env-file .env.production exec postgres psql -U gastos_user gastos_casa < backup.sql
```

---

## 🎯 Resultado Final

Después de completar esta migración tendrás:

- ✅ **Aplicación funcionando en Docker**
- ✅ **Acceso desde toda la red local**
- ✅ **Base de datos PostgreSQL robusta**
- ✅ **Backup automático configurado**
- ✅ **Escalabilidad para múltiples usuarios**
- ✅ **Mantenimiento simplificado**
- ✅ **Datos migrados de forma segura**

**🌐 URL de acceso:** `http://TU_IP_LOCAL:3000`  
**🔧 Panel de admin:** `http://TU_IP_LOCAL:8080`

La aplicación estará disponible 24/7 para todos los dispositivos de la red local, con persistencia de datos garantizada y backup automático diario.