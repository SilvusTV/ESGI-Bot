module.exports = {
  apps: [
    {
      name: 'compiler',
      script: 'node_modules/typescript/bin/tsc',
      args: '--watch --preserveWatchOutput',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      env: {},
    },
    {
      name: 'discord-bot',
      script: 'dist/index.js',
      watch: ['dist'],
      ignore_watch: ['node_modules', 'DB', '.git'],
      merge_logs: true,
      vizion: true,
      autorestart: true,
      env: {},
      windowsHide: true,
    },
  ],
};