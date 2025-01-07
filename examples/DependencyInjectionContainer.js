class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    // Register a service with its implementation
    register(name, Implementation, dependencies = []) {
        this.services.set(name, {
            Implementation,
            dependencies,
            singleton: false
        });
        return this;
    }

    // Register a singleton service
    registerSingleton(name, Implementation, dependencies = []) {
        this.services.set(name, {
            Implementation,
            dependencies,
            singleton: true
        });
        return this;
    }

    // Resolve a service and its dependencies
    resolve(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not registered`);
        }

        if (service.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        const dependencies = service.dependencies.map(dep => this.resolve(dep));
        const instance = new service.Implementation(...dependencies);

        if (service.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }
}

class EmailService {
    async sendOrderConfirmation(user, productId) {
        // Implementation
        console.log('Order confirmation sent', user, productId);
    }
}

class PaymentService {
    async processPayment(amount, userId) {
        // Implementation
        console.log('Payment processed', amount, userId);
    }
}

class OrderService {
    constructor(emailService, paymentService) {
        this.emailService = emailService;
        this.paymentService = paymentService;
    }

    async createOrder(userId, productId) {
        const email = await this.emailService.sendOrderConfirmation(userId, productId);
        const payment = await this.paymentService.processPayment(100, userId);
        // Implementation
    }
}

const container = new DIContainer();

// Register services
container.registerSingleton('emailService', EmailService);
container.registerSingleton('paymentService', PaymentService);

// Register OrderService with its dependencies
container.register('orderService', OrderService, [
    'emailService',
    'paymentService'
]);

// Resolve the OrderService when needed
const orderService = container.resolve('orderService');

orderService.createOrder(1, 2);
