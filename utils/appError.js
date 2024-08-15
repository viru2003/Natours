class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; //if the status code starts with 4 then it is a fail else it is an error
    this.isOperational = true; //this is used to differentiate between operational errors and programming errors
    Error.captureStackTrace(this, this.constructor); //this will capture the stack trace and will not pollute the stack trace with the constructor function
  }
}

module.exports = AppError;
