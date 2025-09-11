import express, { Application, Request, Response } from "express";
import userRoutes from "./routes/userRoutes.ts";

const app: Application = express();

// Middleware
app.use(express.json());

// Routes
app.use("/users", userRoutes);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.send("Hello TypeScript + Node.js! 🟦");
});

export default app;
