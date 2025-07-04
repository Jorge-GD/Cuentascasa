'use client'

import React from 'react'
import dynamic, { DynamicOptions } from 'next/dynamic'
import { ComponentType } from 'react'
import ChunkErrorBoundary from '@/components/common/chunk-error-boundary'
import { ChartSkeleton, LoadingSkeleton } from '@/components/common/loading-states'

interface EnhancedDynamicOptions<P = {}> extends Omit<DynamicOptions<P>, 'loading'> {
  loadingComponent?: 'chart' | 'default' | ComponentType
  componentName?: string
  maxRetries?: number
  fallback?: ComponentType<P>
}

/**
 * Enhanced dynamic import with robust error handling and retry mechanism
 */
export function createRobustDynamicImport<P = {}>(
  importFunction: () => Promise<{ default: ComponentType<P> }>,
  options: EnhancedDynamicOptions<P> = {}
) {
  const {
    loadingComponent = 'default',
    componentName,
    maxRetries = 3,
    fallback,
    ...dynamicOptions
  } = options

  // Determinar el componente de loading
  const LoadingComponent = 
    loadingComponent === 'chart' ? ChartSkeleton :
    loadingComponent === 'default' ? LoadingSkeleton :
    typeof loadingComponent === 'function' ? loadingComponent :
    LoadingSkeleton

  // Wrapper para el import con retry automático
  const enhancedImportFunction = async (): Promise<{ default: ComponentType<P> }> => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Loading ${componentName || 'component'}, attempt ${attempt}/${maxRetries}`)
        const module = await importFunction()
        
        if (!module.default) {
          throw new Error(`Module does not have a default export: ${componentName}`)
        }
        
        console.log(`Successfully loaded ${componentName || 'component'} on attempt ${attempt}`)
        return module
      } catch (error) {
        lastError = error as Error
        console.warn(`Failed to load ${componentName || 'component'} on attempt ${attempt}:`, error)
        
        // Si no es el último intento, esperar antes del siguiente
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
          console.log(`Retrying ${componentName || 'component'} in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error(`All ${maxRetries} attempts failed for ${componentName || 'component'}:`, lastError)
    throw lastError || new Error(`Failed to load ${componentName || 'component'} after ${maxRetries} attempts`)
  }

  // Crear el componente dinámico
  const DynamicComponent = dynamic(enhancedImportFunction, {
    loading: () => <LoadingComponent />,
    ssr: false,
    ...dynamicOptions
  })

  // Wrapper con error boundary
  const WrappedComponent = (props: P) => (
    <ChunkErrorBoundary 
      componentName={componentName}
      maxRetries={maxRetries}
      fallback={fallback ? React.createElement(fallback, props) : undefined}
    >
      <DynamicComponent {...props} />
    </ChunkErrorBoundary>
  )

  return WrappedComponent
}

/**
 * Preload a dynamic component
 */
export async function preloadComponent(
  importFunction: () => Promise<{ default: ComponentType<any> }>,
  componentName?: string
): Promise<boolean> {
  try {
    console.log(`Preloading ${componentName || 'component'}...`)
    await importFunction()
    console.log(`Successfully preloaded ${componentName || 'component'}`)
    return true
  } catch (error) {
    console.warn(`Failed to preload ${componentName || 'component'}:`, error)
    return false
  }
}

/**
 * Preload multiple components
 */
export async function preloadComponents(
  components: Array<{
    importFunction: () => Promise<{ default: ComponentType<any> }>
    name?: string
  }>
): Promise<{ success: number; failed: number; results: boolean[] }> {
  console.log(`Preloading ${components.length} components...`)
  
  const results = await Promise.all(
    components.map(({ importFunction, name }) => 
      preloadComponent(importFunction, name)
    )
  )
  
  const success = results.filter(Boolean).length
  const failed = results.length - success
  
  console.log(`Preloading completed: ${success} successful, ${failed} failed`)
  
  return { success, failed, results }
}

/**
 * Check if the current environment supports dynamic imports
 */
export function isDynamicImportSupported(): boolean {
  try {
    // Check if we're in a browser environment that supports dynamic imports
    return typeof window !== 'undefined' && 'import' in window
  } catch {
    return false
  }
}