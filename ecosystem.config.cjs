module.exports = {
  apps: [
    {
      name: 'flayer-api',
      cwd: './backend',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: process.env.API_INSTANCES || 2,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'flayer-frontend',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: `preview --host 0.0.0.0 --port ${process.env.FRONTEND_PORT || 4173}`,
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
