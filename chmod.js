const fs = require("fs");
const path = require("path");

if (process.platform !== "linux") {
    process.exit(0);
}

const binPath = path.join(
    __dirname,
    "CSproj",
    "bin",
    "Release",
    "net8.0",
    "linux-x64",
    "publish",
    "FortniteReplayAnalysis"
);

try {
    fs.chmodSync(binPath, 0o755);
    console.log("[fortnite-replay-analysis] chmod +x applied");
} catch {
    // Linuxでもpublish構成が無いケースがあるので黙殺
}