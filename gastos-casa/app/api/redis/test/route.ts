import { NextResponse } from 'next/server';
import { cacheManager } from '@/lib/redis/cache-manager';
import RedisClient from '@/lib/redis/client';

export async function GET() {
  try {
    console.log('🧪 Iniciando test de Redis...');
    
    // Test 1: Verificar conexión
    const redisInstance = RedisClient.getInstance();
    const pingResult = await redisInstance.ping();
    
    // Test 2: Operaciones básicas de cache
    const testKey = 'test:basic';
    const testData = {
      message: 'Hello Redis!',
      timestamp: new Date().toISOString(),
      randomNumber: Math.floor(Math.random() * 1000)
    };
    
    // Guardar en cache
    await cacheManager.set(testKey, testData, 60); // 1 minuto TTL
    
    // Recuperar del cache
    const cachedData = await cacheManager.get(testKey);
    
    // Test 3: Verificar getOrSet
    const complexData = await cacheManager.getOrSet(
      'test:complex',
      async () => {
        // Simular operación costosa
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          calculation: 'Esta sería una operación costosa',
          result: Math.PI * 42,
          categories: ['Alimentación', 'Transporte', 'Ocio'],
          timestamp: new Date().toISOString()
        };
      },
      300 // 5 minutos TTL
    );
    
    // Test 4: Obtener estadísticas
    const stats = await redisInstance.getStats();
    const cacheKeys = await cacheManager.getKeys();
    
    return NextResponse.json({
      success: true,
      message: '✅ Redis funcionando correctamente',
      tests: {
        connection: {
          ping: pingResult,
          connected: redisInstance.isConnected()
        },
        basicOperations: {
          stored: testData,
          retrieved: cachedData,
          match: JSON.stringify(testData) === JSON.stringify(cachedData)
        },
        complexOperation: {
          data: complexData,
          cached: true
        },
        stats: {
          totalKeys: cacheKeys.length,
          keys: cacheKeys,
          redisInfo: {
            dbSize: stats.dbSize,
            connected: stats.connected
          }
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en test de Redis:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      message: '❌ Redis no está funcionando correctamente',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Test de limpieza de cache
    await cacheManager.clear();
    
    return NextResponse.json({
      success: true,
      message: '🧹 Cache limpiado correctamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error limpiando cache:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}