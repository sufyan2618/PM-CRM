import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../utils/password";

const SEED_USERS = [
  {
    code: "ADMIN",
    firstName: "Admin",
    lastName: "",
    email: "admin@novaworks.example",
    role: "ADMIN" as const,
    specialization: "Administrator",
    skills: ["Company overview", "transcript creation"],
  },
  {
    code: "PM01",
    firstName: "Ayesha",
    lastName: "Khan",
    email: "ayesha@novaworks.example",
    role: "MANAGER" as const,
    specialization: "Manager / Web PM",
    skills: ["Web projects", "client coordination"],
  },
  {
    code: "PM02",
    firstName: "Bilal",
    lastName: "Ahmed",
    email: "bilal@novaworks.example",
    role: "MANAGER" as const,
    specialization: "Manager / Mobile PM",
    skills: ["Mobile projects", "delivery planning"],
  },
  {
    code: "PM03",
    firstName: "Hina",
    lastName: "Malik",
    email: "hina@novaworks.example",
    role: "MANAGER" as const,
    specialization: "Manager / AI PM",
    skills: ["AI projects", "requirement review"],
  },
  {
    code: "DEV01",
    firstName: "Ali",
    lastName: "Raza",
    email: "ali@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / Full-Stack",
    skills: ["React", "frontend integration"],
  },
  {
    code: "DEV02",
    firstName: "Hamza",
    lastName: "Shah",
    email: "hamza@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / Full-Stack",
    skills: ["Node.js", "databases", "APIs"],
  },
  {
    code: "DEV03",
    firstName: "Sara",
    lastName: "Noor",
    email: "sara@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / App Developer",
    skills: ["Flutter", "mobile UI"],
  },
  {
    code: "DEV04",
    firstName: "Usman",
    lastName: "Tariq",
    email: "usman@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / App Developer",
    skills: ["Flutter", "integration", "testing"],
  },
  {
    code: "DEV05",
    firstName: "Zain",
    lastName: "Abbas",
    email: "zain@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / AI Developer",
    skills: ["LLMs", "extraction", "prompts"],
  },
  {
    code: "DEV06",
    firstName: "Maryam",
    lastName: "Asif",
    email: "maryam@novaworks.example",
    role: "AGENT" as const,
    specialization: "Agent / AI Developer",
    skills: ["Retrieval", "document processing"],
  },
];

async function seed() {
  const resetPasswords = process.argv.includes("--reset-passwords");
  await mongoose.connect(env.MONGO_URI);

  const passwordHash = await hashPassword(env.SEED_DEFAULT_PASSWORD);

  const ops = SEED_USERS.map((user) => {
    const setFields = {
      firstName: user.firstName,
      lastName: user.lastName,
      code: user.code,
      role: user.role,
      specialization: user.specialization,
      skills: user.skills,
      isVerified: true,
      isBlocked: false,
      loginAttempts: 0,
      ...(resetPasswords ? { password: passwordHash } : {}),
    };

    return {
      updateOne: {
        filter: { email: user.email },
        update: {
          $set: setFields,
          $setOnInsert: {
            email: user.email,
            ...(resetPasswords ? {} : { password: passwordHash }),
            emailRateLimit: {
              count: 0,
              windowStart: new Date(),
              resetAfterMinutes: 30,
            },
          },
        },
        upsert: true,
      },
    };
  });

  const result = await UserModel.bulkWrite(ops);
  const created = result.upsertedCount;
  const existing = SEED_USERS.length - created;

  console.log(`Seed complete. created=${created} existing=${existing} total=${SEED_USERS.length}`);
  if (resetPasswords) {
    console.log("Passwords reset to SEED_DEFAULT_PASSWORD");
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
