'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/eventController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Admin'));
router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.put('/:id', ah(c.update));
router.delete('/:id', ah(c.remove));
router.get('/:id/registrations', ah(c.registrations));

module.exports = router;
