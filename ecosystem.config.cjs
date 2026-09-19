const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;

      const separator = trimmed.indexOf('=');
      if (separator === -1) return env;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
      if (key) env[key] = value;
      return env;
    }, {});
}

const localEnv = parseEnvFile(path.resolve(__dirname, '.env'));
const apiInstances = process.env.API_INSTANCES || localEnv.API_INSTANCES || 2;
const frontendPort = process.env.FRONTEND_PORT || localEnv.FRONTEND_PORT || 4173;

module.exports = {
  apps: [
    {
      name: 'flayer-api',
      cwd: './backend',
      script: 'dist/server.js',
      exec_mode: 'cluster',
      instances: apiInstances,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'flayer-frontend',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: `preview --host 0.0.0.0 --port ${frontendPort}`,
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
