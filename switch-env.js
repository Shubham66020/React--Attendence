#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '.env');
const args = process.argv.slice(2);
const mode = args[0];

if (!mode || !['dev', 'prod', 'development', 'production'].includes(mode)) {
    console.log('❌ Usage: node switch-env.js [dev|prod|development|production]');
    console.log('\nExamples:');
    console.log('  node switch-env.js dev       # Switch to development (localhost:5000)');
    console.log('  node switch-env.js prod      # Switch to production (render.com)');
    process.exit(1);
}

const isDev = ['dev', 'development'].includes(mode);
const isProd = ['prod', 'production'].includes(mode);

try {
    let envContent = fs.readFileSync(envFile, 'utf8');

    if (isDev) {
        // Switch to development
        envContent = envContent
            .replace(/^VITE_SERVER_URL=https:\/\/react-attendence\.onrender\.com$/m, '# VITE_SERVER_URL=https://react-attendence.onrender.com')
            .replace(/^# VITE_SERVER_URL=http:\/\/localhost:5000$/m, 'VITE_SERVER_URL=http://localhost:5000');

        console.log('🔧 Switched to DEVELOPMENT mode');
        console.log('📡 Server URL: http://localhost:5000');
    } else if (isProd) {
        // Switch to production
        envContent = envContent
            .replace(/^VITE_SERVER_URL=http:\/\/localhost:5000$/m, '# VITE_SERVER_URL=http://localhost:5000')
            .replace(/^# VITE_SERVER_URL=https:\/\/react-attendence\.onrender\.com$/m, 'VITE_SERVER_URL=https://react-attendence.onrender.com');

        console.log('🚀 Switched to PRODUCTION mode');
        console.log('📡 Server URL: https://react-attendence.onrender.com');
    }

    fs.writeFileSync(envFile, envContent);

    console.log('\n✅ Environment configuration updated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Run: npm run serve');

} catch (error) {
    console.error('❌ Error updating environment file:', error.message);
    process.exit(1);
}
