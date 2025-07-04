#!/bin/bash
# ============= create-new-project-template.sh =============
# Script para crear template de nuevo proyecto en Raspberry Pi

set -e

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

echo "📁 CREAR TEMPLATE PARA NUEVO PROYECTO"
echo "====================================="

# Verificar parámetros
if [ $# -lt 3 ]; then
    echo "Uso: $0 <nombre-proyecto> <puerto> <descripcion> [tipo]"
    echo ""
    echo "Ejemplos:"
    echo "  $0 mi-blog 3001 'Blog personal con Next.js' nextjs"
    echo "  $0 api-usuarios 3002 'API REST para gestión de usuarios' node"
    echo "  $0 dashboard-ventas 3003 'Dashboard de ventas con React' react"
    echo ""
    echo "Tipos disponibles: nextjs, node, react, vue, django, flask, express"
    exit 1
fi

PROJECT_NAME="$1"
PROJECT_PORT="$2"
PROJECT_DESC="$3"
PROJECT_TYPE="${4:-node}"

# Validar nombre del proyecto
if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    error "El nombre del proyecto solo puede contener letras minúsculas, números y guiones"
fi

# Validar puerto
if ! [[ "$PROJECT_PORT" =~ ^[0-9]+$ ]] || [ "$PROJECT_PORT" -lt 3000 ] || [ "$PROJECT_PORT" -gt 9000 ]; then
    error "El puerto debe ser un número entre 3000 y 9000"
fi

log "📝 Creando template para proyecto: $PROJECT_NAME"
info "   Tipo: $PROJECT_TYPE"
info "   Puerto: $PROJECT_PORT"
info "   Descripción: $PROJECT_DESC"

# Crear directorio del proyecto
PROJECT_DIR="/tmp/new-project-template"
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Crear estructura básica
log "📁 Creando estructura de directorios..."
mkdir -p {src,public,docs,scripts}

# 2. Crear docker-compose.yml
log "🐳 Creando docker-compose.yml..."
cat > docker-compose.yml << EOF
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${PROJECT_NAME}-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=${PROJECT_PORT}
    ports:
      - "${PROJECT_PORT}:${PROJECT_PORT}"
    volumes:
      - ./uploads:/app/uploads
      - ../../shared/backup:/app/backups
    networks:
      - ${PROJECT_NAME}-network
      - proxy-network
      - monitoring-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${PROJECT_NAME}.rule=Host(\\\`${PROJECT_NAME}.local\\\`)"
      - "traefik.http.routers.${PROJECT_NAME}.entrypoints=web"
      - "traefik.http.services.${PROJECT_NAME}.loadbalancer.server.port=${PROJECT_PORT}"

networks:
  ${PROJECT_NAME}-network:
    driver: bridge
  proxy-network:
    external: true
  monitoring-network:
    external: true
EOF

# 3. Crear Dockerfile según el tipo
log "🔧 Creando Dockerfile para tipo: $PROJECT_TYPE..."

case "$PROJECT_TYPE" in
    "nextjs")
        cat > Dockerfile << 'EOF'
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
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

RUN chown nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "server.js"]
EOF

        # package.json para Next.js
        cat > package.json << EOF
{
  "name": "${PROJECT_NAME}",
  "version": "1.0.0",
  "description": "${PROJECT_DESC}",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

        # next.config.js
        cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

module.exports = nextConfig
EOF
        ;;

    "node"|"express")
        cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
EOF

        # package.json para Node.js
        cat > package.json << EOF
{
  "name": "${PROJECT_NAME}",
  "version": "1.0.0",
  "description": "${PROJECT_DESC}",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  }
}
EOF

        # Archivo principal para Express
        cat > src/index.js << EOF
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || ${PROJECT_PORT};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a ${PROJECT_NAME}',
    description: '${PROJECT_DESC}',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 ${PROJECT_NAME} ejecutándose en puerto \${PORT}\`);
});
EOF
        ;;

    "react")
        cat > Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

        # nginx.conf para React
        cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files \$uri \$uri/ /index.html;
        }

        location /api {
            # Proxy a API si es necesario
            # proxy_pass http://api-backend;
        }
    }
}
EOF

        # package.json para React
        cat > package.json << EOF
{
  "name": "${PROJECT_NAME}",
  "version": "1.0.0",
  "description": "${PROJECT_DESC}",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-scripts": "^5.0.0"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF
        ;;

    *)
        warn "Tipo de proyecto '$PROJECT_TYPE' no reconocido. Usando template básico de Node.js"
        # Usar template de Node.js por defecto
        ;;
esac

# 4. Crear .env de ejemplo
log "⚙️ Creando archivo de configuración..."
cat > .env.example << EOF
# ${PROJECT_NAME} - Variables de entorno

NODE_ENV=production
PORT=${PROJECT_PORT}
APP_NAME="${PROJECT_NAME}"
APP_VERSION="1.0.0"

# Database (si es necesario)
# DATABASE_URL=postgresql://user:password@localhost:5432/${PROJECT_NAME}

# API Keys (si es necesario)
# API_KEY=tu-api-key-aqui

# Otros
DEBUG=false
EOF

# 5. Crear script de gestión del proyecto
log "🛠️ Creando script de gestión..."
cat > manage.sh << EOF
#!/bin/bash

case "\$1" in
    "start")
        echo "🚀 Iniciando ${PROJECT_NAME}..."
        docker-compose up -d
        ;;
    "stop")
        echo "⏹️ Deteniendo ${PROJECT_NAME}..."
        docker-compose down
        ;;
    "restart")
        \$0 stop
        sleep 3
        \$0 start
        ;;
    "build")
        echo "🏗️ Construyendo imagen..."
        docker-compose build --no-cache
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "shell")
        docker exec -it ${PROJECT_NAME}-app sh
        ;;
    "backup")
        echo "📦 Creando backup..."
        tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz . --exclude=node_modules --exclude=.git
        echo "✅ Backup creado"
        ;;
    "update")
        echo "🔄 Actualizando desde Git..."
        git pull
        \$0 build
        \$0 restart
        ;;
    *)
        echo "Uso: \$0 {start|stop|restart|build|logs|status|shell|backup|update}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar el proyecto"
        echo "  stop    - Detener el proyecto"
        echo "  restart - Reiniciar el proyecto"
        echo "  build   - Construir imagen Docker"
        echo "  logs    - Ver logs en tiempo real"
        echo "  status  - Ver estado de contenedores"
        echo "  shell   - Acceder al contenedor"
        echo "  backup  - Crear backup del proyecto"
        echo "  update  - Actualizar desde Git y reiniciar"
        ;;
esac
EOF

chmod +x manage.sh

# 6. Crear README del proyecto
log "📝 Creando documentación..."
cat > README.md << EOF
# ${PROJECT_NAME}

${PROJECT_DESC}

## 🚀 Inicio Rápido

\`\`\`bash
# Construir e iniciar
./manage.sh build
./manage.sh start

# Ver logs
./manage.sh logs

# Detener
./manage.sh stop
\`\`\`

## 📁 Estructura del Proyecto

\`\`\`
${PROJECT_NAME}/
├── src/                # Código fuente
├── public/             # Archivos estáticos
├── docs/               # Documentación
├── scripts/            # Scripts de utilidad
├── docker-compose.yml  # Configuración Docker
├── Dockerfile          # Imagen Docker
├── manage.sh          # Script de gestión
└── README.md          # Este archivo
\`\`\`

## 🌐 Acceso

- **URL Local**: http://${PROJECT_NAME}.local
- **Puerto Directo**: http://localhost:${PROJECT_PORT}

## 🔧 Configuración

1. Copia \`.env.example\` a \`.env\`
2. Modifica las variables según tus necesidades
3. Ejecuta \`./manage.sh build\`

## 📊 Monitoreo

El proyecto está integrado con el sistema de monitoreo de la Raspberry Pi:
- Logs centralizados
- Métricas en Grafana
- Health checks automáticos

## 🛠️ Comandos Útiles

\`\`\`bash
./manage.sh status    # Estado de contenedores
./manage.sh logs      # Ver logs
./manage.sh shell     # Acceder al contenedor
./manage.sh backup    # Crear backup
./manage.sh update    # Actualizar desde Git
\`\`\`

## 🐳 Docker

\`\`\`bash
# Construir imagen
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
\`\`\`

## 📋 TODO

- [ ] Configurar base de datos si es necesario
- [ ] Añadir tests unitarios
- [ ] Configurar CI/CD
- [ ] Añadir SSL/TLS
- [ ] Configurar backup automático

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT
EOF

# 7. Crear .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
.next/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
logs/

# Databases
*.db
*.sqlite

# Uploads
uploads/

# Backups
backup-*
*.backup

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
.dockerignore
EOF

# 8. Crear dockerignore
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.next
Dockerfile
docker-compose.yml
backup-*
EOF

# 9. Crear script de instalación del proyecto
log "📋 Creando script de instalación..."
cat > scripts/install-to-rpi.sh << 'EOF'
#!/bin/bash
# Script para instalar este proyecto en Raspberry Pi

RPI_USER="pi"
RPI_HOST=""
PROJECT_NAME="$(basename $(pwd))"

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
RPI_PATH="/opt/docker-projects/projects/$PROJECT_NAME"

echo "📤 Transfiriendo proyecto a $RPI_TARGET:$RPI_PATH"

# Crear directorio
ssh "$RPI_TARGET" "sudo mkdir -p '$RPI_PATH' && sudo chown -R $RPI_USER:$RPI_USER '$RPI_PATH'"

# Transferir archivos
rsync -avz --exclude-from=.gitignore --progress ./ "$RPI_TARGET:$RPI_PATH/"

# Construir e iniciar
ssh "$RPI_TARGET" "
    cd '$RPI_PATH'
    ./manage.sh build
    ./manage.sh start
"

echo "✅ Proyecto instalado en http://$PROJECT_NAME.local"
EOF

chmod +x scripts/install-to-rpi.sh

# 10. Mostrar resumen
echo ""
echo "🎉 ¡TEMPLATE CREADO EXITOSAMENTE!"
echo "================================="
echo ""
echo "📁 Ubicación: $PROJECT_DIR"
echo "📝 Proyecto: $PROJECT_NAME"
echo "🔧 Tipo: $PROJECT_TYPE"
echo "🌐 Puerto: $PROJECT_PORT"
echo "📖 Descripción: $PROJECT_DESC"
echo ""
echo "📋 Archivos creados:"
echo "   ├── docker-compose.yml    (Configuración Docker)"
echo "   ├── Dockerfile            (Imagen Docker)"
echo "   ├── package.json          (Dependencias)"
echo "   ├── manage.sh             (Script de gestión)"
echo "   ├── README.md             (Documentación)"
echo "   ├── .env.example          (Variables de entorno)"
echo "   ├── .gitignore            (Archivos ignorados)"
echo "   └── scripts/install-to-rpi.sh  (Instalador para RPI)"
echo ""
echo "🚀 Próximos pasos:"
echo "1. cd $PROJECT_DIR"
echo "2. Personaliza el código en src/"
echo "3. Modifica .env.example según tus necesidades"
echo "4. ./scripts/install-to-rpi.sh <IP_RPI>"
echo ""
echo "🌐 Una vez instalado, estará disponible en:"
echo "   http://${PROJECT_NAME}.local"
echo ""

info "Copia el contenido de $PROJECT_DIR a tu repositorio de proyecto"