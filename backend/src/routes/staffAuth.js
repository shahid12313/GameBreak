'use strict';
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ah = require('../utils/asyncHandler');
const c = require('../controllers/staffAuthController');
const { requireStaff } = require('../middleware/staffAuth');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.get('/status', ah(c.status));
router.post('/bootstrap', ah(c.bootstrap));
router.post('/login', limiter, ah(c.login));
router.get('/me', requireStaff, ah(c.me));

module.exports = router;
