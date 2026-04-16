module.exports = {
  apps: [{
    name: 'mme',
    script: './backend/dist/app.js',
    cwd: '/opt/M.me',
    instances: 1,
    node_args: '--max-old-space-size=512',
    env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: '/opt/M.me/backend/.env' },
    error_file: '/var/log/pm2/mme-error.log',
    out_file: '/var/log/pm2/mme-out.log',
  }]
}
