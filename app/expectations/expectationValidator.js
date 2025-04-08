/**
 * Validator for MockServer expectations
 * @module expectations/expectationValidator
 */

/**
 * Validates an expectation object according to MockServer specification
 * @param {Object} expectation - The expectation object to validate
 * @returns {string|null} Error message if validation fails, null if validation succeeds
 */
export function validateExpectation(expectation) {
  if (!expectation) {
    return 'Expectation object is required';
  }

  // Validate httpRequest field (required)
  if (!expectation.httpRequest) {
    return 'httpRequest field is required in expectation';
  }

  // Validate that at least one response type is present
  const responseTypes = [
    'httpResponse',
    'httpResponseTemplate',
    'httpResponseClassCallback',
    'httpResponseObjectCallback',
    'httpForward',
    'httpForwardTemplate',
    'httpForwardClassCallback',
    'httpForwardObjectCallback',
    'httpOverrideForwardedRequest',
    'httpError'
  ];

  const hasResponseType = responseTypes.some(type => expectation[type] !== undefined);
  if (!hasResponseType) {
    return 'One of the response types is required (httpResponse, httpForward, etc.)';
  }

  // Validate priority (required)
  if (expectation.priority === undefined) {
    return 'Priority field is required in expectation';
  }

  // Validate priority value
  if (typeof expectation.priority !== 'number' || expectation.priority < 0) {
    return 'Priority must be a non-negative number';
  }

  // Validate times if present
  if (expectation.times) {
    if (expectation.times.remainingTimes !== undefined && 
        (typeof expectation.times.remainingTimes !== 'number' || 
         expectation.times.remainingTimes < 0)) {
      return 'Times.remainingTimes must be a non-negative number';
    }
    if (expectation.times.unlimited !== undefined && 
        typeof expectation.times.unlimited !== 'boolean') {
      return 'Times.unlimited must be a boolean';
    }
  }

  // All validations passed
  return null;
} 