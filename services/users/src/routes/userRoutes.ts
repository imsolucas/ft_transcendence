import { Router } from "express";
import { getUsers } from "../controllers/userControllers.ts";

const router = Router();

router.get("/", getUsers);

export default router;
