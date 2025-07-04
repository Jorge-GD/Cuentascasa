import RedisClient from './client';
import { RedisClientType } from 'redis';

export class CacheManager {
  private redis: RedisClientType;
  private defaultTTL = 1800; // 30 minutos por defecto
  private keyPrefix = 'gastos-casa:'; // Prefijo para todas las keys

  constructor() {
    const redisInstance = RedisClient.getInstance();
    this.redis = redisInstance.getClient();
  }

  // Método principal: obtener del cache o ejecutar función
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
      
      // Cache MISS - ejecutar función y cachear resultado
      console.log(`📊 Cache MISS: ${key} - Calculando...`);
      const data = await fetchFunction();
      
      // Guardar en cache
      await this.redis.setEx(fullKey, ttl, JSON.stringify(data));
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
      
      return data;
    } catch (error) {
      console.error(`❌ Cache error para ${key}:`, error);
      // Fallback: ejecutar función directamente sin cache
      console.log(`🔄 Fallback: ejecutando función directamente para ${key}`);
      return await fetchFunction();
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

  // Invalidar múltiples keys por patrón
  async invalidatePattern(pattern: string): Promise<void> {
    const fullPattern = this.keyPrefix + pattern;
    
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        console.log(`🗑️ Invalidados ${keys.length} caches con patrón: ${pattern}`);
      } else {
        console.log(`🔍 No se encontraron caches con patrón: ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ Error invalidando patrón ${pattern}:`, error);
    }
  }

  // Limpiar todo el cache
  async clear(): Promise<void> {
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      // Solo limpiar keys con nuestro prefijo
      const keys = await this.redis.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await this.redis.del(keys);
        console.log(`🧹 Cache limpiado: ${keys.length} keys eliminadas`);
      } else {
        console.log('🧹 Cache ya estaba vacío');
      }
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }

  // Obtener todas las keys del cache
  async getKeys(): Promise<string[]> {
    try {
      const redisInstance = RedisClient.getInstance();
      if (!redisInstance.isConnected()) {
        await redisInstance.connect();
      }

      const keys = await this.redis.keys(this.keyPrefix + '*');
      return keys.map(key => key.replace(this.keyPrefix, ''));
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