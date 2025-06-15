#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Starting production build and server...\n');

// Check if dist directory exists
const distPath = join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.log('📦 Building frontend...');

    const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
    });

    buildProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ Frontend build failed');
            process.exit(1);
        }

        console.log('✅ Frontend build completed\n');
        startServer();
    });
} else {
    console.log('📦 Using existing build in dist/\n');
    startServer();
}

function startServer() {
    console.log('🚀 Starting server on port 5000...\n');

    const serverProcess = spawn('node', ['server/server.js'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname,
        env: {
            ...process.env,
            NODE_ENV: 'production'
        }
    });

    serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });

    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        serverProcess.kill('SIGINT');
        process.exit(0);
    });
}
