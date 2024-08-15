const express = require('express');
const userController = require('./../Controllers/userController');
const authController = require(`./../Controllers/authController`);
const multer = require('multer');

//////////Routes//////////

const Router = express.Router();

//////////Authentication Routes//////////
//for route: /api/v1/users/signup
Router.post('/signup', authController.signup);

//for route: /api/v1/users/login
Router.post('/login', authController.login);

//for route: /api/v1/users/logout
Router.get('/logout', authController.logout);

//////////Route for forgot password//////////
Router.route('/forgotPassword').post(authController.forgotPassword);
Router.route('/resetPassword/:token').patch(authController.resetPassword);

Router.use(authController.protect); //this will protect all the routes below this middleware

//////////Route for get me//////////
Router.get('/me', userController.getMe, userController.getUser);

//////////Route for update password//////////
Router.patch('/updateMyPassword', authController.updatePassword);

//////////Route for update user//////////
Router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
); //upload file

//////////Route for delete user//////////
Router.delete('/deleteMe', userController.deleteMe);
Router.use(authController.restrictTo('admin')); //this will restrict all the routes below this middleware to admin

//////////User Routes///////////
//for route: /api/v1/users
Router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

//for route: /api/v1/users/:id
Router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = Router;
