import pino from 'pino';

let silentMode = false;

/**
 * Sets the silent mode for logging
 * @param {boolean} silent - Whether to enable silent mode
 */
export function setSilentMode(silent) {
    silentMode = !!silent;
}

/**
 * Checks if silent mode is enabled
 * @returns {boolean} True if silent mode is enabled
 */
export function isSilentMode() {
    return silentMode;
}

/**
 * Pino logger instance with pretty printing
 * @type {import('pino').Logger}
 */
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    },
    level: 'info'
});

/**
 * Logs server startup information
 * @param {number} port - The port number the server is running on
 */
export function logServerStarted(port) {
    if (silentMode) return;
    logger.info(`MockServer started on port ${port}`);
}

/**
 * Logs incoming request details
 * @param {Object} request - The request object
 * @param {string} request.method - HTTP method
 * @param {string} request.path - Request path
 * @param {Object} request.query - Query parameters
 * @param {Object} request.headers - Request headers
 * @param {*} request.body - Request body
 */
export function logRequestReceived(request) {
    if (silentMode) return;
    logger.info({
        type: 'received_request',
        method: request.method,
        path: request.path,
        query: request.query,
        headers: request.headers,
        body: request.body
    }, `Request received: ${request.method} ${request.path}`);
}

/**
 * Logs outgoing response details
 * @param {import('express').Response} response - Express response object
 */
export function logResponseSent(response) {
    if (silentMode) return;
    logger.info({
        type: 'sent_response',
        statusCode: response.statusCode,
        headers: response.getHeaders()
    }, `Response sent with status: ${response.statusCode}`);
}

/**
 * Logs when a new expectation is created
 * @param {Object} expectation - The created expectation object
 */
export function logExpectationCreated(expectation) {
    if (silentMode) return;
    logger.info({
        type: 'expectation_created',
        expectation
    }, `Expectation created with ID: ${expectation.id}`);
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
    }, `Expectation removed with ID: ${id}`);
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
 * Logs error messages
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
export function logError(message, error) {
    if (silentMode) return;
    logger.error({
        type: 'error',
        error
    }, `Error: ${message}`);
}

/**
 * Logs details of a forwarded request
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {Object} options.headers - Request headers
 * @param {*} options.body - Request body
 */
export function logForwardedRequest(url, options) {
    if (silentMode) return;
    logger.info({
        type: 'forwarded_request',
        url,
        method: options.method,
        headers: options.headers,
        body: options.body
    }, `Forwarding request: ${options.method} ${url}`);
}

/**
 * Logs details of a forwarded response
 * @param {Object} response - The forwarded response
 * @param {number} response.status - HTTP status code
 * @param {Object} response.headers - Response headers
 * @param {*} response.body - Response body
 */
export function logForwardedResponse(response) {
    if (silentMode) return;
    logger.info({
        type: 'forwarded_response',
        status: response.status,
        headers: response.headers,
        bodySize: typeof response.body === 'string' 
            ? response.body.length 
            : (response.body ? JSON.stringify(response.body).length : 0)
    }, `Forwarded response received with status: ${response.status}`);
}

/**
 * Logs when no matching expectation is found for a request
 * @param {import('express').Request} req - Express request object
 */
export function logNoMatchingExpectation(req) {
    if (silentMode) return;
    logger.warn({
        type: 'no_matching_expectation',
        method: req.method,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body
    }, 'No matching expectation found');
}

/**
 * Logs MockServer version information
 */
export function logVersionInfo() {
    if (silentMode) return;
    const version = process.env.npm_package_version || '1.0.0';
    logger.info({
        type: 'version_info',
        name: 'mockserver-node',
        version
    }, `MockServer Node.js v${version} started`);
}

export default logger; 