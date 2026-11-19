export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.code === 11000) {
    status = 409;
    message = "A record with that unique value already exists";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    message = error.message;
  } else if (error.name === "MulterError") {
    status = 400;
    message = error.message;
  }

  if (status >= 500) {
    console.error("Request failed:", error.name || "Error", error.code || "");
    message = "Internal server error";
  }

  res.status(status).json({ message });
}
