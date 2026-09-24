'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/gameController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff);

router.get('/', ah(c.list));
router.post('/', requireRole('Admin'), ah(c.create));
router.put('/:id', requireRole('Admin'), ah(c.update));
router.delete('/:id', requireRole('Admin'), ah(c.remove));
router.get('/:id/pricing', ah(c.currentPricing)); // any signed-in staff needs to see prices to start a session
router.post('/:id/stations', requireRole('Admin'), ah(c.addStation));
router.delete('/:id/stations/:stationId', requireRole('Admin'), ah(c.removeStation));
router.put('/:id/stations/:stationId/status', requireRole('Manager'), ah(c.setStationStatus));

module.exports = router;
