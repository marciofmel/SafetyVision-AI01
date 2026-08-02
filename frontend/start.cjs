const { spawn } = require('child_process');
const vite = spawn('npx', ['vite', '--host'], { cwd: __dirname, shell: true, stdio: 'inherit' });
vite.on('close', (code) => process.exit(code));
