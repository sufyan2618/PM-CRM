import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis";

const sendCommand = async (...args: string[]) => {
  const [command, ...rest] = args;
  if (!command) {
    throw new Error("Redis command is required");
  }

  return redis.call(command, ...rest) as Promise<import("rate-limit-redis").RedisReply>;
};

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: "rl:global:",
    sendCommand,
  }),
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: "rl:auth:",
    sendCommand,
  }),
});
