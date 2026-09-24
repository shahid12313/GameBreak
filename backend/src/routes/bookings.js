'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/bookingController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Manager')); // Bookings are an operations function.

router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.put('/:id/status', ah(c.setStatus));
router.put('/:id/pay', ah(c.setPay));
router.post('/:id/check-in', ah(c.checkIn));

module.exports = router;
