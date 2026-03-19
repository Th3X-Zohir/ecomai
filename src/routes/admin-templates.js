const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/async-handler');
const adminTemplatesService = require('../services/admin-templates');

const router = express.Router();

// All routes require super_admin
router.use(authRequired, requireRoles(['super_admin']));

// GET /admin/templates — list all templates
router.get('/templates', asyncHandler(async (req, res) => {
  const activeOnly = req.query.active_only !== 'true';
  const templates = await adminTemplatesService.getTemplates({ activeOnly });
  res.json(templates);
}));

// GET /admin/templates/:id
router.get('/templates/:id', asyncHandler(async (req, res) => {
  const template = await adminTemplatesService.getTemplate(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json(template);
}));

// POST /admin/templates
router.post('/templates', asyncHandler(async (req, res) => {
  try {
    const template = await adminTemplatesService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ message: err.message });
    }
    throw err;
  }
}));

// PATCH /admin/templates/:id
router.patch('/templates/:id', asyncHandler(async (req, res) => {
  try {
    const template = await adminTemplatesService.updateTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
}));

// DELETE /admin/templates/:id
router.delete('/templates/:id', asyncHandler(async (req, res) => {
  try {
    const template = await adminTemplatesService.deleteTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
}));

// GET /admin/homepage-sections
router.get('/homepage-sections', asyncHandler(async (req, res) => {
  const activeOnly = req.query.active_only !== 'true';
  const sections = await adminTemplatesService.getHomepageSections({ activeOnly });
  res.json(sections);
}));

// PATCH /admin/homepage-sections/:sectionKey
router.patch('/homepage-sections/:sectionKey', asyncHandler(async (req, res) => {
  const section = await adminTemplatesService.updateHomepageSection(
    req.params.sectionKey,
    req.body
  );
  if (!section) return res.status(404).json({ message: 'Section not found' });
  res.json(section);
}));

module.exports = router;
