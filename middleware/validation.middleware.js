import { body, param, query, validationResult } from 'express-validator';
import { AppError } from './error.middleware.js';

export const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const extractedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));

        throw new AppError('Validation failed', 400, extractedErrors);
    };
};

// Common validation chains
export const commonValidations = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be  positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],
    
    objectId: (field) => 
        param(field)
            .isMongoId()
            .withMessage(`Invalid ${field} ID format`),

    email: 
        body('email')
            .isEmail()
            .bail().isString().trim().toLowerCase()
            .withMessage('Please provide a valid email'),

    password: 
        body('password')
            .isString().bail().isLength({ min: 8 }).custom(value => Buffer.byteLength(value, 'utf8') <= 72)
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
            .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),

    name:
        body('name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]*$/)
            .withMessage('Name can only contain letters and spaces'),

    price:
        body('price')
            .isFloat({ min: 0 })
            .withMessage('Price must be a positive number'),

    url:
        body('url')
            .isURL()
            .withMessage('Please provide a valid URL')
};

// User validation chains
export const validateSignup = validate([
    commonValidations.name,
    commonValidations.email,
    commonValidations.password
]);

export const validateSignin = validate([
    commonValidations.email,
    body('password')
        .isString().bail().isLength({ max: 72 })
        .notEmpty()
        .withMessage('Password is required')
]);

export const validatePasswordChange = validate([
    body('currentPassword')
        .isString().bail().isLength({ max: 72 })
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isString().bail().isLength({ min: 8 }).custom(value => Buffer.byteLength(value, 'utf8') <= 72)
        .notEmpty()
        .withMessage('New password is required')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        })
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
        .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character')
]);

export const validateProfile = validate([
  body('name').optional().isString().bail().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isString().bail().isEmail().trim().toLowerCase(),
  body('bio').optional().isString().isLength({ max: 200 }),
]);

export const validateCourse = (partial = false) => validate([
  body('title').optional(partial).isString().bail().trim().isLength({ min: 1, max: 100 }),
  body('category').optional(partial).isString().bail().trim().isLength({ min: 1, max: 100 }),
  body('price').optional(partial).isFloat({ min: 0, max: 10000000 }).custom(v => Number.isSafeInteger(Math.round(Number(v) * 100)) && Math.abs(Number(v) * 100 - Math.round(Number(v) * 100)) < 0.00001).toFloat(),
  body('subtitle').optional().isString().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 10000 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('isPublished').optional().isBoolean({ strict: false }).toBoolean(),
]);
export const validateLecture = validate([
  body('title').isString().bail().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('isPreview').optional().isBoolean({ strict: false }).toBoolean(),
]);
