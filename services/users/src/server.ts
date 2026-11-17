import { buildApp } from "./app.ts";

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";


(async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: Number(PORT), host: HOST });
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`Public API docs at /api/public/docs`)
  } catch (err) {
    app.log?.error?.(err);
    process.exit(1);
  }
})()
