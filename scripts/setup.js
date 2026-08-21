#!/usr/bin/env node
/**
 * Scorr Monorepo Automated Setup Script
 * Installs all workspace dependencies and configures development environment templates.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🚀 Setting up Scorr monorepo development environment...\n');

// 1. Install dependencies
console.log('📦 Installing workspace dependencies across all applications...');
try {
  execSync('npm install --legacy-peer-deps', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✅ Workspace dependencies installed successfully.\n');
} catch (err) {
  console.error('❌ Failed to install dependencies:', err.message);
  process.exit(1);
}

// 2. Setup environment variables from examples
const envMappings = [
  { example: '.env.example', target: '.env' },
  { example: 'apps/api/.env.example', target: 'apps/api/.env' },
  { example: 'apps/web/.env.example', target: 'apps/web/.env' },
  { example: 'apps/mobile/.env.example', target: 'apps/mobile/.env' },
];

console.log('⚙️  Configuring environment variables...');
let createdEnvs = 0;

for (const { example, target } of envMappings) {
  const examplePath = path.join(ROOT_DIR, example);
  const targetPath = path.join(ROOT_DIR, target);

  if (fs.existsSync(examplePath)) {
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(examplePath, targetPath);
      console.log(`  + Created ${target} from ${example}`);
      createdEnvs++;
    } else {
      console.log(`  ✓ ${target} already exists (skipping overwrite)`);
    }
  }
}

console.log(`\n🎉 Environment setup complete! (${createdEnvs} new .env files created)\n`);
console.log('Available development commands:');
console.log('  npm run dev          - Start backend development server');
console.log('  npm run test         - Run all unit and integration test suites');
console.log('  npm run test:coverage- Enforce code coverage thresholds');
console.log('  npm run lint         - Lint mobile, web, and backend code');
console.log('  docker-compose up -d - Spin up full local PostgreSQL & service stack\n');
