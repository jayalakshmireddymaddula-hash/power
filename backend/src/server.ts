import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./lib/db.js";
import { jobQueue } from "./jobs/queue.js";

async function bootstrap() {
  try {
    console.log("🚀 Initializing FlowPilot AI Database & Schema...");
    await db.initSchema();

    // Start background job worker
    jobQueue.startWorker();

    const server = app.listen(config.API_PORT, () => {
      console.log(`
=====================================================
✨ FlowPilot AI Platform Server Running
🌐 URL:  http://localhost:${config.API_PORT}
📡 API:  http://localhost:${config.API_PORT}/api/v1
🩺 Health: http://localhost:${config.API_PORT}/api/v1/health
🤖 AI Provider: ${config.AI_PROVIDER}
📂 Mode: ${config.NODE_ENV}
=====================================================
      `);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\n🛑 Gracefully shutting down FlowPilot AI server...");
      jobQueue.stopWorker();
      server.close(() => {
        console.log("Server closed. Exiting process.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("❌ Failed to start FlowPilot AI server:", err);
    process.exit(1);
  }
}

bootstrap();
