import { body, validationResult } from "express-validator";
import { PRIORITY, STATUS, HTTP_STATUS } from "../constants.js";

/**
 * Validation rules for Create / Update Task
 */
export const validateTask = [
  body("title")
    .isString()
    .withMessage("Task title must be a string")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("assigned_to")
    .isString()
    .withMessage("Assigned To must be a string")
    .trim()
    .notEmpty()
    .withMessage("Assigned To is required")
    .isLength({ max: 100 })
    .withMessage("Assigned To cannot exceed 100 characters"),

  body("priority")
    .isIn(PRIORITY)
    .withMessage(`Priority must be one of: ${PRIORITY.join(", ")}`),

  body("due_date")
    .notEmpty()
    .withMessage("Due date is required")
    .isString()
    .withMessage("Due date must be a string")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Due date must be in YYYY-MM-DD format")
    .custom((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        throw new Error("Due date must be a valid calendar date");
      }
      return true;
    }),

  body("status")
    .isIn(STATUS)
    .withMessage(`Status must be one of: ${STATUS.join(", ")}`),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  // Check validation result
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
