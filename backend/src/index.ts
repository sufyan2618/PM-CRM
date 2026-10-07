import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { connectDatabase } from "./lib/db";
import { logger, morganStream } from "./lib/logger";
import { setupSwagger } from "./lib/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRateLimiter, globalRateLimiter } from "./middlewares/rate-limit.middleware";
import apiRouter from "./routers";
import authRouter from "./routers/auth.router";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(globalRateLimiter);

app.use(
  morgan("combined", {
    stream: morganStream,
  }),
);

app.use("/api", apiRouter);
app.use("/api/auth", authRateLimiter, authRouter);
setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error: error.message });
  process.exit(1);
});
