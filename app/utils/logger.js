/**
 * Logger module for consistent logging across the application
 * @module utils/logger
 */

import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let silentMode = false;

/**
 * Creates a logger instance
 */
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

/**
 * Custom logger that respects silent mode
 */
const silentableLogger = {
    info: (...args) => { if (!silentMode) logger.info(...args); },
    error: (...args) => { if (!silentMode) logger.error(...args); },
    warn: (...args) => { if (!silentMode) logger.warn(...args); },
    debug: (...args) => { if (!silentMode) logger.debug(...args); },
    trace: (...args) => { if (!silentMode) logger.trace(...args); },
    fatal: (...args) => { if (!silentMode) logger.fatal(...args); },
};

/**
 * Sets silent mode for logging
 * @param {boolean} silent - Whether to enable silent mode
 */
export function setSilentMode(silent) {
    silentMode = !!silent;
}

/**
 * Enables silent mode for testing
 */
export function enableSilentMode() {
    silentMode = true;
}

/**
 * Disables silent mode
 */
export function disableSilentMode() {
    silentMode = false;
}

/**
 * Logs server startup information
 * @param {number} port - The port number the server is running on
 * @param {string} [host] - Host address
 */
export function logServerStarted(port, host = '0.0.0.0') {
    if (silentMode) return;
    logger.info(`MockServer started on ${host}:${port}`);
}

/**
 * Logs when a request is received
 * @param {Object} request - Request object
 */
export function logRequestReceived(request) {
    if (silentMode) return;
    logger.info({
        type: 'request_received',
        method: request.method,
        path: request.path
    }, `${request.method} ${request.path}`);
}

/**
 * Logs when a response is sent
 * @param {Object} response - The Express response object
 */
export function logResponseSent(response) {
    if (silentMode) return;
    logger.info({
        type: 'response_sent',
        status: response.statusCode
    }, `Response sent with status ${response.statusCode}`);
}

/**
 * Logs when a new expectation is created
 * @param {Object} expectation - The new expectation
 */
export function logExpectationCreated(expectation) {
    if (silentMode) return;
    logger.info({
        type: 'expectation_created',
        id: expectation.id,
        method: expectation.httpRequest?.method,
        path: expectation.httpRequest?.path
    }, `Created expectation ${expectation.id}`);
}

/**
 * Logs when an expectation is removed
 * @param {string} id - The ID of the removed expectation
 */
export function logExpectationRemoved(id) {
    if (silentMode) return;
    logger.info({
        type: 'expectation_removed',
        id
    }, `Removed expectation ${id}`);
}

/**
 * Logs when all expectations are cleared
 */
export function logExpectationsCleared() {
    if (silentMode) return;
    logger.info({
        type: 'expectations_cleared'
    }, 'All expectations cleared');
}

/**
 * Logs version information at startup
 */
export function logVersionInfo() {
    if (silentMode) return;
    logger.info({
        type: 'version_info',
        name: 'mockserver-node',
        version: pkg.version
    }, `MockServer Node.js v${pkg.version} started`);
}

export default silentableLogger; 