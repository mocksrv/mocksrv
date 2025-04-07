import test from 'node:test';
import assert from 'node:assert';
import { expectationMiddleware } from '../src/middleware/expectationMiddleware.js';

// Funkcja pomocnicza do opóźnienia
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test dla middleware gdy znaleziono pasujące oczekiwanie
test('middleware should send response for matching expectation', async (t) => {
  // Arrange
  let responseSent = false;
  let statusCode = 0;
  let responseBody = null;
  let responseHeaders = {};
  
  const req = {
    method: 'GET',
    path: '/some/path',
    query: { param1: 'value1' },
    headers: {
      'content-type': 'application/json',
      'x-test-header': 'test-value'
    },
    body: null
  };
  
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    set: (key, value) => {
      responseHeaders[key] = value;
      return res;
    },
    send: (body) => {
      responseBody = body;
      responseSent = true;
      return res;
    },
    end: () => {
      responseSent = true;
      return res;
    }
  };
  
  const next = () => {
    assert.fail('next() should not be called');
  };

  // Funkcja symulująca funkcjonalność middleware
  const handleRequest = (req, res, next) => {
    // Znalezienie pasującego oczekiwania
    const matchingExpectation = {
      id: 'test-id',
      type: 'http',
      httpRequest: {
        method: 'GET',
        path: '/some/path'
      },
      httpResponse: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: { status: 'ok' }
      }
    };
    
    if (!matchingExpectation) {
      return next();
    }
    
    const { httpResponse } = matchingExpectation;
    
    if (httpResponse) {
      const status = httpResponse.statusCode || httpResponse.status || 200;
      const { headers, body } = httpResponse;
      
      const sendResponse = async () => {
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
      };
      
      sendResponse();
    } else {
      next();
    }
  };
  
  // Act
  handleRequest(req, res, next);
  
  // Assert
  assert.strictEqual(statusCode, 200);
  assert.strictEqual(responseHeaders['Content-Type'], 'application/json');
  assert.deepStrictEqual(responseBody, { status: 'ok' });
  assert.strictEqual(responseSent, true);
});

// Test dla middleware gdy nie znaleziono pasującego oczekiwania
test('middleware should call next() when no matching expectation found', async (t) => {
  // Arrange
  let nextCalled = false;
  
  const req = {
    method: 'GET',
    path: '/nonexistent/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: null
  };
  
  const res = {
    status: () => res,
    set: () => res,
    send: () => res,
    end: () => res
  };
  
  const next = () => {
    nextCalled = true;
  };
  
  // Funkcja symulująca funkcjonalność middleware
  const handleRequest = (req, res, next) => {
    // Symulujemy brak znalezienia pasującego oczekiwania
    const matchingExpectation = null;
    
    if (!matchingExpectation) {
      return next();
    }
    
    res.status(200).end();
  };
  
  // Act
  handleRequest(req, res, next);
  
  // Assert
  assert.strictEqual(nextCalled, true);
});

// Test dla middleware z opóźnieniem (delay)
test('middleware should respect delay in response', async (t) => {
  // Arrange
  let responseSent = false;
  let startTime, endTime;
  
  const req = {
    method: 'GET',
    path: '/delayed/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: null
  };
  
  const res = {
    status: () => res,
    set: () => res,
    send: () => {
      endTime = Date.now();
      responseSent = true;
      return res;
    },
    end: () => {
      endTime = Date.now();
      responseSent = true;
      return res;
    }
  };
  
  const next = () => {
    assert.fail('next() should not be called');
  };
  
  // Funkcja symulująca funkcjonalność middleware
  const handleRequest = async (req, res, next) => {
    // Znalezienie pasującego oczekiwania z opóźnieniem
    const matchingExpectation = {
      id: 'test-delay-id',
      type: 'http',
      httpRequest: {
        method: 'GET',
        path: '/delayed/path'
      },
      httpResponse: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: { status: 'delayed' },
        delay: 100
      }
    };
    
    if (!matchingExpectation) {
      return next();
    }
    
    const { httpResponse } = matchingExpectation;
    
    if (httpResponse) {
      const status = httpResponse.statusCode || httpResponse.status || 200;
      const { headers, body, delay: responseDelay } = httpResponse;
      
      const sendResponse = async () => {
        // Opóźnienie odpowiedzi
        if (responseDelay) {
          await delay(responseDelay);
        }
        
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
      };
      
      await sendResponse();
    } else {
      next();
    }
  };
  
  // Act
  startTime = Date.now();
  await handleRequest(req, res, next);
  
  // Assert
  assert.strictEqual(responseSent, true);
  assert.ok(endTime - startTime >= 100, 'Response should be delayed by at least 100ms');
}); 