/**
 * Tests for JSON Matcher
 * @module test/expectations/matchers/jsonMatcher.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { matchJson, deepEquals, deepContains, matchJsonUnitPlaceholder } from '../../../app/expectations/matchers/jsonMatcher.js';
import { JsonUnitPlaceholder } from '../../../app/expectations/types.js';

test('matchJson handles string input correctly', (t) => {
  const jsonString = '{"name":"test","value":123}';
  const expected = { name: 'test', value: 123 };

  assert.strictEqual(matchJson(jsonString, expected), true);
});

test('matchJson handles invalid JSON string', (t) => {
  const invalidJson = '{name:"test"}';
  const expected = { name: 'test' };

  assert.strictEqual(matchJson(invalidJson, expected), false);
});

test('matchJson with exact match uses deepEquals', (t) => {
  const actual = { name: 'test', value: 123 };
  const expected = { name: 'test', value: 123 };
  const expectedDifferent = { name: 'test', value: 456 };

  assert.strictEqual(matchJson(actual, expected, true), true);
  assert.strictEqual(matchJson(actual, expectedDifferent, true), false);
});

test('matchJson with non-exact match uses deepContains', (t) => {
  const actual = { name: 'test', value: 123, extra: 'data' };
  const expected = { name: 'test', value: 123 };

  assert.strictEqual(matchJson(actual, expected, false), true);
});

test('deepEquals handles array comparison', (t) => {
  assert.strictEqual(deepEquals([1, 2, 3], [1, 2, 3]), true);
  assert.strictEqual(deepEquals([1, 2, 3], [1, 2, 4]), false);
  assert.strictEqual(deepEquals([1, 2, 3], [1, 2]), false);
  assert.strictEqual(deepEquals([1, 2, 3], [1, 2, 3, 4]), false);
});

test('deepEquals handles object comparison', (t) => {
  assert.strictEqual(deepEquals(
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2, c: 3 }
  ), true);

  assert.strictEqual(deepEquals(
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2, c: 4 }
  ), false);

  assert.strictEqual(deepEquals(
    { a: 1, b: 2 },
    { a: 1, b: 2, c: 3 }
  ), false);

  assert.strictEqual(deepEquals(
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2 }
  ), false);

  assert.strictEqual(deepEquals(
    { a: 1, b: { c: 2, d: 3 } },
    { a: 1, b: { c: 2, d: 3 } }
  ), true);

  assert.strictEqual(deepEquals(
    { a: 1, b: { c: 2, d: 3 } },
    { a: 1, b: { c: 2, d: 4 } }
  ), false);

  assert.strictEqual(deepEquals(null, null), true);
  assert.strictEqual(deepEquals({}, null), false);
  assert.strictEqual(deepEquals(null, {}), false);
});

test('deepEquals handles primitive comparison', (t) => {
  assert.strictEqual(deepEquals(123, 123), true);
  assert.strictEqual(deepEquals(123, 456), false);
  assert.strictEqual(deepEquals('test', 'test'), true);
  assert.strictEqual(deepEquals('test', 'other'), false);
  assert.strictEqual(deepEquals(true, true), true);
  assert.strictEqual(deepEquals(true, false), false);
});

test('deepEquals handles type differences', (t) => {
  assert.strictEqual(deepEquals(123, '123'), false);
  assert.strictEqual(deepEquals(true, 1), false);
  assert.strictEqual(deepEquals({}, []), false);
});

test('deepEquals handles JSON Unit placeholders', (t) => {
  assert.strictEqual(deepEquals('test', JsonUnitPlaceholder.ANY_STRING), true);
  assert.strictEqual(deepEquals(123, JsonUnitPlaceholder.ANY_NUMBER), true);
  assert.strictEqual(deepEquals(true, JsonUnitPlaceholder.ANY_BOOLEAN), true);
  assert.strictEqual(deepEquals({}, JsonUnitPlaceholder.ANY_OBJECT), true);
  assert.strictEqual(deepEquals([], JsonUnitPlaceholder.ANY_ARRAY), true);
  assert.strictEqual(deepEquals('anything', JsonUnitPlaceholder.IGNORE), true);

  assert.strictEqual(deepEquals(123, JsonUnitPlaceholder.ANY_STRING), false);
  assert.strictEqual(deepEquals('123', JsonUnitPlaceholder.ANY_NUMBER), false);
});

test('deepContains handles array containment', (t) => {
  assert.strictEqual(deepContains([1, 2, 3, 4], [1, 3]), true);
  assert.strictEqual(deepContains([1, 2, 3], [4]), false);
  assert.strictEqual(deepContains('not-array', [1]), false);

  assert.strictEqual(deepContains(
    [{ a: 1 }, { b: 2 }, { c: 3 }],
    [{ a: 1 }, { c: 3 }]
  ), true);

  assert.strictEqual(deepContains(
    [{ a: 1 }, { b: 2 }, { c: 3 }],
    [{ a: 1 }, { d: 4 }]
  ), false);
});

test('deepContains handles object containment', (t) => {
  assert.strictEqual(deepContains(
    { a: 1, b: 2, c: 3 },
    { a: 1, c: 3 }
  ), true);

  assert.strictEqual(deepContains(
    { a: 1, b: 2, c: 3 },
    { a: 1, d: 4 }
  ), false);

  assert.strictEqual(deepContains(
    { a: 1, b: { c: 2, d: 3, e: 4 } },
    { a: 1, b: { c: 2, e: 4 } }
  ), true);

  assert.strictEqual(deepContains(
    { a: 1, b: { c: 2, d: 3 } },
    { a: 1, b: { c: 2, e: 4 } }
  ), false);

  assert.strictEqual(deepContains(
    'not-object',
    { a: 1 }
  ), false);

  assert.strictEqual(deepContains(
    { a: 1 },
    null
  ), false);
});

test('deepContains handles primitive comparison', (t) => {
  assert.strictEqual(deepContains(123, 123), true);
  assert.strictEqual(deepContains(123, 456), false);
  assert.strictEqual(deepContains('test', 'test'), true);
  assert.strictEqual(deepContains('test', 'other'), false);
});

test('deepContains handles JSON Unit placeholders', (t) => {
  assert.strictEqual(deepContains('test', JsonUnitPlaceholder.ANY_STRING), true);
  assert.strictEqual(deepContains(123, JsonUnitPlaceholder.ANY_NUMBER), true);
  assert.strictEqual(deepContains(true, JsonUnitPlaceholder.ANY_BOOLEAN), true);
  assert.strictEqual(deepContains({}, JsonUnitPlaceholder.ANY_OBJECT), true);
  assert.strictEqual(deepContains([], JsonUnitPlaceholder.ANY_ARRAY), true);
  assert.strictEqual(deepContains('anything', JsonUnitPlaceholder.IGNORE), true);

  assert.strictEqual(deepContains(123, JsonUnitPlaceholder.ANY_STRING), false);
  assert.strictEqual(deepContains('123', JsonUnitPlaceholder.ANY_NUMBER), false);
});

test('matchJsonUnitPlaceholder handles all placeholder types', (t) => {
  // IGNORE placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder('anything', JsonUnitPlaceholder.IGNORE),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder(null, JsonUnitPlaceholder.IGNORE),
    true
  );

  // ANY_STRING placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder('test', JsonUnitPlaceholder.ANY_STRING),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder(123, JsonUnitPlaceholder.ANY_STRING),
    false
  );

  // ANY_NUMBER placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder(123, JsonUnitPlaceholder.ANY_NUMBER),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder('123', JsonUnitPlaceholder.ANY_NUMBER),
    false
  );

  // ANY_BOOLEAN placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder(true, JsonUnitPlaceholder.ANY_BOOLEAN),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder(false, JsonUnitPlaceholder.ANY_BOOLEAN),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder(1, JsonUnitPlaceholder.ANY_BOOLEAN),
    false
  );

  // ANY_OBJECT placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder({}, JsonUnitPlaceholder.ANY_OBJECT),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder({ a: 1 }, JsonUnitPlaceholder.ANY_OBJECT),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder([], JsonUnitPlaceholder.ANY_OBJECT),
    false
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder(null, JsonUnitPlaceholder.ANY_OBJECT),
    false
  );

  // ANY_ARRAY placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder([], JsonUnitPlaceholder.ANY_ARRAY),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder([1, 2, 3], JsonUnitPlaceholder.ANY_ARRAY),
    true
  );
  assert.strictEqual(
    matchJsonUnitPlaceholder({}, JsonUnitPlaceholder.ANY_ARRAY),
    false
  );

  // Unknown placeholder
  assert.strictEqual(
    matchJsonUnitPlaceholder('test', 'invalid-placeholder'),
    false
  );
}); 