const express = require('express');
const { asyncHandler } = require('../middleware/async-handler');
const authService = require('../services/auth');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const tokens = await authService.login(req.body.email, req.body.password);
  res.json(tokens);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json(tokens);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  res.json(result);
}));

module.exports = router;