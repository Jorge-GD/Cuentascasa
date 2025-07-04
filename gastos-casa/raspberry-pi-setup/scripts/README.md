# 🔧 Scripts de Migración y Mantenimiento

## 📋 Scripts Disponibles

### 🚀 `migrate-to-docker.sh`
**Migración principal a Docker**
```bash
./scripts/migrate-to-docker.sh
```
- Backup automático de datos actuales
- Configuración de variables de entorno
- Construcción de imágenes Docker
- Migración de base de datos
- Verificación de servicios

### 🌐 `setup-network.sh`
**Configuración de red local**
```bash
./scripts/setup-network.sh
```
- Detección automática de IP local
- Configuración de firewall
- Actualización de variables de entorno
- Reinicio de servicios

### 📦 `backup-schedule.sh`
**Backup automático**
```bash
./scripts/backup-schedule.sh
```
- Backup de PostgreSQL
- Backup de archivos subidos
- Backup de configuración
- Compresión y limpieza automática

### 🔄 `restore-backup.sh`
**Restauración desde backup**
```bash
./scripts/restore-backup.sh /path/to/backup.tar.gz
```
- Restauración completa del sistema
- Verificación de integridad
- Backup de seguridad previo

## 📅 Configuración de Backup Automático

Para programar backups automáticos:

```bash
# Editar crontab
crontab -e

# Añadir backup diario a las 2 AM
0 2 * * * /ruta/completa/gastos-casa/scripts/backup-schedule.sh >> /var/log/gastos-backup.log 2>&1
```

## 🔍 Verificación y Monitoreo

### Verificar estado de servicios:
```bash
docker-compose --env-file .env.production ps
```

### Ver logs en tiempo real:
```bash
docker-compose --env-file .env.production logs -f app
```

### Verificar salud de la aplicación:
```bash
curl http://TU_IP:3000/api/health
```

## 🆘 Solución de Problemas

### Script no ejecutable:
```bash
chmod +x scripts/*.sh
```

### Error de permisos en Docker:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### PostgreSQL no inicia:
```bash
docker-compose --env-file .env.production logs postgres
sudo chown -R 999:999 postgres_data/
```

### Aplicación no accesible desde red:
```bash
sudo ufw allow 3000/tcp
./scripts/setup-network.sh
```