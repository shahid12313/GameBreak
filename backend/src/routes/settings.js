'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/settingsController');
const { requireStaff, requireRole } = require('../middleware/staffAuth');

router.use(requireStaff);
router.get('/', ah(c.get));                          // any signed-in staff can read (needed for the UI shell)
router.put('/', requireRole('Admin'), ah(c.update));  // only Admin+ can change it

module.exports = router;
