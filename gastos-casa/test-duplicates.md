# Prueba de Duplicados - Sistema de Importación

## Mejoras Implementadas

1. **Validación de Duplicados en Importación**
   - Ahora el sistema verifica duplicados antes de guardar cada movimiento
   - Los duplicados con >80% confianza se saltan automáticamente
   - Se muestra información sobre movimientos saltados

2. **Hash Único por Movimiento**
   - Cada movimiento genera un hash basado en: fecha + importe + descripción + cuentaId
   - El hash previene duplicados exactos a nivel de base de datos
   - Unique constraint en la combinación [hash, cuentaId]

3. **Detección Mejorada**
   - Normalización de descripciones (minúsculas, espacios extra)
   - Ignora números de referencia largos (>6 dígitos)
   - Compara solo los primeros 50 caracteres de la descripción

## Cómo Probar

1. **Primer archivo (30 mayo - 30 junio)**
   ```
   06/06/2025    Hogar    Luz y gas    Recibo Energia Xxi Comercializadora de Referenc        No    -52,47    914,43
   12/06/2025    Hogar    Teléfono, TV e internet    Recibo Vodafone        No    -29,00    783,04
   26/06/2025    Hogar    Agua    Recibo HIDRALIA GESTION INTEGRAL DE AGUAS DE AN        No    -45,34    282,47
   03/06/2025    Otros gastos    Otros gastos (otros)    Recibo C.P. Plaza De Toros 7        No    -86,42    1.053,01
   ```

2. **Segundo archivo (30 junio - 30 julio)**
   - Si incluye los mismos movimientos del 26/06 o antes, serán detectados como duplicados
   - Los movimientos nuevos del 01/07 en adelante se importarán normalmente

## Comportamiento Esperado

- **Duplicados exactos**: Rechazados automáticamente (100% confianza)
- **Duplicados probables**: Rechazados si confianza >80%
- **Posibles duplicados**: Importados con advertencia si confianza 50-80%
- **No duplicados**: Importados normalmente

## Información de Depuración

Al importar, el sistema ahora muestra:
- Número de movimientos importados
- Número de duplicados saltados
- Detalles de cada duplicado (descripción y % confianza)