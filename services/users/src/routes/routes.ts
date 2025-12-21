import type { FastifyInstance } from "fastify";
import registerAuthRoutes from "./authRoutes.ts";
import registerUserRoutes from "./userRoutes.ts";
import registerGameRoutes from "./gameRoutes.ts";
import registerHealthRoutes from "./healthRoutes.ts";
import registerPublicRoutes from "./publicRoutes.ts";

export default async function routes(app: FastifyInstance) {
	await registerAuthRoutes(app);
	await registerUserRoutes(app);
	await registerGameRoutes(app);
	await registerHealthRoutes(app);
	await registerPublicRoutes(app);
}
