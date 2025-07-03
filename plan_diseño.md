 Tendencia #1: La Estética "Linear / Vercel" (Neobrutalismo Moderno)

Esta es, sin duda, la recomendación principal y más fuerte para tu proyecto. shadcn/ui está prácticamente diseñado para crear esta apariencia.

    Cómo es: Limpia, de alto contraste, con tipografía nítida, bordes sutiles, sombras definidas y un enfoque absoluto en la funcionalidad sin sacrificar la belleza. Es la estética que define a las herramientas de software modernas.

    Por qué encaja perfecto:

        Componentes Nativos: Los Button, Card, Input, Dialog de shadcn/ui ya vienen con este estilo. No tienes que luchar contra la librería, solo usarla.

        Datos Densos: Este estilo es ideal para presentar información compleja (como en tu movimientos-table.tsx con TanStack Table) de una manera que se sienta profesional y no abarrotada.

        Visualizaciones Claras: Tus gráficos de Recharts se integrarán a la perfección dentro de los Card de shadcn/ui, creando dashboards cohesivos.

        Iconografía Coherente: Lucide React es el set de iconos por excelencia para esta estética. Sus líneas limpias y geométricas complementan a la perfección los componentes de shadcn/ui.

Plan de Acción Concreto:

    Construye tu dashboard principal usando el componente Card de shadcn/ui para cada widget.

    Dentro de esas tarjetas, renderiza tus gráficos (category-pie-chart, monthly-trend-chart).

    Usa la tabla de TanStack Table como el elemento central en la página de "Cuentas", quizás dentro de una gran Card o directamente en el layout principal.

    Utiliza las variantes de los botones (default, destructive, outline, ghost) para crear una jerarquía visual clara para las acciones.

---

# PLAN DE IMPLEMENTACIÓN POR FASES 🚀

## ESTADO ACTUAL: Base Técnica Reparada ✅

**PROBLEMA IDENTIFICADO**: El proyecto estaba usando Tailwind CSS v4.x (experimental) que causaba CSS vacío y "solo botones blancos".

**SOLUCIÓN IMPLEMENTADA**: Regresión a Tailwind v3.4.0 estable + configuración corregida.

**Archivos corregidos**:
- package.json - Dependencias Tailwind v3.4.0
- postcss.config.js - Plugin tailwindcss correcto  
- globals.css - Directivas @tailwind restauradas
- tailwind.config.js - Configuración CommonJS
- components/ui/button.tsx - Prop asChild implementado

**Estado**: ✅ CSS funcionando, servidor activo, estilos aplicándose correctamente.

---

## FASE 1: Componentes Base Faltantes 🎯
**Prioridad: ALTA | Duración: 1-2 días**

### 1.1 Tooltip Component
```bash
# Crear: components/ui/tooltip.tsx
```
**Ubicaciones que lo necesitan**:
- `categoria-form.tsx:189` - Reemplazar atributo title
- `cuenta-selector.tsx:85` - Tooltip en selector  
- `heatmap-anual.tsx` - Tooltips en gráficos

### 1.2 Páginas de Error Personalizadas
```bash
# Crear: app/error.tsx, app/not-found.tsx
```
**Implementar**:
- Error 404 con diseño shadcn/ui
- Error 500 con ilustración
- Botones de navegación coherentes

### 1.3 Breadcrumbs Component
```bash
# Crear: components/ui/breadcrumb.tsx
```
**Rutas que lo necesitan**:
- Configuración > Categorías
- Configuración > Reglas
- Cuentas > [Cuenta] > Movimientos

**Estado**: ✅ COMPLETADO

---

## FASE 2: Mejoras UX Críticas 🔧
**Prioridad: ALTA | Duración: 2-3 días**

### 2.1 Modo Oscuro Nativo
```bash
# Ya tienen next-themes, solo implementar
npm install next-themes  # Ya instalado
```
**Implementar**:
- `app/layout.tsx` - Añadir ThemeProvider
- Tailwind CSS ya configurado para `dark:`
- Toggle en header para cambiar tema

### 2.2 Sistema de Notificaciones con Sonner
```bash
npm install sonner  # Más moderno que react-hot-toast
```
**Implementar**:
- Reemplazar toast.ts existente con Sonner
- Feedback inmediato + skeletons para carga
- Notificaciones en todas las acciones CRUD

### 2.3 Confirmaciones Destructivas (Dialogs)
**Reemplazar nativos**:
- `app/cuentas/page.tsx:34-40` - window.confirm() → AlertDialog
- `app/configuracion/categorias/page.tsx:49,63` - alert() → Sonner toast
- `app/configuracion/reglas/page.tsx` - confirm() → AlertDialog
**Crear**:
- `components/ui/confirm-dialog.tsx` - Para eliminaciones

### 2.4 Manejo de Errores Robusto
**Crear**:
- `components/common/error-boundary.tsx` - Captura errores React
- `lib/utils/error-handler.ts` - Manejo centralizado
- Integrar con Sonner para mostrar errores user-friendly

### 2.5 Completar TODOs Críticos
**TODOs identificados**:
- `cuentas/page.tsx:29` - "TODO: Abrir modal de edición"
- `movimientos-table.tsx:237` - "TODO: Implement delete confirmation"
- `[cuentaId]/movimientos/page.tsx:127` - "TODO: Export functionality"

**Estado**: ✅ COMPLETADO

---

## FASE 3: Estados de Loading Mejorados ⏳
**Prioridad: MEDIA | Duración: 1-2 días**

### 3.1 Loading States Consistentes
**Ampliar**: `components/common/loading-states.tsx` existente
**Implementar**:
- Usar Sonner para feedback inmediato + skeletons para carga
- Loading states unificados en toda la aplicación
- Transiciones suaves entre estados

### 3.2 Skeleton Loaders Específicos
```bash
# Crear: components/ui/skeletons/
```
**Componentes necesarios**:
- `table-skeleton.tsx` - Para movimientos-table.tsx
- `form-skeleton.tsx` - Formularios complejos
- `chart-skeleton.tsx` - Gráficos Recharts
- `dashboard-skeleton.tsx` - Métricas del dashboard

### 3.3 Estados Empty Mejorados
**Ubicaciones**:
- `movimientos-table.tsx:282-290` - Estado "sin movimientos"
- `filter-bar.tsx` - "Sin resultados" después de filtrar
- Charts sin datos

**Implementar**:
- Ilustraciones SVG minimalistas
- Texto descriptivo + acciones sugeridas
- Diseño coherente con tema actual

**Estado**: ✅ COMPLETADO

---

## FASE 4: Header y Navegación Completa 🧭
**Prioridad: MEDIA | Duración: 2-3 días**

### 4.1 Funcionalidades Header Completas
**Ubicación**: `components/layout/header.tsx:22-34`

**Search Button (⌘K)**:
- Modal de búsqueda global
- Buscar movimientos, cuentas, categorías
- Navegación rápida con teclado

**Bell (Notificaciones)**:
- Sistema de notificaciones in-app
- Alertas de límites de gastos
- Recordatorios de categorización

**User Menu**:
- Perfil de usuario
- Configuración de tema
- Cerrar sesión

### 4.2 Command Palette
```bash
# Crear: components/ui/command-palette.tsx
```
**Funcionalidades**:
- Búsqueda universal con ⌘K
- Navegación rápida
- Comandos de acciones

**Estado**: ✅ COMPLETADO

---

## FASE 5: Pulido y Optimización ✨
**Prioridad: BAJA | Duración: 1-2 días**

### 5.1 Estado Offline
**Implementar**:
- Detección de conexión
- Banner offline discreto
- Queue de acciones pendientes

### 5.2 Validación Unificada
**Mejorar**:
- Sistema consistente de validación
- Feedback visual inmediato
- Estados de campo mejorados

### 5.3 Micro-interacciones
**Agregar**:
- Hover states mejorados
- Animaciones de loading
- Transiciones suaves

**Estado**: ✅ COMPLETADO

---

## CRONOGRAMA Y CONTROL 📅

| Fase | Duración | Prioridad | Impacto UX | Estado |
|------|----------|-----------|------------|--------|
| **Base Técnica** | ✅ | 🔴 CRÍTICA | Muy Alto | **✅ COMPLETADO** |
| **Fase 1** | 1-2 días | 🔴 Alta | Alto | **✅ COMPLETADO** |
| **Fase 2** | 2-3 días | 🔴 Alta | Muy Alto | **✅ COMPLETADO** |
| **Fase 3** | 1-2 días | 🟡 Media | Medio | **✅ COMPLETADO** |
| **Fase 4** | 2-3 días | 🟡 Media | Alto | **✅ COMPLETADO** |
| **Fase 5** | 1-2 días | 🟢 Baja | Bajo | **✅ COMPLETADO** |

**Total estimado: 8-14 días** para completar al 100% (actualizado con elementos UX)

---

## CONTROL DE PROGRESO 📊

### ✅ Completadas:
- [x] Reparación base técnica (Tailwind CSS)
- [x] Configuración correcta de PostCSS
- [x] Componente Button funcional
- [x] **FASE 1 COMPLETA**: Tooltip component, páginas de error, breadcrumbs
- [x] **FASE 2 COMPLETA**: Modo oscuro, Sonner, confirmaciones, error handling, TODOs
- [x] **FASE 3 COMPLETA**: Loading states consistentes, skeleton loaders, empty states
- [x] **FASE 4 COMPLETA**: Header funcional, command palette (⌘K), notificaciones, user menu

### ✅ TODAS LAS FASES COMPLETADAS:
- [x] **FASE 5 COMPLETA**: Estado offline, validación unificada, micro-interacciones

### 🎉 PROYECTO COMPLETADO AL 100%

**Estado final**: Proyecto completamente terminado con todas las características implementadas:
- ✅ Base técnica sólida (Tailwind CSS v3.4.0)
- ✅ Componentes base y páginas de error
- ✅ Modo oscuro nativo y sistema de notificaciones
- ✅ Loading states y skeleton loaders
- ✅ Header funcional con command palette (⌘K)
- ✅ Estado offline y validación unificada
- ✅ Micro-interacciones y animaciones

**Resultado**: Aplicación web moderna con excelente UX/UI siguiendo las mejores prácticas de diseño.

---

## NOTAS DE IMPLEMENTACIÓN 📝

1. **Cada fase debe completarse antes de continuar** con la siguiente
2. **Marcar como completado** cada elemento en esta lista
3. **Documentar problemas** encontrados durante implementación
4. **Hacer commit** al finalizar cada subfase
5. **Probar funcionalidad** antes de marcar como completado