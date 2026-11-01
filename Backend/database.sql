CREATE DATABASE IF NOT EXISTS task_management;

USE task_management;

CREATE TABLE
    IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        assigned_to VARCHAR(100) NOT NULL,
        priority ENUM ('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
        due_date DATE NOT NULL,
        status ENUM ('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tasks_status (status),
        INDEX idx_tasks_priority (priority),
        INDEX idx_tasks_created_at (created_at),
        INDEX idx_tasks_due_date (due_date)
    );
