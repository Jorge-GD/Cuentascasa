import { toastUtils } from './toast'

export type ErrorType = 'network' | 'validation' | 'auth' | 'server' | 'unknown'

export interface AppError {
  type: ErrorType
  message: string
  originalError?: unknown
  context?: Record<string, any>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public type: ErrorType = 'server'
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const errorHandler = {
  // Manejo de errores de API
  handleApiError: (error: unknown, context?: string): AppError => {
    if (error instanceof ApiError) {
      return {
        type: error.type,
        message: error.message,
        originalError: error,
        context: { status: error.status, context }
      }
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Error de conexión. Verifica tu conexión a internet.',
        originalError: error,
        context: { context }
      }
    }

    if (error instanceof Error) {
      // Detectar errores específicos por mensaje
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return {
          type: 'auth',
          message: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
          originalError: error,
          context: { context }
        }
      }

      if (error.message.includes('validation') || error.message.includes('required')) {
        return {
          type: 'validation',
          message: 'Datos inválidos. Verifica la información ingresada.',
          originalError: error,
          context: { context }
        }
      }

      return {
        type: 'server',
        message: error.message,
        originalError: error,
        context: { context }
      }
    }

    return {
      type: 'unknown',
      message: 'Ha ocurrido un error inesperado.',
      originalError: error,
      context: { context }
    }
  },

  // Mostrar error usando toast
  showError: (error: AppError) => {
    switch (error.type) {
      case 'network':
        toastUtils.app.networkError()
        break
      case 'auth':
        toastUtils.error('Sesión expirada', {
          description: error.message,
          duration: 8000
        })
        break
      case 'validation':
        toastUtils.warning('Datos inválidos', {
          description: error.message,
          duration: 6000
        })
        break
      case 'server':
        toastUtils.error('Error del servidor', {
          description: error.message,
          duration: 6000
        })
        break
      default:
        toastUtils.error('Error inesperado', {
          description: error.message,
          duration: 5000
        })
    }
  },

  // Wrapper para operaciones async
  withErrorHandling: async <T>(
    operation: () => Promise<T>,
    context?: string,
    showToast = true
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      const appError = errorHandler.handleApiError(error, context)
      
      if (showToast) {
        errorHandler.showError(appError)
      }

      // Log para desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in operation:', {
          context,
          error: appError,
          originalError: error
        })
      }

      return null
    }
  },

  // Parsear respuesta de API
  parseApiResponse: async (response: Response): Promise<any> => {
    if (!response.ok) {
      let errorMessage = `Error ${response.status}`
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }

      throw new ApiError(response.status, errorMessage, 
        response.status >= 500 ? 'server' : 
        response.status === 401 ? 'auth' : 
        response.status >= 400 ? 'validation' : 'unknown'
      )
    }

    try {
      return await response.json()
    } catch (error) {
      throw new Error('Respuesta inválida del servidor')
    }
  }
}

// Helper para operaciones CRUD comunes
export const crudErrorHandler = {
  create: (itemType: string) => ({
    success: () => toastUtils.app.saveSuccess(itemType),
    error: (error: unknown) => {
      const appError = errorHandler.handleApiError(error, `crear ${itemType}`)
      errorHandler.showError(appError)
    }
  }),

  update: (itemType: string) => ({
    success: () => toastUtils.app.saveSuccess(itemType),
    error: (error: unknown) => {
      const appError = errorHandler.handleApiError(error, `actualizar ${itemType}`)
      errorHandler.showError(appError)
    }
  }),

  delete: (itemType: string) => ({
    success: () => toastUtils.app.deleteSuccess(itemType),
    error: (error: unknown) => {
      const appError = errorHandler.handleApiError(error, `eliminar ${itemType}`)
      errorHandler.showError(appError)
    }
  }),

  fetch: (itemType: string) => ({
    error: (error: unknown) => {
      const appError = errorHandler.handleApiError(error, `cargar ${itemType}`)
      errorHandler.showError(appError)
    }
  })
}