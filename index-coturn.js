// kill ports first (optional, cross-platform)
const { execSync, spawn } = require("child_process");
const os = require("os");
const path = require("path");

function getPidsByPort(port) {
  const platform = os.platform();
  let cmd;

  if (platform === "win32") {
    cmd = `netstat -ano | findstr :${port}`;
  } else {
    cmd = `lsof -i :${port} -t`;
  }

  try {
    const output = execSync(cmd, { stdio: ["pipe", "pipe", "ignore"] })
      .toString()
      .trim();

    if (!output) return [];

    return output.split("\n").map(line => {
      if (platform === "win32") return line.trim().split(/\s+/).pop();
      return line.trim();
    });
  } catch {
    return [];
  }
}

function killPort(port) {
  const pids = getPidsByPort(port);
  for (const pid of pids) {
    try {
      if (os.platform() === "win32") {
        execSync(`taskkill /PID ${pid} /F`);
      } else {
        process.kill(pid, "SIGTERM");
      }
    } catch {}
  }
}

// optional: stop old servers
killPort(3000);
killPort(3478);

// start web server
require("./server.js");

// start coturn binary
const isBuilt = !!process.pkg;
const exeDir = isBuilt ? path.dirname(process.execPath) : __dirname;
const coturnExe = path.join(exeDir, "coturn", "bin", "turnserver.exe");

console.log(`🔄 Starting coturn from: ${coturnExe}`);

const coturn = spawn(coturnExe, [], {
  stdio: "inherit",
  detached: false
});

coturn.on("error", (error) => {
  console.error("❌ Failed to start coturn:", error);
});

coturn.on("exit", (code) => {
  console.log(`⚠️  Coturn exited with code ${code}`);
  process.exit(code || 1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  if (coturn.pid) {
    try {
      process.kill(coturn.pid);
    } catch {}
  }
  process.exit(0);
});
