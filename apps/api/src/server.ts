import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health";
import { participantRouter } from "./routes/participant";
import { tournamentRouter } from "./routes/tournament";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api/tournament", tournamentRouter);
  app.use("/api/participant", participantRouter);

  app.use(
    (
      error: Error & { code?: string; status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(error.status ?? 500).json({
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message || "Unexpected server error",
      });
    },
  );

  return app;
}
