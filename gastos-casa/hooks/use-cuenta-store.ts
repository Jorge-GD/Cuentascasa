import { useEffect, useState } from 'react'
import { useCuentaStore } from '@/lib/stores/cuentaStore'

// Re-export for compatibility
export { useCuentaStore }

export function useClientCuentaStore() {
  const store = useCuentaStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Hidratar el store desde localStorage
    const unsubHydrate = useCuentaStore.persist.onHydrate(() => {
      setIsHydrated(false)
    })

    const unsubFinishHydration = useCuentaStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    // Forzar hidratación inmediata
    useCuentaStore.persist.rehydrate()

    // Si el store ya está hidratado
    if (useCuentaStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }

    return () => {
      unsubHydrate?.()
      unsubFinishHydration?.()
    }
  }, [])

  return {
    ...store,
    isHydrated
  }
}
