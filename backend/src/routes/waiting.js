'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/waitingController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Manager'));

router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.put('/:id/notify', ah(c.markNotified));
router.post('/:id/convert', ah(c.convert));
router.delete('/:id', ah(c.remove));

module.exports = router;
