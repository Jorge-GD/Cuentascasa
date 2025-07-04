# 🍓 INSTRUCCIONES RÁPIDAS - Raspberry Pi Setup

## 🎯 ¿Qué es esto?

Esta carpeta contiene **todo lo necesario** para convertir tu Raspberry Pi en un servidor Docker profesional que ejecute tu aplicación Gastos Casa y futuros proyectos.

## 🚀 Instalación en 3 Pasos

### **PASO 1: Transferir a Raspberry Pi**
```bash
# Desde tu PC, ejecuta:
./transfer-to-rpi.sh 192.168.1.XXX
```
*(Cambia 192.168.1.XXX por la IP de tu Raspberry Pi)*

### **PASO 2: Instalar en Raspberry Pi**
```bash
# El script te preguntará si quieres instalar automáticamente
# O puedes hacerlo manualmente:
ssh pi@192.168.1.XXX
cd /home/pi/raspberry-pi-setup
./install.sh
```

### **PASO 3: Reiniciar y Disfrutar**
```bash
# En la Raspberry Pi:
sudo reboot

# Después del reinicio, verificar:
rpi status
```

## 🌐 URLs de Acceso

Una vez instalado:
- **Gastos Casa**: http://gastos-casa.local
- **Panel de Control**: http://192.168.1.XXX:8080
- **Monitoreo**: http://monitor.local

## ⚙️ Comandos Útiles

```bash
rpi start     # Iniciar servicios
rpi stop      # Detener servicios
rpi status    # Ver estado
rpi backup    # Backup manual
```

## 📁 ¿Qué Incluye?

✅ **Instalación automática** de Docker optimizado para ARM  
✅ **Reverse proxy** con Traefik para múltiples proyectos  
✅ **Monitoreo** con Grafana  
✅ **Sistema de backup** automático  
✅ **DNS local** para acceso por nombres  
✅ **Arranque automático** al encender la RPI  
✅ **Scripts de gestión** fáciles de usar  
✅ **Optimizaciones** específicas para Raspberry Pi  

## 🆘 ¿Problemas?

1. **No se conecta por SSH**: Verifica que SSH esté habilitado en la RPI
2. **IP incorrecta**: Usa `nmap -sn 192.168.1.0/24` para encontrar la RPI
3. **Errores de instalación**: Revisa que la RPI tenga internet
4. **No funciona la app**: Ejecuta `./scripts/verify-rpi-setup.sh`

## 📞 Soporte Completo

Para documentación detallada: `RASPBERRY-PI-SETUP.md` (150+ páginas)

---

**¡En 10 minutos tendrás tu Raspberry Pi funcionando como un servidor profesional!** 🍓🐳