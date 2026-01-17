#!/usr/bin/env tsx
/**
 * Check which Supabase environment you're connected to
 * Run with: npx tsx scripts/check-environment.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found!');
  process.exit(1);
}

dotenv.config({ path: envPath });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set in .env.local');
  process.exit(1);
}

console.log('\n🔍 Current Supabase Connection:\n');

if (url.includes('127.0.0.1') || url.includes('localhost')) {
  console.log('✅ TEST ENVIRONMENT (Local Docker)');
  console.log(`   URL: ${url}`);
  console.log('   Safe to break, test data only\n');
} else if (url.includes('supabase.co')) {
  console.log('⚠️  PRODUCTION ENVIRONMENT (Cloud)');
  console.log(`   URL: ${url}`);
  console.log('   CAUTION: Real user data!\n');
  console.log('   Commands to switch to test mode:');
  console.log('   1. Update .env.local to use http://127.0.0.1:54321');
  console.log('   2. Run: npm run dev (restart server)\n');
} else {
  console.log('⚠️  UNKNOWN ENVIRONMENT');
  console.log(`   URL: ${url}\n`);
}
