'use client'

import { z } from 'zod'

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  phone: z.string().regex(/^[+]?[0-9\s\-()]+$/, 'Introduce un teléfono válido'),
  currency: z.number().min(0, 'El importe debe ser positivo'),
  date: z.date().refine(date => date <= new Date(), 'La fecha no puede ser futura'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
}

// Form validation schemas
export const validationSchemas = {
  // Account schemas
  cuenta: z.object({
    nombre: commonSchemas.name.max(50, 'El nombre no puede tener más de 50 caracteres'),
    tipo: z.enum(['corriente', 'ahorros', 'credito'], {
      required_error: 'Selecciona un tipo de cuenta'
    }),
    banco: commonSchemas.name.max(30, 'El banco no puede tener más de 30 caracteres'),
    saldoInicial: commonSchemas.currency,
    activa: z.boolean().default(true)
  }),

  // Movement schemas
  movimiento: z.object({
    fecha: commonSchemas.date,
    descripcion: commonSchemas.description.max(200, 'La descripción no puede tener más de 200 caracteres'),
    importe: z.number().refine(val => val !== 0, 'El importe no puede ser cero'),
    categoria: commonSchemas.category,
    subcategoria: z.string().optional(),
    esManual: z.boolean().default(false),
    cuentaId: z.string().min(1, 'Selecciona una cuenta')
  }),

  // Category schemas
  categoria: z.object({
    nombre: commonSchemas.name.max(30, 'El nombre no puede tener más de 30 caracteres'),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Introduce un color válido'),
    icono: z.string().min(1, 'Selecciona un icono'),
    presupuesto: commonSchemas.currency.optional(),
    activa: z.boolean().default(true)
  }),

  // Import schemas
  importConfig: z.object({
    separador: z.enum([',', ';', '\t'], {
      required_error: 'Selecciona un separador'
    }),
    fechaFormato: z.enum(['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd'], {
      required_error: 'Selecciona un formato de fecha'
    }),
    columnaFecha: z.number().min(0, 'Selecciona la columna de fecha'),
    columnaDescripcion: z.number().min(0, 'Selecciona la columna de descripción'),
    columnaImporte: z.number().min(0, 'Selecciona la columna de importe'),
    saltarPrimeraFila: z.boolean().default(true)
  }),

  // User profile schemas
  perfil: z.object({
    nombre: commonSchemas.name,
    email: commonSchemas.email,
    telefono: commonSchemas.phone.optional(),
    preferencias: z.object({
      tema: z.enum(['light', 'dark', 'system']).default('system'),
      idioma: z.enum(['es', 'en']).default('es'),
      moneda: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
      notificaciones: z.boolean().default(true)
    })
  })
}

// Validation result type
export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
  fieldErrors?: Record<string, string>
}

// Validation function
export function validateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    } else {
      const fieldErrors: Record<string, string> = {}
      const errors: Record<string, string[]> = {}

      result.error.errors.forEach(error => {
        const field = error.path.join('.')
        const message = error.message
        
        fieldErrors[field] = message
        
        if (!errors[field]) {
          errors[field] = []
        }
        errors[field].push(message)
      })

      return {
        success: false,
        errors,
        fieldErrors
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: { general: ['Error de validación'] },
      fieldErrors: { general: 'Error de validación' }
    }
  }
}

// Real-time validation hook
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  field: keyof T,
  debounceMs: number = 300
) {
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const validateField = useCallback(
    debounce((value: any) => {
      setIsValidating(true)
      
      try {
        const fieldSchema = schema.shape[field as string]
        if (fieldSchema) {
          fieldSchema.parse(value)
          setError(null)
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0]?.message || 'Error de validación')
        }
      } finally {
        setIsValidating(false)
      }
    }, debounceMs),
    [schema, field, debounceMs]
  )

  return {
    error,
    isValidating,
    validateField
  }
}

// Form validation hook
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  const validate = useCallback((data: unknown): ValidationResult<T> => {
    const result = validateData(schema, data)
    
    setErrors(result.fieldErrors || {})
    setIsValid(result.success)
    
    return result
  }, [schema])

  const clearErrors = useCallback(() => {
    setErrors({})
    setIsValid(false)
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  return {
    errors,
    isValid,
    validate,
    clearErrors,
    clearFieldError
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Import required hooks
import { useState, useCallback } from 'react'