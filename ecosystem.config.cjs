module.exports = {
  apps: [
    {
      name: 'otec',
      // Fix #55: use standalone server.js directly instead of npm start
      script: '.next/standalone/server.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_POOL_MAX: 10,
      },
      // Restart si usa más de 512MB por worker
      max_memory_restart: '512M',
      // Reinicio gradual (0-downtime)
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Auto-restart con backoff exponencial
      exp_backoff_restart_delay: 100,
      max_restarts: 15,
      min_uptime: 5000,
    },
  ],
};
