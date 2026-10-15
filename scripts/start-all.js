import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("🚀  FlowPilot AI — Intelligent Workflow Automation Platform");
console.log("    Automate the Busywork. Accelerate the Work.");
console.log("==================================================================\n");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// 1. Start Backend API Server (Port 3000)
console.log("[1/2] Starting Backend API Server in /backend on http://localhost:3000 ...");
const api = spawn(npmCmd, ["run", "dev"], {
  cwd: path.resolve(rootDir, "backend"),
  stdio: "inherit",
  shell: true,
});

// 2. Start Frontend Web Client (Port 5173)
console.log("[2/2] Starting Frontend Web Client in /frontend on http://localhost:5173 ...");
const web = spawn(npmCmd, ["run", "dev", "--", "--host"], {
  cwd: path.resolve(rootDir, "frontend"),
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  console.log("\nShutting down FlowPilot AI services...");
  api.kill();
  web.kill();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
