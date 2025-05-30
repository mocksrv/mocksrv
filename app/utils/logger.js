/**
 * Enhanced logger module based on MockServer implementation
 * @module utils/logger
 */

import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const DEFAULT_LOG_LEVEL = 'info';
const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const createLogger = (level = DEFAULT_LOG_LEVEL) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return pino({
        level,
        transport: isDevelopment ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
                messageFormat: '{msg}'
            }
        } : undefined,
        formatters: {
            level: (label) => ({ level: label.toUpperCase() })
        }
    });
};

const baseLogger = createLogger(process.env.MOCKSERVER_LOG_LEVEL || DEFAULT_LOG_LEVEL);

const log = (level) => (message, context = {}) => {
    if (!baseLogger[level]) return;
    baseLogger[level]({ msg: message, ...context });
};

export const trace = log('trace');
export const debug = log('debug');
export const info = log('info');
export const warn = log('warn');
export const error = log('error');
export const fatal = log('fatal');

export const logServerStarted = (port, host = '0.0.0.0') => {
    info('MockServer started', {
        event: 'SERVER_STARTED',
        port,
        host,
        version: pkg.version
    });
};

export const logRequest = (request, type = 'RECEIVED') => {
    debug(`${request.method} ${request.path}`, {
        event: `REQUEST_${type}`,
        method: request.method,
        path: request.path,
        headers: request.headers,
        query: request.query,
        body: request.body
    });
};

export const logRequestReceived = logRequest;

export const logResponse = (response, request) => {
    debug(`Response sent with status ${response.statusCode}`, {
        event: 'RESPONSE_SENT',
        status: response.statusCode,
        method: request?.method,
        path: request?.path,
        responseTime: response.get ? response.get('X-Response-Time') : undefined
    });
};

export const logResponseSent = logResponse;

export const logExpectation = (expectation, action = 'CREATED') => {
    info(`Expectation ${action.toLowerCase()}: ${expectation.id}`, {
        event: `EXPECTATION_${action}`,
        id: expectation.id,
        method: expectation.httpRequest?.method,
        path: expectation.httpRequest?.path,
        priority: expectation.priority
    });
};

export const logMatch = (request, expectation, matched = true) => {
    const message = matched ? 'Request matched expectation' : 'Request did not match expectation';
    debug(message, {
        event: matched ? 'REQUEST_MATCHED' : 'REQUEST_NOT_MATCHED',
        requestMethod: request.method,
        requestPath: request.path,
        expectationId: expectation?.id,
        matchDetails: {
            method: matched,
            path: matched,
            headers: matched,
            query: matched,
            body: matched
        }
    });
};

export const logError = (error, additionalContext = {}) => {
    baseLogger.error({
        msg: error.message || 'An error occurred',
        event: 'ERROR',
        stack: error.stack,
        ...additionalContext
    });
};

export const setLogLevel = (level) => {
    if (LOG_LEVELS.includes(level.toLowerCase())) {
        baseLogger.level = level.toLowerCase();
    } else {
        warn(`Invalid log level: ${level}. Using default: ${DEFAULT_LOG_LEVEL}`);
    }
};

let isSilent = false;

export const setSilentMode = (silent) => {
    isSilent = silent;
    setLogLevel(silent ? 'fatal' : DEFAULT_LOG_LEVEL);
};

export const enableSilentMode = () => setSilentMode(true);

export const createTestLogger = () => {
    const logs = [];
    const testLogger = {
        trace: (msg, ctx) => logs.push({ level: 'TRACE', msg, ctx }),
        debug: (msg, ctx) => logs.push({ level: 'DEBUG', msg, ctx }),
        info: (msg, ctx) => logs.push({ level: 'INFO', msg, ctx }),
        warn: (msg, ctx) => logs.push({ level: 'WARN', msg, ctx }),
        error: (msg, ctx) => logs.push({ level: 'ERROR', msg, ctx }),
        fatal: (msg, ctx) => logs.push({ level: 'FATAL', msg, ctx }),
        getLogs: () => [...logs],
        clearLogs: () => { logs.length = 0; }
    };
    return testLogger;
};

export default {
    trace,
    debug,
    info,
    warn,
    error,
    fatal,
    logServerStarted,
    logRequest,
    logRequestReceived,
    logResponse,
    logResponseSent,
    logExpectation,
    logMatch,
    logError,
    setLogLevel
};