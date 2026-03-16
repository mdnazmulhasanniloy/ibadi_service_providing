module.exports = {
  apps: [
    {
      name: 'project_format',
      script: './dist/server.js',

      // 🔴 এই লাইনটা যোগ করো
      node_args: '-r tsconfig-paths/register',

      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/error/err.log',
      out_file: './logs/out/out.log',
      log_file: './logs/combined/combined.log',
      time: true,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
