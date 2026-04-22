// PM2 process config — keeps the files service running + restarts on crash
module.exports = {
  apps: [
    {
      name: "odudoc-files",
      script: "./server.js",
      cwd: "/opt/odudoc-files",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        FILES_STORAGE_ROOT: "/var/www/files",
        FILES_PUBLIC_BASE_URL: "https://files.odudoc.com",
        // These two are loaded from /opt/odudoc-files/.env at runtime by the
        // systemd-equivalent behavior of PM2 + dotenv. Set them in .env only.
      },
      error_file: "/var/www/files/logs/err.log",
      out_file: "/var/www/files/logs/out.log",
      time: true,
    },
  ],
};
