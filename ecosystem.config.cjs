const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const vars = {};
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim();
          vars[key] = val;
        }
      }
    });
    return vars;
  } catch (e) {
    return {};
  }
}

const envVars = parseEnvFile(path.join(__dirname, ".env.local"));

module.exports = {
  apps: [
    {
      name: "otec",
      script: ".next/standalone/server.js",
      cwd: "./",
      instances: "max",
      exec_mode: "cluster",
      env: {
        ...envVars,
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      listen_timeout: 10000,
      kill_timeout: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      exp_backoff_restart_delay: 100,
      max_restarts: 15,
      min_uptime: 5000,
    },
  ],
};
