#!/bin/bash
# Script para inicializar Redis de forma sencilla

echo "🍓 INICIANDO REDIS PARA GASTOS CASA"
echo "=================================="

# Opción 1: Docker (recomendado)
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Iniciando Redis con Docker..."
    
    # Verificar si ya existe el contenedor
    if docker ps -a --format 'table {{.Names}}' | grep -q 'gastos-casa-redis'; then
        echo "📄 Contenedor Redis existe, iniciando..."
        docker start gastos-casa-redis
    else
        echo "🆕 Creando nuevo contenedor Redis..."
        docker run -d \
            --name gastos-casa-redis \
            --restart unless-stopped \
            -p 6379:6379 \
            -v gastos-casa-redis-data:/data \
            redis:7-alpine \
            redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    fi
    
    echo "✅ Redis ejecutándose en puerto 6379"
    echo "🔍 Verificando conexión..."
    
    # Esperar un poco para que inicie
    sleep 3
    
    if docker exec gastos-casa-redis redis-cli ping | grep -q PONG; then
        echo "✅ Redis responde correctamente!"
    else
        echo "❌ Redis no responde"
        exit 1
    fi

# Opción 2: Redis local
elif command -v redis-server >/dev/null 2>&1; then
    echo "💻 Iniciando Redis local..."
    
    # Verificar si ya está ejecutándose
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis ya está ejecutándose"
    else
        echo "🚀 Iniciando servidor Redis..."
        redis-server --daemonize yes --maxmemory 256mb --maxmemory-policy allkeys-lru
        
        sleep 2
        
        if redis-cli ping | grep -q PONG; then
            echo "✅ Redis iniciado correctamente!"
        else
            echo "❌ Error iniciando Redis"
            exit 1
        fi
    fi

# Opción 3: Instrucciones para instalar
else
    echo "❌ Redis no está instalado"
    echo ""
    echo "📋 OPCIONES PARA INSTALAR REDIS:"
    echo ""
    echo "🐳 Opción 1 - Docker (Recomendado):"
    echo "   sudo apt install docker.io"
    echo "   sudo systemctl start docker"
    echo "   sudo usermod -aG docker \$USER"
    echo "   # Reiniciar sesión y ejecutar de nuevo"
    echo ""
    echo "💻 Opción 2 - Redis nativo:"
    echo "   sudo apt update"
    echo "   sudo apt install redis-server"
    echo "   sudo systemctl start redis"
    echo ""
    exit 1
fi

echo ""
echo "🎯 Redis listo para Gastos Casa!"
echo "📊 Puedes probar la API en: http://localhost:3000/api/redis/test"
echo ""
echo "🔧 Comandos útiles:"
echo "   redis-cli ping                    # Verificar conexión"
echo "   redis-cli keys 'gastos-casa:*'   # Ver keys del cache"
echo "   redis-cli flushdb                # Limpiar cache"