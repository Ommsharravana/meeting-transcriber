/**
 * Seed Superadmin Script
 *
 * Run this script once to create the initial superadmin user.
 *
 * Required environment variables:
 * - INITIAL_SUPERADMIN_EMAIL: Email for the superadmin
 * - INITIAL_SUPERADMIN_PASSWORD: Password for the superadmin
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 *
 * Usage:
 * npx tsx scripts/seed-superadmin.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPERADMIN_EMAIL = process.env.INITIAL_SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.INITIAL_SUPERADMIN_PASSWORD;

async function seedSuperadmin() {
  console.log('🔐 Seed Superadmin Script');
  console.log('========================\n');

  // Validate environment variables
  if (!SUPABASE_URL) {
    console.error('❌ Missing SUPABASE_URL environment variable');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  if (!SUPERADMIN_EMAIL) {
    console.error('❌ Missing INITIAL_SUPERADMIN_EMAIL environment variable');
    process.exit(1);
  }

  if (!SUPERADMIN_PASSWORD) {
    console.error('❌ Missing INITIAL_SUPERADMIN_PASSWORD environment variable');
    process.exit(1);
  }

  if (SUPERADMIN_PASSWORD.length < 8) {
    console.error('❌ INITIAL_SUPERADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  console.log(`📧 Superadmin email: ${SUPERADMIN_EMAIL}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if superadmin already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', SUPERADMIN_EMAIL)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      console.log('⚠️  User already exists with this email');

      if (existingUser.role === 'superadmin') {
        console.log('✅ User is already a superadmin. No changes needed.');
        process.exit(0);
      }

      // Upgrade existing user to superadmin
      console.log('🔄 Upgrading existing user to superadmin...');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'superadmin',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ User upgraded to superadmin successfully!');
      process.exit(0);
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);

    // Create superadmin user
    console.log('👤 Creating superadmin user...');

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: SUPERADMIN_EMAIL,
        name: 'Super Admin',
        password_hash: passwordHash,
        role: 'superadmin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('\n✅ Superadmin created successfully!');
    console.log('================================');
    console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
    console.log(`👤 Name: Super Admin`);
    console.log(`🛡️  Role: superadmin`);
    console.log(`✓ Status: active`);
    console.log(`🆔 ID: ${newUser.id}`);
    console.log('\n🎉 You can now log in with these credentials!');

  } catch (error: any) {
    console.error('\n❌ Error creating superadmin:', error.message || error);
    process.exit(1);
  }
}

seedSuperadmin();
