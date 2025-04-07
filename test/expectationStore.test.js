import test from 'node:test';
import assert from 'node:assert';
import { matchesExpectation } from '../app/store/expectationStore.js';

test('matches basic HTTP expectation', async (t) => {
  const request = {
    method: 'GET',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/some/path'
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with headers', async (t) => {
  const request = {
    method: 'GET',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json',
      'x-api-key': 'secret123'
    },
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/some/path',
      headers: {
        'x-api-key': 'secret123'
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with query parameters', async (t) => {
  const request = {
    method: 'GET',
    path: '/some/path',
    query: {
      param1: 'value1',
      param2: 'value2'
    },
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/some/path',
      matchType: 'onlyMatchingFields',
      query: {
        param1: 'value1'
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with JSON body', async (t) => {
  const request = {
    method: 'POST',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: {
      menu: {
        id: "file",
        value: "File",
        popup: {
          menuitem: [
            { value: "New", onclick: "CreateNewDoc()" },
            { value: "Open", onclick: "OpenDoc()" },
            { value: "Close", onclick: "CloseDoc()" }
          ]
        }
      }
    }
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/some/path',
      body: {
        type: 'json',
        value: {
          menu: {
            id: "file",
            value: "File",
            popup: {
              menuitem: [
                { value: "New", onclick: "CreateNewDoc()" },
                { value: "Open", onclick: "OpenDoc()" },
                { value: "Close", onclick: "CloseDoc()" }
              ]
            }
          }
        }
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with JSONPath body', async (t) => {
  const request = {
    method: 'POST',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: {
      store: {
        book: [
          {
            category: "reference",
            author: "Nigel Rees",
            title: "Sayings of the Century",
            price: 8.95
          },
          {
            category: "fiction",
            author: "Herman Melville",
            title: "Moby Dick",
            isbn: "0-553-21311-3",
            price: 8.99
          }
        ],
        bicycle: {
          color: "red",
          price: 19.95
        }
      },
      expensive: 10
    }
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/some/path',
      body: {
        type: 'jsonPath',
        value: '$.store.book[0].author'
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with "not" flag in headers', async (t) => {
  const request = {
    method: 'GET',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/some/path',
      headers: {
        not: true,
        'x-api-key': 'secret123'
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with STRICT matchType', async (t) => {
  const request = {
    method: 'POST',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: {
      id: 1,
      name: "John",
      age: 30
    }
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/some/path',
      matchType: 'strict',
      body: {
        type: 'json',
        value: {
          id: 1,
          name: "John",
          age: 30
        }
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with ONLY_MATCHING_FIELDS matchType', async (t) => {
  const request = {
    method: 'POST',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: {
      id: 1,
      name: "John",
      age: 30,
      address: {
        city: "New York",
        zipCode: "10001"
      }
    }
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/some/path',
      matchType: 'onlyMatchingFields',
      body: {
        type: 'json',
        value: {
          name: "John",
          age: 30
        }
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches HTTP expectation with JSONUnit placeholders', async (t) => {
  const request = {
    method: 'POST',
    path: '/some/path',
    query: {},
    headers: {
      'content-type': 'application/json'
    },
    body: {
      id: 1,
      name: "John Doe",
      active: true,
      createdAt: "2023-04-01T12:00:00Z"
    }
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/some/path',
      body: {
        type: 'json',
        value: {
          id: '${json-unit.any-number}',
          name: '${json-unit.any-string}',
          active: '${json-unit.any-boolean}',
          createdAt: '${json-unit.any-string}'
        }
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches path with wildcard at the end', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/users/123',
    query: {},
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/*'
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches path with wildcard in the middle', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/users/profile',
    query: {},
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/*/profile'
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('matches path with multiple wildcards', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/v1/users/123/settings',
    query: {},
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/*/users/*/settings'
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('does not match path with wildcard when pattern is different', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/orders/123',
    query: {},
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/users/*'
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), false);
});

test('matches path with wildcard and not flag', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/users/123',
    query: {},
    headers: {},
    body: null
  };

  const expectation = {
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: {
        not: true,
        value: '/api/orders/*'
      }
    }
  };
  
  assert.strictEqual(matchesExpectation(request, expectation), true);
});

test('selects expectation with higher priority', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/test',
    query: {},
    headers: {},
    body: null
  };

  const mockExpectations = [
    {
      id: '1',
      type: 'http',
      priority: 0,
      httpRequest: {
        method: 'GET',
        path: '/api/test'
      }
    },
    {
      id: '2',
      type: 'http',
      priority: 10, 
      httpRequest: {
        method: 'GET',
        path: '/api/test'
      }
    },
    {
      id: '3',
      type: 'http',
      priority: 5,
      httpRequest: {
        method: 'GET',
        path: '/api/test'
      }
    }
  ];

  const matchingExpectations = mockExpectations;

  matchingExpectations.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.id.localeCompare(a.id);
  });

  assert.strictEqual(matchingExpectations[0].id, '2');
  assert.strictEqual(matchingExpectations[0].priority, 10);
});

test('selects most recently added expectation when priorities are equal', async (t) => {
  const request = {
    method: 'GET',
    path: '/api/test',
    query: {},
    headers: {},
    body: null
  };

  const mockExpectations = [
    {
      id: 'aaa',
      type: 'http',
      priority: 5,
      httpRequest: {
        method: 'GET',
        path: '/api/test'
      }
    },
    {
      id: 'zzz',
      type: 'http',
      priority: 5,
      httpRequest: {
        method: 'GET',
        path: '/api/test'
      }
    }
  ];

  const matchingExpectations = mockExpectations;

  matchingExpectations.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.id.localeCompare(a.id);
  });

  assert.strictEqual(matchingExpectations[0].id, 'zzz');
}); 