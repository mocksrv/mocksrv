/**
 * Tests for expectation matcher
 * @module test/expectations/matchers/matcher.test
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  matchStringValue,
  matchNumberValue,
  matchRegexValue,
  matchWildcardValue,
  matchRequest
} from '../../../app/expectations/matchers/matcher.js';

test('matchStringValue matches exact string values', (t) => {
  assert.strictEqual(matchStringValue('test', 'test'), true);
  assert.strictEqual(matchStringValue('test', 'other'), false);
  assert.strictEqual(matchStringValue('', ''), true);
  assert.strictEqual(matchStringValue(null, null), true);
  assert.strictEqual(matchStringValue(undefined, undefined), true);
  assert.strictEqual(matchStringValue('test', null), false);
  assert.strictEqual(matchStringValue(null, 'test'), false);
});

test('matchNumberValue matches exact number values', (t) => {
  assert.strictEqual(matchNumberValue(123, 123), true);
  assert.strictEqual(matchNumberValue(123, 456), false);
  assert.strictEqual(matchNumberValue(0, 0), true);
  assert.strictEqual(matchNumberValue(null, null), true);
  assert.strictEqual(matchNumberValue(undefined, undefined), true);
  assert.strictEqual(matchNumberValue(123, null), false);
  assert.strictEqual(matchNumberValue(null, 123), false);
});

test('matchRegexValue matches string against regex pattern', (t) => {
  assert.strictEqual(matchRegexValue('/test/', 'test'), true);
  assert.strictEqual(matchRegexValue('/test/', 'testing'), true);
  assert.strictEqual(matchRegexValue('/^test$/', 'test'), true);
  assert.strictEqual(matchRegexValue('/^test$/', 'testing'), false);
  assert.strictEqual(matchRegexValue('/\\d+/', '123'), true);
  assert.strictEqual(matchRegexValue('/\\d+/', 'abc'), false);
  assert.strictEqual(matchRegexValue(null, 'test'), false);
  assert.strictEqual(matchRegexValue('/test/', null), false);
});

test('matchWildcardValue matches string against wildcard pattern', (t) => {
  assert.strictEqual(matchWildcardValue('*', 'test'), true);
  assert.strictEqual(matchWildcardValue('test*', 'test123'), true);
  assert.strictEqual(matchWildcardValue('test*', 'best123'), false);
  assert.strictEqual(matchWildcardValue('*test', '123test'), true);
  assert.strictEqual(matchWildcardValue('*test', '123best'), false);
  assert.strictEqual(matchWildcardValue('test*ing', 'testSomething'), false);
  assert.strictEqual(matchWildcardValue('test*ing', 'testing'), true);
  assert.strictEqual(matchWildcardValue('test*ing', 'testThinking'), true);
  assert.strictEqual(matchWildcardValue(null, 'test'), false);
  assert.strictEqual(matchWildcardValue('test*', null), false);
});

test('matchRequest matches simple request criteria', (t) => {
  const expectation = {
    httpRequest: {
      method: 'GET',
      path: '/api/resource',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  };

  const matchingRequest = {
    method: 'GET',
    path: '/api/resource',
    headers: {
      'content-type': 'application/json'
    }
  };

  const nonMatchingMethod = {
    method: 'POST',
    path: '/api/resource',
    headers: {
      'content-type': 'application/json'
    }
  };

  const nonMatchingPath = {
    method: 'GET',
    path: '/api/other',
    headers: {
      'content-type': 'application/json'
    }
  };

  const nonMatchingHeader = {
    method: 'GET',
    path: '/api/resource',
    headers: {
      'content-type': 'text/plain'
    }
  };

  assert.strictEqual(matchRequest(expectation, matchingRequest), true);
  assert.strictEqual(matchRequest(expectation, nonMatchingMethod), false);
  assert.strictEqual(matchRequest(expectation, nonMatchingPath), false);
  assert.strictEqual(matchRequest(expectation, nonMatchingHeader), false);
});

test('matchRequest handles wildcard matching', (t) => {
  const wildcardExpectation = {
    httpRequest: {
      method: 'GET',
      path: '/api/*'
    }
  };

  const matchingRequest = {
    method: 'GET',
    path: '/api/123',
    headers: {
      'content-type': 'application/json'
    }
  };

  const nonMatchingRequest = {
    method: 'GET',
    path: '/other/abc',
    headers: {
      'content-type': 'application/json'
    }
  };

  assert.strictEqual(matchRequest(wildcardExpectation, matchingRequest), true);
  assert.strictEqual(matchRequest(wildcardExpectation, nonMatchingRequest), false);
}); 