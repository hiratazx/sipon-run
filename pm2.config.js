module.exports = {
  apps: [
    {
      name: 'progress-run',
      exec_mode: 'cluster',
      instances: 'max',
      script: './.output/server/index.mjs',
      args: '',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      }
    }
  ]
}
