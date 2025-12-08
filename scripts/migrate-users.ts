/**
 * Migrate Users Script
 *
 * Migrates existing users from data/users.json to Supabase.
 * All migrated users will be set to role='user' and status='active'.
 *
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 *
 * Usage:
 * npx tsx scripts/migrate-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface LegacyUser {
  id: string;
  email: string;
  name?: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

async function migrateUsers() {
  console.log('📦 Migrate Users Script');
  console.log('======================\n');

  // Validate environment variables
  if (!SUPABASE_URL) {
    console.error('❌ Missing SUPABASE_URL environment variable');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  // Check if users.json exists
  const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

  if (!fs.existsSync(usersFilePath)) {
    console.log('ℹ️  No data/users.json file found. Nothing to migrate.');
    process.exit(0);
  }

  // Read existing users
  console.log('📖 Reading users from data/users.json...');
  let legacyUsers: LegacyUser[];

  try {
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    legacyUsers = JSON.parse(fileContent);
  } catch (error: any) {
    console.error('❌ Error reading users.json:', error.message);
    process.exit(1);
  }

  if (!Array.isArray(legacyUsers) || legacyUsers.length === 0) {
    console.log('ℹ️  No users found in data/users.json. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`📊 Found ${legacyUsers.length} users to migrate\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of legacyUsers) {
    console.log(`🔄 Processing: ${user.email}`);

    try {
      // Check if user already exists in Supabase
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        console.log(`   ⏭️  Skipped (already exists)`);
        skipped++;
        continue;
      }

      // Insert user into Supabase
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email: user.email,
          name: user.name || null,
          password_hash: user.password_hash,
          role: 'user',
          status: 'active',
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`   ✅ Migrated successfully`);
      migrated++;

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      errors++;
    }
  }

  console.log('\n========== Migration Complete ==========');
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('========================================\n');

  if (migrated > 0) {
    console.log('💡 Tip: You can safely delete data/users.json after verifying the migration.');
  }
}

migrateUsers();
