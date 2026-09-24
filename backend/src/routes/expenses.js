'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/expenseController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff, requireRole('Admin'));
router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.delete('/:id', ah(c.remove));

module.exports = router;
