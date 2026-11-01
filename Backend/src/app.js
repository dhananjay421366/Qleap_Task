import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import taskRoutes from "./router/task.routes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import pool from "./db/connection.js";

const app = express();

// Request Logging Middleware to log incoming requests and their response times
app.use((req, res, next) => {
  const requestId = req.get("X-Request-Id") || randomUUID();
  const startedAt = Date.now();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        event: "http_request",
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      })
    );
  });
  next();
});

const allowedOrigins = (process.env.CORS_ORIGINS)
  .split(",")
  .map((origin) => origin.trim())
  .map((origin) => new URL(origin).origin)
  .filter(Boolean);

const rateLimitWindowMs =
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const defaultRateLimit = Number(process.env.RATE_LIMIT_MAX) || 100;

const createRateLimiter = (limit) =>
  rateLimit({
    windowMs: rateLimitWindowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });

const readRateLimiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_READ_MAX) || defaultRateLimit
);
const writeRateLimiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_WRITE_MAX) || defaultRateLimit
);

// Global Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// API Routes
app.use(
  "/api",
  (req, res, next) => {
    const limiter = req.method === "GET" ? readRateLimiter : writeRateLimiter;
    limiter(req, res, next);
  },
  taskRoutes
);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// Readiness Check
app.get("/health/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ success: true, message: "Service is ready" });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "readiness_check_failed",
        requestId: req.requestId,
        error: error.message,
      })
    );
    res.status(503).json({ success: false, message: "Service is not ready" });
  }
});

// Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
