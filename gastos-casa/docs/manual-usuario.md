# Manual de Usuario - Sistema de Control de Gastos Domésticos

## Índice

1. [Introducción](#introducción)
2. [Primeros Pasos](#primeros-pasos)
3. [Gestión de Cuentas](#gestión-de-cuentas)
4. [Importación de Extractos](#importación-de-extractos)
5. [Gestión de Movimientos](#gestión-de-movimientos)
6. [Sistema de Categorías](#sistema-de-categorías)
7. [Reglas de Categorización](#reglas-de-categorización)
8. [Presupuestos](#presupuestos)
9. [Dashboard y Análisis](#dashboard-y-análisis)
10. [Backup y Exportación](#backup-y-exportación)
11. [Solución de Problemas](#solución-de-problemas)

## Introducción

El Sistema de Control de Gastos Domésticos es una aplicación web diseñada para ayudarte a gestionar y analizar tus finanzas personales y familiares de manera eficiente.

### Características principales:
- 📊 **Dashboard interactivo** con visualizaciones en tiempo real
- 💳 **Múltiples cuentas** (personales y compartidas)
- 📄 **Importación automática** de extractos bancarios
- 🏷️ **Categorización inteligente** con reglas personalizables
- 🎯 **Sistema de presupuestos** con alertas
- 📈 **Análisis temporal** y comparativas
- 💾 **Backup automático** y exportación de datos

## Primeros Pasos

### 1. Configuración inicial

Al acceder por primera vez al sistema:

1. **Crear tu primera cuenta**
   - Ve a `Cuentas > Nueva cuenta`
   - Asigna un nombre descriptivo (ej: "Gastos Jorge")
   - Selecciona el tipo (personal/compartida)
   - Elige un color identificativo

2. **Configurar categorías básicas**
   - El sistema incluye categorías predefinidas
   - Puedes personalizarlas en `Configuración > Categorías`

3. **Importar tu primer extracto**
   - Ve a `Importar`
   - Sube un PDF de tu banco o pega el texto copiado
   - Revisa la categorización automática
   - Confirma la importación

### 2. Navegación principal

La aplicación se organiza en las siguientes secciones:

- **Dashboard**: Vista general de tus finanzas
- **Cuentas**: Gestión de cuentas y movimientos
- **Importar**: Subida de extractos bancarios
- **Configuración**: Categorías, reglas, presupuestos y backup

## Gestión de Cuentas

### Crear una nueva cuenta

1. Navega a `Cuentas > Nueva cuenta`
2. Completa el formulario:
   - **Nombre**: Descriptivo (ej: "Gastos Violeta", "Gastos Casa")
   - **Tipo**: Personal o Compartida
   - **Color**: Para identificación visual en gráficos
3. Haz clic en "Crear cuenta"

### Gestionar cuentas existentes

En la página de cuentas puedes:
- **Ver resumen** de cada cuenta
- **Editar** información básica
- **Eliminar** cuentas (cuidado: esto elimina todos los movimientos)
- **Cambiar cuenta activa** para filtrar vistas

### Tipos de cuenta

- **Personal**: Para gastos individuales
- **Compartida**: Para gastos familiares o de pareja

## Importación de Extractos

### Formatos soportados

El sistema actualmente soporta:
- **PDF de ING**: Detección automática del formato
- **Texto copiado**: Pega directamente el contenido del extracto

### Proceso de importación

1. **Seleccionar método**
   - **Subir PDF**: Arrastra el archivo o haz clic para seleccionarlo
   - **Pegar texto**: Copia el extracto y pégalo en el área de texto

2. **Preview automático**
   - El sistema procesa y categoriza automáticamente
   - Muestra un preview de todos los movimientos detectados
   - Indica el nivel de confianza de cada categorización

3. **Revisión y ajustes**
   - Revisa las categorías sugeridas
   - Edita manualmente las que no sean correctas
   - Selecciona qué movimientos importar

4. **Confirmación**
   - Haz clic en "Importar movimientos seleccionados"
   - El sistema detecta y previene duplicados automáticamente

### Detección de duplicados

El sistema detecta duplicados por:
- Fecha, importe y descripción exactos
- Fecha e importe similares (±2 días, ±€0.01)
- Similitud en la descripción

## Gestión de Movimientos

### Ver movimientos

En `Cuentas > [Nombre de cuenta] > Movimientos`:

- **Tabla completa** con todos los movimientos
- **Filtros avanzados** por fecha, categoría, tipo e importe
- **Búsqueda** por descripción
- **Ordenación** por cualquier columna
- **Paginación** para grandes cantidades de datos

### Filtros disponibles

- **Rango de fechas**: Específico o preestablecido
- **Categoría**: Una o múltiples categorías
- **Tipo de movimiento**: Gastos, ingresos o ambos
- **Rango de importe**: Mínimo y máximo
- **Origen**: Manual o importado

### Editar movimientos

1. Haz clic en cualquier movimiento
2. Modifica los campos necesarios:
   - Fecha, descripción, importe
   - Categoría y subcategoría
   - Agregar etiquetas
3. Guarda los cambios

### Crear movimientos manuales

1. Haz clic en "Nuevo movimiento"
2. Completa todos los campos obligatorios
3. El movimiento se marca automáticamente como "manual"

## Sistema de Categorías

### Categorías predefinidas

El sistema incluye categorías comunes:
- Alimentación (Supermercado, Carnicería, etc.)
- Compras Online (Amazon, Ropa, Tecnología)
- Gastos Fijos (Alquiler, Luz, Agua, Internet)
- Mascotas (Comida, Veterinario, Accesorios)
- Salidas (Restaurantes, Cine, Ocio)
- Transporte (Gasolina, Transporte público)
- Cumpleaños y Regalos

### Personalizar categorías

En `Configuración > Categorías`:

1. **Crear nueva categoría**
   - Nombre descriptivo
   - Color distintivo
   - Icono (opcional)
   - Presupuesto mensual (opcional)

2. **Editar categorías existentes**
   - Cambiar nombre, color o presupuesto
   - Agregar subcategorías

3. **Eliminar categorías**
   - Solo si no tienen movimientos asociados
   - O reasignar movimientos a otra categoría

### Subcategorías

Cada categoría puede tener subcategorías para mayor detalle:
- Alimentación → Supermercado, Carnicería, Frutería
- Transporte → Gasolina, Parking, Transporte público

## Reglas de Categorización

### ¿Qué son las reglas?

Las reglas permiten categorizar automáticamente los movimientos basándose en patrones en la descripción.

### Crear reglas

En `Configuración > Reglas`:

1. **Información básica**
   - Nombre descriptivo
   - Categoría de destino
   - Subcategoría (opcional)
   - Prioridad (1 = mayor prioridad)

2. **Patrón de coincidencia**
   - **Contiene**: La descripción contiene el texto
   - **Empieza con**: La descripción comienza con el texto
   - **Termina con**: La descripción termina con el texto
   - **Exacto**: Coincidencia exacta
   - **Regex**: Expresión regular avanzada

3. **Ámbito**
   - Aplicar a todas las cuentas
   - O solo a una cuenta específica

### Ejemplos de reglas

- **Mercadona** (contiene) → Alimentación / Supermercado
- **BIZUM ENVIADO** (empieza con) → Bizum / Enviado
- **REPSOL|CEPSA|BP** (regex) → Transporte / Gasolina

### Probar reglas

Usa el probador de reglas para verificar que funcionan correctamente:
1. Escribe una descripción de ejemplo
2. Ve qué regla se aplicaría
3. Ajusta si es necesario

## Presupuestos

### Configurar presupuestos

En `Configuración > Presupuestos`:

1. **Selecciona una categoría** sin presupuesto
2. **Establece el límite mensual** en euros
3. El sistema calculará automáticamente:
   - Gasto actual del mes
   - Porcentaje usado
   - Proyección para fin de mes

### Tipos de alertas

- 🟢 **En límite**: Menos del 80% usado
- 🟡 **Advertencia**: 80-100% usado o proyección excesiva
- 🔴 **Excedido**: Más del 100% usado

### Dashboard de presupuestos

- **Resumen global** de todos los presupuestos
- **Progreso individual** por categoría
- **Alertas automáticas** en el dashboard principal
- **Proyecciones** basadas en el gasto actual

## Dashboard y Análisis

### Métricas principales

El dashboard muestra:
- **Gastos totales** del período
- **Ingresos totales** del período
- **Balance** (ingresos - gastos)
- **Proyección** para fin de mes (solo vista mensual)

### Gráficos disponibles

1. **Distribución por categorías** (gráfico circular)
2. **Evolución temporal** (líneas de gastos e ingresos)
3. **Comparación entre cuentas** (si tienes múltiples)

### Períodos de análisis

- **Mes actual**: Vista detallada con proyecciones
- **Trimestre**: Tendencias de 3 meses
- **Año**: Análisis anual completo

### Alertas automáticas

El sistema genera alertas por:
- Balance negativo
- Incremento significativo de gastos
- Presupuestos excedidos
- Patrones inusuales de gasto

## Backup y Exportación

### Crear backups

En `Configuración > Backup`:

1. **Backup completo**
   - Toda la base de datos
   - Todas las cuentas y movimientos

2. **Backup por cuenta**
   - Solo una cuenta específica
   - Útil para compartir datos

3. **Backup por período**
   - Rango de fechas específico
   - Para análisis históricos

### Restaurar backups

1. Selecciona el archivo de backup
2. Elige el tipo de restauración:
   - **Reemplazar**: Borra datos actuales
   - **Combinar**: Agrega a datos existentes

### Exportar a Excel/CSV

Para análisis externos:
- **Excel**: Múltiples hojas con análisis incluido
- **CSV**: Archivos separados por tipo de dato

## Solución de Problemas

### Problemas comunes

**❓ No se importan los movimientos**
- Verifica que el formato del archivo sea correcto
- Revisa que no sean duplicados de importaciones anteriores
- Comprueba que la cuenta esté seleccionada

**❓ Las categorías no se asignan automáticamente**
- Revisa las reglas de categorización
- Verifica que estén activas y tengan la prioridad correcta
- Prueba las reglas con el probador integrado

**❓ Los gráficos no se muestran**
- Asegúrate de que hay datos en el período seleccionado
- Verifica que la cuenta tenga movimientos
- Recarga la página si es necesario

**❓ Error al subir archivos PDF**
- Verifica que el archivo no esté corrupto
- Asegúrate de que es un PDF de texto (no imagen)
- Prueba con el método de texto copiado

### Limitaciones conocidas

- Solo soporta formato de extractos de ING
- Máximo 50MB por archivo PDF
- Los backups se almacenan localmente

### Contacto de soporte

Para problemas técnicos o sugerencias:
- Revisa primero esta documentación
- Verifica los logs en la consola del navegador
- Crea un backup antes de reportar problemas

---

## Atajos de teclado

- `Ctrl + K`: Búsqueda rápida (próximamente)
- `Ctrl + N`: Nuevo movimiento (próximamente)
- `Ctrl + I`: Ir a importar (próximamente)

---

*Versión del manual: 1.0.0*  
*Última actualización: Enero 2025*