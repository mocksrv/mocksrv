import test from 'node:test';
import assert from 'node:assert';
import { HttpScheme } from '../src/types/expectation.js';
import { buildQueryString } from '../src/utils/httpClient.js';

test('builds correct forwarding URL', async (t) => {
  const httpForward1 = {
    host: 'example.com',
    port: 80,
    scheme: HttpScheme.HTTP
  };
  
  const request1 = {
    path: '/api/resource',
    query: {}
  };
  
  const expectedUrl1 = 'http://example.com/api/resource';
  const url1 = `http://${httpForward1.host}${httpForward1.port === 80 ? '' : `:${httpForward1.port}`}${request1.path}`;
  assert.strictEqual(url1, expectedUrl1);

  const httpForward2 = {
    host: 'secure.example.com',
    port: 8443,
    scheme: HttpScheme.HTTPS
  };
  
  const request2 = {
    path: '/api/secure-resource',
    query: {}
  };
  
  const expectedUrl2 = 'https://secure.example.com:8443/api/secure-resource';
  const url2 = `https://${httpForward2.host}${httpForward2.port === 443 ? '' : `:${httpForward2.port}`}${request2.path}`;
  assert.strictEqual(url2, expectedUrl2);

  const request3 = {
    path: '/api/search',
    query: {
      q: 'test query',
      limit: '10',
      filter: ['active', 'verified']
    }
  };
  
  const queryString = buildQueryString(request3.query);
  const expectedQueryString = 'q=test%20query&limit=10&filter=active&filter=verified';
  assert.strictEqual(queryString, expectedQueryString);
});

test('properly handles request headers', async (t) => {
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'host': 'mockserver.com',
    'user-agent': 'test-agent'
  };
  
  const expectedForwardedHeaders = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'user-agent': 'test-agent'
  };
  
  const forwardedHeaders = { ...headers };
  delete forwardedHeaders.host;
  
  assert.deepStrictEqual(forwardedHeaders, expectedForwardedHeaders);
}); 