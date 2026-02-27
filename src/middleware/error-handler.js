const { DomainError } = require('../errors/domain-error');

function errorHandler(err, _req, res, _next) {
  if (err instanceof DomainError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Invalid JSON in request body' });
  }

  console.error('[ERROR]', err.stack || err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}

module.exports = { errorHandler };
