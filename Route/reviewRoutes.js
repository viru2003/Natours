const express = require('express');
const reviewController = require('./../Controllers/reviewController');
const authController = require('./../Controllers/authController');

////////////Router//////////
Router = express.Router({ mergeParams: true }); //this will allow us to access the parameters from parent router

Router.use(authController.protect); //this will protect all the routes below this middleware

//for route: /api/v1/reviews
Router.route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

//for route: /api/v1/reviews/:id
Router.route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  );

module.exports = Router;
