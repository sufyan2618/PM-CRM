import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { ProjectModel } from "../models/project.model";
import { TaskModel } from "../models/task.model";
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

const DEMO_PROJECTS = [
  {
    name: "UrbanCart Website",
    clientName: "UrbanCart Clothing",
    description: "A considered storefront experience for UrbanCart’s next chapter.",
    managerCode: "PM01",
    deadline: "2026-10-20",
    tasks: [
      { title: "Product catalog UI", description: "Build the responsive product listing and detail views.", assigneeCode: "DEV01", deadline: "2026-10-12", estimatedHours: 12 },
      { title: "Product search and filters", description: "Add clear category, size, and price filters.", assigneeCode: "DEV01", deadline: "2026-10-15", estimatedHours: 8 },
      { title: "Shopping cart and checkout", description: "Implement cart updates and the checkout journey.", assigneeCode: "DEV02", deadline: "2026-10-17", estimatedHours: 10 },
      { title: "Responsive storefront polish", description: "Refine mobile layouts and final visual details.", assigneeCode: "DEV03", deadline: "2026-10-20", estimatedHours: 10 },
    ],
  },
  {
    name: "QuickServe Mobile App",
    clientName: "QuickServe",
    description: "A dependable ordering app for customers and local merchants.",
    managerCode: "PM02",
    deadline: "2026-10-24",
    tasks: [
      { title: "Payments integration", description: "Connect the payment flow and transaction states.", assigneeCode: "DEV01", deadline: "2026-10-18", estimatedHours: 10 },
      { title: "Order tracking", description: "Show clear status updates from kitchen to customer.", assigneeCode: "DEV02", deadline: "2026-10-20", estimatedHours: 12 },
      { title: "Push notification setup", description: "Wire up order and delivery notifications.", assigneeCode: "DEV04", deadline: "2026-10-22", estimatedHours: 10 },
      { title: "Merchant dashboard", description: "Create the core order management screens.", assigneeCode: "DEV05", deadline: "2026-10-24", estimatedHours: 14 },
    ],
  },
  {
    name: "HelpDeskPro AI Assistant",
    clientName: "HelpDeskPro",
    description: "An AI support assistant grounded in the client’s help center.",
    managerCode: "PM03",
    deadline: "2026-10-22",
    tasks: [
      { title: "Knowledge base ingestion", description: "Prepare support documents for reliable retrieval.", assigneeCode: "DEV06", deadline: "2026-10-16", estimatedHours: 12 },
      { title: "AI response pipeline", description: "Build the first response generation workflow.", assigneeCode: "DEV05", deadline: "2026-10-19", estimatedHours: 10 },
      { title: "Escalation handoff", description: "Route unresolved conversations to the support team.", assigneeCode: "DEV03", deadline: "2026-10-21", estimatedHours: 8 },
      { title: "Assistant integration QA", description: "Validate the assistant against support scenarios.", assigneeCode: "DEV04", deadline: "2026-10-22", estimatedHours: 8 },
    ],
  },
];

async function seedDemoProjects() {
  const users = await UserModel.find({ code: { $in: SEED_USERS.map((user) => user.code) } }).select("_id code").lean();
  const userIds = new Map(users.map((user) => [user.code, user._id]));

  for (const input of DEMO_PROJECTS) {
    const managerId = userIds.get(input.managerCode);
    if (!managerId) throw new Error(`Seed manager ${input.managerCode} was not created`);
    const project = await ProjectModel.findOneAndUpdate(
      { name: input.name, clientName: input.clientName },
      { $set: { name: input.name, clientName: input.clientName, description: input.description, managerId, deadline: input.deadline } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await TaskModel.bulkWrite(input.tasks.map((task) => {
      const assigneeId = userIds.get(task.assigneeCode);
      if (!assigneeId) throw new Error(`Seed agent ${task.assigneeCode} was not created`);
      const { assigneeCode: _assigneeCode, ...taskFields } = task;
      return {
        updateOne: {
          filter: { projectId: project._id, title: task.title },
          update: { $set: { ...taskFields, projectId: project._id, assigneeId } },
          upsert: true,
        },
      };
    }));
  }
}

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
  await seedDemoProjects();
  const created = result.upsertedCount;
  const existing = SEED_USERS.length - created;

  console.log(`Seed complete. created=${created} existing=${existing} total=${SEED_USERS.length}`);
  console.log(`Demo workspace seeded: ${DEMO_PROJECTS.length} projects and ${DEMO_PROJECTS.reduce((sum, project) => sum + project.tasks.length, 0)} tasks.`);
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
