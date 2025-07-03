import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react'

interface ToastOptions {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

export const toastUtils = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 4000,
      icon: CheckCircle,
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 6000,
      icon: XCircle,
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 5000,
      icon: AlertTriangle,
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration || 4000,
      icon: Info,
    })
  },

  loading: (message: string, options?: { description?: string }) => {
    return toast.loading(message, {
      description: options?.description,
      icon: Loader2,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: (data: T) => string
      error: (error: any) => string
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  },

  // Toasts específicos para la aplicación
  app: {
    importSuccess: (count: number) => {
      return toastUtils.success(
        `Importación completada`,
        {
          description: `Se importaron ${count} movimientos correctamente`,
          duration: 5000,
        }
      )
    },

    importError: (error: string) => {
      return toastUtils.error(
        'Error en la importación',
        {
          description: error,
          duration: 8000,
        }
      )
    },

    budgetExceeded: (categoria: string, porcentaje: number) => {
      return toastUtils.warning(
        `Presupuesto excedido`,
        {
          description: `Has excedido el presupuesto de ${categoria} en un ${porcentaje.toFixed(1)}%`,
          duration: 8000,
        }
      )
    },

    budgetWarning: (categoria: string, porcentaje: number) => {
      return toastUtils.warning(
        `Cerca del límite de presupuesto`,
        {
          description: `Has usado el ${porcentaje.toFixed(1)}% del presupuesto de ${categoria}`,
          duration: 6000,
        }
      )
    },

    saveSuccess: (item: string) => {
      return toastUtils.success(
        `${item} guardado correctamente`,
        {
          duration: 3000,
        }
      )
    },

    deleteSuccess: (item: string) => {
      return toastUtils.success(
        `${item} eliminado correctamente`,
        {
          duration: 3000,
        }
      )
    },

    networkError: () => {
      return toastUtils.error(
        'Error de conexión',
        {
          description: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
          duration: 6000,
        }
      )
    },

    backupCreated: (filename: string) => {
      return toastUtils.success(
        'Backup creado exitosamente',
        {
          description: `Archivo: ${filename}`,
          duration: 5000,
        }
      )
    },

    backupRestored: () => {
      return toastUtils.success(
        'Backup restaurado correctamente',
        {
          description: 'Los datos han sido restaurados desde el backup',
          duration: 5000,
        }
      )
    },
  }
}

// Export individual functions for convenience
export const { success, error, warning, info, loading, promise } = toastUtils