#!/usr/bin/env node

/**
 * Script to apply the database schema to Supabase
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Please set:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL (already in .env.local)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (get from Supabase dashboard)');
  console.error('\nTo get your service role key:');
  console.error('  1. Go to https://supabase.com/dashboard/project/lqushgfncphmnjiwtwlx/settings/api');
  console.error('  2. Copy the "service_role" key under "Project API keys"');
  console.error('  3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySchema() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema to Supabase database...');
    console.log('This may take 10-15 seconds...\n');

    // Split schema into individual statements (basic split on semicolon)
    // Note: This is a simple approach; for complex schemas you might need a proper SQL parser
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Some errors are expected (like "type already exists")
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Skipped (already exists): Statement ${i + 1}`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`✓ Applied ${successCount} statements...`);
          }
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Schema application completed!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

applySchema();
