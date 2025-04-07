import pino from 'pino';

// Konfiguracja flagi wyciszenia logów - przydatne podczas testów
let silentMode = false;

// Funkcja do włączania/wyłączania trybu cichego
export function setSilentMode(silent) {
    silentMode = !!silent;
}

// Funkcja do sprawdzania aktualnego stanu trybu cichego
export function isSilentMode() {
    return silentMode;
}

// Konfiguracja loggera pino
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    },
    level: 'info'
});

// Logowanie inicjalizacji serwera
export function logServerStarted(port) {
    if (silentMode) return;
    logger.info(`MockServer started on port ${port}`);
}

// Logowanie odebranego żądania
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

// Logowanie wysłanej odpowiedzi
export function logResponseSent(response) {
    if (silentMode) return;
    logger.info({
        type: 'sent_response',
        statusCode: response.statusCode,
        headers: response.getHeaders()
    }, `Response sent with status: ${response.statusCode}`);
}

// Logowanie utworzonego oczekiwania
export function logExpectationCreated(expectation) {
    if (silentMode) return;
    logger.info({
        type: 'expectation_created',
        expectation
    }, `Expectation created with ID: ${expectation.id}`);
}

// Logowanie usuniętego oczekiwania
export function logExpectationRemoved(id) {
    if (silentMode) return;
    logger.info({
        type: 'expectation_removed',
        id
    }, `Expectation removed with ID: ${id}`);
}

// Logowanie wyczyszczenia wszystkich oczekiwań
export function logExpectationsCleared() {
    if (silentMode) return;
    logger.info({
        type: 'expectations_cleared'
    }, 'All expectations cleared');
}

// Logowanie błędu
export function logError(message, error) {
    if (silentMode) return;
    logger.error({
        type: 'error',
        error
    }, `Error: ${message}`);
}

// Logowanie przekazywanego żądania
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

// Logowanie odpowiedzi przekazanej
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