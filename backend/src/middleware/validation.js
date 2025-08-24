const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));
    
    throw new AppError('Validation failed', 400, formattedErrors);
  }
  next();
};

// Common validation rules
const validationRules = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),

  // Password validation
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Required string validation
  requiredString: (field, min = 1) => body(field)
    .trim()
    .isLength({ min })
    .withMessage(`${field} is required and must be at least ${min} characters`),

  // Optional string validation
  optionalString: (field, max = 1000) => body(field)
    .optional()
    .trim()
    .isLength({ max })
    .withMessage(`${field} must be less than ${max} characters`),

  // UUID validation
  uuid: (field) => param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  // Numeric validation
  positiveInteger: (field) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`),

  // Optional positive integer
  optionalPositiveInteger: (field) => body(field)
    .optional()
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`),

  // Date validation
  dateString: (field) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`),

  // Optional date validation
  optionalDateString: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`),

  // Enum validation
  enum: (field, values) => body(field)
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`),

  // Optional enum validation
  optionalEnum: (field, values) => body(field)
    .optional()
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

// Specific validation sets for different endpoints
const validationSets = {
  // Auth validations
  login: [
    validationRules.email(),
    validationRules.requiredString('password', 1),
    handleValidationErrors,
  ],

  register: [
    validationRules.requiredString('name', 2),
    validationRules.email(),
    validationRules.password(),
    validationRules.requiredString('companyName', 2),
    handleValidationErrors,
  ],

  // Client validations
  createClient: [
    validationRules.requiredString('name', 2),
    validationRules.optionalEnum('contact_type', ['residential', 'commercial']),
    validationRules.optionalString('billing_email', 255),
    validationRules.optionalString('phone', 20),
    validationRules.optionalString('notes', 2000),
    handleValidationErrors,
  ],

  updateClient: [
    validationRules.uuid('id'),
    validationRules.optionalString('name', 2),
    validationRules.optionalEnum('contact_type', ['residential', 'commercial']),
    validationRules.optionalString('billing_email', 255),
    validationRules.optionalString('phone', 20),
    validationRules.optionalString('notes', 2000),
    handleValidationErrors,
  ],

  // Site validations
  createSite: [
    validationRules.uuid('clientId'),
    validationRules.requiredString('name', 2),
    validationRules.requiredString('address', 5),
    validationRules.requiredString('city', 2),
    validationRules.requiredString('state', 2),
    validationRules.optionalString('zip_code', 10),
    validationRules.optionalString('property_type', 50),
    validationRules.optionalPositiveInteger('square_footage'),
    validationRules.optionalString('notes', 2000),
    handleValidationErrors,
  ],

  // Inspection validations
  createInspection: [
    validationRules.uuid('site_id'),
    validationRules.uuid('template_id'),
    validationRules.optionalString('tech_id'),
    handleValidationErrors,
  ],

  // Estimate validations
  createEstimate: [
    validationRules.uuid('client_id'),
    validationRules.uuid('site_id'),
    validationRules.optionalString('price_book_id'),
    validationRules.optionalString('customer_notes', 2000),
    validationRules.optionalString('internal_notes', 2000),
    validationRules.optionalDateString('valid_until'),
    handleValidationErrors,
  ],

  addEstimateItem: [
    validationRules.requiredString('description', 1),
    body('qty')
      .isFloat({ min: 0 })
      .withMessage('Quantity must be a positive number'),
    body('unit_price_cents')
      .isInt({ min: 0 })
      .withMessage('Unit price must be a positive integer (in cents)'),
    validationRules.optionalEnum('unit', ['each', 'hour', 'foot', 'gallon', 'set']),
    handleValidationErrors,
  ],

  // Generic ID validation
  validateId: [
    param('id').isNumeric().withMessage('ID must be numeric'),
    handleValidationErrors,
  ],

  // Pagination validation
  validatePagination: [
    ...validationRules.pagination(),
    handleValidationErrors,
  ],
};

module.exports = {
  validationRules,
  validationSets,
  handleValidationErrors,
};