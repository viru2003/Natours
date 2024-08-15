const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const tourRouter = require('./Route/tourRoutes');
const userRouter = require('./Route/userRoutes');
const reviewRouter = require('./Route/reviewRoutes');
const bookingRouter = require('./Route/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./Controllers/errorController');
const ratelimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const viewRouter = require('./Route/viewRoutes');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const app = express();

app.set('view engine', 'pug'); //this will set the view engine to pug
app.set('views', path.join(__dirname, 'views')); //this will set the views directory to the views folder

//////////Global Middlewares//////////

// app.use(cors);
//////////Serving static files//////////
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: [
        "'self'",
        'https://*.cloudflare.com',
        'https://*.stripe.com',
        'http:',
        'https://*.mapbox.com',
        'https://js.stripe.com/v3/',
        'data:',
      ],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      workerSrc: ["'self'", 'data:', 'blob:'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        "'self'",
        'blob:',
        'wss:',
        'https://*.tiles.mapbox.com',
        'https://api.mapbox.com',
        'https://events.mapbox.com',
        'https://js.stripe.com/v3/',
        'http://localhost:3000', // Add your connect source here
      ],
      upgradeInsecureRequests: [],
    },
  }),
);

//////////Middleware//////////
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

///////Rate Limiting//////////
//this will limit the number of requests from a single IP
const limiter = ratelimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP,please try again in an hour',
});
app.use('/api', limiter);

//body parser,reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' })); //this will parse the data from the urlencoded form. ie form data
app.use(cookieParser()); //this will parse the cookie from the request

//data sanitization against NoSQL query injection
/*
{
    "email":{"$gt":""},
    "password":"password1234"
}
This will log in the user without knowing the email. because $gt->greater than is always true
*/

app.use(mongoSanitize()); //mongoSanitize will return a middleware function

//data sanitization against XSS
app.use(xss()); //this will clean any user input from malicious HTML code

//this will prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
    //this will allow duplicate duration in the query string
  }),
);

app.use(compression());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

app.use('/', viewRouter);

//////////Routes->TOUR//////////
app.use('/api/v1/tours', tourRouter);

//////////Route->Users//////////
app.use('/api/v1/users', userRouter);

/////////Route->Review/////////
app.use('/api/v1/reviews', reviewRouter);
/////////Route->Booking/////////
app.use('/api/v1/bookings', bookingRouter);
//////////Error Handling Unhandled Routes//////////
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//////////Error Handling Middleware//////////
app.use(globalErrorHandler);

module.exports = app;

//path.join():this will join the current directory with the specified folder
