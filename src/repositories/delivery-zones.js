/**
 * Delivery Zones Repository
 * CRUD for delivery areas, charge rules, SLA profiles, and settings
 */
const db = require('../db');

/* ── Zones ─────────────────────────────────────────────────────────── */

async function listZones(shopId) {
  const { rows } = await db.query(
    `SELECT z.*,
            COALESCE(json_agg(
              json_build_object('id', a.id, 'code', a.code, 'name', a.name)
              ORDER BY a.name
            ) FILTER (WHERE a.id IS NOT NULL), '[]') AS areas
     FROM delivery_zones z
     LEFT JOIN delivery_area_codes a ON a.zone_id = z.id
     WHERE z.shop_id = $1
     GROUP BY z.id
     ORDER BY z.name`,
    [shopId]
  );
  return rows;
}

async function getZoneById(shopId, zoneId) {
  const { rows } = await db.query(
    `SELECT z.*,
            COALESCE(json_agg(
              json_build_object('id', a.id, 'code', a.code, 'name', a.name)
              ORDER BY a.name
            ) FILTER (WHERE a.id IS NOT NULL), '[]') AS areas
     FROM delivery_zones z
     LEFT JOIN delivery_area_codes a ON a.zone_id = z.id
     WHERE z.id = $1 AND z.shop_id = $2
     GROUP BY z.id`,
    [zoneId, shopId]
  );
  return rows[0] || null;
}

async function findZoneByName(shopId, name) {
  const { rows } = await db.query(
    `SELECT * FROM delivery_zones WHERE shop_id = $1 AND LOWER(name) = LOWER($2)`,
    [shopId, name]
  );
  return rows[0] || null;
}

async function createZone({ shopId, name, description, baseCharge, minDeliveryDays, maxDeliveryDays, areas = [] }, client) {
  const query = client
    ? client.query
    : db.query;

  const { rows } = await query(
    `INSERT INTO delivery_zones (shop_id, name, description, base_charge, min_delivery_days, max_delivery_days)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [shopId, name, description || null, baseCharge || 0, minDeliveryDays || 1, maxDeliveryDays || 5]
  );
  const zone = rows[0];

  if (areas.length > 0) {
    const areaInserts = areas.map((a, i) =>
      `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
    ).join(', ');
    const areaVals = areas.flatMap(a => [zone.id, a.code, a.name]);
    await query(
      `INSERT INTO delivery_area_codes (zone_id, code, name) VALUES ${areaInserts}`,
      areaVals
    );
  }

  return getZoneById(shopId, zone.id);
}

async function updateZone(shopId, zoneId, { name, description, baseCharge, minDeliveryDays, maxDeliveryDays, isActive }) {
  const fields = [];
  const vals = [shopId, zoneId];
  let idx = 3;
  if (name !== undefined) { fields.push(`name = $${idx++}`); vals.push(name); }
  if (description !== undefined) { fields.push(`description = $${idx++}`); vals.push(description); }
  if (baseCharge !== undefined) { fields.push(`base_charge = $${idx++}`); vals.push(baseCharge); }
  if (minDeliveryDays !== undefined) { fields.push(`min_delivery_days = $${idx++}`); vals.push(minDeliveryDays); }
  if (maxDeliveryDays !== undefined) { fields.push(`max_delivery_days = $${idx++}`); vals.push(maxDeliveryDays); }
  if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); vals.push(isActive); }
  fields.push(`updated_at = NOW()`);

  if (fields.length === 1) return getZoneById(shopId, zoneId);

  await db.query(
    `UPDATE delivery_zones SET ${fields.join(', ')} WHERE id = $2 AND shop_id = $1`,
    vals
  );
  return getZoneById(shopId, zoneId);
}

async function deleteZone(shopId, zoneId) {
  const { rowCount } = await db.query(
    `DELETE FROM delivery_zones WHERE id = $1 AND shop_id = $2`,
    [zoneId, shopId]
  );
  return rowCount > 0;
}

/* ── Area Codes ────────────────────────────────────────────────────── */

async function addAreaCode(shopId, zoneId, { code, name }) {
  const { rows } = await db.query(
    `INSERT INTO delivery_area_codes (zone_id, code, name)
     SELECT $1, $2, $3
     WHERE EXISTS (SELECT 1 FROM delivery_zones WHERE id = $1 AND shop_id = $4)
     RETURNING *`,
    [zoneId, code, name, shopId]
  );
  return rows[0] || null;
}

async function removeAreaCode(shopId, zoneId, areaCodeId) {
  const { rowCount } = await db.query(
    `DELETE FROM delivery_area_codes a
     USING delivery_zones z
     WHERE a.zone_id = z.id AND z.shop_id = $1 AND a.zone_id = $2 AND a.id = $3`,
    [shopId, zoneId, areaCodeId]
  );
  return rowCount > 0;
}

/* ── Charge Rules ───────────────────────────────────────────────────── */

async function listChargeRules(shopId, zoneId) {
  const { rows } = await db.query(
    `SELECT r.*, z.name AS zone_name
     FROM delivery_charge_rules r
     LEFT JOIN delivery_zones z ON z.id = r.zone_id
     WHERE r.shop_id = $1 AND (r.zone_id = $2 OR (r.zone_id IS NULL AND ($2::uuid IS NULL)))
     ORDER BY r.rule_type, r.min_value`,
    [shopId, zoneId || null]
  );
  return rows;
}

async function listAllChargeRules(shopId) {
  const { rows } = await db.query(
    `SELECT r.*, z.name AS zone_name
     FROM delivery_charge_rules r
     LEFT JOIN delivery_zones z ON z.id = r.zone_id
     WHERE r.shop_id = $1
     ORDER BY r.rule_type, r.min_value`,
    [shopId]
  );
  return rows;
}

async function createChargeRule({ shopId, zoneId, name, ruleType, minValue, maxValue, charge }, client) {
  const query = client ? client.query : db.query;
  const { rows } = await query(
    `INSERT INTO delivery_charge_rules (shop_id, zone_id, name, rule_type, min_value, max_value, charge)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [shopId, zoneId || null, name, ruleType, minValue || 0, maxValue || null, charge || 0]
  );
  return rows[0];
}

async function updateChargeRule(shopId, ruleId, { name, minValue, maxValue, charge, isActive }) {
  const fields = [];
  const vals = [shopId, ruleId];
  let idx = 3;
  if (name !== undefined) { fields.push(`name = $${idx++}`); vals.push(name); }
  if (minValue !== undefined) { fields.push(`min_value = $${idx++}`); vals.push(minValue); }
  if (maxValue !== undefined) { fields.push(`max_value = $${idx++}`); vals.push(maxValue); }
  if (charge !== undefined) { fields.push(`charge = $${idx++}`); vals.push(charge); }
  if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); vals.push(isActive); }
  fields.push(`updated_at = NOW()`);

  const { rows } = await db.query(
    `UPDATE delivery_charge_rules SET ${fields.join(', ')}
     WHERE id = $2 AND shop_id = $1 RETURNING *`,
    vals
  );
  return rows[0] || null;
}

async function deleteChargeRule(shopId, ruleId) {
  const { rowCount } = await db.query(
    `DELETE FROM delivery_charge_rules WHERE id = $1 AND shop_id = $2`,
    [ruleId, shopId]
  );
  return rowCount > 0;
}

/* ── SLA Profiles ──────────────────────────────────────────────────── */

async function listSlaProfiles(shopId) {
  const { rows } = await db.query(
    `SELECT * FROM delivery_sla_profiles WHERE shop_id = $1 ORDER BY min_days`,
    [shopId]
  );
  return rows;
}

async function createSlaProfile({ shopId, name, minDays, maxDays, additionalCharge, isDefault }) {
  if (isDefault) {
    await db.query(
      `UPDATE delivery_sla_profiles SET is_default = false WHERE shop_id = $1`,
      [shopId]
    );
  }
  const { rows } = await db.query(
    `INSERT INTO delivery_sla_profiles (shop_id, name, min_days, max_days, additional_charge, is_default)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [shopId, name, minDays || 1, maxDays || 3, additionalCharge || 0, isDefault || false]
  );
  return rows[0];
}

async function updateSlaProfile(shopId, profileId, { name, minDays, maxDays, additionalCharge, isDefault, isActive }) {
  if (isDefault) {
    await db.query(
      `UPDATE delivery_sla_profiles SET is_default = false WHERE shop_id = $1`,
      [shopId]
    );
  }
  const fields = [];
  const vals = [shopId, profileId];
  let idx = 3;
  if (name !== undefined) { fields.push(`name = $${idx++}`); vals.push(name); }
  if (minDays !== undefined) { fields.push(`min_days = $${idx++}`); vals.push(minDays); }
  if (maxDays !== undefined) { fields.push(`max_days = $${idx++}`); vals.push(maxDays); }
  if (additionalCharge !== undefined) { fields.push(`additional_charge = $${idx++}`); vals.push(additionalCharge); }
  if (isDefault !== undefined) { fields.push(`is_default = $${idx++}`); vals.push(isDefault); }
  if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); vals.push(isActive); }
  fields.push(`updated_at = NOW()`);

  const { rows } = await db.query(
    `UPDATE delivery_sla_profiles SET ${fields.join(', ')}
     WHERE id = $2 AND shop_id = $1 RETURNING *`,
    vals
  );
  return rows[0] || null;
}

async function deleteSlaProfile(shopId, profileId) {
  const { rowCount } = await db.query(
    `DELETE FROM delivery_sla_profiles WHERE id = $1 AND shop_id = $2`,
    [profileId, shopId]
  );
  return rowCount > 0;
}

async function getDefaultSlaProfile(shopId) {
  const { rows } = await db.query(
    `SELECT * FROM delivery_sla_profiles WHERE shop_id = $1 AND is_default = true AND is_active = true`,
    [shopId]
  );
  return rows[0] || null;
}

/* ── Delivery Settings ──────────────────────────────────────────────── */

async function getDeliverySettings(shopId) {
  const { rows } = await db.query(
    `SELECT ds.*,
            COALESCE(json_agg(
              json_build_object('id', sp.id, 'name', sp.name, 'min_days', sp.min_days, 'max_days', sp.max_days)
              ORDER BY sp.min_days
            ) FILTER (WHERE sp.id IS NOT NULL), '[]') AS sla_profiles
     FROM delivery_settings ds
     LEFT JOIN delivery_sla_profiles sp ON sp.shop_id = ds.shop_id AND sp.is_active = true
     WHERE ds.shop_id = $1
     GROUP BY ds.id`,
    [shopId]
  );
  return rows[0] || null;
}

async function upsertDeliverySettings(shopId, data, client) {
  const query = client ? client.query : db.query;
  const fields = [
    'delivery_mode', 'is_delivery_enabled', 'free_shipping_threshold',
    'default_packaging_charge', 'max_delivery_days_default', 'min_delivery_days_default',
    'auto_assign_driver', 'allow_schedule_delivery', 'allow_same_day_delivery',
    'cod_handling_fee_percent', 'notify_customer_on_dispatch'
  ];
  const vals = [
    data.deliveryMode || 'merchant_managed',
    data.isDeliveryEnabled !== undefined ? data.isDeliveryEnabled : true,
    data.freeShippingThreshold || null,
    data.defaultPackagingCharge || 0,
    data.maxDeliveryDaysDefault || 7,
    data.minDeliveryDaysDefault || 1,
    data.autoAssignDriver || false,
    data.allowScheduleDelivery !== undefined ? data.allowScheduleDelivery : true,
    data.allowSameDayDelivery !== undefined ? data.allowSameDayDelivery : false,
    data.codHandlingFeePercent || 0,
    data.notifyCustomerOnDispatch !== undefined ? data.notifyCustomerOnDispatch : true,
  ];

  const { rows } = await query(
    `INSERT INTO delivery_settings (shop_id, ${fields.join(', ')})
     VALUES ($1, ${vals.map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (shop_id) DO UPDATE SET
       ${fields.map((f, i) => `${f} = EXCLUDED.${f}`).join(', ')},
       updated_at = NOW()
     RETURNING *`,
    [shopId, ...vals]
  );
  return rows[0];
}

/* ── Calculate Delivery Charge ──────────────────────────────────────── */

async function calculateDeliveryCharge({ shopId, zoneId, packageWeight, orderAmount, itemCount, isCod }) {
  const settings = await getDeliverySettings(shopId);
  if (!settings || !settings.is_delivery_enabled) return { charge: 0, packagingCharge: 0, freeShipping: true };

  // Check free shipping threshold
  if (settings.free_shipping_threshold && Number(orderAmount) >= Number(settings.free_shipping_threshold)) {
    return { charge: 0, packagingCharge: Number(settings.default_packaging_charge), freeShipping: true };
  }

  let totalCharge = 0;
  let packagingCharge = Number(settings.default_packaging_charge);

  // Zone base charge
  if (zoneId) {
    const { rows } = await db.query(
      `SELECT base_charge, min_delivery_days, max_delivery_days FROM delivery_zones WHERE id = $1 AND shop_id = $2 AND is_active = true`,
      [zoneId, shopId]
    );
    if (rows[0]) {
      totalCharge += Number(rows[0].base_charge);
    }
  }

  // Weight-based rules
  const weightRules = await db.query(
    `SELECT * FROM delivery_charge_rules
     WHERE shop_id = $1 AND rule_type = 'weight'
       AND is_active = true
       AND min_value <= $2
       AND (max_value IS NULL OR max_value >= $2)
     ORDER BY zone_id NULLS LAST, min_value DESC
     LIMIT 1`,
    [shopId, packageWeight || 0]
  );
  if (weightRules.rows[0]) totalCharge += Number(weightRules.rows[0].charge);

  // Order-amount rules
  const amountRules = await db.query(
    `SELECT * FROM delivery_charge_rules
     WHERE shop_id = $1 AND rule_type = 'order_amount'
       AND is_active = true
       AND min_value <= $2
       AND (max_value IS NULL OR max_value >= $2)
     ORDER BY zone_id NULLS LAST, min_value DESC
     LIMIT 1`,
    [shopId, orderAmount || 0]
  );
  if (amountRules.rows[0]) totalCharge += Number(amountRules.rows[0].charge);

  // Item count rules
  const itemRules = await db.query(
    `SELECT * FROM delivery_charge_rules
     WHERE shop_id = $1 AND rule_type = 'item_count'
       AND is_active = true
       AND min_value <= $2
       AND (max_value IS NULL OR max_value >= $2)
     ORDER BY zone_id NULLS LAST, min_value DESC
     LIMIT 1`,
    [shopId, itemCount || 1]
  );
  if (itemRules.rows[0]) totalCharge += Number(itemRules.rows[0].charge);

  // COD handling fee
  let codFee = 0;
  if (isCod && settings.cod_handling_fee_percent) {
    codFee = Number(orderAmount || 0) * Number(settings.cod_handling_fee_percent) / 100;
    totalCharge += codFee;
  }

  return {
    charge: Number(totalCharge.toFixed(2)),
    packagingCharge: Number(packagingCharge.toFixed(2)),
    codFee: Number(codFee.toFixed(2)),
    freeShipping: false,
  };
}

/* ── Delivery Exceptions ───────────────────────────────────────────── */

async function createDeliveryException({ deliveryRequestId, exceptionType, reasonCode, reasonDescription, recordedByUserId }) {
  const { rows } = await db.query(
    `INSERT INTO delivery_exceptions (delivery_request_id, exception_type, reason_code, reason_description, recorded_by_user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [deliveryRequestId, exceptionType, reasonCode, reasonDescription || null, recordedByUserId || null]
  );
  return rows[0];
}

async function listDeliveryExceptions(deliveryRequestId) {
  const { rows } = await db.query(
    `SELECT e.*, u.full_name AS recorded_by_name
     FROM delivery_exceptions e
     LEFT JOIN users u ON u.id = e.recorded_by_user_id
     WHERE e.delivery_request_id = $1
     ORDER BY e.created_at DESC`,
    [deliveryRequestId]
  );
  return rows;
}

async function resolveDeliveryException(exceptionId, resolution) {
  const { rows } = await db.query(
    `UPDATE delivery_exceptions SET resolution = $2, resolved_at = NOW()
     WHERE id = $1 RETURNING *`,
    [exceptionId, resolution]
  );
  return rows[0] || null;
}

/* ── Driver Fleet ───────────────────────────────────────────────────── */

async function listDriverFleet(shopId) {
  const { rows } = await db.query(
    `SELECT df.*, u.full_name, u.phone, u.email
     FROM driver_fleet df
     JOIN users u ON u.id = df.user_id
     WHERE df.shop_id = $1 OR df.shop_id IS NULL
     ORDER BY df.is_available DESC, u.full_name`,
    [shopId]
  );
  return rows;
}

async function addDriverToFleet({ shopId, userId, vehicleType, vehiclePlate, maxWeightKg, zonesCovered }) {
  const { rows } = await db.query(
    `INSERT INTO driver_fleet (shop_id, user_id, vehicle_type, vehicle_plate, max_weight_kg, zones_covered)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       vehicle_type = EXCLUDED.vehicle_type,
       vehicle_plate = EXCLUDED.vehicle_plate,
       max_weight_kg = EXCLUDED.max_weight_kg,
       zones_covered = EXCLUDED.zones_covered,
       updated_at = NOW()
     RETURNING *`,
    [shopId || null, userId, vehicleType || null, vehiclePlate || null, maxWeightKg || null, zonesCovered || []]
  );
  return rows[0];
}

async function updateDriverAvailability(userId, isAvailable) {
  const { rows } = await db.query(
    `UPDATE driver_fleet SET is_available = $2, updated_at = NOW()
     WHERE user_id = $1 RETURNING *`,
    [userId, isAvailable]
  );
  return rows[0] || null;
}

module.exports = {
  // Zones
  listZones, getZoneById, findZoneByName, createZone, updateZone, deleteZone,
  // Area Codes
  addAreaCode, removeAreaCode,
  // Charge Rules
  listChargeRules, listAllChargeRules, createChargeRule, updateChargeRule, deleteChargeRule,
  // SLA Profiles
  listSlaProfiles, createSlaProfile, updateSlaProfile, deleteSlaProfile, getDefaultSlaProfile,
  // Settings
  getDeliverySettings, upsertDeliverySettings,
  // Calculation
  calculateDeliveryCharge,
  // Exceptions
  createDeliveryException, listDeliveryExceptions, resolveDeliveryException,
  // Fleet
  listDriverFleet, addDriverToFleet, updateDriverAvailability,
};
