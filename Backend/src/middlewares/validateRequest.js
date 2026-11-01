import { param, query, validationResult } from "express-validator";
import { HTTP_STATUS, PRIORITY, STATUS } from "../constants.js";

const sendValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

export const validateTaskId = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Task ID must be a positive integer"),
  sendValidationErrors,
];

export const validateTaskQuery = [
  query("status")
    .optional()
    .isString()
    .withMessage("Status filter must be a string")
    .isIn(STATUS)
    .withMessage(`Status must be one of: ${STATUS.join(", ")}`),
  query("priority")
    .optional()
    .isString()
    .withMessage("Priority filter must be a string")
    .isIn(PRIORITY)
    .withMessage(`Priority must be one of: ${PRIORITY.join(", ")}`),
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search cannot exceed 100 characters"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Page size must be between 1 and 100"),
  sendValidationErrors,
];
