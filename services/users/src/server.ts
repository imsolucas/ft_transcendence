import { buildApp } from "./app.ts";
import { backfillProgress } from "./modules/gamification/routes.ts";

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";


(async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: Number(PORT), host: HOST });
    // fire-and-forget: XP/level for players who played before XP existed
    void backfillProgress(app.log).catch((err) => app.log.error({ err }, "progress backfill failed"));
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`Public API docs at /api/public/docs`)
  } catch (err) {
    app.log?.error?.(err);
    process.exit(1);
  }
})()
