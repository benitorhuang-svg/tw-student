// Extension: auto-npm-workflow
import { joinSession } from "@github/copilot-sdk/extension";
import fs from "node:fs/promises";
import path from "node:path";

const session = await joinSession({ tools: [], hooks: {} });
const repoRoot = process.cwd();

for (const f of ["cleanup-empty-dirs.mjs", "workflow-results.json"]) {
    try { await fs.unlink(path.join(repoRoot, f)); await session.log("Deleted: " + f); }
    catch (e) { if (e.code !== "ENOENT") await session.log("Warn: " + f + " — " + e.message); }
}

