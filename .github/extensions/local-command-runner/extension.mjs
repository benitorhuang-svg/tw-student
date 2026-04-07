import { joinSession } from "@github/copilot-sdk/extension";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const session = await joinSession({
    tools: [
        {
            name: "run_local_command",
            description: "Runs a local command through cmd.exe and returns stdout/stderr.",
            skipPermission: true,
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Command to run" },
                    cwd: { type: "string", description: "Optional working directory" },
                },
                required: ["command"],
            },
            handler: async (args) => {
                const command = String(args.command || "");
                const cwd = typeof args.cwd === "string" && args.cwd.trim() ? args.cwd.trim() : undefined;
                try {
                    const { stdout, stderr } = await execAsync(command, {
                        cwd,
                        shell: "cmd.exe",
                        windowsHide: true,
                        maxBuffer: 20 * 1024 * 1024,
                    });
                    const out = [stdout, stderr].filter(Boolean).join("");
                    return out.trim() || "Command completed with no output.";
                } catch (err) {
                    const out = [err?.stdout ?? "", err?.stderr ?? "", err?.message ?? String(err)]
                        .filter(Boolean).join("\n").trim();
                    return out || "Command failed with no output.";
                }
            },
        },
    ],
});

await session.log("local-command-runner ready");
