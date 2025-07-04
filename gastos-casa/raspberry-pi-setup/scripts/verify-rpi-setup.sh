#!/bin/bash
# ============= verify-rpi-setup.sh =============
# Script de verificación post-instalación Raspberry Pi

set -e

# Configuración
RPI_USER="pi"
RPI_HOST=""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Iconos
CHECK="✅"
CROSS="❌"
WARNING="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}$WARNING $1${NC}"
}

error() {
    echo -e "${RED}$CROSS $1${NC}"
}

info() {
    echo -e "${BLUE}$INFO $1${NC}"
}

success() {
    echo -e "${GREEN}$CHECK $1${NC}"
}

section() {
    echo -e "\n${CYAN}🔍 $1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Variables de verificación
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check() {
    local description="$1"
    local command="$2"
    local expected_result="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    printf "%-50s" "$description"
    
    if eval "$command" >/dev/null 2>&1; then
        if [ -n "$expected_result" ]; then
            result=$(eval "$command" 2>/dev/null)
            if [[ "$result" == *"$expected_result"* ]]; then
                echo -e "${GREEN}$CHECK${NC}"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                echo -e "${RED}$CROSS${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
        else
            echo -e "${GREEN}$CHECK${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        echo -e "${RED}$CROSS${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

remote_check() {
    local description="$1"
    local command="$2"
    local expected_result="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    printf "%-50s" "$description"
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$RPI_TARGET" "$command" >/dev/null 2>&1; then
        if [ -n "$expected_result" ]; then
            result=$(ssh "$RPI_TARGET" "$command" 2>/dev/null)
            if [[ "$result" == *"$expected_result"* ]]; then
                echo -e "${GREEN}$CHECK${NC}"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                echo -e "${RED}$CROSS${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
        else
            echo -e "${GREEN}$CHECK${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        echo -e "${RED}$CROSS${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Función para obtener información del sistema
get_system_info() {
    echo -e "\n${CYAN}📊 INFORMACIÓN DEL SISTEMA${NC}"
    echo "=============================="
    
    if [ -n "$RPI_TARGET" ]; then
        info "Obteniendo información de $RPI_TARGET..."
        
        echo -e "\n🖥️  Hardware:"
        ssh "$RPI_TARGET" "cat /proc/device-tree/model 2>/dev/null || echo 'Modelo no disponible'"
        
        echo -e "\n💻 Sistema:"
        ssh "$RPI_TARGET" "uname -a"
        
        echo -e "\n🧠 Memoria:"
        ssh "$RPI_TARGET" "free -h"
        
        echo -e "\n💾 Almacenamiento:"
        ssh "$RPI_TARGET" "df -h | head -5"
        
        echo -e "\n🌡️  Temperatura:"
        ssh "$RPI_TARGET" "vcgencmd measure_temp 2>/dev/null || echo 'No disponible'"
        
        echo -e "\n📍 Red:"
        ssh "$RPI_TARGET" "hostname -I"
        
    else
        info "Verificación local..."
        
        echo -e "\n🖥️  Hardware:"
        cat /proc/device-tree/model 2>/dev/null || echo 'Modelo no disponible'
        
        echo -e "\n💻 Sistema:"
        uname -a
        
        echo -e "\n🧠 Memoria:"
        free -h
        
        echo -e "\n💾 Almacenamiento:"
        df -h | head -5
        
        echo -e "\n🌡️  Temperatura:"
        vcgencmd measure_temp 2>/dev/null || echo 'No disponible'
        
        echo -e "\n📍 Red:"
        hostname -I
    fi
}

# Función principal de verificación
run_verification() {
    section "VERIFICACIÓN DEL SISTEMA BASE"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Conectividad SSH" "echo 'SSH OK'"
        remote_check "Usuario pi existe" "id pi"
        remote_check "Raspberry Pi detectada" "grep 'Raspberry Pi' /proc/cpuinfo"
        remote_check "Sistema actualizado (menos de 30 días)" "find /var/log -name 'apt' -mtime -30"
    else
        check "Usuario pi existe" "id pi"
        check "Raspberry Pi detectada" "grep 'Raspberry Pi' /proc/cpuinfo"
        check "Sistema actualizado" "find /var/log -name 'apt' -mtime -30"
    fi
    
    section "VERIFICACIÓN DE DOCKER"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Docker instalado" "docker --version"
        remote_check "Docker funcionando" "docker ps"
        remote_check "Docker Compose instalado" "docker-compose --version"
        remote_check "Usuario en grupo docker" "groups pi | grep docker"
        remote_check "Docker daemon configurado" "test -f /etc/docker/daemon.json"
    else
        check "Docker instalado" "docker --version"
        check "Docker funcionando" "docker ps"
        check "Docker Compose instalado" "docker-compose --version"
        check "Usuario en grupo docker" "groups $USER | grep docker"
        check "Docker daemon configurado" "test -f /etc/docker/daemon.json"
    fi
    
    section "VERIFICACIÓN DE ESTRUCTURA DE PROYECTOS"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Directorio /opt/docker-projects" "test -d /opt/docker-projects"
        remote_check "Directorio proxy" "test -d /opt/docker-projects/proxy"
        remote_check "Directorio monitoring" "test -d /opt/docker-projects/monitoring"
        remote_check "Directorio projects" "test -d /opt/docker-projects/projects"
        remote_check "Directorio shared" "test -d /opt/docker-projects/shared"
        remote_check "Script de gestión existe" "test -f /opt/docker-projects/manage-rpi.sh"
        remote_check "Script es ejecutable" "test -x /opt/docker-projects/manage-rpi.sh"
    else
        check "Directorio /opt/docker-projects" "test -d /opt/docker-projects"
        check "Directorio proxy" "test -d /opt/docker-projects/proxy"
        check "Directorio monitoring" "test -d /opt/docker-projects/monitoring"
        check "Directorio projects" "test -d /opt/docker-projects/projects"
        check "Directorio shared" "test -d /opt/docker-projects/shared"
        check "Script de gestión existe" "test -f /opt/docker-projects/manage-rpi.sh"
        check "Script es ejecutable" "test -x /opt/docker-projects/manage-rpi.sh"
    fi
    
    section "VERIFICACIÓN DE REDES DOCKER"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Red proxy-network" "docker network ls | grep proxy-network"
        remote_check "Red monitoring-network" "docker network ls | grep monitoring-network"
        remote_check "Red projects-network" "docker network ls | grep projects-network"
    else
        check "Red proxy-network" "docker network ls | grep proxy-network"
        check "Red monitoring-network" "docker network ls | grep monitoring-network"
        check "Red projects-network" "docker network ls | grep projects-network"
    fi
    
    section "VERIFICACIÓN DE SERVICIOS CORE"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Traefik configurado" "test -f /opt/docker-projects/proxy/docker-compose.yml"
        remote_check "Traefik ejecutándose" "docker ps | grep traefik"
        remote_check "Grafana configurado" "test -f /opt/docker-projects/monitoring/docker-compose.yml"
        remote_check "Grafana ejecutándose" "docker ps | grep grafana"
    else
        check "Traefik configurado" "test -f /opt/docker-projects/proxy/docker-compose.yml"
        check "Traefik ejecutándose" "docker ps | grep traefik"
        check "Grafana configurado" "test -f /opt/docker-projects/monitoring/docker-compose.yml"
        check "Grafana ejecutándose" "docker ps | grep grafana"
    fi
    
    section "VERIFICACIÓN DE DNS Y RED"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "dnsmasq instalado" "which dnsmasq"
        remote_check "dnsmasq funcionando" "systemctl is-active dnsmasq"
        remote_check "Configuración DNS local" "test -f /etc/dnsmasq.d/local-projects"
        remote_check "Firewall activo" "ufw status | grep 'Status: active'"
    else
        check "dnsmasq instalado" "which dnsmasq"
        check "dnsmasq funcionando" "systemctl is-active dnsmasq"
        check "Configuración DNS local" "test -f /etc/dnsmasq.d/local-projects"
        check "Firewall activo" "ufw status | grep 'Status: active'"
    fi
    
    section "VERIFICACIÓN DE CONECTIVIDAD WEB"
    
    RPI_IP=""
    if [ -n "$RPI_TARGET" ]; then
        RPI_IP=$(ssh "$RPI_TARGET" "hostname -I | cut -d' ' -f1")
    else
        RPI_IP=$(hostname -I | cut -d' ' -f1)
    fi
    
    check "Traefik dashboard accesible" "curl -f http://$RPI_IP:8080 --connect-timeout 5"
    check "Grafana accesible" "curl -f http://$RPI_IP:3000 --connect-timeout 5"
    
    section "VERIFICACIÓN DE PROYECTO GASTOS-CASA"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Proyecto gastos-casa existe" "test -d /opt/docker-projects/projects/gastos-casa"
        remote_check "Docker compose del proyecto" "test -f /opt/docker-projects/projects/gastos-casa/docker-compose.rpi.yml"
        remote_check "Variables de entorno" "test -f /opt/docker-projects/projects/gastos-casa/.env.rpi"
        remote_check "App gastos-casa ejecutándose" "docker ps | grep gastos-casa-app"
        remote_check "DB gastos-casa ejecutándose" "docker ps | grep gastos-casa-db"
    else
        check "Proyecto gastos-casa existe" "test -d /opt/docker-projects/projects/gastos-casa"
        check "Docker compose del proyecto" "test -f /opt/docker-projects/projects/gastos-casa/docker-compose.rpi.yml"
        check "Variables de entorno" "test -f /opt/docker-projects/projects/gastos-casa/.env.rpi"
        check "App gastos-casa ejecutándose" "docker ps | grep gastos-casa-app"
        check "DB gastos-casa ejecutándose" "docker ps | grep gastos-casa-db"
    fi
    
    # Verificar health endpoint si la app está ejecutándose
    if [ -n "$RPI_IP" ]; then
        check "Gastos-casa health check" "curl -f http://$RPI_IP:3000/api/health --connect-timeout 5"
    fi
    
    section "VERIFICACIÓN DE SERVICIOS DEL SISTEMA"
    
    if [ -n "$RPI_TARGET" ]; then
        remote_check "Servicio docker-projects activo" "systemctl is-enabled docker-projects"
        remote_check "Docker habilitado al boot" "systemctl is-enabled docker"
        remote_check "Crontab de backup configurado" "crontab -l | grep backup"
    else
        check "Servicio docker-projects activo" "systemctl is-enabled docker-projects"
        check "Docker habilitado al boot" "systemctl is-enabled docker"
        check "Crontab de backup configurado" "crontab -l | grep backup"
    fi
}

# Función para mostrar recomendaciones
show_recommendations() {
    echo -e "\n${CYAN}💡 RECOMENDACIONES${NC}"
    echo "=================="
    
    if [ $FAILED_CHECKS -gt 0 ]; then
        warn "Se encontraron $FAILED_CHECKS problemas que deberían solucionarse:"
        echo ""
        
        if [ -n "$RPI_TARGET" ]; then
            echo "🔧 Para solucionar problemas comunes:"
            echo "   • Reinstalar Docker: ssh $RPI_TARGET 'curl -fsSL https://get.docker.com | sh'"
            echo "   • Reiniciar servicios: ssh $RPI_TARGET '/opt/docker-projects/manage-rpi.sh restart'"
            echo "   • Ver logs: ssh $RPI_TARGET 'docker-compose -f /opt/docker-projects/proxy/docker-compose.yml logs'"
        else
            echo "🔧 Para solucionar problemas comunes:"
            echo "   • Reiniciar servicios: /opt/docker-projects/manage-rpi.sh restart"
            echo "   • Ver logs: docker-compose -f /opt/docker-projects/proxy/docker-compose.yml logs"
            echo "   • Verificar permisos: sudo chown -R $USER:$USER /opt/docker-projects"
        fi
        echo ""
    fi
    
    if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
        success "¡Todos los checks pasaron! El sistema está funcionando perfectamente."
        echo ""
        echo "🌐 URLs de acceso:"
        echo "   • Traefik Dashboard: http://$RPI_IP:8080"
        echo "   • Grafana Monitor: http://monitor.local (admin/admin)"
        echo "   • Gastos Casa: http://gastos-casa.local"
        echo ""
        echo "🔧 Comandos útiles:"
        if [ -n "$RPI_TARGET" ]; then
            echo "   • Estado: ssh $RPI_TARGET '/opt/docker-projects/manage-rpi.sh status'"
            echo "   • Logs: ssh $RPI_TARGET '/opt/docker-projects/manage-rpi.sh logs'"
            echo "   • Reiniciar: ssh $RPI_TARGET '/opt/docker-projects/manage-rpi.sh restart'"
        else
            echo "   • Estado: rpi status"
            echo "   • Logs: rpi logs"
            echo "   • Reiniciar: rpi restart"
        fi
    fi
    
    echo ""
    echo "📱 Configuración de dispositivos cliente:"
    echo "   Añade a /etc/hosts de tus dispositivos:"
    echo "   $RPI_IP traefik.local monitor.local gastos-casa.local"
}

# Función principal
main() {
    echo -e "${CYAN}"
    echo "🍓 VERIFICACIÓN RASPBERRY PI DOCKER SERVER"
    echo "==========================================="
    echo -e "${NC}"
    
    # Verificar parámetros
    if [ $# -ge 1 ]; then
        RPI_HOST="$1"
        if [ $# -ge 2 ]; then
            RPI_USER="$2"
        fi
        RPI_TARGET="$RPI_USER@$RPI_HOST"
        info "Verificando servidor remoto: $RPI_TARGET"
    else
        info "Verificando sistema local"
        # Verificar que estamos en Raspberry Pi
        if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
            warn "No se detectó Raspberry Pi. Continuando verificación..."
        fi
    fi
    
    # Obtener información del sistema
    get_system_info
    
    # Ejecutar verificaciones
    run_verification
    
    # Mostrar resumen
    echo -e "\n${CYAN}📋 RESUMEN DE VERIFICACIÓN${NC}"
    echo "=========================="
    echo "Total de checks: $TOTAL_CHECKS"
    success "Pasaron: $PASSED_CHECKS"
    if [ $FAILED_CHECKS -gt 0 ]; then
        error "Fallaron: $FAILED_CHECKS"
    fi
    
    # Calcular porcentaje
    percentage=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Porcentaje de éxito: $percentage%"
    
    # Mostrar recomendaciones
    show_recommendations
    
    # Código de salida
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}$ROCKET ¡Verificación completada exitosamente!${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}$WARNING Verificación completada con algunos problemas.${NC}"
        exit 1
    fi
}

# Mostrar ayuda
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "🍓 Script de Verificación Raspberry Pi Docker Server"
    echo ""
    echo "Uso:"
    echo "  $0                    # Verificación local"
    echo "  $0 <IP_RPI> [usuario] # Verificación remota"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Verificar sistema local"
    echo "  $0 192.168.1.100     # Verificar RPI remota (usuario: pi)"
    echo "  $0 192.168.1.100 pi  # Verificar RPI remota (usuario específico)"
    echo ""
    echo "El script verifica:"
    echo "  ✓ Sistema base y optimizaciones"
    echo "  ✓ Instalación y configuración Docker"
    echo "  ✓ Estructura de proyectos"
    echo "  ✓ Redes Docker"
    echo "  ✓ Servicios core (Traefik, Grafana)"
    echo "  ✓ DNS y configuración de red"
    echo "  ✓ Conectividad web"
    echo "  ✓ Proyecto Gastos Casa"
    echo "  ✓ Servicios del sistema"
    exit 0
fi

# Ejecutar verificación principal
main "$@"