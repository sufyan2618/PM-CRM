import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "./logger";

let transactionsSupported = false;
let detected = false;

export async function connectDatabase() {
  await mongoose.connect(env.MONGO_URI);
  logger.info("MongoDB connected");
  await detectTransactionSupport();
}

export async function detectTransactionSupport(): Promise<boolean> {
  if (detected) return transactionsSupported;

  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      transactionsSupported = false;
      detected = true;
      logger.warn("MongoDB transactions unavailable: no admin connection");
      return false;
    }

    const hello = (await admin.command({ hello: 1 })) as {
      setName?: string;
      msg?: string;
    };

    transactionsSupported = Boolean(hello.setName) || hello.msg === "isdbgrid";
    detected = true;

    if (transactionsSupported) {
      logger.info("MongoDB transactions supported (replica set / mongos)");
    } else {
      logger.warn(
        "MongoDB transactions unavailable (standalone). Using compensating cleanup fallback for multi-document writes.",
      );
    }
  } catch (error) {
    transactionsSupported = false;
    detected = true;
    logger.warn("MongoDB transaction detection failed; using cleanup fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return transactionsSupported;
}

export function supportsTransactions(): boolean {
  return transactionsSupported;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
