/**
 * Test modułu API handlerów oczekiwań
 * @module test/api/handlers/expectations
 */

import test from 'node:test';
import assert from 'node:assert';
import { clearExpectations } from '../../../app/expectations/expectationStore.js';
import { createExpectationHandler } from '../../../app/api/handlers/expectations/createExpectationHandler.js';
import { listExpectationsHandler } from '../../../app/api/handlers/expectations/listExpectationsHandler.js';
import { deleteExpectationHandler } from '../../../app/api/handlers/expectations/deleteExpectationHandler.js';
import { clearExpectationsHandler } from '../../../app/api/handlers/expectations/clearExpectationsHandler.js';

test('powinien eksportować poprawnie funkcje handlerów oczekiwań', async () => {
  // Przygotowanie testu
  await clearExpectations();

  // Sprawdzenie czy eksportowane funkcje są rzeczywiście funkcjami
  assert.strictEqual(typeof createExpectationHandler, 'function', 'createExpectationHandler powinien być funkcją');
  assert.strictEqual(typeof listExpectationsHandler, 'function', 'listExpectationsHandler powinien być funkcją');
  assert.strictEqual(typeof deleteExpectationHandler, 'function', 'deleteExpectationHandler powinien być funkcją');
  assert.strictEqual(typeof clearExpectationsHandler, 'function', 'clearExpectationsHandler powinien być funkcją');

  // Sprzątanie po teście
  await clearExpectations();
}); 