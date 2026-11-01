import * as TaskModel from "../models/task.model.js";
import { HTTP_STATUS } from "../constants.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 *  Get all tasks (with search & filters)
 *  GET /api/tasks
 */
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, search, page = 1, pageSize = 25 } = req.query;

  const { rows: tasks, total } = await TaskModel.getAllTasks({
    status,
    priority,
    search,
    page: Number(page),
    pageSize: Number(pageSize),
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    count: tasks.length,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      totalPages: Math.ceil(total / Number(pageSize)),
      hasNextPage: Number(page) * Number(pageSize) < total,
    },
    data: tasks,
  });
});

/**
 *     Get single task by ID
 *     GET /api/tasks/:id
 */
export const getTask = asyncHandler(async (req, res) => {
  const task = await TaskModel.getTaskById(req.params.id);

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: task,
  });
});

/**
 *     Create new task
 *     POST /api/tasks
 */
export const createTask = asyncHandler(async (req, res) => {
  const newTask = await TaskModel.createTask(req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: "Task created successfully",
    data: newTask,
  });
});

/**
 *     Update task
 *     PUT /api/tasks/:id
 */
export const updateTask = asyncHandler(async (req, res) => {
  const updated = await TaskModel.updateTask(req.params.id, req.body);

  if (!updated) {
    const error = new Error("Task not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Task updated successfully",
  });
});

/**
 *     Delete task
 *     DELETE /api/tasks/:id
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const deleted = await TaskModel.deleteTask(req.params.id);

  if (!deleted) {
    const error = new Error("Task not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Task deleted successfully",
  });
});

/**
 *     Get dashboard summary
 *     GET /api/dashboard/summary
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await TaskModel.getDashboardSummary();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      totalTasks: Number(summary.totalTasks) || 0,
      pendingTasks: Number(summary.pendingTasks) || 0,
      inProgressTasks: Number(summary.inProgressTasks) || 0,
      completedTasks: Number(summary.completedTasks) || 0,
    },
  });
});
