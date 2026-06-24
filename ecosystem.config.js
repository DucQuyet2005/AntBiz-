module.exports = {
  apps: [
    {
      name: 'antbiz',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/AntBiz-',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'antbiz-worker',
      script: 'node_modules/.bin/tsx',
      args: 'worker.ts',
      cwd: '/var/www/AntBiz-',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
