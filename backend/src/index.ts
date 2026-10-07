import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Server } from "http";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/db";
import { logger, morganStream } from "./lib/logger";
import { redis } from "./lib/redis";
import { setupSwagger } from "./lib/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRateLimiter, globalRateLimiter } from "./middlewares/rate-limit.middleware";
import { sanitizeRequest } from "./middlewares/sanitize.middleware";
import apiRouter from "./routers";
import { getHealth } from "./controllers/health.controller";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeRequest);
app.use(globalRateLimiter);

app.use(
  morgan("combined", {
    stream: morganStream,
  }),
);

// Legacy health alias for docker/nginx healthchecks
app.get("/api/health", getHealth);

app.use("/api/v1/auth", authRateLimiter);
app.use("/api/v1", apiRouter);

setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

let server: Server | undefined;

async function bootstrap() {
  await connectDatabase();
  server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDatabase();
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("Graceful shutdown failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error: error.message });
  process.exit(1);
});
