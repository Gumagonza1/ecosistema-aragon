'use strict';

module.exports = {
  apps: [
    {
      name: 'telegram-dispatcher',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      env_file: '.env',                              // copy .env.example → .env
      error_file: '../logs/telegram-error.log',
      out_file:   '../logs/telegram-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
