import { FastifyInstance } from "fastify";
import registerAuthRoutes from "./authRoutes.ts";
import registerUserRoutes from "./userRoutes.ts";
import registerGameRoutes from "./gameRoutes.ts";

export default async function routes(app: FastifyInstance) {
	await registerAuthRoutes(app);
	await registerUserRoutes(app);
	await registerGameRoutes(app);
}
