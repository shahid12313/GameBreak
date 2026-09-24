'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/sessionController');
const { requireStaff } = require('../middleware/staffAuth');

router.use(requireStaff); // Staff role and above — running sessions is the base permission everyone has.

router.get('/board', ah(c.board));
router.get('/history', ah(c.history));
router.get('/:id/quote', ah(c.quote));
router.post('/start', ah(c.start));
router.post('/:id/stop', ah(c.stop));

module.exports = router;
