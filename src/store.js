const crypto = require('crypto');

/**
 * Legacy in-memory store — kept only for createId() utility and backward compat.
 * All real data is now in PostgreSQL.
 */

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

module.exports = { createId };

