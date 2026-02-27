const express = require('express');
const authService = require('../services/auth');
const { authRequired, requireRoles } = require('../middleware/auth');
const deliveryService = require('../services/delivery-requests');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.post('/auth/login', (req, res) => {
  try {
    const tokens = authService.login(req.body.email, req.body.password);
    return res.json(tokens);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to login driver' });
  }
});

router.use(authRequired, requireRoles(['delivery_agent']));

router.get('/assignments', (req, res) => {
  const items = deliveryService.listDriverAssignments(req.auth.sub);
  return res.json({ items, count: items.length });
});

router.post('/assignments/:id/location', (req, res) => {
  try {
    const request = deliveryService.driverPostLocation({
      driverUserId: req.auth.sub,
      deliveryRequestId: req.params.id,
      lat: req.body.lat,
      lng: req.body.lng,
    });
    return res.json(request);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to post location update' });
  }
});

router.patch('/assignments/:id/status', (req, res) => {
  try {
    const request = deliveryService.driverUpdateStatus({
      driverUserId: req.auth.sub,
      deliveryRequestId: req.params.id,
      status: req.body.status,
    });
    return res.json(request);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update assignment status' });
  }
});

module.exports = router;
