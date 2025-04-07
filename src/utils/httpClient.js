import fetch from 'node-fetch';
import { logForwardedRequest, logForwardedResponse } from './logger.js';
import { HttpScheme } from '../types/expectation.js';

/**
 * Przekazuje żądanie do określonego celu
 * 
 * @param {Object} request - Oryginalne żądanie od klienta
 * @param {Object} httpForward - Konfiguracja przekazywania
 * @returns {Promise<Object>} - Odpowiedź z docelowego serwera
 */
export async function forwardRequest(request, httpForward) {
    const { host, port, scheme } = httpForward;
    
    // Budowanie docelowego URL
    const protocol = scheme === HttpScheme.HTTPS ? 'https' : 'http';
    const portSuffix = (
        (scheme === HttpScheme.HTTP && port === 80) || 
        (scheme === HttpScheme.HTTPS && port === 443)
    ) ? '' : `:${port}`;
    
    const targetUrl = `${protocol}://${host}${portSuffix}${request.path}`;
    
    // Przekształcanie parametrów zapytania
    const queryString = buildQueryString(request.query);
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    // Przygotowanie nagłówków - usuwamy pewne nagłówki specyficzne dla Express
    const headers = { ...request.headers };
    delete headers.host; // Usuwamy nagłówek host, który odnosi się do mock servera
    
    // Przygotowanie opcji dla fetch
    const options = {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        redirect: 'follow' // Podążamy za przekierowaniami
    };
    
    // Logowanie przekazywanego żądania
    logForwardedRequest(fullUrl, options);
    
    try {
        // Wysyłanie żądania
        const response = await fetch(fullUrl, options);
        
        // Przetwarzanie odpowiedzi
        const responseBody = await parseResponseBody(response);
        
        // Tworzenie obiektu odpowiedzi
        const forwardedResponse = {
            status: response.status,
            headers: extractHeaders(response),
            body: responseBody
        };
        
        // Logowanie odpowiedzi
        logForwardedResponse(forwardedResponse);
        
        return forwardedResponse;
    } catch (error) {
        console.error(`Error forwarding request to ${fullUrl}:`, error);
        throw error;
    }
}

/**
 * Buduje string zapytania z obiektu parametrów
 */
export function buildQueryString(query) {
    if (!query || Object.keys(query).length === 0) {
        return '';
    }
    
    return Object.entries(query)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
}

/**
 * Wyodrębnia nagłówki z odpowiedzi fetch
 */
function extractHeaders(response) {
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return headers;
}

/**
 * Analizuje ciało odpowiedzi w zależności od typu zawartości
 */
async function parseResponseBody(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
        return await response.json();
    } else if (
        contentType.includes('text/') || 
        contentType.includes('application/xml') ||
        contentType.includes('application/javascript')
    ) {
        return await response.text();
    } else {
        // Dla typów binarnych zwracamy bufor
        return await response.buffer();
    }
} 