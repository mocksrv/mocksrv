/**
 * Main server file for MockServer
 * @module server
 */

import express from 'express';
import { initializeStore } from './expectations/expectationStore.js';
import { requestHandler } from './request-handling/requestHandler.js';
import apiRoutes from './api/routes.js';
import { logVersionInfo, logServerStarted } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

const CONFIG = {
    HOST: process.env.MOCKSERVER_HOST || '0.0.0.0',
    PORT: process.env.NODE_PORT || process.env.PORT || 1080,

    LOG_LEVEL: process.env.MOCKSERVER_LOG_LEVEL || 'info',

    MAX_HEADER_SIZE: parseInt(process.env.MOCKSERVER_MAX_HEADER_SIZE || '8192', 10),

    INITIALIZATION_JSON_PATH: process.env.MOCKSERVER_INITIALIZATION_JSON_PATH || '',
    WATCH_INITIALIZATION_JSON: process.env.MOCKSERVER_WATCH_INITIALIZATION_JSON === 'true',

    PERSIST_EXPECTATIONS: process.env.MOCKSERVER_PERSIST_EXPECTATIONS !== 'false',
    PERSISTED_EXPECTATIONS_PATH: process.env.MOCKSERVER_PERSISTED_EXPECTATIONS_PATH || './data/expectations.json'
};

/**
 * Express application instance for the MockServer
 * @type {import('express').Express}
 */
const app = express();

if (CONFIG.MAX_HEADER_SIZE) {
    app.use(express.json({ limit: `${CONFIG.MAX_HEADER_SIZE}kb` }));
    app.use(express.text({ type: 'text/plain', limit: `${CONFIG.MAX_HEADER_SIZE}kb` }));
} else {
    app.use(express.json());
    app.use(express.text({ type: 'text/plain' }));
}

app.use(requestHandler);

app.use(apiRoutes);

/**
 * Loads expectations from an initialization JSON file
 * @returns {Promise<void>}
 */
async function loadInitializationExpectations() {
    if (!CONFIG.INITIALIZATION_JSON_PATH) return;

    try {
        if (!fs.existsSync(CONFIG.INITIALIZATION_JSON_PATH)) {
            console.warn(`Initialization file not found: ${CONFIG.INITIALIZATION_JSON_PATH}`);
            return;
        }

        const fileContent = fs.readFileSync(CONFIG.INITIALIZATION_JSON_PATH, 'utf8');
        const expectations = JSON.parse(fileContent);

        if (Array.isArray(expectations)) {
            console.log(`Loading ${expectations.length} expectations from initialization file`);
            for (const expectation of expectations) {
                await initializeStore.addExpectation(expectation);
            }
        } else {
            console.warn('Initialization file does not contain an array of expectations');
        }
    } catch (error) {
        console.error('Failed to load initialization expectations:', error);
    }
}

/**
 * Sets up file watcher for initialization JSON if enabled
 */
function setupInitializationFileWatcher() {
    if (!CONFIG.WATCH_INITIALIZATION_JSON || !CONFIG.INITIALIZATION_JSON_PATH) return;

    try {
        fs.watch(CONFIG.INITIALIZATION_JSON_PATH, async (eventType) => {
            if (eventType === 'change') {
                console.log('Initialization file changed, reloading expectations');
                await initializeStore.clearExpectations();
                await loadInitializationExpectations();
            }
        });
        console.log(`Watching initialization file: ${CONFIG.INITIALIZATION_JSON_PATH}`);
    } catch (error) {
        console.error('Failed to set up initialization file watcher:', error);
    }
}

/**
 * Configure the persistence path for expectations
 */
function configurePersistence() {
    if (CONFIG.PERSIST_EXPECTATIONS) {
        const dir = path.dirname(CONFIG.PERSISTED_EXPECTATIONS_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        initializeStore.setPersistencePath(CONFIG.PERSISTED_EXPECTATIONS_PATH);
    } else {
        initializeStore.disablePersistence();
    }
}

/**
 * Starts the MockServer
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
        process.env.LOG_LEVEL = CONFIG.LOG_LEVEL;

        configurePersistence();

        await initializeStore();

        await loadInitializationExpectations();

        setupInitializationFileWatcher();

        logVersionInfo();

        app.listen(CONFIG.PORT, CONFIG.HOST, () => {
            logServerStarted(CONFIG.PORT, CONFIG.HOST);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
