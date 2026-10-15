import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(__dirname, "../packages/shared");
const sharedDist = path.resolve(sharedDir, "dist/index.js");

try {
  if (!existsSync(sharedDist)) {
    console.log("⚙️  Compiling @flowpilot/shared dependency...");
    execSync("npm run build", { cwd: sharedDir, stdio: "inherit" });
  }
} catch (err) {
  console.warn("⚠️  Note on shared build:", err.message);
}
