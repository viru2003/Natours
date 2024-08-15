module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err)); //this will return a function which will be called when the route is hit
    //fn will return a promise and if there is an error it will be caught by the catch block and will be passed to the next middleware
  };
};
