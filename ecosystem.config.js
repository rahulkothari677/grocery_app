module.exports = {
  apps: [
    {
      name: 'luxegrocer-backend',
      script: './backend/server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        PORT: 5000,
        NODE_ENV: 'development'
      },
      env_production: {
        PORT: 5000,
        NODE_ENV: 'production',
        MONGO_URI: 'mongodb://localhost:27017/luxegrocer',
        JWT_SECRET: 'luxegrocer-super-secret-jwt-key-2026'
      }
    }
  ]
};
