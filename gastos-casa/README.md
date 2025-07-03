# Sistema de Control de Gastos Domésticos

Aplicación web para gestionar y analizar los gastos domésticos mediante la importación de extractos bancarios y categorización inteligente.

## Características Principales

- 📊 **Dashboard interactivo** con visualizaciones de gastos
- 💳 **Gestión de múltiples cuentas** (personales y compartidas)
- 📄 **Importación automática** de extractos bancarios (PDF/texto)
- 🏷️ **Categorización inteligente** con reglas personalizables
- 📈 **Análisis temporal** con vistas mensuales y anuales
- 🔍 **Búsqueda y filtros** avanzados de movimientos
- 💾 **Sistema de backup** y exportación de datos

## Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Git

## Instalación

1. **Clonar el repositorio**
```bash
git clone [URL_DEL_REPOSITORIO]
cd Cuentascasa/gastos-casa
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar la base de datos**
```bash
# Crear la base de datos SQLite y ejecutar migraciones
npx prisma migrate dev

# (Opcional) Cargar datos de ejemplo
npm run db:seed
```

4. **Configurar variables de entorno**
```bash
# Crear archivo .env.local
cp .env.example .env.local
```

## Uso

### Iniciar en modo desarrollo
```bash
npm run dev
```
La aplicación estará disponible en http://localhost:3000

### Iniciar en modo producción
```bash
npm run build
npm run start
```

## Primeros Pasos

### 1. Crear una cuenta
- Navegar a `/cuentas/nueva`
- Crear cuentas para cada persona (ej: "Gastos Jorge", "Gastos Violeta")
- Crear una cuenta compartida si es necesario (ej: "Gastos Casa")

### 2. Importar extracto bancario
- Ir a `/importar`
- Subir archivo PDF del banco o pegar el texto copiado
- Revisar la categorización automática sugerida
- Ajustar categorías si es necesario
- Confirmar la importación

### 3. Configurar categorías y reglas
- Acceder a `/configuracion/categorias` para personalizar categorías
- Crear reglas de categorización en `/configuracion/reglas`
- Las reglas se aplicarán automáticamente en futuras importaciones

### 4. Explorar el dashboard
- El dashboard principal muestra un resumen de gastos
- Filtrar por cuenta o período de tiempo
- Ver gráficos de distribución por categorías
- Analizar tendencias de gasto

## Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción

# Base de datos
npm run db:push      # Sincronizar esquema sin migraciones
npm run db:migrate   # Ejecutar migraciones
npm run db:seed      # Cargar datos de ejemplo
npm run db:reset     # Resetear base de datos
npm run db:studio    # Abrir Prisma Studio (GUI)

# Testing
npm run test         # Ejecutar todos los tests
npm run test:unit    # Solo tests unitarios
npm run test:integration # Solo tests de integración

# Calidad de código
npm run lint         # Ejecutar linter
npm run type-check   # Verificar tipos TypeScript
```

## Estructura del Proyecto

```
gastos-casa/
├── app/               # Páginas y rutas (App Router)
├── components/        # Componentes reutilizables
├── lib/              # Lógica de negocio y utilidades
│   ├── db/           # Queries y utilidades de BD
│   ├── parsers/      # Parsers de extractos bancarios
│   ├── analytics/    # Cálculos y métricas
│   └── utils/        # Utilidades generales
├── prisma/           # Esquema y migraciones
└── public/           # Archivos estáticos
```

## Funcionalidades por Implementar

- ⏳ Sistema completo de importación con preview (Fase 5)
- ⏳ Gestión avanzada de movimientos (Fase 6)
- ⏳ Editor de reglas de categorización (Fase 7)
- ⏳ Dashboard con visualizaciones completas (Fase 8)
- ⏳ Vistas temporales detalladas (Fase 9)
- ⏳ Sistema de backup automático (Fase 10)
- ⏳ Predicciones y alertas inteligentes (Fase 11)

## Solución de Problemas

### La base de datos no se crea
```bash
# Forzar la creación
npx prisma db push --force-reset
```

### Error al importar PDF
- Verificar que el archivo sea un PDF válido del banco ING
- Comprobar que el formato no haya cambiado

### Los gráficos no se muestran
- Limpiar caché del navegador
- Verificar que hay datos en la base de datos

## Licencia

Este proyecto es de uso privado.