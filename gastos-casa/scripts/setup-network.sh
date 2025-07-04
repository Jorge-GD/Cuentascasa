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

# Configurar firewall (si está disponible)
if command -v ufw >/dev/null 2>&1; then
    echo "🔥 Configurando firewall UFW..."
    sudo ufw allow 3000/tcp comment "Gastos Casa App"
    sudo ufw allow 8080/tcp comment "Gastos Casa Admin"
    echo "✅ Reglas de firewall UFW añadidas"
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "🔥 Configurando firewall FirewallD..."
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=8080/tcp
    sudo firewall-cmd --reload
    echo "✅ Reglas de firewall FirewallD añadidas"
else
    echo "⚠️  No se detectó firewall UFW o FirewallD. Configura manualmente:"
    echo "   - Puerto 3000/tcp para la aplicación"
    echo "   - Puerto 8080/tcp para Adminer"
fi

# Reiniciar contenedores con nueva configuración
echo "🔄 Reiniciando contenedores..."
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
echo ""
echo "🔧 Para verificar conectividad:"
echo "   ping $LOCAL_IP"
echo "   curl http://$LOCAL_IP:3000/api/health"