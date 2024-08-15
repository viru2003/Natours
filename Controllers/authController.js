const User = require(`./../Models/userModel`);
const jwt = require(`jsonwebtoken`);
const catchAsync = require('./../utils/catchAsync');
const AppError = require(`./../utils/appError`);
const Email = require(`./../utils/email`);
const crypto = require(`crypto`);
const { promisify } = require(`util`);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  /*
  Cookie is a small piece of text which is sent by the server and stored on the client side(browser).
  Whenever the user makes a request to the server, the cookie is sent to the server along with the request. 
  The server can then use the data stored in the cookie to identify the user.
  */

  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      // Date.now() + 10 * 1000,
    ),
    // secure: true,cookie will only be sent on an encrypted connection,i.e https
    httpOnly: true, //cookie cannot be accessed or modified in any way by the browser
  };

  if (process.env.NODE_ENV === `production`) cookieOptions.secure = true;

  res.cookie(`jwt`, token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: `success`,
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  //id->payload, secret->secret key, options->expiresIn(when user will be logged out)
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //destructuring

  //1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError(`Please provide email and password!`, 400));
  }

  //2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(`Incorrect email or password`, 401));
  }

  //3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    //cookie will be deleted
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: `success`,
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith(`Bearer`)
  ) {
    token = req.headers.authorization.split(` `)[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(`You are not logged in! Please log in to get access.`, 401),
    );
  }

  //2) Verification token
  //promisify to convert callback function to promise
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError(`The user belonging to this token does not exist.`, 401),
    );
  }

  //4) Check if user changed password after the token was issued
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(`User recently changed password! Please log in again`, 401),
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = user;
  res.locals.user = user;
  next();
});

//cannot pass arguments to middleware function,hence wrapping it in another function
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`You do not have permission to perform this action`, 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`There is no user with email address`, 404));
  }

  //2)Generate the random reset token
  // const resetToken = User.createPasswordResetToken();
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //this will save the document without validating it

  //3)Send it to user's email
  //try catch is used because if there is an error in sending email, then we have to delete the passwordResetToken and passwordResetExpires
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: `success`,
      message: `Token sent to email!`,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        `There was an error sending the email. Try again later!`,
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }); //if the token has not expired and there is a user, then only we will reset the password

  //2)If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError(`Token is invalid or has expired`, 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3)Update changedPasswordAt property for the user

  //4)Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(`Your current password is wrong`, 401));
  }
  //3) If so,update password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4) Log user in,send JWT
  createSendToken(user, 200, res);
});

// only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      const user = await User.findById(decoded.id);
      if (!user) {
        return next();
      }

      if (user.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      res.locals.user = user; //locals is a property of res object, it is available to all the templates
      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};
