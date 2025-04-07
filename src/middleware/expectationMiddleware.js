import { findMatchingExpectation } from '../store/expectationStore.js';
import { logRequestReceived, logResponseSent } from '../utils/logger.js';
import { forwardRequest } from '../utils/httpClient.js';

/**
 * Creates a promise that resolves after the specified delay
 * @param {number} ms - The delay in milliseconds
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Middleware for handling mock expectations
 * Matches incoming requests against stored expectations and returns appropriate responses
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
export function expectationMiddleware(req, res, next) {
  const request = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body
  };

  logRequestReceived(request);

  const matchingExpectation = findMatchingExpectation(request);

  if (!matchingExpectation) {
    return next();
  }

  const { httpResponse, httpForward } = matchingExpectation;

  const responseDelay = httpResponse?.delay || httpForward?.delay;

  /**
   * Handles response with optional delay
   * @param {Function} responseHandler - Async function that handles the response
   * @returns {Promise<void>}
   */
  const handleWithDelay = async (responseHandler) => {
    if (responseDelay) {
      let delayMs = 0;

      if (typeof responseDelay === 'number') {
        delayMs = responseDelay;
      } else if (responseDelay.timeUnit && responseDelay.value) {
        const { timeUnit, value } = responseDelay;
        switch (timeUnit.toUpperCase()) {
          case 'MILLISECONDS':
            delayMs = value;
            break;
          case 'SECONDS':
            delayMs = value * 1000;
            break;
          case 'MINUTES':
            delayMs = value * 60 * 1000;
            break;
          default:
            delayMs = value;
        }
      }

      if (delayMs > 0) {
        await delay(delayMs);
      }
    }

    await responseHandler();
  };

  if (httpResponse) {
    handleWithDelay(async () => {
      const status = httpResponse.statusCode || httpResponse.status || 200;
      const { headers, body } = httpResponse;

      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          res.set(key, value);
        });
      }

      res.status(status);

      if (body) {
        res.send(body);
      } else {
        res.end();
      }

      logResponseSent(res);
    });
  } else if (httpForward) {
    handleWithDelay(async () => {
      try {
        const forwardedResponse = await forwardRequest(request, httpForward);

        if (forwardedResponse.headers) {
          Object.entries(forwardedResponse.headers).forEach(([key, value]) => {
            res.set(key, value);
          });
        }

        res.status(forwardedResponse.status);

        if (forwardedResponse.body) {
          res.send(forwardedResponse.body);
        } else {
          res.end();
        }

        logResponseSent(res);
      } catch (error) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Failed to forward request: ${error.message}`
        });

        logResponseSent(res);
      }
    });
  } else {
    next();
  }
}
