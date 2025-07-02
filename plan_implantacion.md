Planning: Sistema de Control de Gastos Domésticos
1. Arquitectura General
Stack Tecnológico:

Frontend: Next.js 14+ con TypeScript
Base de datos: SQLite (local)
ORM: Prisma
UI Components: shadcn/ui + Tailwind CSS
Gráficos: Recharts o Chart.js
Parsing PDF: pdf-parse o pdfjs-dist
Estado: Zustand o Context API
Validación: Zod

Estructura del Proyecto:
gastos-casa/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── components/
│   ├── cuentas/
│   │   ├── [cuentaId]/
│   │   │   ├── page.tsx
│   │   │   ├── anual/
│   │   │   └── mensual/
│   │   └── nueva/
│   ├── importar/
│   ├── configuracion/
│   │   ├── categorias/
│   │   ├── reglas/
│   │   └── backup/
│   └── api/
│       ├── gastos/
│       ├── importar/
│       └── backup/
├── components/
├── lib/
│   ├── db/
│   ├── parsers/
│   └── utils/
└── prisma/
    └── schema.prisma
2. Modelo de Datos (SQLite + Prisma)
prismamodel Cuenta {
  id          String   @id @default(cuid())
  nombre      String   // "Gastos Jorge", "Gastos Violeta", "Gastos Casa"
  tipo        String   // "personal" | "compartida"
  color       String   // Para identificación visual
  createdAt   DateTime @default(now())
  
  movimientos Movimiento[]
  reglas      ReglaCategorizacion[]
}

model Movimiento {
  id            String   @id @default(cuid())
  fecha         DateTime
  descripcion   String
  importe       Float
  saldo         Float?
  
  // Categorías originales de ING
  categoriaING     String?
  subcategoriaING  String?
  
  // Categorías personalizadas
  categoria        String
  subcategoria     String?
  
  // Metadata
  esManual         Boolean @default(false)
  fechaImportacion DateTime @default(now())
  
  cuenta           Cuenta @relation(fields: [cuentaId], references: [id])
  cuentaId         String
  
  etiquetas        Etiqueta[]
  
  @@index([fecha, cuentaId])
  @@index([categoria])
}

model Categoria {
  id           String   @id @default(cuid())
  nombre       String   @unique
  color        String
  icono        String?
  presupuesto  Float?   // Presupuesto mensual
  
  subcategorias Subcategoria[]
}

model Subcategoria {
  id           String   @id @default(cuid())
  nombre       String
  categoriaId  String
  categoria    Categoria @relation(fields: [categoriaId], references: [id])
}

model ReglaCategorizacion {
  id              String   @id @default(cuid())
  nombre          String
  patron          String   // Regex o texto a buscar
  tipoCoincidencia String  // "contiene" | "empieza" | "termina" | "regex"
  categoria       String
  subcategoria    String?
  prioridad       Int      // Para resolver conflictos
  activa          Boolean  @default(true)
  
  cuenta          Cuenta?  @relation(fields: [cuentaId], references: [id])
  cuentaId        String?  // null = aplica a todas las cuentas
}

model Etiqueta {
  id          String   @id @default(cuid())
  nombre      String   @unique
  color       String
  
  movimientos Movimiento[]
}
3. Funcionalidades por Módulo
3.1 Importación de Datos

Parser automático para PDF de ING
Importación manual (copy/paste del texto)
Detección de duplicados por fecha+importe+descripción
Preview antes de importar con categorización automática
Mapeo de categorías ING → Personalizadas

3.2 Sistema de Categorización
typescript// Categorías predefinidas
const CATEGORIAS_BASE = {
  alimentacion: {
    nombre: "Alimentación",
    subcategorias: ["Supermercado", "Carnicería", "Frutería", "Otros"]
  },
  comprasOnline: {
    nombre: "Compras Online",
    subcategorias: ["Amazon", "Ropa", "Tecnología", "Otros"]
  },
  gastosFijos: {
    nombre: "Gastos Fijos",
    subcategorias: ["Alquiler", "Luz", "Agua", "Internet", "Comunidad"]
  },
  mascotas: {
    nombre: "Mascotas",
    subcategorias: ["Comida", "Veterinario", "Accesorios"]
  },
  salidas: {
    nombre: "Salidas",
    subcategorias: ["Restaurantes", "Cine", "Ocio"]
  },
  transporte: {
    nombre: "Transporte",
    subcategorias: ["Gasolina", "Transporte público", "Parking", "Uber/Taxi"]
  },
  cumpleanos: {
    nombre: "Cumpleaños y Regalos",
    subcategorias: ["Regalos", "Celebraciones"]
  }
}
3.3 Dashboard Principal

Vista general:

Gasto total del mes actual (todas las cuentas o filtrado)
Comparación con mes anterior
Proyección fin de mes


Gráficos:

Evolución mensual (línea temporal)
Distribución por categorías (donut chart)
Top 5 gastos del mes
Comparativa entre cuentas


Alertas:

Presupuestos excedidos
Gastos inusuales



3.4 Vistas de Cuenta

Vista Mensual:

Tabla de movimientos con filtros
Resumen por categoría
Comparación con meses anteriores
Gráfico de evolución diaria del saldo


Vista Anual:

Resumen por meses
Tendencias por categoría
Estadísticas anuales
Previsión basada en histórico



3.5 Configuración

Gestión de Reglas:

CRUD de reglas de categorización
Test de reglas con ejemplos
Importar/Exportar reglas


Categorías personalizadas:

Añadir/editar categorías
Asignar colores e iconos
Establecer presupuestos


Backup:

Exportar base de datos
Importar backup
Programar backups automáticos



4. Flujos de Usuario
Flujo 1: Primera vez

Crear cuenta (Jorge/Violeta/Casa)
Configurar categorías base
Importar primer extracto
Revisar categorización automática
Crear reglas para casos especiales

Flujo 2: Uso mensual

Descargar PDF del banco
Importar en la aplicación
Revisar categorizaciones sugeridas
Ajustar manualmente si es necesario
Ver dashboard actualizado

Flujo 3: Análisis

Seleccionar período a analizar
Filtrar por cuenta(s)
Ver comparativas y tendencias
Exportar reportes si es necesario

5. Características Técnicas Especiales
5.1 Parser Inteligente
typescriptinterface ParserResult {
  movimientos: MovimientoRaw[]
  formatoDetectado: 'ING_PDF' | 'ING_TEXT' | 'MANUAL'
  errores: string[]
}

// Detectar patrones como "Bizum enviado a NOMBRE comentario"
// y separar: tipo=Bizum, destinatario=NOMBRE, nota=comentario
5.2 Sistema de Reglas Flexibles
typescriptinterface ReglaEspecial {
  tipo: 'BIZUM' | 'TRANSFERENCIA' | 'COMERCIO'
  // Para Bizum: categorizar según destinatario + comentario
  // Para Comercios: categorización fija
}
5.3 Previsiones Inteligentes

Detectar gastos recurrentes
Calcular media de gastos por categoría
Proyectar gastos futuros
Alertar de anomalías





Common installation issues
​
Linux permission issues
When installing Claude Code with npm, you may encounter permission errors if your npm global prefix is not user writable (eg. /usr, or /usr/local).

​
Recommended solution: Create a user-writable npm prefix
The safest approach is to configure npm to use a directory within your home folder:



Tengo el siguiente error: 

Copy
# First, save a list of your existing global packages for later migration
npm list -g --depth=0 > ~/npm-global-packages.txt

# Create a directory for your global packages
mkdir -p ~/.npm-global

# Configure npm to use the new directory path
npm config set prefix ~/.npm-global

# Note: Replace ~/.bashrc with ~/.zshrc, ~/.profile, or other appropriate file for your shell
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Apply the new PATH setting
source ~/.bashrc

# Now reinstall Claude Code in the new location
npm install -g @anthropic-ai/claude-code

# Optional: Reinstall your previous global packages in the new location
# Look at ~/npm-global-packages.txt and install packages you want to keep
This solution is recommended because it:

Avoids modifying system directory permissions
Creates a clean, dedicated location for your global npm packages
Follows security best practices



Fases de Desarrollo Completas
FASE 0: Preparación del Entorno
Duración estimada: 1 día
Objetivos:

Configurar el entorno de desarrollo completo
Establecer la estructura base del proyecto
Configurar herramientas de desarrollo

Tareas:

Crear proyecto Next.js con TypeScript
bashnpx create-next-app@latest gastos-casa --typescript --tailwind --app
cd gastos-casa

Instalar dependencias principales
bashnpm install prisma @prisma/client sqlite3 @types/sqlite3
npm install -D @types/node

Configurar Prisma
bashnpx prisma init --datasource-provider sqlite

Configurar estructura de carpetas
mkdir -p app/{dashboard,cuentas,importar,configuracion,api}
mkdir -p components/{ui,dashboard,common}
mkdir -p lib/{db,parsers,utils,types}
mkdir -p __tests__/{unit,integration}

Configurar Git y .gitignore
bashgit init
echo "*.db" >> .gitignore
echo "*.db-journal" >> .gitignore
echo ".env.local" >> .gitignore

Configurar testing
bashnpm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom


Entregables:

Proyecto Next.js funcionando
Estructura de carpetas completa
Git inicializado

Tests:
bashnpm run dev # Debe mostrar página por defecto de Next.js
npm run build # Debe compilar sin errores
Commit:
bashgit add .
git commit -m "feat: setup inicial del proyecto con Next.js, TypeScript y Prisma"

FASE 1: Modelo de Datos y Base de Datos
Duración estimada: 2 días
Objetivos:

Implementar el esquema completo de base de datos
Crear migraciones iniciales
Implementar utilidades básicas de BD

Tareas:

Crear schema.prisma completo
prisma// Implementar todos los modelos definidos en el planning

Crear migración inicial
bashnpx prisma migrate dev --name init

Crear cliente de Prisma singleton
typescript// lib/db/prisma.ts

Crear seeds iniciales
typescript// prisma/seed.ts - Categorías base, cuenta de ejemplo

Implementar utilidades de BD
typescript// lib/db/queries.ts - Funciones CRUD básicas


Entregables:

Base de datos SQLite creada
Modelos Prisma funcionando
Seeds de datos iniciales

Tests:
typescript// __tests__/unit/db.test.ts
- Test de conexión a BD
- Test de CRUD básico
- Test de relaciones entre modelos
Verificación:
bashnpx prisma studio # Debe abrir el navegador con la BD
npm run test:unit # Todos los tests de BD deben pasar
Commit:
bashgit add .
git commit -m "feat: implementación completa del modelo de datos con Prisma"

FASE 2: Sistema de Parseo de Extractos
Duración estimada: 3 días
Objetivos:

Implementar parser para PDF de ING
Implementar parser para texto copiado
Sistema de validación de datos

Tareas:

Instalar dependencias de parseo
bashnpm install pdf-parse multer
npm install -D @types/multer

Crear tipos TypeScript
typescript// lib/types/parser.ts
interface MovimientoRaw {
  fecha: string
  descripcion: string
  importe: number
  saldo: number
  categoriaING?: string
  subcategoriaING?: string
}

Implementar parser de PDF
typescript// lib/parsers/ingPdfParser.ts

Implementar parser de texto
typescript// lib/parsers/ingTextParser.ts

Crear utilidades de validación
typescript// lib/parsers/validator.ts

Crear API endpoint para parseo
typescript// app/api/parse/route.ts


Entregables:

Parser funcional para PDF ING
Parser funcional para texto copiado
Sistema de validación robusto

Tests:
typescript// __tests__/unit/parsers.test.ts
- Test con PDF de ejemplo
- Test con diferentes formatos de texto
- Test de casos límite y errores
Verificación:
bashnpm run test:parsers
# Crear script de prueba manual
npm run parse:test -- sample.pdf
Commit:
bashgit add .
git commit -m "feat: sistema completo de parseo de extractos bancarios"

FASE 3: UI Base y Sistema de Componentes
Duración estimada: 3 días
Objetivos:

Configurar sistema de componentes UI
Implementar layout principal
Crear componentes reutilizables básicos

Tareas:

Instalar shadcn/ui
bashnpx shadcn-ui@latest init
npx shadcn-ui@latest add button card table dialog form

Crear layout principal
typescript// app/layout.tsx - Navegación lateral
// components/layout/Sidebar.tsx
// components/layout/Header.tsx

Implementar componentes base
typescript// components/ui/DataTable.tsx
// components/ui/MoneyDisplay.tsx
// components/ui/DatePicker.tsx

Crear tema y estilos globales
css/* app/globals.css - Variables de color, tipografía */

Implementar navegación
typescript// lib/navigation.ts - Rutas y menús


Entregables:

Layout navegable
Sistema de componentes configurado
Tema visual consistente

Tests:
typescript// __tests__/integration/navigation.test.tsx
- Test de navegación entre páginas
- Test de componentes UI básicos
Verificación:
bashnpm run dev
# Navegar por todas las rutas principales
# Verificar responsive design desactivado
Commit:
bashgit add .
git commit -m "feat: implementación de UI base con shadcn/ui y layout principal"

FASE 4: Gestión de Cuentas
Duración estimada: 2 días
Objetivos:

CRUD completo de cuentas
Selector de cuenta activa
Vista de listado de cuentas

Tareas:

Crear página de cuentas
typescript// app/cuentas/page.tsx - Listado
// app/cuentas/nueva/page.tsx - Formulario

Implementar API de cuentas
typescript// app/api/cuentas/route.ts - GET, POST
// app/api/cuentas/[id]/route.ts - PUT, DELETE

Crear store de estado global
bashnpm install zustand
typescript// lib/stores/cuentaStore.ts

Componentes de cuenta
typescript// components/cuentas/CuentaCard.tsx
// components/cuentas/CuentaForm.tsx
// components/cuentas/CuentaSelector.tsx


Entregables:

Sistema completo de gestión de cuentas
Selector de cuenta activa funcional
Persistencia de cuenta seleccionada

Tests:
typescript// __tests__/integration/cuentas.test.tsx
- Test de creación de cuenta
- Test de edición/eliminación
- Test de cambio de cuenta activa
Verificación:
bashnpm run dev
# Crear 3 cuentas: Jorge, Violeta, Casa
# Cambiar entre cuentas
# Editar y eliminar
Commit:
bashgit add .
git commit -m "feat: sistema completo de gestión de cuentas con Zustand"

FASE 5: Importación de Movimientos
Duración estimada: 4 días
Objetivos:

Interfaz de importación completa
Preview con categorización automática
Detección de duplicados

Tareas:

Crear página de importación
typescript// app/importar/page.tsx

Implementar componentes de importación
typescript// components/importar/UploadZone.tsx
// components/importar/PreviewTable.tsx
// components/importar/CategorizationEditor.tsx

Sistema de categorización automática
typescript// lib/categorization/engine.ts
// lib/categorization/rules.ts

API de importación
typescript// app/api/importar/route.ts
// app/api/importar/preview/route.ts

Detección de duplicados
typescript// lib/utils/duplicateDetection.ts


Entregables:

Importación funcional de PDF/texto
Preview interactivo antes de guardar
Categorización automática básica

Tests:
typescript// __tests__/integration/import.test.tsx
- Test de upload de archivo
- Test de preview
- Test de detección de duplicados
- Test de importación completa
Verificación:
bashnpm run dev
# Importar archivo de ejemplo
# Verificar categorización automática
# Modificar categorías en preview
# Confirmar importación
Commit:
bashgit add .
git commit -m "feat: sistema completo de importación con preview y categorización"

FASE 6: Gestión de Movimientos
Duración estimada: 3 días
Objetivos:

Vista de movimientos con filtros
Edición de movimientos
Añadir movimientos manuales

Tareas:

Crear vista de movimientos
typescript// app/cuentas/[cuentaId]/movimientos/page.tsx

Implementar tabla avanzada
bashnpm install @tanstack/react-table
typescript// components/movimientos/MovimientosTable.tsx

Sistema de filtros
typescript// components/movimientos/FilterBar.tsx
// lib/utils/filters.ts

Modal de edición
typescript// components/movimientos/MovimientoModal.tsx

API de movimientos
typescript// app/api/movimientos/route.ts
// app/api/movimientos/[id]/route.ts


Entregables:

Tabla de movimientos completa
Filtros funcionales
CRUD de movimientos

Tests:
typescript// __tests__/integration/movimientos.test.tsx
- Test de filtrado
- Test de paginación
- Test de edición
- Test de creación manual
Verificación:
bashnpm run dev
# Ver listado de movimientos
# Aplicar diferentes filtros
# Editar un movimiento
# Crear movimiento manual
Commit:
bashgit add .
git commit -m "feat: gestión completa de movimientos con filtros y edición"

FASE 7: Sistema de Categorías y Reglas
Duración estimada: 4 días
Objetivos:

Gestión completa de categorías personalizadas
Sistema de reglas de categorización
Editor visual de reglas

Tareas:

Página de configuración de categorías
typescript// app/configuracion/categorias/page.tsx

CRUD de categorías
typescript// components/categorias/CategoriaForm.tsx
// components/categorias/CategoriaList.tsx

Sistema de reglas
typescript// app/configuracion/reglas/page.tsx
// components/reglas/ReglaEditor.tsx
// components/reglas/ReglaTest.tsx

Motor de reglas mejorado
typescript// lib/categorization/rulesEngine.ts

API de configuración
typescript// app/api/categorias/route.ts
// app/api/reglas/route.ts


Entregables:

Gestión completa de categorías
Editor de reglas funcional
Testing de reglas en tiempo real

Tests:
typescript// __tests__/unit/rules.test.ts
- Test de motor de reglas
- Test de prioridades
- Test de casos especiales (Bizum)
Verificación:
bashnpm run dev
# Crear categorías personalizadas
# Crear reglas para Mercadona, Bizum
# Probar reglas con ejemplos
# Re-categorizar movimientos existentes
Commit:
bashgit add .
git commit -m "feat: sistema completo de categorías y reglas de categorización"

FASE 8: Dashboard y Visualizaciones
Duración estimada: 5 días
Objetivos:

Dashboard principal con métricas
Gráficos interactivos
Comparativas entre períodos

Tareas:

Instalar librería de gráficos
bashnpm install recharts date-fns

Implementar dashboard principal
typescript// app/dashboard/page.tsx
// components/dashboard/MetricCard.tsx
// components/dashboard/SpendingChart.tsx

Gráficos específicos
typescript// components/charts/CategoryPieChart.tsx
// components/charts/MonthlyTrendChart.tsx
// components/charts/AccountComparisonChart.tsx

Sistema de métricas
typescript// lib/analytics/metrics.ts
// lib/analytics/calculations.ts

API de analytics
typescript// app/api/analytics/dashboard/route.ts
// app/api/analytics/trends/route.ts


Entregables:

Dashboard funcional y visualmente atractivo
Gráficos interactivos
Métricas en tiempo real

Tests:
typescript// __tests__/unit/analytics.test.ts
- Test de cálculos de métricas
- Test de agregaciones
- Test de comparativas
Verificación:
bashnpm run dev
# Ver dashboard con datos reales
# Interactuar con gráficos
# Cambiar períodos de tiempo
# Filtrar por cuentas
Commit:
bashgit add .
git commit -m "feat: dashboard completo con visualizaciones y métricas"

FASE 9: Vistas Mensuales y Anuales
Duración estimada: 4 días
Objetivos:

Vista detallada mensual
Vista resumen anual
Navegación temporal intuitiva

Tareas:

Vista mensual
typescript// app/cuentas/[cuentaId]/mensual/[mes]/page.tsx
// components/vistas/VistaMensual.tsx

Vista anual
typescript// app/cuentas/[cuentaId]/anual/[año]/page.tsx
// components/vistas/VistaAnual.tsx

Componentes de navegación temporal
typescript// components/common/MonthPicker.tsx
// components/common/YearSelector.tsx

Comparativas período a período
typescript// components/comparativas/ComparativaMensual.tsx
// components/comparativas/HeatmapAnual.tsx


Entregables:

Vistas mensuales completas
Vistas anuales con resúmenes
Navegación temporal fluida

Tests:
typescript// __tests__/integration/vistas.test.tsx
- Test de navegación temporal
- Test de cálculos mensuales
- Test de resúmenes anuales
Verificación:
bashnpm run dev
# Navegar entre meses
# Ver resumen anual
# Comparar meses
# Verificar totales
Commit:
bashgit add .
git commit -m "feat: vistas mensuales y anuales con navegación temporal"

FASE 10: Sistema de Backup y Exportación
Duración estimada: 3 días
Objetivos:

Backup manual de base de datos
Restauración de backups
Exportación de datos

Tareas:

Página de backup
typescript// app/configuracion/backup/page.tsx

Sistema de backup
typescript// lib/backup/exporter.ts
// lib/backup/importer.ts

API de backup
typescript// app/api/backup/export/route.ts
// app/api/backup/import/route.ts

Exportación a formatos
bashnpm install xlsx csv-writer
typescript// lib/export/excel.ts
// lib/export/csv.ts


Entregables:

Sistema de backup funcional
Exportación a Excel/CSV
Restauración completa

Tests:
typescript// __tests__/integration/backup.test.ts
- Test de exportación
- Test de importación
- Test de integridad de datos
Verificación:
bashnpm run dev
# Crear backup
# Borrar datos
# Restaurar backup
# Exportar a Excel
Commit:
bashgit add .
git commit -m "feat: sistema completo de backup y exportación de datos"

FASE 11: Funcionalidades Avanzadas
Duración estimada: 5 días
Objetivos:

Detección de gastos recurrentes
Predicciones y proyecciones
Alertas y notificaciones

Tareas:

Detector de patrones
typescript// lib/analytics/patternDetector.ts
// lib/analytics/recurring.ts

Sistema de predicciones
typescript// lib/predictions/forecaster.ts
// components/predictions/ForecastChart.tsx

Sistema de alertas
typescript// lib/alerts/engine.ts
// components/alerts/AlertsPanel.tsx

Presupuestos por categoría
typescript// components/presupuestos/BudgetManager.tsx
// lib/budgets/tracker.ts


Entregables:

Detección automática de gastos fijos
Proyecciones futuras
Sistema de alertas funcional

Tests:
typescript// __tests__/unit/predictions.test.ts
- Test de detección de patrones
- Test de proyecciones
- Test de alertas
Verificación:
bashnpm run dev
# Ver gastos recurrentes detectados
# Ver proyecciones
# Configurar presupuestos
# Verificar alertas
Commit:
bashgit add .
git commit -m "feat: funcionalidades avanzadas con predicciones y alertas"

FASE 12: Optimización y Pulido Final
Duración estimada: 3 días
Objetivos:

Optimización de rendimiento
Mejoras de UX
Documentación

Tareas:

Optimización de queries
typescript// Implementar índices
// Optimizar agregaciones

Loading states y feedback
typescript// components/common/LoadingStates.tsx
// Implementar toast notifications

Documentación
markdown// README.md completo
// docs/manual-usuario.md

Scripts de utilidad
json// package.json scripts
"db:reset": "...",
"db:seed": "...",
"backup:create": "..."


Entregables:

Aplicación optimizada
Documentación completa
Scripts de mantenimiento

Tests finales:
bashnpm run test # Todos los tests
npm run build # Build de producción
npm run start # Verificar producción
Commit final:
bashgit add .
git commit -m "feat: optimización final y documentación completa"
git tag v1.0.0

📊 Resumen de Entregables por Fase
FaseDuraciónEntregables PrincipalesTests01 díaSetup completo✓12 díasBase de datos✓23 díasParser de extractos✓33 díasUI Base✓42 díasGestión de cuentas✓54 díasImportación✓63 díasCRUD Movimientos✓74 díasCategorías y reglas✓85 díasDashboard✓94 díasVistas temporales✓103 díasBackup✓115 díasFeatures avanzadas✓123 díasOptimización✓
Total: ~41 días de desarrollo
🚀 Scripts NPM para cada fase
json{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:watch": "jest --watch",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}