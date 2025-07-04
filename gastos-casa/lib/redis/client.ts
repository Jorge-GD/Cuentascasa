import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private connected: boolean = false;
  private connecting: boolean = false;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 5000,
      }
    });

    // Event listeners
    this.client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('🔗 Redis conectando...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis conectado y listo');
      this.connected = true;
      this.connecting = false;
    });

    this.client.on('end', () => {
      console.log('📴 Redis desconectado');
      this.connected = false;
      this.connecting = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconectando...');
      this.connecting = true;
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    try {
      this.connecting = true;
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('❌ Error conectando a Redis:', error);
      this.connecting = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
      this.connected = false;
      this.connecting = false;
    } catch (error) {
      console.error('❌ Error desconectando Redis:', error);
    }
  }

  isConnected(): boolean {
    return this.connected && this.client.isOpen;
  }

  isConnecting(): boolean {
    return this.connecting;
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // Método de conveniencia para verificar conectividad
  async ping(): Promise<string> {
    if (!this.isConnected()) {
      await this.connect();
    }
    return await this.client.ping();
  }

  // Método para obtener estadísticas básicas
  async getStats(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Redis no está conectado');
    }

    try {
      const info = await this.client.info();
      const dbSize = await this.client.dbSize();
      
      return {
        connected: this.isConnected(),
        dbSize,
        info: info,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats de Redis:', error);
      throw error;
    }
  }
}

export default RedisClient;