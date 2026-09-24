'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/staffController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Owner')); // Managing staff accounts is Owner-only.
router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.put('/:id', ah(c.update));
router.delete('/:id', ah(c.remove));
router.post('/:id/reset-password', ah(c.resetPassword));

module.exports = router;
