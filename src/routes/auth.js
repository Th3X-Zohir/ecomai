const express = require('express');
const authService = require('../services/auth');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const tokens = authService.login(req.body.email, req.body.password);
    return res.json(tokens);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to login' });
  }
});

router.post('/refresh', (req, res) => {
  try {
    const tokens = authService.refresh(req.body.refreshToken);
    return res.json(tokens);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to refresh token' });
  }
});

router.post('/logout', (req, res) => {
  try {
    const result = authService.logout(req.body.refreshToken);
    return res.json(result);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to logout' });
  }
});

module.exports = router;
