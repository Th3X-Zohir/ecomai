const express = require('express');
const jwt = require('jsonwebtoken');
const { users } = require('../store');
const { jwtSecret } = require('../config');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      shop_id: user.shopId,
    },
    jwtSecret,
    { expiresIn: '15m' }
  );

  return res.json({ accessToken, tokenType: 'Bearer' });
});

module.exports = router;
