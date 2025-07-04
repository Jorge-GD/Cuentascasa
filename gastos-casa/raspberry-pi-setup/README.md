# 🍓 Raspberry Pi Setup - Gastos Casa

Este directorio contiene todo lo necesario para configurar tu Raspberry Pi como servidor Docker multi-proyecto.

## 📋 Contenido

```
raspberry-pi-setup/
├── README.md                           # Este archivo
├── RASPBERRY-PI-SETUP.md              # Documentación completa
├── install.sh                         # Script de instalación principal
├── project-files/                     # Archivos del proyecto gastos-casa
├── scripts/                           # Scripts de automatización
│   ├── setup-raspberry-pi.sh         # Setup automático de la RPI
│   ├── deploy-to-rpi.sh              # Deploy del proyecto
│   ├── verify-rpi-setup.sh           # Verificación del sistema
│   └── create-new-project-template.sh # Template para nuevos proyectos
└── config/                           # Configuraciones pre-creadas
    ├── docker-compose.rpi.yml        # Docker compose para RPI
    ├── Dockerfile.rpi                # Dockerfile optimizado ARM
    ├── traefik/                      # Configuración Traefik
    ├── monitoring/                   # Stack de monitoreo
    └── systemd/                      # Servicios del sistema
```

## 🚀 Instalación Rápida

### 1. Transferir a Raspberry Pi
```bash
# Desde tu PC, copiar toda la carpeta a la RPI
scp -r raspberry-pi-setup/ pi@TU_RPI_IP:/home/pi/

# O usar rsync (más eficiente)
rsync -avz raspberry-pi-setup/ pi@TU_RPI_IP:/home/pi/raspberry-pi-setup/
```

### 2. Ejecutar en Raspberry Pi
```bash
# Conectar por SSH
ssh pi@TU_RPI_IP

# Ir al directorio
cd /home/pi/raspberry-pi-setup

# Ejecutar instalación completa
chmod +x install.sh
./install.sh
```

### 3. Verificar Instalación
```bash
# Verificar que todo funciona
./scripts/verify-rpi-setup.sh
```

## 🌐 Acceso a Servicios

Una vez instalado, podrás acceder a:

- **Gastos Casa**: http://gastos-casa.local
- **Traefik Dashboard**: http://TU_RPI_IP:8080
- **Grafana Monitoring**: http://monitor.local

## ⚙️ Comandos Útiles

```bash
# Estado del sistema
rpi status

# Iniciar servicios
rpi start

# Detener servicios
rpi stop

# Ver logs
rpi logs

# Backup manual
rpi backup
```

## 📞 Soporte

Si encuentras problemas:
1. Revisa `RASPBERRY-PI-SETUP.md` para documentación completa
2. Ejecuta `./scripts/verify-rpi-setup.sh` para diagnóstico
3. Revisa logs en `/opt/docker-projects/shared/logs/`