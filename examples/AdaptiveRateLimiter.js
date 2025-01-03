const express = require('express');
const app = express();

class AdaptiveRateLimiter {
    constructor(options = {}) {
        this.baseLimit = options.baseLimit || 100;
        this.windowMs = options.windowMs || 60000;
        this.minLimit = options.minLimit || 10;
        this.maxLimit = options.maxLimit || 1000;

        this.currentLimit = this.baseLimit;
        this.requests = new Map();
        this.metrics = {
            successCount: 0,
            errorCount: 0,
            avgResponseTime: 0
        };
    }

    async isAllowed(clientId) {
        this.cleanup();
        await this.updateMetrics();

        const clientRequests = this.requests.get(clientId) || [];
        const windowStart = Date.now() - this.windowMs;
        const recentRequests = clientRequests.filter(time => time > windowStart);

        if (recentRequests.length >= this.currentLimit) {
            return false;
        }

        recentRequests.push(Date.now());
        this.requests.set(clientId, recentRequests);
        return true;
    }

    cleanup() {
        const windowStart = Date.now() - this.windowMs;
        for (const [clientId, requests] of this.requests.entries()) {
            const validRequests = requests.filter(time => time > windowStart);
            if (validRequests.length === 0) {
                this.requests.delete(clientId);
            } else {
                this.requests.set(clientId, validRequests);
            }
        }
    }

    async updateMetrics() {
        const systemLoad = await this.getSystemMetrics();
        const errorRate = this.metrics.errorCount /
            (this.metrics.successCount + this.metrics.errorCount || 1);

        this.adjustLimit(systemLoad, errorRate);
    }

    adjustLimit(systemLoad, errorRate) {
        let multiplier = 1;

        // Adjust based on system load
        if (systemLoad > 0.8) multiplier *= 0.8;
        else if (systemLoad < 0.3) multiplier *= 1.2;

        // Adjust based on error rate
        if (errorRate > 0.1) multiplier *= 0.7;
        else if (errorRate < 0.01) multiplier *= 1.1;

        this.currentLimit = Math.min(
            this.maxLimit,
            Math.max(
                this.minLimit,
                Math.floor(this.currentLimit * multiplier)
            )
        );
    }

    async getSystemMetrics() {
        const usage = process.cpuUsage();
        return (usage.user + usage.system) / 1000000; // Convert to seconds
    }
}

class EnhancedAdaptiveRateLimiter extends AdaptiveRateLimiter {
    constructor(options = {}) {
        super(options);
        this.metricsWindow = new Array(10).fill({
            timestamp: Date.now(),
            cpuLoad: 0,
            memoryUsage: 0,
            responseTime: 0,
            errorRate: 0
        });
    }

    async collectMetrics() {
        const metrics = {
            timestamp: Date.now(),
            cpuLoad: await this.getCPULoad(),
            memoryUsage: await this.getMemoryUsage(),
            responseTime: this.metrics.avgResponseTime,
            errorRate: this.getErrorRate()
        };

        this.metricsWindow.shift();
        this.metricsWindow.push(metrics);

        return this.analyzeMetrics();
    }

    analyzeMetrics() {
        const recent = this.metricsWindow.slice(-3);
        const trend = {
            cpuLoad: this.calculateTrend(recent, 'cpuLoad'),
            responseTime: this.calculateTrend(recent, 'responseTime'),
            errorRate: this.calculateTrend(recent, 'errorRate')
        };

        return trend;
    }

    calculateTrend(metrics, key) {
        if (metrics.length < 2) return 0;
        const values = metrics.map(m => m[key]);
        const delta = values[values.length - 1] - values[0];
        return delta / values[0];
    }

    async getCPULoad() {
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 100));
        const endUsage = process.cpuUsage(startUsage);
        return (endUsage.user + endUsage.system) / 1000000;
    }

    async getMemoryUsage() {
        const used = process.memoryUsage();
        return used.heapUsed / used.heapTotal;
    }

    getErrorRate() {
        const total = this.metrics.successCount + this.metrics.errorCount;
        return total ? this.metrics.errorCount / total : 0;
    }
}

const limiter = new EnhancedAdaptiveRateLimiter({
    baseLimit: 3,
    windowMs: 60000
});

app.get('/', async (req, res, next) => {
    const clientId = req.ip;
    const startTime = Date.now();

    try {
        const allowed = await limiter.isAllowed(clientId);
        if (!allowed) {
            return res.status(429).json({
                error: 'Too Many Requests',
                currentLimit: limiter.currentLimit,
                retryAfter: Math.ceil(limiter.windowMs / 1000)
            });
        }

        const duration = Date.now() - startTime;

        if (res.statusCode >= 500) {
            limiter.metrics.errorCount++;
        } else {
            limiter.metrics.successCount++;
        }
        limiter.metrics.avgResponseTime =
            (limiter.metrics.avgResponseTime + duration) / 2;

        res.json(limiter);
    } catch (error) {
        next(error);
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
