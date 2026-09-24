'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/pricingController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Admin'));

router.get('/game/:gameId', ah(c.listForGame));
router.post('/', ah(c.create));
router.put('/:id', ah(c.update));
router.delete('/:id', ah(c.remove));

module.exports = router;
