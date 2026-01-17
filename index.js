const { spawn } = require("child_process");

function run(file) {
  const child = spawn("node", [file], { stdio: "inherit" });

  child.on("exit", (code) => {
    console.log(`${file} exited with code ${code}`);
  });

  child.on("error", (err) => {
    console.error(`${file} failed to start`, err);
  });
}

run("server.js");
run("turn-server.js");
