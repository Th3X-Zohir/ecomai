const { users, createId } = require('../store');

function findByEmail(email) {
  return users.find((entry) => entry.email.toLowerCase() === String(email || '').toLowerCase()) || null;
}

function findById(id) {
  return users.find((entry) => entry.id === id) || null;
}

function createUser({ email, password, role, shopId }) {
  const user = {
    id: createId('usr'),
    email,
    password,
    role,
    shopId: shopId || null,
  };
  users.push(user);
  return user;
}

module.exports = { findByEmail, findById, createUser };
