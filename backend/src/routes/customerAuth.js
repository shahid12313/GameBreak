'use strict';
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ah = require('../utils/asyncHandler');
const c = require('../controllers/customerAuthController');
const { requireCustomer } = require('../middleware/customerAuth');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/register', limiter, ah(c.register));
router.post('/login', limiter, ah(c.login));
router.get('/me', requireCustomer, ah(c.me));

module.exports = router;
