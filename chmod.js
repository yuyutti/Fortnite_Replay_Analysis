const fs = require("fs");
const path = require("path");

if (process.platform !== "linux") {
    console.log("[fortnite-replay-analysis] skip chmod (not linux)");
    process.exit(0);
}

const binPath = path.join(
    __dirname,
    "CSproj",
    "bin",
    "Release",
    "net10.0",
    "linux-x64",
    "publish",
    "FortniteReplayAnalysis"
);

if (!fs.existsSync(binPath)) {
    console.warn("[fortnite-replay-analysis] binary not found:", binPath);
    process.exit(0);
}

try {
    fs.chmodSync(binPath, 0o755);
    console.log("[fortnite-replay-analysis] chmod +x applied:", binPath);
} catch (e) {
    console.error("[fortnite-replay-analysis] chmod failed:", e.message);
}