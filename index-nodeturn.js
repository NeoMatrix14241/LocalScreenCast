// kill ports first (optional, cross-platform)
const { execSync } = require("child_process");
const os = require("os");

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
killPort(3487);

// start both servers
require("./server.js");
require("./turn-server.js");
