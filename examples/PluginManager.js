const fs = require('fs');

class PluginManager {
    #plugins = new Map();
    #hooks = new Map();

    async registerPlugin(plugin) {
        // Validate plugin structure
        if (!plugin.name || !plugin.version) {
            throw new Error('Plugin must have name and version properties');
        }

        if (this.#plugins.has(plugin.name)) {
            throw new Error(`Plugin ${plugin.name} is already registered`);
        }

        // Initialize plugin if needed
        if (typeof plugin.initialize === 'function') {
            try {
                await plugin.initialize();
            } catch (error) {
                throw new Error(`Failed to initialize plugin ${plugin.name}: ${error.message}`);
            }
        }

        // Register plugin hooks
        for (const [hookName, hookFn] of Object.entries(plugin.hooks || {})) {
            if (!this.#hooks.has(hookName)) {
                this.#hooks.set(hookName, new Set());
            }
            this.#hooks.get(hookName).add(hookFn);
        }

        this.#plugins.set(plugin.name, plugin);
        console.log(`Plugin ${plugin.name} v${plugin.version} registered successfully`);
    }

    async executeHook(hookName, ...args) {
        const hooks = this.#hooks.get(hookName);
        if (!hooks) {
            return [];
        }

        const results = [];
        for (const hook of hooks) {
            try {
                const result = await hook(...args);
                results.push(result);
            } catch (error) {
                console.error(`Error executing hook ${hookName}: ${error.message}`);
                results.push(null);
            }
        }
        return results;
    }

    async unregisterPlugin(pluginName) {
        const plugin = this.#plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} is not registered`);
        }

        // Remove plugin hooks
        for (const [hookName, hooks] of this.#hooks.entries()) {
            for (const hookFn of Object.values(plugin.hooks || {})) {
                hooks.delete(hookFn);
            }
            if (hooks.size === 0) {
                this.#hooks.delete(hookName);
            }
        }

        // Shutdown plugin if needed
        if (typeof plugin.shutdown === 'function') {
            try {
                await plugin.shutdown();
            } catch (error) {
                console.error(`Error shutting down plugin ${pluginName}: ${error.message}`);
            }
        }

        this.#plugins.delete(pluginName);
        console.log(`Plugin ${pluginName} unregistered successfully`);
    }

    getPlugin(pluginName) {
        return this.#plugins.get(pluginName);
    }

    listPlugins() {
        return Array.from(this.#plugins.entries()).map(([name, plugin]) => ({
            name,
            version: plugin.version
        }));
    }
}

// Console Logger Plugin
const consoleLoggerPlugin = {
    name: 'console-logger',
    version: '1.0.0',
    hooks: {
        'onLog': async (level, message) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${level}: ${message}`);
        }
    }
};

// File Logger Plugin
const fileLoggerPlugin = {
    name: 'file-logger',
    version: '1.0.0',
    initialize: async () => {
        // Setup file handles, create directories, etc.
        await fs.promises.mkdir('./logs', { recursive: true });
    },
    shutdown: async () => {
        // Close file handles, etc.
    },
    hooks: {
        'onLog': async (level, message) => {
            const timestamp = new Date().toISOString();
            const logLine = `[${timestamp}] ${level}: ${message}\n`;
            await fs.promises.appendFile('./logs/app.log', logLine);
        }
    }
};

// Slack Notification Plugin (for error logs only)
const slackNotifierPlugin = {
    name: 'slack-notifier',
    version: '1.0.0',
    initialize: async () => {
        // Initialize Slack client
    },
    hooks: {
        'onLog': async (level, message) => {
            if (level === 'ERROR') {
                // Send it to Slack (implementation omitted for brevity)
                await sendToSlack(`🚨 Error: ${message}`);
            }
        }
    }
};

async function main() {
    // Create plugin manager instance
    const pluginManager = new PluginManager();

    // Register plugins
    await pluginManager.registerPlugin(consoleLoggerPlugin);
    await pluginManager.registerPlugin(fileLoggerPlugin);
    await pluginManager.registerPlugin(slackNotifierPlugin);

    // Create a logging function that uses the plugins
    async function log(level, message) {
        await pluginManager.executeHook('onLog', level, message);
    }

    // Example usage
    await log('INFO', 'Application started');
    await log('ERROR', 'Failed to connect to database');

    // List all registered plugins
    console.log('Registered plugins:', pluginManager.listPlugins());

    // Cleanup
    await pluginManager.unregisterPlugin('slack-notifier');
}

main().catch(console.error);
