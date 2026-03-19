/**
 * Delivery Zones Service
 * Business logic for delivery zones, charge rules, SLA profiles, settings, and charge calculation
 */
const repo = require('../repositories/delivery-zones');
const { DomainError } = require('../errors/domain-error');

/* ── Zones ──────────────────────────────────────────────────────────── */

async function getZones(shopId) {
  return repo.listZones(shopId);
}

async function getZone(shopId, zoneId) {
  const zone = await repo.getZoneById(shopId, zoneId);
  if (!zone) throw new DomainError('NOT_FOUND', 'Delivery zone not found', 404);
  return zone;
}

async function createZone(shopId, data) {
  const existing = await repo.findZoneByName(shopId, data.name);
  if (existing) {
    throw new DomainError('DUPLICATE', 'A zone with this name already exists', 400);
  }
  return repo.createZone({ shopId, ...data });
}

async function updateZone(shopId, zoneId, data) {
  await getZone(shopId, zoneId); // validate exists
  if (data.name) {
    const existing = await repo.findZoneByName(shopId, data.name);
    if (existing && existing.id !== zoneId) {
      throw new DomainError('DUPLICATE', 'A zone with this name already exists', 400);
    }
  }
  return repo.updateZone(shopId, zoneId, data);
}

async function deleteZone(shopId, zoneId) {
  await getZone(shopId, zoneId);
  const deleted = await repo.deleteZone(shopId, zoneId);
  if (!deleted) throw new DomainError('NOT_FOUND', 'Zone not found', 404);
  return true;
}

/* ── Area Codes ────────────────────────────────────────────────────── */

async function addAreaToZone(shopId, zoneId, areaData) {
  await getZone(shopId, zoneId);
  const area = await repo.addAreaCode(shopId, zoneId, areaData);
  if (!area) throw new DomainError('NOT_FOUND', 'Zone not found', 404);
  return area;
}

async function removeAreaFromZone(shopId, zoneId, areaCodeId) {
  await getZone(shopId, zoneId);
  const removed = await repo.removeAreaCode(shopId, zoneId, areaCodeId);
  if (!removed) throw new DomainError('NOT_FOUND', 'Area code not found', 404);
  return true;
}

/* ── Charge Rules ───────────────────────────────────────────────────── */

async function getChargeRules(shopId, zoneId) {
  return zoneId ? repo.listChargeRules(shopId, zoneId) : repo.listAllChargeRules(shopId);
}

async function createChargeRule(shopId, data) {
  if (!['weight', 'order_amount', 'item_count'].includes(data.ruleType)) {
    throw new DomainError('VALIDATION_ERROR', 'ruleType must be weight, order_amount, or item_count', 400);
  }
  if (data.zoneId) {
    await getZone(shopId, data.zoneId);
  }
  return repo.createChargeRule({ shopId, ...data });
}

async function updateChargeRule(shopId, ruleId, data) {
  const rule = await repo.updateChargeRule(shopId, ruleId, data);
  if (!rule) throw new DomainError('NOT_FOUND', 'Charge rule not found', 404);
  return rule;
}

async function deleteChargeRule(shopId, ruleId) {
  const deleted = await repo.deleteChargeRule(shopId, ruleId);
  if (!deleted) throw new DomainError('NOT_FOUND', 'Charge rule not found', 404);
  return true;
}

/* ── SLA Profiles ───────────────────────────────────────────────────── */

async function getSlaProfiles(shopId) {
  return repo.listSlaProfiles(shopId);
}

async function createSlaProfile(shopId, data) {
  return repo.createSlaProfile({ shopId, ...data });
}

async function updateSlaProfile(shopId, profileId, data) {
  const profile = await repo.updateSlaProfile(shopId, profileId, data);
  if (!profile) throw new DomainError('NOT_FOUND', 'SLA profile not found', 404);
  return profile;
}

async function deleteSlaProfile(shopId, profileId) {
  const deleted = await repo.deleteSlaProfile(shopId, profileId);
  if (!deleted) throw new DomainError('NOT_FOUND', 'SLA profile not found', 404);
  return true;
}

/* ── Delivery Settings ──────────────────────────────────────────────── */

async function getSettings(shopId) {
  let settings = await repo.getDeliverySettings(shopId);
  if (!settings) {
    // Create defaults
    settings = await repo.upsertDeliverySettings(shopId, {});
  }
  return settings;
}

async function saveSettings(shopId, data) {
  const validModes = ['merchant_managed', 'platform_managed', 'hybrid', 'none'];
  if (data.deliveryMode && !validModes.includes(data.deliveryMode)) {
    throw new DomainError('VALIDATION_ERROR', `deliveryMode must be one of: ${validModes.join(', ')}`, 400);
  }
  return repo.upsertDeliverySettings(shopId, data);
}

/* ── Delivery Charge Calculator ─────────────────────────────────────── */

async function calculateCharge({ shopId, zoneId, packageWeight, orderAmount, itemCount, isCod }) {
  return repo.calculateDeliveryCharge({ shopId, zoneId, packageWeight, orderAmount, itemCount, isCod });
}

/* ── SLA Estimation ─────────────────────────────────────────────────── */

async function estimateDeliveryWindow(shopId, zoneId, slaProfileId) {
  let profile = null;
  if (slaProfileId) {
    const profiles = await repo.listSlaProfiles(shopId);
    profile = profiles.find(p => p.id === slaProfileId);
  }
  if (!profile) {
    profile = await repo.getDefaultSlaProfile(shopId);
  }
  if (!profile) {
    const settings = await getSettings(shopId);
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + (settings?.min_delivery_days_default || 1));
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + (settings?.max_delivery_days_default || 7));
    return {
      minDays: settings?.min_delivery_days_default || 1,
      maxDays: settings?.max_delivery_days_default || 7,
      estimatedDateStart: minDate.toISOString().split('T')[0],
      estimatedDateEnd: maxDate.toISOString().split('T')[0],
    };
  }
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + profile.min_days);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + profile.max_days);
  return {
    profileId: profile.id,
    profileName: profile.name,
    minDays: profile.min_days,
    maxDays: profile.max_days,
    additionalCharge: Number(profile.additional_charge),
    estimatedDateStart: minDate.toISOString().split('T')[0],
    estimatedDateEnd: maxDate.toISOString().split('T')[0],
  };
}

/* ── Delivery Exceptions ─────────────────────────────────────────────── */

async function logException({ deliveryRequestId, exceptionType, reasonCode, reasonDescription, recordedByUserId }) {
  return repo.createDeliveryException({ deliveryRequestId, exceptionType, reasonCode, reasonDescription, recordedByUserId });
}

async function getExceptions(deliveryRequestId) {
  return repo.listDeliveryExceptions(deliveryRequestId);
}

async function resolveException(exceptionId, resolution) {
  const resolved = await repo.resolveDeliveryException(exceptionId, resolution);
  if (!resolved) throw new DomainError('NOT_FOUND', 'Exception record not found', 404);
  return resolved;
}

/* ── Driver Fleet ────────────────────────────────────────────────────── */

async function getFleet(shopId) {
  return repo.listDriverFleet(shopId);
}

async function registerDriver(shopId, data) {
  return repo.addDriverToFleet({ shopId, ...data });
}

async function setDriverAvailability(userId, isAvailable) {
  return repo.updateDriverAvailability(userId, isAvailable);
}

module.exports = {
  // Zones
  getZones, getZone, createZone, updateZone, deleteZone,
  // Areas
  addAreaToZone, removeAreaFromZone,
  // Charge Rules
  getChargeRules, createChargeRule, updateChargeRule, deleteChargeRule,
  // SLA
  getSlaProfiles, createSlaProfile, updateSlaProfile, deleteSlaProfile,
  // Settings
  getSettings, saveSettings,
  // Calculator
  calculateCharge, estimateDeliveryWindow,
  // Exceptions
  logException, getExceptions, resolveException,
  // Fleet
  getFleet, registerDriver, setDriverAvailability,
};
