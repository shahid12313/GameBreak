'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/publicController');
const { requireCustomer } = require('../middleware/customerAuth');

router.get('/bookings', requireCustomer, ah(c.myBookings));

module.exports = router;
