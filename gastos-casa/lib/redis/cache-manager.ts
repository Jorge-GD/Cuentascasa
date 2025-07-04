import RedisClient from './client';
import { RedisClientType } from 'redis';

export class CacheManager {
  private redis: RedisClientType;
  private defaultTTL = 1800; // 30 minutos por defecto
  private keyPrefix = 'gastos-casa:'; // Prefijo para todas las keys
  private lockPrefix = 'lock:'; // Prefijo para locks
  private pendingRequests = new Map<string, Promise<any>>(); // In-memory lock para el mismo proceso

  constructor() {
    const redisInstance = RedisClient.getInstance();
    this.redis = redisInstance.getClient();
  }

  // Método principal: obtener del cache o ejecutar función (con protección thundering herd)
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const fullKey = this.keyPrefix + key;
    
    try {
      // Asegurar conexión
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      // Intentar obtener del cache
      const cached = await this.redis.get(fullKey);
      
      if (cached) {
        console.log(`🚀 Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      
      // Cache MISS - verificar si ya hay una request en proceso para esta key
      if (this.pendingRequests.has(key)) {
        console.log(`⏳ Esperando request existente para: ${key}`);
        return await this.pendingRequests.get(key);
      }

      // Crear lock distribuido usando Redis SET NX
      const lockKey = this.keyPrefix + this.lockPrefix + key;
      const lockValue = Date.now().toString();
      const lockTTL = 30; // 30 segundos de lock máximo
      
      const lockAcquired = await this.redis.set(lockKey, lockValue, {
        NX: true, // Solo establecer si no existe
        EX: lockTTL // Expirar después de 30 segundos
      });
      
      if (!lockAcquired) {
        // No pudimos obtener el lock, otro proceso está calculando
        console.log(`🔒 Lock ocupado para ${key}, esperando...`);
        
        // Esperar un poco y intentar obtener del cache otra vez
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        const cachedAfterWait = await this.redis.get(fullKey);
        if (cachedAfterWait) {
          console.log(`🚀 Cache HIT después de esperar: ${key}`);
          return JSON.parse(cachedAfterWait);
        }
        
        // Si aún no está en cache, ejecutar la función sin lock
        console.log(`⚡ Ejecutando sin lock para ${key}`);
        return await fetchFunction();
      }
      
      // Tenemos el lock, crear promise y agregarlo al mapa
      const promise = this._executeWithLock<T>(key, fetchFunction, ttl, lockKey, lockValue);
      this.pendingRequests.set(key, promise);
      
      try {
        const result = await promise;
        return result;
      } finally {
        // Limpiar el request pendiente
        this.pendingRequests.delete(key);
      }
      
    } catch (error) {
      console.error(`❌ Cache error para ${key}:`, error);
      // Fallback: ejecutar función directamente sin cache
      console.log(`🔄 Fallback: ejecutando función directamente para ${key}`);
      return await fetchFunction();
    }
  }

  // Método privado para ejecutar función con lock
  private async _executeWithLock<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number,
    lockKey: string,
    lockValue: string
  ): Promise<T> {
    const fullKey = this.keyPrefix + key;
    
    try {
      console.log(`📊 Cache MISS con lock: ${key} - Calculando...`);
      const data = await fetchFunction();
      
      // Guardar en cache
      await this.redis.setEx(fullKey, ttl, JSON.stringify(data));
      console.log(`💾 Cached con lock: ${key} (TTL: ${ttl}s)`);
      
      return data;
    } finally {
      // Liberar el lock verificando que sea nuestro lock
      try {
        const currentLockValue = await this.redis.get(lockKey);
        if (currentLockValue === lockValue) {
          await this.redis.del(lockKey);
          console.log(`🔓 Lock liberado para: ${key}`);
        }
      } catch (lockError) {
        console.error(`❌ Error liberando lock para ${key}:`, lockError);
      }
    }
  }

  // Obtener del cache (sin fallback)
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      const cached = await this.redis.get(fullKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`❌ Error obteniendo cache ${key}:`, error);
      return null;
    }
  }

  // Establecer en cache
  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      await this.redis.setEx(fullKey, ttl, JSON.stringify(value));
      console.log(`💾 Set cache: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`❌ Error estableciendo cache ${key}:`, error);
    }
  }

  // Eliminar del cache
  async del(key: string): Promise<void> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      await this.redis.del(fullKey);
      console.log(`🗑️ Deleted cache: ${key}`);
    } catch (error) {
      console.error(`❌ Error eliminando cache ${key}:`, error);
    }
  }

  // Invalidar múltiples keys por patrón (usando SCAN para mejor rendimiento)
  async invalidatePattern(pattern: string): Promise<void> {
    const fullPattern = this.keyPrefix + pattern;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      let cursor = 0;
      let totalDeleted = 0;
      const batchSize = 100; // Procesar en lotes de 100 keys
      
      do {
        const result = await this.redis.scan(cursor, {
          MATCH: fullPattern,
          COUNT: batchSize
        });
        
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await this.redis.del(keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== 0);
      
      if (totalDeleted > 0) {
        console.log(`🗑️ Invalidados ${totalDeleted} caches con patrón: ${pattern}`);
      } else {
        console.log(`🔍 No se encontraron caches con patrón: ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ Error invalidando patrón ${pattern}:`, error);
    }
  }

  // Limpiar todo el cache (usando SCAN)
  async clear(): Promise<void> {
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      let cursor = 0;
      let totalDeleted = 0;
      const batchSize = 100;
      
      do {
        const result = await this.redis.scan(cursor, {
          MATCH: this.keyPrefix + '*',
          COUNT: batchSize
        });
        
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await this.redis.del(keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== 0);
      
      if (totalDeleted > 0) {
        console.log(`🧹 Cache limpiado: ${totalDeleted} keys eliminadas`);
      } else {
        console.log('🧹 Cache ya estaba vacío');
      }
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }

  // Obtener todas las keys del cache (usando SCAN)
  async getKeys(): Promise<string[]> {
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      const allKeys: string[] = [];
      let cursor = 0;
      const batchSize = 100;
      
      do {
        const result = await this.redis.scan(cursor, {
          MATCH: this.keyPrefix + '*',
          COUNT: batchSize
        });
        
        cursor = result.cursor;
        const keys = result.keys.map(key => key.replace(this.keyPrefix, ''));
        allKeys.push(...keys);
      } while (cursor !== 0);
      
      return allKeys;
    } catch (error) {
      console.error('❌ Error obteniendo keys:', error);
      return [];
    }
  }

  // Verificar si existe una key
  async exists(key: string): Promise<boolean> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      console.error(`❌ Error verificando existencia ${key}:`, error);
      return false;
    }
  }

  // Obtener tiempo de vida restante
  async getTTL(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error(`❌ Error obteniendo TTL ${key}:`, error);
      return -1;
    }
  }
}

// Instancia singleton del cache manager
export const cacheManager = new CacheManager();