/**
 * Tests for expectation indexer
 * @module test/expectations/indexers/indexer.test
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  getBasePathSegment,
  initializeIndices,
  indexExpectation,
  removeFromIndices,
  getCandidateExpectationIds
} from '../../../app/expectations/indexers/indexer.js';

test('getBasePathSegment returns correct segment', (t) => {
  assert.strictEqual(getBasePathSegment('/api/resource'), '/api');
  assert.strictEqual(getBasePathSegment('api/resource'), '/api');
  assert.strictEqual(getBasePathSegment('/'), '/');
  assert.strictEqual(getBasePathSegment(''), null);
  assert.strictEqual(getBasePathSegment(null), null);
});

test('getCandidateExpectationIds returns method-based candidates', (t) => {
  
  const expectations = new Map();

  const getExpectation = {
    id: 'get-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    }
  };

  const postExpectation = {
    id: 'post-expectation',
    type: 'http',
    httpRequest: {
      method: 'POST',
      path: '/api/resource'
    }
  };

  expectations.set('get-expectation', getExpectation);
  expectations.set('post-expectation', postExpectation);

  
  initializeIndices(expectations);

  
  const getRequest = {
    method: 'GET',
    path: '/api/resource'
  };

  const candidates = getCandidateExpectationIds(getRequest);
  assert.strictEqual(candidates.has('get-expectation'), true);
  assert.strictEqual(candidates.has('post-expectation'), false);
});

test('getCandidateExpectationIds returns path-based candidates', (t) => {
  
  const expectations = new Map();

  const apiExpectation = {
    id: 'api-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    }
  };

  const userExpectation = {
    id: 'user-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/user/profile'
    }
  };

  expectations.set('api-expectation', apiExpectation);
  expectations.set('user-expectation', userExpectation);

  
  initializeIndices(expectations);

  
  const apiRequest = {
    method: 'GET',
    path: '/api/different'
  };

  const candidates = getCandidateExpectationIds(apiRequest);
  assert.strictEqual(candidates.has('api-expectation'), true);
  assert.strictEqual(candidates.has('user-expectation'), false);
});

test('getCandidateExpectationIds includes wildcard candidates', (t) => {
  
  const expectations = new Map();

  const wildcardExpectation = {
    id: 'wildcard-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/*'
    }
  };

  const normalExpectation = {
    id: 'normal-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/user/profile'
    }
  };

  expectations.set('wildcard-expectation', wildcardExpectation);
  expectations.set('normal-expectation', normalExpectation);

  
  initializeIndices(expectations);

  
  const anyRequest = {
    method: 'GET',
    path: '/some/random/path'
  };

  const candidates = getCandidateExpectationIds(anyRequest);
  assert.strictEqual(candidates.has('wildcard-expectation'), true);
});

test('removeFromIndices removes expectation from indices', (t) => {
  
  const expectations = new Map();

  const expectation = {
    id: 'test-expectation',
    type: 'http',
    httpRequest: {
      method: 'GET',
      path: '/api/resource'
    }
  };

  expectations.set('test-expectation', expectation);

  
  initializeIndices(expectations);

  
  const request = {
    method: 'GET',
    path: '/api/resource'
  };

  let candidates = getCandidateExpectationIds(request);
  assert.strictEqual(candidates.has('test-expectation'), true);

  
  removeFromIndices('test-expectation', expectation);

  
  candidates = getCandidateExpectationIds(request);
  assert.strictEqual(candidates.has('test-expectation'), false);
}); 