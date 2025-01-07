
# Node.js Advanced Patterns

## Table of Contents

- [Dependency Injection Container](./examples/DependencyInjectionContainer.js)
![Dependency Injection Container](./assets/img/di-container-diagram.svg)
    - Dynamic dependency management
    - Service registration and resolution
    - Supports complex dependency graphs
```bash
    $ node run example:4
```
> Full article: https://medium.com/@v-checha/node-js-advanced-patterns-stream-transformations-2a5c2fa6f590

- Circuit Breaker Pattern
    - Prevents cascading failures
    - Automatic recovery mechanism
    - Configurable failure thresholds
    - Different circuit states (CLOSED, OPEN, HALF_OPEN)


- [Streaming Transformer](./examples/StreamTransformer.js)
![Stream Transformer](./assets/img/stream-transformer-diagram.svg)
    - Advanced stream processing
    - Composable transformation streams
    - Supports async transformations
    - Easy stream composition
  
  ```bash
    $ node run example:1
  ```
> Full article: https://medium.com/@v-checha/node-js-advanced-patterns-stream-transformations-2a5c2fa6f590

- [Robust Retry Mechanism](./examples/RetryMechanism.js)
![Retry Mechanism](./assets/img/retry-mechanism-diagram.svg)
    - Exponential backoff with jitter
    - Configurable retry strategies
    - Prevents thundering herd problem
    - Intelligent delay calculation

  ```bash
    $ node run example:2
  ```
> Full Article: https://medium.com/@v-checha/advanced-node-js-patterns-implementing-robust-retry-logic-656cf70f8ee9


- [Adaptive Rate Limiter](./examples/AdaptiveRateLimiter.js)
![Adaptive Rate Limiter](./assets/img/rate-limiter-diagram.svg)
    - Dynamic request throttling
    - Adaptive threshold management
    - Prevents system overload
    - Flexible configuration

  ```bash
    $ node run example:3
  ```
  
> Full article: https://medium.com/@v-checha/node-js-advanced-patterns-adaptive-rate-limiter-aa8221177162


- Dynamic Plugin System
    - Runtime plugin loading
    - Hot-reload capabilities
    - Safe plugin execution
    - Error-tolerant plugin management
