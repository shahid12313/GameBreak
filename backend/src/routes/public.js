'use strict';
const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/publicController');
const { optionalCustomer } = require('../middleware/customerAuth');

router.get('/catalog', ah(c.catalog));
router.get('/availability', ah(c.availability));
router.get('/discount-check', ah(c.checkCode));
router.post('/bookings', optionalCustomer, ah(c.createBooking));
router.get('/events', ah(c.events));
router.post('/events/:id/register', optionalCustomer, ah(c.registerForEvent));
router.post('/waiting-list', ah(c.joinWaitingList));

module.exports = router;
