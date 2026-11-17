import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/healthControllers.ts";

export default async function registerHealthRoutes(app: FastifyInstance) {
	app.get("/health", {
	schema: {
		summary: "Health check",
		description: "Returns the health status of the service.",
		response: {
		200: {
			description: "Service is healthy.",
			type: "object",
			properties: {
			status: { type: "string" }
			}
		},
		503: {
			description: "Database unreachable.",
			type: "object",
			properties: {
			status: { type: "string" }
			}
		}
		}
	}
	}, controllers.healthCheck);
}
