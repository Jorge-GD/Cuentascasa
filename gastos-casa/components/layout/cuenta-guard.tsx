'use client'

import { useEffect } from 'react'
import { useCuentaStore } from '@/lib/stores/cuentaStore'

interface CuentaGuardProps {
  children: React.ReactNode
}

export function CuentaGuard({ children }: CuentaGuardProps) {
  const { fetchCuentas } = useCuentaStore()

  useEffect(() => {
    // Initialize accounts on app load
    fetchCuentas()
  }, [fetchCuentas])

  // For now, just render children - in the future this could handle
  // account selection logic, redirects, etc.
  return <>{children}</>
}