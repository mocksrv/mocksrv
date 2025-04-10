/**
 * @module expectations/expectationValidator
 */

import Ajv from 'ajv';
import { schemas } from './schemas.js';

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  verbose: true,
  validateSchema: false,
  discriminator: true
});

Object.entries(schemas).forEach(([name, schema]) => {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
});

const validateExpectationSchema = ajv.compile({
  $ref: '#/components/schemas/Expectation'
});

/**
 * Validates an expectation object according to MockServer OpenAPI specification
 * @param {Object} expectation - The expectation object to validate
 * @returns {string|null} Error message if validation fails, null if validation succeeds
 */
export function validateExpectation(expectation) {
  if (validateExpectationSchema(expectation)) {
    return null;
  }
  return validateExpectationSchema.errors[0].message;
} 