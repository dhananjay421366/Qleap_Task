import { Router } from "express";
import * as TaskController from "../controllers/task.controller.js";
import { validateTask } from "../middlewares/validateTask.js";
import {
  validateTaskId,
  validateTaskQuery,
} from "../middlewares/validateRequest.js";

const router = Router();

// Dashboard
router.get("/dashboard/summary", TaskController.getDashboardSummary);

// Task CRUD
router
  .route("/tasks")
  .get(validateTaskQuery, TaskController.getTasks)
  .post(validateTask, TaskController.createTask);

router
  .route("/tasks/:id")
  .get(validateTaskId, TaskController.getTask)
  .put(validateTaskId, validateTask, TaskController.updateTask)
  .delete(validateTaskId, TaskController.deleteTask);

export default router;
