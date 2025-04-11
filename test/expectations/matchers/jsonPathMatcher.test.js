/**
 * Tests for JSONPath Matcher
 * @module test/expectations/matchers/jsonPathMatcher.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { matchJsonPath } from '../../../app/expectations/matchers/jsonPathMatcher.js';

test('matchJsonPath matches valid JSONPath expressions', (t) => {
  const testObject = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345'
    },
    phones: [
      {
        type: 'home',
        number: '555-1234'
      },
      {
        type: 'work',
        number: '555-5678'
      }
    ],
    hobbies: ['reading', 'hiking', 'coding']
  };

  
  assert.strictEqual(matchJsonPath(testObject, '$.name'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.age'), true);

  
  assert.strictEqual(matchJsonPath(testObject, '$.address.city'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.address.state'), true);

  
  assert.strictEqual(matchJsonPath(testObject, '$.hobbies[0]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.hobbies[2]'), true);

  
  assert.strictEqual(matchJsonPath(testObject, '$.phones[0].type'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.phones[1].number'), true);

  
  assert.strictEqual(matchJsonPath(testObject, '$..type'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.phones[*].number'), true);

  
  assert.strictEqual(matchJsonPath(testObject, '$.nonexistent'), false);
  assert.strictEqual(matchJsonPath(testObject, '$.address.nonexistent'), false);
  assert.strictEqual(matchJsonPath(testObject, '$.hobbies[10]'), false);
});

test('matchJsonPath handles string input', (t) => {
  const jsonString = '{"name":"John","age":30,"hobbies":["reading","hiking"]}';

  assert.strictEqual(matchJsonPath(jsonString, '$.name'), true);
  assert.strictEqual(matchJsonPath(jsonString, '$.age'), true);
  assert.strictEqual(matchJsonPath(jsonString, '$.hobbies[0]'), true);
  assert.strictEqual(matchJsonPath(jsonString, '$.nonexistent'), false);
});

test('matchJsonPath handles invalid JSON string', (t) => {
  const invalidJson = '{name:"John",age:30}';

  assert.strictEqual(matchJsonPath(invalidJson, '$.name'), false);
});

test('matchJsonPath handles null and undefined', (t) => {
  assert.strictEqual(matchJsonPath(null, '$.name'), false);
  assert.strictEqual(matchJsonPath(undefined, '$.name'), false);
});

test('matchJsonPath handles invalid JSONPath expressions', (t) => {
  const testObject = { name: 'John', age: 30 };

  assert.strictEqual(matchJsonPath(testObject, 'invalid_path'), false);
  assert.strictEqual(matchJsonPath(testObject, ''), false);
  assert.strictEqual(matchJsonPath(testObject, null), false);
  assert.strictEqual(matchJsonPath(testObject, undefined), false);
});

test('matchJsonPath handles arrays directly', (t) => {
  const testArray = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ];

  assert.strictEqual(matchJsonPath(testArray, '$[0].id'), true);
  assert.strictEqual(matchJsonPath(testArray, '$[1].name'), true);
  assert.strictEqual(matchJsonPath(testArray, '$[?(@.id==2)]'), true);
  assert.strictEqual(matchJsonPath(testArray, '$[?(@.name=="Item 3")]'), true);
  assert.strictEqual(matchJsonPath(testArray, '$[?(@.id==4)]'), false);
});

test('matchJsonPath handles complex filters and expressions', (t) => {
  const testObject = {
    items: [
      { id: 1, price: 10, tags: ['sale', 'new'] },
      { id: 2, price: 20, tags: ['sale'] },
      { id: 3, price: 30, tags: ['new'] },
      { id: 4, price: 40, tags: [] }
    ]
  };

  
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.price>20)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.price<15)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.price>=30)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.price<=10)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.price==20)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.id==5)]'), false);

  
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.tags.length>0)]'), true);
  assert.strictEqual(matchJsonPath(testObject, '$.items[?(@.tags.length==0)]'), true);
}); 