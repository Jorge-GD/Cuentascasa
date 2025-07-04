#!/bin/bash

case "$1" in
    "start")
        echo "🚀 Iniciando servicios principales..."
        cd /opt/docker-projects/proxy && docker-compose up -d
        cd /opt/docker-projects/monitoring && docker-compose up -d
        cd /opt/docker-projects/projects/gastos-casa && docker-compose -f docker-compose.rpi.yml --env-file .env.rpi up -d
        echo "✅ Servicios iniciados"
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
    "backup")
        echo "💾 Ejecutando backup..."
        cd /opt/docker-projects/projects/gastos-casa && ./manage.sh backup
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs|backup}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar todos los servicios"
        echo "  stop    - Detener todos los servicios"
        echo "  restart - Reiniciar todos los servicios"
        echo "  status  - Ver estado del sistema"
        echo "  logs    - Ver logs recientes"
        echo "  backup  - Ejecutar backup manual"
        ;;
esac