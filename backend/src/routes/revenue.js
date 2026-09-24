'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/revenueController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff);
router.get('/dashboard', ah(c.dashboard)); // Staff+ can see today's basic KPIs on the dashboard home
router.get('/summary', requireRole('Admin'), ah(c.summary));
router.get('/export', requireRole('Admin'), ah(c.exportExcel));

module.exports = router;
