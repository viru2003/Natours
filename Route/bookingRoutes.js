const express = require('express');
const authController = require('./../Controllers/authController');
const bookingController = require('./../Controllers/bookingController');

const Router = express.Router();

Router.use(authController.protect);
Router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

Router.route('/').get(
  authController.restrictTo('admin', 'lead-guide'),
  bookingController.getAllBookings,
);

Router.route('/:id')
  .get(bookingController.getBooking)
  .delete(bookingController.deleteBooking)
  .patch(bookingController.updateBooking);

module.exports = Router;
