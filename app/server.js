/**
 * Main server file for MockServer
 * @module server
 */

import express from 'express';
import { initializeStore, setPersistencePath, disablePersistence, addExpectation, clearExpectations } from './expectations/expectationStore.js';
import { requestHandler } from './request-handling/requestHandler.js';
import apiRoutes from './api/routes.js';
import logger, { logServerStarted, logRequest, logResponse, logError } from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { validateExpectation } from './expectations/expectationValidator.js';
import { isFileSaving, getLastSavedContent, watchFile } from './expectations/persistence.js';

const CONFIG = {
    HOST: process.env.MOCKSERVER_HOST || 'localhost',
    PORT: parseInt(process.env.NODE_PORT || process.env.PORT || '1080', 10),
    VERSION: process.env.npm_package_version || '1.0.0',
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
    app.use(express.json({ limit: `${CONFIG.MAX_HEADER_SIZE}kb`, verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    } }));
    app.use(express.text({ type: 'text/plain', limit: `${CONFIG.MAX_HEADER_SIZE}kb` }));
} else {
    app.use(express.json({ verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    } }));
    app.use(express.text({ type: 'text/plain' }));
}

app.use(express.urlencoded({ 
    extended: true,
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    }
}));

app.use((req, res, next) => {
    logger.debug('Incoming request', {
        event: 'REQUEST_DEBUG',
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        hostname: req.hostname,
        ip: req.ip,
        headers: req.headers
    });
    next();
});

app.use((req, res, next) => {
    const request = {
        method: req.method,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body
    };
    
    logRequest(request);
    
    let responseLogged = false;
    
    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    
    const logResponseOnce = () => {
        if (!responseLogged) {
            logResponse(res, request);
            responseLogged = true;
        }
    };
    
    res.end = function(chunk) {
        logResponseOnce();
        return originalEnd.apply(res, arguments);
    };
    
    res.send = function(body) {
        return originalSend.apply(res, arguments);
    };
    
    res.json = function(body) {
        return originalJson.apply(res, arguments);
    };
    
    next();
});

app.use((req, res, next) => {
    const _send = res.send;
    res.send = function (body) {
        if (res.statusCode === 404) {
            logger.debug('404 Not Found', {
                event: 'NOT_FOUND',
                method: req.method,
                url: req.url,
                path: req.path,
                headers: req.headers,
                body: req.body
            });
        }
        res.send = _send;
        return res.send(body);
    };
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use(requestHandler);

app.use(apiRoutes);

app.use((req, res) => {
    logger.debug('Unhandled request', {
        event: 'UNHANDLED_REQUEST',
        method: req.method,
        url: req.url,
        path: req.path,
        headers: req.headers
    });
    res.status(404).json({
        error: 'Not Found',
        message: `No handler found for ${req.method} ${req.path}`
    });
});

/**
 * @returns {Promise<void>}
 */
async function loadInitializationExpectations() {
    if (!CONFIG.INITIALIZATION_JSON_PATH) return;

    try {
        if (!fs.existsSync(CONFIG.INITIALIZATION_JSON_PATH)) {
            logger.warn(`Initialization file not found: ${CONFIG.INITIALIZATION_JSON_PATH}`);
            return;
        }

        const fileContent = fs.readFileSync(CONFIG.INITIALIZATION_JSON_PATH, 'utf8');
        const expectations = JSON.parse(fileContent);

        if (Array.isArray(expectations)) {
            logger.info(`Loading expectations from file`, {
                file: CONFIG.INITIALIZATION_JSON_PATH,
                count: expectations.length
            });
            
            for (const expectation of expectations) {
                try {
                    const validationError = validateExpectation(expectation);
                    if (validationError) {
                        logError(new Error(`Invalid expectation: ${validationError}`), {
                            context: 'initialization_validation',
                            expectation: {
                                id: expectation.id,
                                method: expectation.httpRequest?.method,
                                path: expectation.httpRequest?.path
                            }
                        });
                        continue;
                    }

                    const requestDetails = expectation.httpRequest || {};
                    logger.debug('Loading expectation', {
                        method: requestDetails.method || 'ANY',
                        path: requestDetails.path || '/',
                        id: expectation.id,
                        priority: expectation.priority
                    });
                    
                    await addExpectation(expectation);
                } catch (expectationError) {
                    logError(expectationError, {
                        context: 'initialization',
                        expectation: {
                            id: expectation.id,
                            method: expectation.httpRequest?.method,
                            path: expectation.httpRequest?.path
                        }
                    });
                }
            }
        } else {
            logger.warn('Initialization file does not contain an array of expectations');
        }
    } catch (error) {
        logError(error, { context: 'initialization_load' });
    }
}

function setupInitializationFileWatcher() {
    if (!CONFIG.WATCH_INITIALIZATION_JSON || !CONFIG.INITIALIZATION_JSON_PATH) return;

    try {
        const stopWatching = watchFile(CONFIG.INITIALIZATION_JSON_PATH, async () => {
            logger.info('Initialization file changed, reloading expectations', {
                file: CONFIG.INITIALIZATION_JSON_PATH
            });
            
            try {
                const content = await fs.promises.readFile(CONFIG.INITIALIZATION_JSON_PATH, 'utf8');
                const expectations = JSON.parse(content);
                
                if (Array.isArray(expectations)) {
                    await clearExpectations();
                    for (const expectation of expectations) {
                        try {
                            const validationError = validateExpectation(expectation);
                            if (validationError) {
                                throw new Error(`Invalid expectation: ${validationError}`);
                            }
                            await addExpectation(expectation);
                        } catch (expError) {
                            logger.error('Failed to add expectation', {
                                error: expError.message,
                                expectation
                            });
                        }
                    }
                } else {
                    throw new Error('Expectations file must contain an array');
                }
            } catch (error) {
                logger.error('Failed to reload expectations, restoring last known good state', {
                    error: error.message
                });
                
                const lastContent = getLastSavedContent();
                if (lastContent) {
                    await clearExpectations();
                    for (const expectation of lastContent) {
                        await addExpectation(expectation);
                    }
                }
            }
        });

        process.on('SIGTERM', () => {
            stopWatching();
        });
        process.on('SIGINT', () => {
            stopWatching();
        });

        logger.info('Watching initialization file', {
            file: CONFIG.INITIALIZATION_JSON_PATH
        });
    } catch (error) {
        logError(error, { context: 'file_watcher' });
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
        setPersistencePath(CONFIG.PERSISTED_EXPECTATIONS_PATH);
        logger.info('Persistence enabled', {
            path: CONFIG.PERSISTED_EXPECTATIONS_PATH
        });
    } else {
        disablePersistence();
        logger.info('Persistence disabled');
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
        
        logger.info(`Starting MockServer on port ${CONFIG.PORT}`);
        logger.info(`Version: ${CONFIG.VERSION}`);

        const server = app.listen(CONFIG.PORT, () => {
            logger.info(`MockServer is running at http://${CONFIG.HOST}:${CONFIG.PORT}`);
        });

        const shutdown = async () => {
            logger.info('Shutting down gracefully...');
            try {
                await new Promise((resolve) => server.close(resolve));
                logger.info('Server closed successfully');
                process.exit(0);
            } catch (err) {
                logger.error('Error during shutdown:', err);
                process.exit(1);
            }
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught exception:', err);
            shutdown();
        });

        process.on('unhandledRejection', (err) => {
            logger.error('Unhandled rejection:', err);
            shutdown();
        });

        if (CONFIG.PERSIST_EXPECTATIONS) {
            await loadInitializationExpectations();
            setupInitializationFileWatcher();
        }
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer().catch(err => {
    logger.error('Error during server startup:', err);
    process.exit(1);
});
