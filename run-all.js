const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

console.log('🚀 Launching Phoenix AI Backend Server & Frontend Client concurrently...');

// 1. Spawn Backend Server
const serverProcess = spawn('node', ['--watch', 'server.js'], {
    cwd: serverDir,
    shell: true,
    stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
    process.stdout.write(`[SERVER] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[SERVER ERROR] ${data}`);
});

// 2. Spawn Frontend Client
const clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: clientDir,
    shell: true,
    stdio: 'pipe'
});

clientProcess.stdout.on('data', (data) => {
    process.stdout.write(`[CLIENT] ${data}`);
});

clientProcess.stderr.on('data', (data) => {
    process.stderr.write(`[CLIENT ERROR] ${data}`);
});

process.on('SIGINT', () => {
    serverProcess.kill();
    clientProcess.kill();
    process.exit();
});
