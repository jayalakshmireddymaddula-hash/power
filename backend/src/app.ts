import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { errorHandler, AppError } from "./middleware/error-handler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

// Security Headers
app.use(helmet());

// CORS
const allowedOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local dev
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-Correlation-ID", "X-Organization-ID"],
  })
);

// Request body limits
app.use(express.json({ limit: config.MAX_REQUEST_BODY_BYTES }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_BODY_BYTES }));

// Request IDs
app.use(requestIdMiddleware);

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms) [${req.id}]`);
    }
  });
  next();
});

// API Routes
app.use("/api/v1", apiRouter);

// 404 Handler
app.use((req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Endpoint ${req.method} ${req.originalUrl} does not exist.`));
});

// Centralized Error Handler
app.use(errorHandler);
