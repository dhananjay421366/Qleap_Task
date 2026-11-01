import pool from "../db/connection.js";

/**
 * Get all tasks with optional filters (search, status, priority)
 */
export const getAllTasks = async (filters = {}) => {
  let where = " WHERE 1=1";
  const params = [];
  const page =
    Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const pageSize =
    Number.isInteger(filters.pageSize) && filters.pageSize > 0
      ? Math.min(filters.pageSize, 100)
      : 25;
  const offset = (page - 1) * pageSize;

  if (filters.status) {
    where += " AND status = ?";
    params.push(filters.status);
  }

  if (filters.priority) {
    where += " AND priority = ?";
    params.push(filters.priority);
  }

  if (filters.search) {
    where += " AND title LIKE ?";
    params.push(`%${filters.search}%`);
  }

  const query = `SELECT * FROM tasks${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
  const countQuery = `SELECT COUNT(*) AS total FROM tasks${where}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.execute(query, params),
    pool.execute(countQuery, params),
  ]);

  return {
    rows,
    total: Number(countRows[0]?.total) || 0,
  };
};

/**
 * Get single task by ID
 */
export const getTaskById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM tasks WHERE id = ?", [id]);
  return rows[0];
};

/**
 * Create a new task
 */
export const createTask = async (taskData) => {
  const { title, description, assigned_to, priority, due_date, status } =
    taskData;

  const [result] = await pool.execute(
    `INSERT INTO tasks (title, description, assigned_to, priority, due_date, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description || null, assigned_to, priority, due_date, status]
  );

  return { id: result.insertId, ...taskData };
};

/**
 * Update existing task
 */
export const updateTask = async (id, taskData) => {
  const { title, description, assigned_to, priority, due_date, status } =
    taskData;

  const [result] = await pool.execute(
    `UPDATE tasks 
     SET title = ?, description = ?, assigned_to = ?, priority = ?, due_date = ?, status = ?
     WHERE id = ?`,
    [title, description || null, assigned_to, priority, due_date, status, id]
  );

  return result.affectedRows > 0;
};

/**
 * Delete task by ID
 */
export const deleteTask = async (id) => {
  const [result] = await pool.execute("DELETE FROM tasks WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * Get dashboard summary counts
 */
export const getDashboardSummary = async () => {
  const [rows] = await pool.execute(`
    SELECT 
      COUNT(*) AS totalTasks,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingTasks,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressTasks,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks
    FROM tasks
  `);

  return rows[0];
};
