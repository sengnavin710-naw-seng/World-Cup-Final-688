import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health";
import { participantRouter } from "./routes/participant";
import { tournamentRouter } from "./routes/tournament";

function isUpstreamFetchError(error: Error) {
  return error.message.includes("fetch failed");
}

// Allowed origins: production domain + local dev
const ALLOWED_ORIGINS = new Set([
  "https://seng688.com",
  "https://www.seng688.com",
  "http://seng688.com",
  "http://www.seng688.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Allow any local network IP during development (192.168.x.x:5173)
  ...(process.env.NODE_ENV !== "production"
    ? ["http://192.168.110.119:5173"]
    : []),
]);

export function createServer() {
  const app = express();
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use((req, res, next) => {
    const requestId =
      typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()
        ? req.headers["x-request-id"]
        : randomUUID();
    const startedAt = Date.now();

    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    console.info(`[${requestId}] ${req.method} ${req.originalUrl} started`);
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      console.info(
        `[${requestId}] ${req.method} ${req.originalUrl} completed ${res.statusCode} in ${durationMs}ms`,
      );
    });

    next();
  });

  app.use("/health", healthRouter);
  app.use("/api/tournament", tournamentRouter);
  app.use("/api/participant", participantRouter);
  app.use((req, res) => {
    res.status(404).json({
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} was not found.`,
      requestId: res.locals.requestId,
    });
  });

  app.use(
    (
      error: Error & { code?: string; status?: number },
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const requestId = res.locals.requestId ?? "unknown-request";
      const status = error.status ?? (isUpstreamFetchError(error) ? 503 : 500);
      const code = error.code ?? (status === 503 ? "UPSTREAM_UNAVAILABLE" : "INTERNAL_ERROR");
      const message =
        error.status || status === 404
          ? error.message
          : status === 503
            ? "Upstream service is temporarily unavailable."
            : "Unexpected server error.";

      const logPayload = {
        code,
        status,
        message: error.message,
        ...(status >= 500 ? { stack: error.stack } : {}),
      };

      if (status >= 500) {
        console.error(`[${requestId}] ${req.method} ${req.originalUrl} failed`, logPayload);
      } else {
        console.warn(`[${requestId}] ${req.method} ${req.originalUrl} failed`, logPayload);
      }

      res.status(status).json({
        code,
        message,
        requestId,
      });
    },
  );

  return app;
}
