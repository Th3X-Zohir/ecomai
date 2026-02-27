const { DomainError } = require('../errors/domain-error');

/**
 * Validates request body fields. Returns middleware function.
 * @param {Object} rules - { fieldName: { required, type, min, max, pattern, oneOf } }
 */
function validateBody(rules) {
  return (req, _res, next) => {
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        throw new DomainError('VALIDATION_ERROR', `${field} is required`, 400);
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'string' && typeof value !== 'string') {
        throw new DomainError('VALIDATION_ERROR', `${field} must be a string`, 400);
      }
      if (rule.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be a number`, 400);
      }
      if (rule.type === 'array' && !Array.isArray(value)) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be an array`, 400);
      }
      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be a valid email`, 400);
      }
      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be >= ${rule.min}`, 400);
      }
      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be <= ${rule.max}`, 400);
      }
      if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be at least ${rule.minLength} characters`, 400);
      }
      if (rule.oneOf && !rule.oneOf.includes(value)) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be one of: ${rule.oneOf.join(', ')}`, 400);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        throw new DomainError('VALIDATION_ERROR', `${field} format is invalid`, 400);
      }
    }
    next();
  };
}

module.exports = { validateBody };
