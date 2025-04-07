import { findMatchingExpectation } from '../store/expectationStore.js';
import { logRequestReceived, logResponseSent } from '../utils/logger.js';
import { forwardRequest } from '../utils/httpClient.js';

// Funkcja pomocnicza do opóźnienia odpowiedzi
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    
    // Obsługa opóźnienia wspólna dla obu rodzajów akcji
    const responseDelay = httpResponse?.delay || httpForward?.delay;
    const handleWithDelay = async (responseHandler) => {
        if (responseDelay) {
            let delayMs = 0;
            
            if (typeof responseDelay === 'number') {
                // Proste opóźnienie w milisekundach
                delayMs = responseDelay;
            } else if (responseDelay.timeUnit && responseDelay.value) {
                // Format zgodny z MockServer: { timeUnit: 'MILLISECONDS', value: 500 }
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
                        delayMs = value; // Domyślnie zakładamy milisekundy
                }
            }
            
            if (delayMs > 0) {
                await delay(delayMs);
            }
        }
        
        await responseHandler();
    };
    
    if (httpResponse) {
        // Obsługa bezpośredniej odpowiedzi
        handleWithDelay(async () => {
            // Obsługa obu formatów - status i statusCode dla kompatybilności z MockServer
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
        // Obsługa przekazania żądania
        handleWithDelay(async () => {
            try {
                // Przekazanie żądania do docelowego serwera
                const forwardedResponse = await forwardRequest(request, httpForward);
                
                // Ustawienie nagłówków z odpowiedzi
                if (forwardedResponse.headers) {
                    Object.entries(forwardedResponse.headers).forEach(([key, value]) => {
                        res.set(key, value);
                    });
                }
                
                // Ustawienie statusu
                res.status(forwardedResponse.status);
                
                // Wysłanie ciała odpowiedzi
                if (forwardedResponse.body) {
                    res.send(forwardedResponse.body);
                } else {
                    res.end();
                }
                
                logResponseSent(res);
            } catch (error) {
                // W przypadku błędu, zwracamy status 502 Bad Gateway
                res.status(502).json({
                    error: 'Bad Gateway',
                    message: `Failed to forward request: ${error.message}`
                });
                
                logResponseSent(res);
            }
        });
    } else {
        // Jeśli brak akcji, przechodzimy dalej
        next();
    }
}
