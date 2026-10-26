const { spawn } = require('node:child_process');
const children = [
    spawn(process.execPath, ['--watch', 'server/server.js'], { stdio: 'inherit' }),
    spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' })
];
let stopping = false;
function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    children.forEach(child => child.kill('SIGTERM'));
    process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
children.forEach(child => child.on('exit', code => stop(code || 0)));
console.log('[dev] React with hot reload: http://localhost:5173');
