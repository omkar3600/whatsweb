import { Injectable, Logger } from '@nestjs/common';

export interface TrafficRecord {
    timestamp: number;
    feature: string;
    route: string;
    method: string;
    statusCode: number;
    responseBytes: number;
    durationMs: number;
    isStorage?: boolean;
}

export interface FeatureMetrics {
    feature: string;
    requestCount: number;
    totalBytes: number;
    averageBytes: number;
    largestBytes: number;
    avgDurationMs: number;
    errorCount: number;
    lastRequestAt: string;
}

export interface AnomalyWarning {
    timestamp: string;
    feature: string;
    route: string;
    reason: string;
    details: string;
}

@Injectable()
export class TrafficMonitorService {
    private readonly logger = new Logger(TrafficMonitorService.name);
    private readonly isDebug = process.env.TRAFFIC_DEBUG === 'true';

    // In-memory sliding window of recent traffic (max 5,000 records)
    private readonly maxRecords = 5000;
    private recentRecords: TrafficRecord[] = [];
    private anomalies: AnomalyWarning[] = [];
    private readonly bootTime = Date.now();

    // Feature cumulative counters
    private cumulativeByFeature = new Map<string, {
        requestCount: number;
        totalBytes: number;
        largestBytes: number;
        totalDurationMs: number;
        errorCount: number;
        lastRequestAt: number;
    }>();

    // Endpoint cumulative counters
    private cumulativeByEndpoint = new Map<string, {
        requestCount: number;
        totalBytes: number;
        largestBytes: number;
    }>();

    // Rate limiter tracker for anomaly detection
    private rateTracker = new Map<string, number[]>();

    recordRequest(param: {
        route: string;
        method: string;
        statusCode: number;
        responseBytes: number;
        durationMs: number;
        isStorage?: boolean;
    }) {
        const feature = this.classifyFeature(param.route);
        const now = Date.now();

        const record: TrafficRecord = {
            timestamp: now,
            feature,
            route: param.route,
            method: param.method,
            statusCode: param.statusCode,
            responseBytes: param.responseBytes,
            durationMs: param.durationMs,
            isStorage: param.isStorage,
        };

        if (this.recentRecords.length >= this.maxRecords) {
            this.recentRecords.shift();
        }
        this.recentRecords.push(record);

        const current = this.cumulativeByFeature.get(feature) || {
            requestCount: 0,
            totalBytes: 0,
            largestBytes: 0,
            totalDurationMs: 0,
            errorCount: 0,
            lastRequestAt: now,
        };
        current.requestCount += 1;
        current.totalBytes += param.responseBytes;
        current.largestBytes = Math.max(current.largestBytes, param.responseBytes);
        current.totalDurationMs += param.durationMs;
        current.lastRequestAt = now;
        if (param.statusCode >= 400) current.errorCount += 1;
        this.cumulativeByFeature.set(feature, current);

        const normalizedRoute = this.normalizeRoute(param.route);
        const epStat = this.cumulativeByEndpoint.get(normalizedRoute) || {
            requestCount: 0,
            totalBytes: 0,
            largestBytes: 0,
        };
        epStat.requestCount += 1;
        epStat.totalBytes += param.responseBytes;
        epStat.largestBytes = Math.max(epStat.largestBytes, param.responseBytes);
        this.cumulativeByEndpoint.set(normalizedRoute, epStat);

        if (param.responseBytes > 1024 * 1024) {
            this.recordAnomaly({
                timestamp: new Date(now).toISOString(),
                feature,
                route: param.route,
                reason: 'LARGE_PAYLOAD',
                details: `Response size was ${(param.responseBytes / (1024 * 1024)).toFixed(2)} MB (> 1MB threshold)`,
            });
        }

        const recentTimestamps = (this.rateTracker.get(normalizedRoute) || []).filter(t => now - t < 5000);
        recentTimestamps.push(now);
        this.rateTracker.set(normalizedRoute, recentTimestamps);
        if (recentTimestamps.length > 15) {
            this.recordAnomaly({
                timestamp: new Date(now).toISOString(),
                feature,
                route: param.route,
                reason: 'RAPID_BURST_POLLING',
                details: `${recentTimestamps.length} calls in 5 seconds to ${normalizedRoute}`,
            });
        }

        if (this.isDebug) {
            this.logger.log(`[TRAFFIC] feature=${feature} method=${param.method} route=${param.route} bytes=${param.responseBytes} duration=${param.durationMs}ms status=${param.statusCode}`);
        }
    }

    private recordAnomaly(anomaly: AnomalyWarning) {
        if (this.anomalies.length >= 100) this.anomalies.shift();
        this.anomalies.push(anomaly);
        this.logger.warn(`[TRAFFIC_ANOMALY] ${anomaly.reason} on ${anomaly.route}: ${anomaly.details}`);
    }

    classifyFeature(route: string): string {
        const r = route.toLowerCase();
        if (r.startsWith('/conversations') || r.startsWith('/messages') || r.startsWith('/chat')) return 'inbox';
        if (r.startsWith('/contacts')) return 'contacts';
        if (r.startsWith('/campaigns')) return 'campaigns';
        if (r.startsWith('/shops/me') || r.startsWith('/shops/stats') || r.startsWith('/shops/overview')) return 'dashboard';
        if (r.startsWith('/media')) return 'storage_media';
        if (r.startsWith('/whatsapp/webhook')) return 'whatsapp_webhooks';
        if (r.startsWith('/whatsapp')) return 'whatsapp_api';
        if (r.startsWith('/ai') || r.startsWith('/chatbot')) return 'ai_agent';
        if (r.startsWith('/workflows')) return 'workflows';
        if (r.startsWith('/auth') || r.startsWith('/users')) return 'authentication';
        if (r.startsWith('/admin')) return 'admin';
        if (r.startsWith('/templates')) return 'templates';
        return 'system';
    }

    private normalizeRoute(route: string): string {
        return route
            .split('?')[0]
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
            .replace(/\/[0-9]+/g, '/:id');
    }

    getTrafficSummary(timeWindowMinutes: number = 0) {
        const now = Date.now();
        const cutoff = timeWindowMinutes > 0 ? now - timeWindowMinutes * 60 * 1000 : 0;

        const filtered = cutoff > 0
            ? this.recentRecords.filter(r => r.timestamp >= cutoff)
            : this.recentRecords;

        const featureMap = new Map<string, { count: number; bytes: number; maxBytes: number; duration: number; errors: number; lastTime: number }>();
        for (const r of filtered) {
            const f = featureMap.get(r.feature) || { count: 0, bytes: 0, maxBytes: 0, duration: 0, errors: 0, lastTime: 0 };
            f.count += 1;
            f.bytes += r.responseBytes;
            f.maxBytes = Math.max(f.maxBytes, r.responseBytes);
            f.duration += r.durationMs;
            f.lastTime = Math.max(f.lastTime, r.timestamp);
            if (r.statusCode >= 400) f.errors += 1;
            featureMap.set(r.feature, f);
        }

        let totalNetworkBytes = 0;
        let totalRequestCount = 0;
        const features: FeatureMetrics[] = [];

        for (const [feat, data] of featureMap.entries()) {
            totalNetworkBytes += data.bytes;
            totalRequestCount += data.count;
            features.push({
                feature: feat,
                requestCount: data.count,
                totalBytes: data.bytes,
                averageBytes: data.count > 0 ? Math.round(data.bytes / data.count) : 0,
                largestBytes: data.maxBytes,
                avgDurationMs: data.count > 0 ? Math.round(data.duration / data.count) : 0,
                errorCount: data.errors,
                lastRequestAt: data.lastTime > 0 ? new Date(data.lastTime).toISOString() : 'never',
            });
        }

        features.sort((a, b) => b.totalBytes - a.totalBytes);

        const topEndpoints = Array.from(this.cumulativeByEndpoint.entries())
            .map(([endpoint, stat]) => ({
                endpoint,
                requestCount: stat.requestCount,
                totalBytes: stat.totalBytes,
                averageBytes: stat.requestCount > 0 ? Math.round(stat.totalBytes / stat.requestCount) : 0,
                largestBytes: stat.largestBytes,
            }))
            .sort((a, b) => b.totalBytes - a.totalBytes)
            .slice(0, 10);

        return {
            status: 'operational',
            uptimeSeconds: Math.round((now - this.bootTime) / 1000),
            observedWindowMinutes: timeWindowMinutes || 'all_time_session',
            totalRequests: totalRequestCount,
            totalEgressBytes: totalNetworkBytes,
            totalEgressFormatted: this.formatBytes(totalNetworkBytes),
            features,
            topEndpoints,
            recentAnomalies: this.anomalies.slice(-10),
            timestamp: new Date().toISOString(),
        };
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
