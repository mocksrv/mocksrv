/**
 * Handler for retrieving recorded requests, active expectations, recorded expectations or log messages
 * @module api/handlers/retrieveHandler
 */

import { getAllExpectations } from '../../expectations/expectationStore.js';
import logger from '../../utils/logger.js';
import { matchRequest } from '../../expectations/matchers/matcher.js';

// Tymczasowe zmienne do przechowywania historii requestów (w przyszłości powinny być w osobnym module)
let requestHistory = [];
let requestResponseHistory = [];

/**
 * Dodaje request do historii
 * @param {Object} request - Request do dodania do historii
 */
export function recordRequest(request) {
  // Ograniczamy historię do 100 requestów
  if (requestHistory.length >= 100) {
    requestHistory.shift();
  }
  requestHistory.push({
    timestamp: new Date().toISOString(),
    ...request
  });
}

/**
 * Dodaje request i response do historii
 * @param {Object} request - Request
 * @param {Object} response - Response
 */
export function recordRequestResponse(request, response) {
  // Ograniczamy historię do 100 par request-response
  if (requestResponseHistory.length >= 100) {
    requestResponseHistory.shift();
  }
  requestResponseHistory.push({
    timestamp: new Date().toISOString(),
    httpRequest: request,
    httpResponse: response
  });
}

/**
 * Czyści historię requestów
 */
export function clearRequestHistory() {
  requestHistory = [];
  requestResponseHistory = [];
}

/**
 * Filtruje historię requestów na podstawie definicji requestu
 * @param {Object} requestDefinition - Definicja requestu do filtrowania
 * @returns {Array} Odfiltrowana historia requestów
 */
function filterRequestHistory(requestDefinition) {
  if (!requestDefinition || Object.keys(requestDefinition).length === 0) {
    return requestHistory;
  }
  
  return requestHistory.filter(request => {
    try {
      return matchRequest(request, requestDefinition);
    } catch (error) {
      return false;
    }
  });
}

/**
 * Filtruje historię request-response na podstawie definicji requestu
 * @param {Object} requestDefinition - Definicja requestu do filtrowania
 * @returns {Array} Odfiltrowana historia request-response
 */
function filterRequestResponseHistory(requestDefinition) {
  if (!requestDefinition || Object.keys(requestDefinition).length === 0) {
    return requestResponseHistory;
  }
  
  return requestResponseHistory.filter(item => {
    try {
      return matchRequest(item.httpRequest, requestDefinition);
    } catch (error) {
      return false;
    }
  });
}

/**
 * Filtruje oczekiwania na podstawie definicji requestu
 * @param {Object} requestDefinition - Definicja requestu do filtrowania
 * @returns {Array} Odfiltrowane oczekiwania
 */
function filterExpectations(requestDefinition) {
  const allExpectations = getAllExpectations();
  
  if (!requestDefinition || Object.keys(requestDefinition).length === 0) {
    return allExpectations;
  }
  
  return allExpectations.filter(expectation => {
    try {
      // Jeśli filtr nie określa wartości, to akceptujemy wszystkie oczekiwania
      if (!expectation.httpRequest) return false;
      
      // Sprawdzamy pole path
      if (requestDefinition.path && expectation.httpRequest.path) {
        if (requestDefinition.path !== expectation.httpRequest.path) {
          return false;
        }
      }
      
      // Sprawdzamy pole method
      if (requestDefinition.method && expectation.httpRequest.method) {
        if (requestDefinition.method !== expectation.httpRequest.method) {
          return false;
        }
      }
      
      // Jeśli wszystkie warunki są spełnione, zwracamy true
      return true;
    } catch (error) {
      return false;
    }
  });
}

/**
 * Handles PUT requests to /mockserver/retrieve
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export function retrieveHandler(req, res) {
  const format = (req.query.format || 'json').toLowerCase();
  const type = (req.query.type || 'requests').toLowerCase();

  // Walidacja formatu
  if (!['java', 'json', 'log_entries'].includes(format)) {
    return res.status(400).json({
      error: 'incorrect request format',
      message: 'Invalid format parameter. Supported values are: java, json, log_entries'
    });
  }

  // Walidacja typu
  const validTypes = {
    'logs': 'logs',
    'requests': 'requests',
    'request_responses': 'request_responses',
    'recorded_expectations': 'recorded_expectations',
    'active_expectations': 'active_expectations',
    // Obsługa wariantów z wielkimi literami
    'LOGS': 'logs',
    'REQUESTS': 'requests',
    'REQUEST_RESPONSES': 'request_responses',
    'RECORDED_EXPECTATIONS': 'recorded_expectations',
    'ACTIVE_EXPECTATIONS': 'active_expectations'
  };

  const normalizedType = validTypes[type];
  if (!normalizedType) {
    return res.status(400).json({
      error: 'incorrect request format',
      message: 'Invalid type parameter. Supported values are: logs, requests, request_responses, recorded_expectations, active_expectations'
    });
  }

  // Pobierz filter z body jeśli istnieje
  const requestFilter = req.body && Object.keys(req.body).length > 0 ? req.body : null;

  try {
    switch (normalizedType) {
      case 'active_expectations': {
        // Filtrowanie oczekiwań
        const expectations = filterExpectations(requestFilter);
        
        switch (format) {
          case 'json':
            res.status(200).json(expectations);
            break;
          case 'java':
            // Konwersja do formatu Java nie jest obecnie wspierana w pełni
            res.status(200).type('application/java').send(
              `List<Expectation> expectations = Arrays.asList(\n${
                expectations.map(exp => `    new Expectation(${JSON.stringify(exp)})`).join(',\n')
              }\n);`
            );
            break;
          case 'log_entries':
            res.status(200).type('text/plain').send(
              expectations.map(exp => `EXPECTATION ${exp.id}: ${JSON.stringify(exp)}`).join('\n')
            );
            break;
        }
        break;
      }

      case 'requests': {
        // Filtrowanie historii requestów
        const requests = filterRequestHistory(requestFilter);
        
        switch (format) {
          case 'json':
            res.status(200).json(requests);
            break;
          case 'java':
            res.status(200).type('application/java').send(
              `List<HttpRequest> requests = Arrays.asList(\n${
                requests.map(req => `    new HttpRequest(${JSON.stringify(req)})`).join(',\n')
              }\n);`
            );
            break;
          case 'log_entries':
            res.status(200).type('text/plain').send(
              requests.map(req => `REQUEST ${req.method} ${req.path}: ${JSON.stringify(req)}`).join('\n')
            );
            break;
        }
        break;
      }

      case 'request_responses': {
        // Filtrowanie historii request-response
        const requestResponses = filterRequestResponseHistory(requestFilter);
        
        switch (format) {
          case 'json':
            res.status(200).json(requestResponses);
            break;
          case 'java':
            res.status(200).type('application/java').send(
              `List<HttpRequestAndResponse> requestResponses = Arrays.asList(\n${
                requestResponses.map(item => `    new HttpRequestAndResponse(${JSON.stringify(item)})`).join(',\n')
              }\n);`
            );
            break;
          case 'log_entries':
            res.status(200).type('text/plain').send(
              requestResponses.map(item => 
                `REQUEST_RESPONSE ${item.httpRequest.method} ${item.httpRequest.path}: ${JSON.stringify(item)}`
              ).join('\n')
            );
            break;
        }
        break;
      }

      case 'recorded_expectations':
        // Obecnie nie przechowujemy recorded expectations osobno
        res.status(200).json([]);
        break;

      case 'logs':
        // Zwracamy pustą odpowiedź dla logów, gdyż obecnie nie przechowujemy logów
        res.status(200).type('text/plain').send('');
        break;
    }
  } catch (error) {
    logger.error({
      type: 'retrieve_handler_error',
      error: error.message
    }, `Error in retrieveHandler: ${error.message}`);
    
    res.status(400).json({
      error: 'incorrect request format',
      message: error.message
    });
  }
} 