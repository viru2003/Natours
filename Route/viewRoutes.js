const express = require('express');
const Router = express.Router();
const viewsController = require('./../Controllers/viewController');
const authController = require('./../Controllers/authController');
const bookingController = require('./../Controllers/bookingController');

Router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview,
);
Router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
Router.get(`/login`, authController.isLoggedIn, viewsController.getLoginForm);
Router.get(`/me`, authController.protect, viewsController.getAccount);
Router.get(`/my-tours`, authController.protect, viewsController.getMyTours);
Router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData,
);

module.exports = Router;
