import "./config/env.js";
import app from "./app.js";
import pool from "./db/connection.js";

const PORT = Number(process.env.PORT) || 5000;
let server;

// Shutdown function to gracefully close the server and database connection
const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await pool.end();
  process.exit(0);
};

// Start the server and connect to the database
const start = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL Connected Successfully");
    connection.release();
    server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MySQL:", err.message);
    await pool.end();
    process.exitCode = 1;
  }
};

// Handle termination signals for graceful shutdown
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
