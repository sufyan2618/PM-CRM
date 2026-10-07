import { Router } from "express";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

export default apiRouter;
