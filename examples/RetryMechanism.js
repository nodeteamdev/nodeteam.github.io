class RetryError extends Error {
    constructor(originalError, attempts, duration) {
        super(originalError.message);
        this.name = 'RetryError';
        this.originalError = originalError;
        this.attempts = attempts;
        this.duration = duration;
    }
}

class ExponentialBackoffRetry {
    constructor(options = {}) {
        this.baseDelay = options.baseDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.maxRetries = options.maxRetries || 5;
        this.jitter = options.jitter || true;
    }

    async execute(fn) {
        let retries = 0;

        while (true) {
            try {
                return await fn();
            } catch (error) {
                if (retries >= this.maxRetries) {
                    throw new Error(`Failed after ${retries} retries: ${error.message}`);
                }

                const delay = this.calculateDelay(retries);
                await this.wait(delay);
                retries++;
            }
        }
    }

    calculateDelay(retryCount) {
        // Calculate exponential delay: 2^retryCount * baseDelay
        let delay = Math.min(
            this.maxDelay,
            Math.pow(2, retryCount) * this.baseDelay
        );

        // Add jitter to prevent thundering herd problem
        if (this.jitter) {
            delay = delay * (0.5 + Math.random());
        }

        return delay;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000;
        this.failures = 0;
        this.state = 'CLOSED';
        this.lastFailureTime = null;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failures = 0;
            }
            return result;
        } catch (error) {
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.failures >= this.failureThreshold) {
                this.state = 'OPEN';
            }
            throw error;
        }
    }
}

class RetryMechanism {
    constructor(options = {}) {
        this.retrier = new ExponentialBackoffRetry(options.retry);
        this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
        this.logger = options.logger || console;
    }

    async execute(fn, context = {}) {
        const startTime = Date.now();
        let attempts = 0;

        try {
            return await this.circuitBreaker.execute(async () => {
                return await this.retrier.execute(async () => {
                    attempts++;
                    try {
                        const result = await fn();
                        this.logSuccess(context, attempts, startTime);
                        return result;
                    } catch (error) {
                        this.logFailure(context, attempts, error);
                        throw error;
                    }
                });
            });
        } catch (error) {
            throw new RetryError(error, attempts, Date.now() - startTime);
        }
    }

    logSuccess(context, attempts, startTime) {
        this.logger.info({
            event: 'retry_success',
            context,
            attempts,
            duration: Date.now() - startTime
        });
    }

    logFailure(context, attempts, error) {
        this.logger.error({
            event: 'retry_failure',
            context,
            attempts,
            error: error.message
        });
    }
}

const retrySystem = new RetryMechanism({
    retry: {
        baseDelay: 1000,
        maxDelay: 30000,
        maxRetries: 5
    },
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000
    }
});

// Database operation with retry
async function fetchUserData(userId) {
    return retrySystem.execute(
        async () => {
            const user = await db.users.findById(userId);
            if (!user) throw new Error('User not found');
            return user;
        },
        { operation: 'fetchUserData', userId }
    );
}

fetchUserData('user123')
    .then(user => console.log('User:', user))
    .catch(error => console.error('Error:', error));


// API call with retry
async function updateUserProfile(userId, data) {
    return retrySystem.execute(
        async () => {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('API request failed');
            return response.json();
        },
        { operation: 'updateUserProfile', userId }
    );
}

updateUserProfile('user123', { name: 'Alice' })
    .then(response => console.log('Response:', response))
    .catch(error => console.error('Error:', error));
