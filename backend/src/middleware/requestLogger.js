const logger = require('../utils/logger');

// Enhanced request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Extract useful request info
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    companyId: req.user?.company_id,
  };

  // Log the request
  logger.http(`${req.method} ${req.originalUrl}`, {
    ...requestInfo,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Override res.end to capture response info
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.originalUrl} - ${res.statusCode}`, responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} - ${res.statusCode}`, responseInfo);
    } else {
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, responseInfo);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;