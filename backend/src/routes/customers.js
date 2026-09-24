'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/customerController');
const { requireStaff } = require('../middleware/staffAuth');

router.use(requireStaff); // Staff and above.

router.get('/', ah(c.list));
router.post('/', ah(c.create));
router.put('/:id', ah(c.update));
router.post('/:id/settle', ah(c.settle));
router.get('/:id/history', ah(c.history));

module.exports = router;
