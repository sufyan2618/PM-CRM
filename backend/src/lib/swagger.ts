import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Auth Starter API",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": { description: "OK" },
        },
      },
    },
    "/api/auth/register": {
      post: { summary: "Register user", responses: { "201": { description: "Created" } } },
    },
    "/api/auth/verify-otp": {
      post: { summary: "Verify OTP", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/resend-otp": {
      post: { summary: "Resend OTP", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/login": {
      post: { summary: "Login user", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/refresh-token": {
      post: { summary: "Refresh access token", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/logout": {
      post: { summary: "Logout user", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/profile": {
      get: { summary: "Get profile", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/reset-password": {
      post: { summary: "Request reset password", responses: { "200": { description: "OK" } } },
    },
    "/api/auth/update-password": {
      post: { summary: "Update password", responses: { "200": { description: "OK" } } },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
