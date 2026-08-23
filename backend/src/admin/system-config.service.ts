import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SystemConfigService — manages admin-configurable platform settings
 * stored in the SystemConfig table. These override environment variables
 * at runtime so admins can change Meta credentials without a server restart.
 */
@Injectable()
export class SystemConfigService {
    private readonly logger = new Logger(SystemConfigService.name);
    private cache: Record<string, string> = {};
    private cacheLoadedAt: Date | null = null;
    private readonly cacheTtlMs = 60_000; // 1 minute

    constructor(private prisma: PrismaService) {}

    /** Load all config entries into an in-memory cache. */
    private async loadCache(): Promise<void> {
        const rows = await this.prisma.systemConfig.findMany();
        this.cache = {};
        for (const row of rows) {
            this.cache[row.key] = row.value;
        }
        this.cacheLoadedAt = new Date();
    }

    /** Get a config value — falls back to the environment variable if not in DB. */
    async get(key: string, envFallback?: string): Promise<string | undefined> {
        const now = Date.now();
        const stale = !this.cacheLoadedAt || (now - this.cacheLoadedAt.getTime()) > this.cacheTtlMs;
        if (stale) await this.loadCache();

        return this.cache[key] ?? envFallback ?? process.env[key];
    }

    /** Upsert a config key. */
    async set(key: string, value: string, isSecret = false, updatedBy?: string): Promise<void> {
        await this.prisma.systemConfig.upsert({
            where: { key },
            create: { id: require('crypto').randomUUID(), key, value, isSecret, updatedBy },
            update: { value, isSecret, updatedBy },
        });
        this.cache[key] = value; // Invalidate cache entry immediately
        this.logger.log(`[SystemConfig] Set key="${key}" (secret=${isSecret}) by ${updatedBy || 'system'}`);
    }

    /** Get all config entries (values of secret keys are masked). */
    async getAll(): Promise<Array<{ key: string; value: string; isSecret: boolean; updatedAt: Date; updatedBy: string | null }>> {
        const rows = await this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
        return rows.map(r => ({
            key: r.key,
            value: r.isSecret ? '••••••••' : r.value,
            isSecret: r.isSecret,
            updatedAt: r.updatedAt,
            updatedBy: r.updatedBy,
        }));
    }

    /** Delete a config key (reverts to env var fallback). */
    async delete(key: string): Promise<void> {
        await this.prisma.systemConfig.deleteMany({ where: { key } });
        delete this.cache[key];
        this.logger.log(`[SystemConfig] Deleted key="${key}"`);
    }

    /** Invalidate the cache — call after bulk updates. */
    invalidateCache(): void {
        this.cacheLoadedAt = null;
        this.cache = {};
    }
}
