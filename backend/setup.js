#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up NFC Payment Backend...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Install dependencies
console.log('\n📦 Installing dependencies...');
exec('npm install', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Failed to install dependencies:', error);
    return;
  }
  
  console.log('✅ Dependencies installed');
  
  // Setup Prisma
  console.log('\n🗄️  Setting up database...');
  exec('npx prisma generate', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to generate Prisma client:', error);
      return;
    }
    
    console.log('✅ Prisma client generated');
    
    // Push database schema
    exec('npx prisma db push', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Failed to push database schema:', error);
        return;
      }
      
      console.log('✅ Database schema created');
      
      // Seed database
      console.log('\n🌱 Seeding database...');
      exec('npm run db:seed', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to seed database:', error);
          return;
        }
        
        console.log('✅ Database seeded with sample data');
        console.log('\n🎉 Backend setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. npm run dev      - Start development server');
        console.log('   2. npm run db:studio - Open Prisma Studio');
        console.log('   3. Visit http://localhost:3000/health - Test API');
        console.log('   4. Visit http://localhost:3000/admin - Admin Dashboard');
        console.log('\n📱 Mobile app integration:');
        console.log('   - Update mobile app to point to: http://YOUR_IP:3000/api');
        console.log('   - Backend is compatible with existing admin system');
      });
    });
  });
});