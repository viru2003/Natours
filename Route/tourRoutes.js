const express = require('express');
const tourController = require('./../Controllers/tourControllerRefactor');
const authController = require(`./../Controllers/authController`);
const reviewRouter = require('./reviewRoutes');

////////////Router//////////

const Router = express.Router();

//POST /tour/234fad4/reviews
//GET /tour/234fad4/reviews
//GET /tour/234fad4/reviews/987fad7

//////////Review Routes///////////

// Router.route("/:tourId/reviews").post(
//   authController.protect,
//   authController.restrictTo("user"),
//   reviewController.createReview,
// );

Router.use('/:tourId/reviews', reviewRouter);

///////Tour within a distance///////
Router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(
  tourController.getToursWithin,
);
// /tours-within/233/center/-40,45/unit/mi

///////Exact distance from a point///////
// /distances/233/center/-40,45/unit/mi
Router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

//for route: /api/v1/tours/monthly-plan/:year
Router.route('/monthly-plan/:year').get(
  authController.protect,
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan,
);

//for route: /api/v1/tours/tour-stats
Router.route('/tours-stats').get(tourController.getTourStats);

//for route: /api/v1/tours/top-5-cheap alias route
Router.route('/top-5-cheap').get(
  tourController.aliasTopTours,
  tourController.getALLTours,
);

//for route: /api/v1/tours
Router.route(`/`)
  .get(tourController.getALLTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  ); //chaining the middleware

//for route: /api/v1/tours/:id
Router.route(`/:id`)
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    // tourController.uploadTourImages,
    // tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = Router;
