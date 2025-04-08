/**
 * Request Handler for processing incoming requests
 * @module request-handling/requestHandler
 */

import { findExpectationForRequest } from '../expectations/expectationStore.js';
import logger, { logRequest, logResponse, logMatch, logError } from '../utils/logger.js';
import { forwardRequest } from '../http-forwarding/forwarder.js';
import { recordRequest, recordRequestResponse } from '../api/handlers/retrieveHandler.js';

/**
 * Creates a promise that resolves after the specified delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates delay in milliseconds from various delay formats
 * @param {number|Object} delayConfig - Delay configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(delayConfig) {
  if (!delayConfig) {
    return 0;
  }

  if (typeof delayConfig === 'number') {
    return delayConfig;
  }

  if (delayConfig.timeUnit && delayConfig.value) {
    const { timeUnit, value } = delayConfig;
    switch (timeUnit.toUpperCase()) {
      case 'MILLISECONDS':
        return value;
      case 'SECONDS':
        return value * 1000;
      case 'MINUTES':
        return value * 60 * 1000;
      default:
        return value;
    }
  }

  return 0;
}

/**
 * Middleware for handling requests and matching them to expectations
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
export function requestHandler(req, res, next) {
  if (req.path.startsWith('/mockserver')) {
    return next();
  }

  const request = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body
  };

  // Rejestrujemy request w historii
  recordRequest(request);

  // Logowanie requestu
  logRequest(request);
  
  try {
    const matchingExpectation = findExpectationForRequest(request);

    if (!matchingExpectation) {
      logMatch(request, null, false);
      return next();
    }

    logMatch(request, matchingExpectation, true);
    
    handleResponse(request, res, matchingExpectation).catch(error => {
      logError(error, {
        context: 'response_handling',
        request: {
          method: request.method,
          path: request.path
        },
        expectation: {
          id: matchingExpectation.id
        }
      });
      
      const errorResponse = {
        error: 'Internal Server Error',
        message: error.message,
        requestReceived: {
          method: request.method,
          path: request.path,
          query: request.query
        }
      };
      
      res.status(500).json(errorResponse);
      
      // Rejestrujemy request i response w historii
      recordRequestResponse(request, {
        statusCode: 500,
        body: errorResponse
      });
      
      logResponse(res, request);
    });
  } catch (error) {
    logError(error, {
      context: 'request_processing',
      request: {
        method: request.method,
        path: request.path
      }
    });
    
    const errorResponse = {
      error: 'Request Processing Error',
      message: error.message,
      requestReceived: {
        method: request.method,
        path: request.path,
        query: request.query
      }
    };
    
    res.status(500).json(errorResponse);
    
    // Rejestrujemy request i response w historii
    recordRequestResponse(request, {
      statusCode: 500,
      body: errorResponse
    });
    
    logResponse(res, request);
  }
}

/**
 * Handles the response based on the matched expectation
 * @param {Object} request - Request object
 * @param {import('express').Response} res - Express response
 * @param {Object} expectation - Matching expectation
 * @returns {Promise<void>}
 */
async function handleResponse(request, res, expectation) {
  const { httpResponse, httpForward } = expectation;

  if (httpResponse) {
    await sendMockResponse(request, res, httpResponse);
  } else if (httpForward) {
    await sendForwardedResponse(request, res, httpForward);
  } else {
    const errorResponse = {
      error: 'Invalid expectation configuration',
      message: 'Expectation must have either httpResponse or httpForward'
    };
    
    res.status(500).json(errorResponse);
    
    // Rejestrujemy request i response w historii
    recordRequestResponse(request, {
      statusCode: 500,
      body: errorResponse
    });
    
    logResponse(res, request);
  }
}

/**
 * Sends a mock response based on the expectation
 * @param {Object} request - Request object
 * @param {import('express').Response} res - Express response
 * @param {Object} httpResponse - Response configuration
 * @returns {Promise<void>}
 */
async function sendMockResponse(request, res, httpResponse) {
  const delayMs = calculateDelay(httpResponse.delay);
  if (delayMs > 0) {
    await delay(delayMs);
  }

  const status = httpResponse.statusCode || httpResponse.status || 200;
  res.status(status);

  if (httpResponse.headers) {
    Object.entries(httpResponse.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
  }

  // Przygotuj odpowiedź do rejestracji
  const responseToRecord = {
    statusCode: status,
    headers: res.getHeaders ? res.getHeaders() : {},
    body: httpResponse.body
  };

  if (httpResponse.body) {
    res.send(httpResponse.body);
  } else {
    res.end();
  }

  // Rejestrujemy request i response w historii
  recordRequestResponse(request, responseToRecord);
  
  logResponse(res, request);
}

/**
 * Forwards the request and sends the response
 * @param {Object} request - Request object
 * @param {import('express').Response} res - Express response
 * @param {Object} httpForward - Forward configuration
 * @returns {Promise<void>}
 */
async function sendForwardedResponse(request, res, httpForward) {
  const delayMs = calculateDelay(httpForward.delay);
  if (delayMs > 0) {
    await delay(delayMs);
  }

  try {
    const forwardedResponse = await forwardRequest(request, httpForward);

    if (forwardedResponse.headers) {
      Object.entries(forwardedResponse.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }

    res.status(forwardedResponse.status);

    // Przygotuj odpowiedź do rejestracji
    const responseToRecord = {
      statusCode: forwardedResponse.status,
      headers: forwardedResponse.headers || {},
      body: forwardedResponse.body
    };

    if (forwardedResponse.body) {
      res.send(forwardedResponse.body);
    } else {
      res.end();
    }

    // Rejestrujemy request i response w historii
    recordRequestResponse(request, responseToRecord);
    
    logResponse(res, request);
  } catch (error) {
    const errorResponse = {
      error: 'Bad Gateway',
      message: `Failed to forward request: ${error.message}`
    };
    
    res.status(502).json(errorResponse);
    
    // Rejestrujemy request i response w historii
    recordRequestResponse(request, {
      statusCode: 502,
      body: errorResponse
    });
    
    logResponse(res, request);
  }
} 
