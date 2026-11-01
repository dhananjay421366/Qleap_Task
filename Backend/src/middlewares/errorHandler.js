import { HTTP_STATUS } from "../constants.js";

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error(
    JSON.stringify({
      event: "request_error",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  );

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isDevelopment = process.env.NODE_ENV === "development";
  const isClientError = statusCode >= 400 && statusCode < 500;
  const message =
    isDevelopment || isClientError
      ? err.message || "Request failed"
      : "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  next(error);
};
