import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cuenta } from '@/lib/types/database'

interface CuentaState {
  // Estado
  cuentas: Cuenta[]
  cuentaActiva: Cuenta | null
  isLoading: boolean
  error: string | null

  // Acciones
  setCuentas: (cuentas: Cuenta[]) => void
  setCuentaActiva: (cuenta: Cuenta | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Operaciones CRUD
  fetchCuentas: () => Promise<void>
  createCuenta: (data: { nombre: string; tipo: string; color: string }) => Promise<Cuenta | null>
  updateCuenta: (id: string, data: Partial<{ nombre: string; tipo: string; color: string }>) => Promise<Cuenta | null>
  deleteCuenta: (id: string) => Promise<boolean>
  
  // Utilidades
  getCuentaById: (id: string) => Cuenta | undefined
  selectCuenta: (id: string) => void
}

export const useCuentaStore = create<CuentaState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      cuentas: [],
      cuentaActiva: null,
      isLoading: false,
      error: null,

      // Setters básicos
      setCuentas: (cuentas) => set({ cuentas }),
      setCuentaActiva: (cuenta) => set({ cuentaActiva: cuenta }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Operaciones CRUD
      fetchCuentas: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/cuentas')
          const result = await response.json()
          
          if (result.success) {
            set({ cuentas: result.data, isLoading: false })
            
            // Si no hay cuenta activa, seleccionar la primera
            const { cuentaActiva } = get()
            if (!cuentaActiva && result.data.length > 0) {
              set({ cuentaActiva: result.data[0] })
            }
            
            // Si la cuenta activa ya no existe, seleccionar otra
            if (cuentaActiva && !result.data.find((c: Cuenta) => c.id === cuentaActiva.id)) {
              set({ cuentaActiva: result.data.length > 0 ? result.data[0] : null })
            }
          } else {
            set({ error: result.error, isLoading: false })
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Error al cargar cuentas',
            isLoading: false 
          })
        }
      },

      createCuenta: async (data) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/cuentas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          })
          
          const result = await response.json()
          
          if (result.success) {
            const nuevaCuenta = result.data
            const { cuentas } = get()
            
            set({ 
              cuentas: [...cuentas, nuevaCuenta],
              isLoading: false 
            })
            
            // Si es la primera cuenta, hacerla activa
            if (cuentas.length === 0) {
              set({ cuentaActiva: nuevaCuenta })
            }
            
            return nuevaCuenta
          } else {
            set({ error: result.error, isLoading: false })
            return null
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Error al crear cuenta',
            isLoading: false 
          })
          return null
        }
      },

      updateCuenta: async (id, data) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/cuentas/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          })
          
          const result = await response.json()
          
          if (result.success) {
            const cuentaActualizada = result.data
            const { cuentas, cuentaActiva } = get()
            
            const cuentasActualizadas = cuentas.map(cuenta =>
              cuenta.id === id ? cuentaActualizada : cuenta
            )
            
            set({ 
              cuentas: cuentasActualizadas,
              cuentaActiva: cuentaActiva?.id === id ? cuentaActualizada : cuentaActiva,
              isLoading: false 
            })
            
            return cuentaActualizada
          } else {
            set({ error: result.error, isLoading: false })
            return null
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Error al actualizar cuenta',
            isLoading: false 
          })
          return null
        }
      },

      deleteCuenta: async (id) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/cuentas/${id}`, {
            method: 'DELETE',
          })
          
          const result = await response.json()
          
          if (result.success) {
            const { cuentas, cuentaActiva } = get()
            const cuentasFiltradas = cuentas.filter(cuenta => cuenta.id !== id)
            
            set({ 
              cuentas: cuentasFiltradas,
              cuentaActiva: cuentaActiva?.id === id 
                ? (cuentasFiltradas.length > 0 ? cuentasFiltradas[0] : null)
                : cuentaActiva,
              isLoading: false 
            })
            
            return true
          } else {
            set({ error: result.error, isLoading: false })
            return false
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Error al eliminar cuenta',
            isLoading: false 
          })
          return false
        }
      },

      // Utilidades
      getCuentaById: (id) => {
        const { cuentas } = get()
        return cuentas.find(cuenta => cuenta.id === id)
      },

      selectCuenta: (id) => {
        const { cuentas } = get()
        const cuenta = cuentas.find(c => c.id === id)
        if (cuenta) {
          set({ cuentaActiva: cuenta })
        }
      },
    }),
    {
      name: 'cuenta-storage',
      partialize: (state) => ({ 
        cuentaActiva: state.cuentaActiva 
      }),
      // Evitar errores de hidratación
      skipHydration: true,
    }
  )
)